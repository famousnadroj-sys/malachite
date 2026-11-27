
/* Malachite: paid real-time audio/video calls and faster private profile photo loading. */
(function(){
 'use strict';
 var CALL_PROVIDER_ENABLED=false,providerStatusPendingFor=null,providerStatusCheckedFor=null,providerStatusCheckedAt=0,photoCache=Object.create(null),callInbox=null,callInboxUserId=null,sessionChannel=null,callState=null,incoming=null,jitsiApi=null,callBusy=false,joiningCallId=null,callClockTimer=null,callStartedAt=0,audioOutputDevices=[],offerStatusFor=null,offerStatusPending=false;
 if(typeof PRIX==='object')PRIX.Appels='Temporairement indisponible';
 window.CALL_PROVIDER_ENABLED=CALL_PROVIDER_ENABLED;

 function readPhotoCache(key){
  // Signed Storage URLs expire on the server clock. Do not persist them in
  // localStorage: a device clock that is behind can keep an expired JWT alive
  // for days. Use only a monotonic, in-memory TTL for this page session.
  var v=photoCache[key],now=performance.now();
  if(v&&v.expMono>now+30000)return v;
  delete photoCache[key];
  try{localStorage.removeItem('mal_photo_cache:'+key)}catch(e){}
  return null;
 }
 function writePhotoCache(key,value){
  photoCache[key]={url:value.url,expMono:performance.now()+3500000};
  try{localStorage.removeItem('mal_photo_cache:'+key)}catch(e){}
 }
 async function resolveProfilesPhotosFast(list){
  list=list||[];
  var groups=Object.create(null),resolved=Object.create(null),refs=[],now=Date.now();
  list.forEach(function(p){
   if(!p)return;p.photoUrls=[];
   (p.photos||[]).filter(Boolean).forEach(function(raw,index){
    var s=String(raw),bucket=s.indexOf('/storage/v1/object/public/photos/')>=0?'photos':'profile-photos';
    var path=storagePath(bucket,raw),key=bucket+'|'+path,item={p:p,index:index,key:key,bucket:bucket,path:path};
    refs.push(item);
    var cached=readPhotoCache(key,now);
    if(cached)resolved[key]=cached.url;
    else{if(!groups[bucket])groups[bucket]=Object.create(null);if(!groups[bucket][path])groups[bucket][path]=[];groups[bucket][path].push(item)}
   });
  });
  await Promise.all(Object.keys(groups).map(async function(bucket){
   var paths=Object.keys(groups[bucket]);
   for(var offset=0;offset<paths.length;offset+=100){
    var batch=paths.slice(offset,offset+100);
    try{
     var result=await sb.storage.from(bucket).createSignedUrls(batch,3600);
     if(result.error)throw result.error;
     (result.data||[]).forEach(function(value,index){
      var path=value.path||batch[index],url=value.signedUrl||'';
      if(!url)return;
      var key=bucket+'|'+path;resolved[key]=url;writePhotoCache(key,{url:url,exp:now+3500000});
     });
    }catch(error){console.warn('Photos profil: signature groupée impossible',error)}
   }
  }));
  refs.forEach(function(item){var url=resolved[item.key];if(url)item.p.photoUrls.push(url)});
  return list;
 }
 async function resolveProfilePhotosFast(p){if(!p)return p;await resolveProfilesPhotosFast([p]);return p;}
 window.resolveProfilePhotosBatch=resolveProfilesPhotosFast;
 window.resolveProfilePhotos=resolveProfilePhotosFast;
 if(typeof resolveProfilePhotos==='function')resolveProfilePhotos=resolveProfilePhotosFast;

 function overlay(title,body,actions,mount){
  var old=document.getElementById('malCallOverlay');if(old)old.remove();
  var html='<div id="malCallOverlay" class="mal-call-overlay"><section class="mal-call-card"><header><b>'+esc(title)+'</b><button onclick="malCloseCallUI()" aria-label="Fermer" style="background:transparent;border:0;color:white;font-size:22px">×</button></header><div class="mal-call-body">'+body+'</div>'+(mount?'<div id="malJitsiMount"></div>':'')+(actions?'<div class="mal-call-actions">'+actions+'</div>':'')+'</section></div>';
  document.body.insertAdjacentHTML('beforeend',html);
 }
 function closeUI(){if(jitsiApi){try{jitsiApi.dispose()}catch(e){}jitsiApi=null}var el=document.getElementById('malCallOverlay');if(el)el.remove()}
 window.malCloseCallUI=closeUI;
 function stopCallInbox(){
  if(callInbox){try{sb.removeChannel(callInbox)}catch(e){}callInbox=null}
  callInboxUserId=null;incoming=null;
 }
 async function refreshCallProviderStatus(force){
  if(!me||!me.id){
   CALL_PROVIDER_ENABLED=false;window.CALL_PROVIDER_ENABLED=false;
   if(typeof PRIX==='object')PRIX.Appels='Temporairement indisponible';
   stopCallInbox();return false;
  }
  var uid=me.id;
  if(providerStatusPendingFor===uid)return false;
  if(!force&&providerStatusCheckedFor===uid&&Date.now()-providerStatusCheckedAt<30000)return CALL_PROVIDER_ENABLED;
  providerStatusPendingFor=uid;
  try{
   var response=await sb.functions.invoke('malachite-jaas-token',{body:{action:'status'}});
   if(response.error||!response.data||typeof response.data.enabled!=='boolean')throw response.error||new Error('Provider status invalid');
   if(!me||me.id!==uid)return false;
   CALL_PROVIDER_ENABLED=response.data.enabled===true;
   providerStatusCheckedFor=uid;providerStatusCheckedAt=Date.now();
   window.CALL_PROVIDER_ENABLED=CALL_PROVIDER_ENABLED;
   if(typeof PRIX==='object')PRIX.Appels=CALL_PROVIDER_ENABLED?'Appels audio/vidéo disponibles':'Temporairement indisponible';
   if(CALL_PROVIDER_ENABLED)startInbox();else stopCallInbox();
   return CALL_PROVIDER_ENABLED;
  }catch(e){
   if(me&&me.id===uid){
    CALL_PROVIDER_ENABLED=false;window.CALL_PROVIDER_ENABLED=false;
    providerStatusCheckedFor=uid;providerStatusCheckedAt=Date.now();
    if(typeof PRIX==='object')PRIX.Appels='Temporairement indisponible';
    stopCallInbox();
   }
   return false;
  }finally{
   if(providerStatusPendingFor===uid)providerStatusPendingFor=null;
  }
 }
 function startInbox(){
  // Keep incoming-call subscriptions disabled until authenticated JaaS is deployed and verified.
  if(!CALL_PROVIDER_ENABLED)return false;
  if(!me)return;var uid=me.id;
  if(callInbox&&callInboxUserId===uid)return;
  if(callInbox)stopCallInbox();
  callInboxUserId=uid;
  callInbox=sb.channel('malachite-call-inbox-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_sessions',filter:'callee_id=eq.'+uid},function(ev){
   var row=ev&&ev.new;
   if(!row||row.status!=='pending'||new Date(row.expires_at)<=new Date())return;
   if(!me||me.id!==uid)return;
   if(callState||callBusy||incoming){
    if(!incoming||incoming.id!==row.id)sb.rpc('update_my_call_session_status',{p_id:row.id,p_status:'rejected'}).then(function(){});
    return;
   }
   incoming=row;var p=prof(row.caller_id)||{},name=p.prenom||'Un membre';
   try{if(typeof beep==='function')beep();if(navigator.vibrate)navigator.vibrate([250,120,250])}catch(e){}
   overlay(row.mode==='video'?'Appel vidéo entrant':'Appel audio entrant','<div style="font-size:48px">📲</div><h2>'+esc(name)+'</h2><p>Appel entrant · '+(row.mode==='video'?'Vidéo':'Audio')+'</p><p>Souhaites-tu répondre ?</p>','<button class="reject" onclick="malRejectCall()">Refuser</button><button class="accept" onclick="malAcceptCall()">Accepter</button>',false);
  }).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){if(callInboxUserId===uid){callInbox=null;callInboxUserId=null}console.warn('Réception des appels indisponible : '+status)}});
 }
 async function acceptIncoming(){
  var row=incoming;if(!row||!me)return;
  var r=await sb.rpc('update_my_call_session_status',{p_id:row.id,p_status:'accepted'});var accepted=Array.isArray(r.data)?r.data[0]:r.data;
  if(r.error||!accepted||accepted.status!=='accepted'||new Date(accepted.expires_at).getTime()<=Date.now()){
   alert('Impossible d’accepter : cet appel n’est plus en attente ou a expiré.');incoming=null;closeUI();return
  }
  callState={id:accepted.id,caller:false,caller_id:accepted.caller_id,callee_id:accepted.callee_id,mode:accepted.mode,room:accepted.room,status:accepted.status};
  incoming=null;await joinJitsi(callState);
 }
 async function rejectIncoming(){var row=incoming;if(row&&me)await sb.rpc('update_my_call_session_status',{p_id:row.id,p_status:'rejected'});incoming=null;closeUI()}
 window.malAcceptCall=acceptIncoming;window.malRejectCall=rejectIncoming;
 async function hasPass(){
  var s=await sb.from('statuts').select('premium_until').eq('user_id',me.id).maybeSingle();
  if(s.error)throw s.error;
  if(s.data&&s.data.premium_until&&new Date(s.data.premium_until).getTime()>Date.now())return true;
  var r=await sb.from('paiements').select('id,entitlement_expires_at,reviewed_at,created_at').eq('user_id',me.id).eq('offre','Appels').eq('statut','valide').limit(20);
  if(r.error)throw r.error;var now=Date.now();return !!(r.data||[]).some(function(x){var until=x.entitlement_expires_at||((x.reviewed_at||x.created_at)?new Date(x.reviewed_at||x.created_at).getTime()+7*86400000:0);return until>now});
 }
 function subscribeReady(ch){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(!done){done=true;reject(new Error('Le service temps réel ne répond pas.'))}},12000);ch.subscribe(function(status,error){if(done)return;if(status==='SUBSCRIBED'){done=true;clearTimeout(t);resolve()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){done=true;clearTimeout(t);reject(error||new Error('Connexion Realtime impossible'))}})})}
 async function startCall(mode){
  // Recheck the authenticated provider before attempting a call. The database
  // remains the final authority and rejects creation/acceptance while disabled.
  if(!CALL_PROVIDER_ENABLED&&!(await refreshCallProviderStatus(true))){alert('Les appels audio et vidéo sont temporairement suspendus pour protéger la confidentialité. Ils seront réactivés après la configuration et la vérification des salles privées sécurisées.');return}
  if(!me||!open){alert('Ouvre une conversation avant d’appeler.');return}
  if(mode!=='audio'&&mode!=='video')mode='audio';
  if(!mutual){alert('Appel impossible : un match réciproque est nécessaire.');return}
  if(callBusy||callState){alert('Un appel est déjà en cours.');return}
  var target=open,targetProfile=prof(target)||{};
  if(typeof online==='function'&&!online(targetProfile)){
   alert((targetProfile.prenom||'Cette personne')+' est hors ligne. Envoie-lui un message et réessaie lorsqu’elle sera connectée.');
   return;
  }
  callBusy=true;
  try{
   if(!(await hasPass())){alert('Accès aux appels non actif : Premium ou Pass Appels validé (1 USD / 7 jours) requis.');go('offres');return}
   if(!me||open!==target)throw new Error('La conversation a changé. Relance l’appel depuis la bonne conversation.');
   var id=crypto.randomUUID(),room='Malachite-'+id.replace(/-/g,'');
   var ch=sb.channel('malachite-call-session-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'call_sessions',filter:'id=eq.'+id},function(ev){
    var row=ev&&ev.new;if(!row||!callState||callState.id!==id)return;callState.status=row.status;
    if(row.status==='accepted'&&callState.caller&&!jitsiApi)joinJitsi(callState);
    else if(row.status==='rejected'){alert('L’autre membre a refusé l’appel.');finishCall(false)}
    else if(row.status==='ended'||row.status==='expired'){if(jitsiApi)finishCall(false);else{closeUI();callState=null;alert(row.status==='expired'?'Pas de réponse.':'Appel terminé.')}}
   });
   await subscribeReady(ch);sessionChannel=ch;
   var ins=await sb.rpc('start_call_session',{p_id:id,p_callee_id:target,p_room:room,p_mode:mode,p_expires_at:new Date(Date.now()+90000).toISOString()});
   if(ins.error)throw ins.error;
   var created=Array.isArray(ins.data)?ins.data[0]:ins.data;
   if(!created||!created.id)throw new Error('La base n’a pas confirmé la création de l’appel.');
   callState={id:created.id,caller:true,caller_id:created.caller_id,callee_id:created.callee_id,mode:created.mode,room:created.room,status:created.status};
   overlay(mode==='video'?'Appel vidéo en cours':'Appel audio en cours','<p>Appel envoyé à '+esc((prof(target)||{}).prenom||'ton match')+'. En attente de réponse…</p>','<button class="hangup" onclick="malHangup()">Annuler l’appel</button>',false);
   callState.timeout=setTimeout(async function(){if(callState&&callState.id===id&&callState.status==='pending'){await sb.rpc('update_my_call_session_status',{p_id:id,p_status:'expired'});finishCall(false);alert('Aucune réponse. Réessaie plus tard.')}},90000);
  }catch(e){console.error('Appel Malachite',e);var em=e&&e.message?e.message:'erreur inconnue';if(em.indexOf('call_entitlement_required')>=0)em='Les appels nécessitent Premium actif ou un Pass Appels validé.';else if(em.indexOf('mutual_match_required')>=0)em='Appel impossible : ce membre ne figure pas comme match réciproque dans la base. Ouvre un match confirmé.';else if(em.indexOf('call_already_active')>=0)em='Un appel est déjà en cours pour toi ou ce membre. Termine-le avant de recommencer.';else if(em.indexOf('row-level security')>=0||em.indexOf('42501')>=0)em='La base a refusé la création de l’appel. Réessaie après reconnexion.';alert('Appel impossible : '+em);if(sessionChannel){sb.removeChannel(sessionChannel);sessionChannel=null}callState=null}
  finally{callBusy=false}
 }
 async function loadJitsi(appId){
  if(window.JitsiMeetExternalAPI)return;
  if(!appId||!/^vpaas-magic-cookie-[a-f0-9]+$/i.test(appId))throw new Error('Identifiant JaaS invalide.');
  await new Promise(function(resolve,reject){var s=document.querySelector('script[data-mal-jaas]');if(s){if(window.JitsiMeetExternalAPI){resolve();return}s.addEventListener('load',resolve,{once:true});s.addEventListener('error',function(){reject(new Error('JaaS ne se charge pas.'))},{once:true});setTimeout(function(){window.JitsiMeetExternalAPI?resolve():reject(new Error('Délai JaaS dépassé.'))},15000);return}
   s=document.createElement('script');s.src='https://8x8.vc/'+encodeURIComponent(appId)+'/external_api.js';s.async=true;s.dataset.malJaas='1';s.onload=resolve;s.onerror=function(){reject(new Error('Impossible de charger JaaS.'))};document.head.appendChild(s);
  });
 }
 async function joinJitsi(state){
  if(!state||!callState||callState.id!==state.id||joiningCallId===state.id||jitsiApi)return;
  joiningCallId=state.id;
  try{
   var tokenResponse=await sb.functions.invoke('malachite-jaas-token',{body:{session_id:state.id}});
   if(tokenResponse.error)throw tokenResponse.error;
   var tokenData=tokenResponse.data;
   if(!tokenData||tokenData.domain!=='8x8.vc'||typeof tokenData.jwt!=='string'||typeof tokenData.roomName!=='string')throw new Error('Jeton JaaS invalide.');
   var appId=tokenData.roomName.split('/')[0];
   if(!tokenData.roomName.startsWith(appId+'/')||!/^vpaas-magic-cookie-[a-f0-9]+$/i.test(appId))throw new Error('Salle JaaS invalide.');
   await loadJitsi(appId);
   if(!callState||callState.id!==state.id)return;
   var p=prof(state.caller?state.callee_id:state.caller_id)||{},name=(mine&&mine.prenom)||'Membre Malachite';
   overlay(state.mode==='video'?'Appel vidéo avec '+(p.prenom||'ton match'):'Appel audio avec '+(p.prenom||'ton match'),
    '<div class="mal-call-live"><span id="malCallStatus">Connexion à l’appel en cours…</span><div class="mal-call-controls"><button type="button" onclick="malToggleMic()" id="malMicBtn">🎙️ Micro activé</button><button type="button" onclick="malToggleCamera()" id="malCameraBtn">📷 Caméra</button><label class="mal-audio-route">🔊 Sortie audio <select id="malAudioOutput" onchange="malSetAudioOutput(this.value)"><option value="">Haut-parleur par défaut</option></select></label></div></div>',
    '<button class="hangup" onclick="malHangup()">Raccrocher</button>',true);
   var mount=document.getElementById('malJitsiMount');
   if(!mount)throw new Error('Interface de l’appel introuvable.');
   jitsiApi=new JitsiMeetExternalAPI('8x8.vc',{
    roomName:tokenData.roomName,jwt:tokenData.jwt,parentNode:mount,width:'100%',height:'100%',userInfo:{displayName:name},
    configOverwrite:{prejoinConfig:{enabled:false},enableWelcomePage:false,startWithAudioMuted:false,startWithVideoMuted:state.mode==='audio',disableDeepLinking:true,p2p:{enabled:true}},
    interfaceConfigOverwrite:{TOOLBAR_BUTTONS:['microphone','camera','hangup','chat','tileview','fullscreen','settings','participants-pane','desktop']}
   });
   callStartedAt=0;
   clearInterval(callClockTimer);callClockTimer=null;
   jitsiApi.addListener('videoConferenceJoined',function(){
    callStartedAt=Date.now();clearInterval(callClockTimer);
    callClockTimer=setInterval(function(){var node=document.getElementById('malCallStatus');if(node&&callStartedAt){var n=Math.floor((Date.now()-callStartedAt)/1000);node.textContent='Connecté · '+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}},1000);
    var node=document.getElementById('malCallStatus');if(node)node.textContent='Connecté · 00:00';loadAudioOutputDevices()
   });
   jitsiApi.addListener('deviceListChanged',loadAudioOutputDevices);
   jitsiApi.addListener('connectionQualityChanged',function(event){var node=document.getElementById('malCallStatus');if(node&&event&&event.connectionQuality==='poor')node.textContent='Connexion faible · vérifie ton réseau'});
   jitsiApi.addListener('audioMuteStatusChanged',function(event){var b=document.getElementById('malMicBtn');if(b)b.textContent=event.muted?'🔇 Micro coupé':'🎙️ Micro activé'});
   jitsiApi.addListener('videoMuteStatusChanged',function(event){var b=document.getElementById('malCameraBtn');if(b)b.textContent=event.muted?'📷 Caméra coupée':'📷 Caméra activée'});
   jitsiApi.addListener('readyToClose',function(){finishCall(true)});
   jitsiApi.addListener('videoConferenceLeft',function(){finishCall(true)});
  }catch(e){
   console.error('Connexion Jitsi Malachite',e);
   alert('Connexion à l’appel impossible : '+(e&&e.message?e.message:'service indisponible')+'. Vérifie ta connexion puis réessaie.');
   await finishCall(true);
  }finally{if(joiningCallId===state.id)joiningCallId=null}
 }
 window.malToggleMic=function(){if(jitsiApi)jitsiApi.executeCommand('toggleAudio')};
 window.malToggleCamera=function(){if(jitsiApi)jitsiApi.executeCommand('toggleVideo')};
 async function loadAudioOutputDevices(){
  if(!jitsiApi||typeof jitsiApi.getAvailableDevices!=='function')return;
  try{
   var devices=await jitsiApi.getAvailableDevices();
   audioOutputDevices=devices&&Array.isArray(devices.audioOutput)?devices.audioOutput:[];
   var select=document.getElementById('malAudioOutput');if(!select)return;
   var current=select.value;
   select.innerHTML='<option value="">Haut-parleur par défaut</option>'+audioOutputDevices.map(function(d){return '<option value="'+esc(d.deviceId)+'">'+esc(d.label||'Sortie audio')+'</option>'}).join('');
   if(current&&audioOutputDevices.some(function(d){return d.deviceId===current}))select.value=current;
   else if(audioOutputDevices.length===1&&audioOutputDevices[0].deviceId!=='default')select.value=audioOutputDevices[0].deviceId;
   select.disabled=audioOutputDevices.length===0;
  }catch(e){console.warn('Liste des sorties audio indisponible',e)}
 }
 window.malSetAudioOutput=async function(deviceId){
  if(!jitsiApi||!deviceId)return;
  var device=audioOutputDevices.find(function(d){return d.deviceId===deviceId});
  if(!device)return;
  try{await jitsiApi.setAudioOutputDevice(device.label||'',device.deviceId)}
  catch(e){alert('Ce navigateur ne permet pas de changer la sortie audio. Utilise le réglage haut-parleur de ton téléphone.')}
 };
 async function finishCall(updateServer){
  var s=callState;if(s&&s.timeout)clearTimeout(s.timeout);
  clearInterval(callClockTimer);callClockTimer=null;callStartedAt=0;joiningCallId=null;audioOutputDevices=[];
  if(jitsiApi){var api=jitsiApi;jitsiApi=null;try{api.dispose()}catch(e){}}
  if(updateServer&&s&&me&&s.status!=='ended'&&s.status!=='rejected'&&s.status!=='expired')await sb.rpc('update_my_call_session_status',{p_id:s.id,p_status:'ended'});
  closeUI();callState=null;callBusy=false;if(sessionChannel){sb.removeChannel(sessionChannel);sessionChannel=null}
 }
 window.malHangup=function(){finishCall(true)};
 window.call=function(mode){return startCall(mode||'audio')};
 if(typeof call==='function')call=function(mode){return startCall(mode||'audio')};

 // Calls stay unavailable until JaaS JWT issuance and server-side authorization
 // are configured and verified. Never replace disabled UI controls here.
 var oldMatch=window.matchBox;
 if(typeof oldMatch==='function')window.matchBox=oldMatch;
 var oldThread=window.thread;
 if(typeof oldThread==='function')window.thread=oldThread;
 var oldSub=window.sub;
 if(typeof oldSub==='function')window.sub=function(){oldSub()};
 // Keep the public entry point connected to the guarded implementation. The
 // provider status RPC and database checks keep this fail-closed until JaaS is
 // configured; do not permanently shadow the call handler after configuration.
 window.call=function(mode){return startCall(mode||'audio')};
 if(typeof call==='function')call=function(mode){return startCall(mode||'audio')};
 window.startCallInbox=function(){return refreshCallProviderStatus(true).then(function(enabled){if(enabled)startInbox();return enabled})};

 function refreshOfferPremiumStatus(){
  if(!me||offerStatusFor===me.id||offerStatusPending)return;
  offerStatusPending=true;var uid=me.id;
  sb.from('statuts').select('premium_until').eq('user_id',uid).maybeSingle().then(function(r){
   if(r.error)throw r.error;
   if(!me||me.id!==uid)return;
   st[uid]=r.data||{};offerStatusFor=uid;
   if(tab==='offres'&&typeof draw==='function')draw(true);
  }).catch(function(e){console.warn('Vérification Premium pour les offres',e)}).finally(function(){offerStatusPending=false});
 }
 window.offres=function(){
  refreshOfferPremiumStatus();
  var premiumActive=!!(me&&st[me.id]&&st[me.id].premium_until&&new Date(st[me.id].premium_until).getTime()>Date.now());
  var callsCard=CALL_PROVIDER_ENABLED?'<div class="plan"><h3>📞 Appels audio + vidéo</h3><p>'+(premiumActive?'Inclus dans ton abonnement Premium actif.':'Pass Appels : 1 USD / 7 jours avec tes matchs.')+'</p></div>':'<div class="plan"><h3>📞 Appels audio + vidéo</h3><p>Service temporairement indisponible pendant la sécurisation des appels. Aucun Pass Appels ne peut être acheté ni validé avant l’activation du fournisseur authentifié. Les appels seront inclus dans Premium ou proposés en Pass Appels après validation complète.</p></div>';
  var callOption=CALL_PROVIDER_ENABLED&&!premiumActive?'<option value="Appels">Pass Appels — 1 USD / 7 jours</option>':'';
  var paymentMethods=(NUM?'<option value="airtel">Airtel Money</option>':'')+(ORANGE?'<option value="orange">Orange Money</option>':'');
  var paymentSection=(NUM||ORANGE)?'<h2>💳 Payer et soumettre le code de transaction</h2><div class="box list"><p>1. Choisis une offre et un moyen de paiement affiché. 2. Envoie exactement le montant indiqué au numéro correspondant. 3. Copie la référence reçue de ton opérateur. 4. Soumets-la avec le justificatif. L’accès est activé seulement après vérification manuelle par l’administrateur.</p>'+(NUM?'<div class="card"><b>Numéro Airtel Money destinataire</b><div style="font-size:20px;font-weight:800;letter-spacing:1px">'+esc(NUM)+'</div></div>':'')+(ORANGE?'<div class="card"><b>Numéro Orange Money destinataire</b><div style="font-size:20px;font-weight:800;letter-spacing:1px">'+esc(ORANGE)+'</div></div>':'')+'<label>Offre<select id="of"><option value="Premium">Premium — 2 USD / 30 jours (appels dès réactivation du service sécurisé)</option><option value="Boost">Boost — 0,50 USD / 24 heures</option></select></label><label>Moyen de paiement<select id="malOperator">'+paymentMethods+'</select></label><label>Code de transaction<input id="cd" maxlength="100" autocomplete="off" placeholder="Référence exacte reçue après transfert"></label><p class="note">Ne communique jamais ton PIN ni ton code OTP. Le réseau doit correspondre au transfert.</p><label>Justificatif de paiement (JPEG, PNG ou WebP · 5 Mo maximum)<input id="malReceipt" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="b1" id="malSubmitPayment" onclick="pay()">Soumettre le paiement avec justificatif</button><div class="note" id="pm" aria-live="polite"></div></div>':'<section class="card"><h3>💳 Paiements temporairement suspendus</h3><p class="note">Les moyens de paiement sont en cours de confirmation. N’effectue aucun transfert et ne communique aucun code avant la réactivation officielle des paiements.</p></section>';
  return '<h2>⭐ Nos offres</h2><div class="list"><div class="plan"><h3>Gratuit <span>0 $</span></h3><p>Profil, découverte, likes, messages illimités dans les conversations existantes, jusqu’à 15 nouvelles conversations initiées par jour et 1 rendez-vous par semaine.</p></div><div class="plan" style="border:2px solid var(--pink)"><h3>👑 Premium <span>2 $ / 30 jours</span></h3><p>Tout le confort Premium pendant 30 jours : appels audio et vidéo inclus dès la réactivation du service sécurisé, nouvelles conversations sans quota, rendez-vous illimités et accès aux coordonnées de tes matchs sans payer le déblocage contact séparément. À l’expiration, les avantages Premium s’arrêtent automatiquement ; renouvelle pour les retrouver.</p></div>'+callsCard+'<div class="plan"><h3>🔥 Boost <span>0,50 $ / 24 h</span></h3><p>Ton profil passe en priorité en haut de Découvrir pendant 24 heures pour augmenter sa visibilité. Le Boost n’ajoute pas de fonctionnalités de messagerie ou d’appel.</p></div></div>'+paymentSection+'<section id="malPaymentHistory"><h3>Suivi de mes demandes</h3><p class="note">Chargement…</p></section>';
 };
 async function loadMyPayments(){
  var node=document.getElementById('malPaymentHistory');if(!node||!me)return;
  var r=await sb.from('paiements').select('id,offre,statut,created_at,reviewed_at,admin_reason,operateur').eq('user_id',me.id).order('created_at',{ascending:false}).limit(10);
  if(r.error){node.innerHTML='<p class="note">Impossible de charger le suivi : '+esc(r.error.message)+'</p>';return}
  node.innerHTML='<h3>Suivi de mes demandes</h3>'+(r.data&&r.data.length?'<div class="list">'+r.data.map(function(x){var label=x.statut==='valide'?'Demande vérifiée — accès activé':x.statut==='rejete'?'Demande refusée':'En cours de vérification';var detail=x.statut==='rejete'?'Motif : '+esc(x.admin_reason||'Aucun motif communiqué.'):x.statut==='attente'?'Ta demande reste en vérification manuelle.':'Ton avantage est maintenant actif.';detail+=' · '+(x.operateur==='orange'?'Orange Money':'Airtel Money');return '<div class="card"><b>Demande #'+x.id+' · '+esc(x.offre)+'</b><div>'+label+'</div><div class="note">'+detail+'</div><small>'+new Date(x.created_at).toLocaleString('fr-FR')+'</small></div>'}).join('')+'</div>':'<p class="note">Aucune demande de paiement pour le moment.</p>');
 }
 window.loadMyPayments=loadMyPayments;
 window.pay=async function(){
  var input=document.getElementById('cd'),offer=document.getElementById('of'),operator=document.getElementById('malOperator'),proof=document.getElementById('malReceipt'),msgEl=document.getElementById('pm'),button=document.getElementById('malSubmitPayment');
  if(!me){if(msgEl)msgEl.textContent='Connecte-toi avant de soumettre un paiement.';return}
  var network=operator?operator.value:(NUM?'airtel':'orange');
  if(!NUM&&!ORANGE){if(msgEl)msgEl.textContent='Les paiements sont temporairement suspendus. N’effectue aucun transfert.';return}
  if((network==='airtel'&&!NUM)||(network==='orange'&&!ORANGE)){if(msgEl)msgEl.textContent='Ce moyen de paiement n’est pas disponible actuellement.';return}
  var code=input?input.value.trim():'';
  if(code.length<4||code.length>100){if(msgEl)msgEl.textContent='Code invalide : saisis entre 4 et 100 caractères.';return}
  if(!offer||!['Premium','Appels','Boost'].includes(offer.value)){if(msgEl)msgEl.textContent='Choisis une offre valide.';return}
  if(offer.value==='Appels'&&!CALL_PROVIDER_ENABLED){if(msgEl)msgEl.textContent='Le Pass Appels est temporairement indisponible. Aucun paiement ne sera accepté avant l’activation sécurisée du service.';return}
  if(!proof||!proof.files||!proof.files[0]){if(msgEl)msgEl.textContent='Ajoute le justificatif du transfert pour continuer.';return}
  if(button){button.disabled=true;button.textContent='Envoi sécurisé…'}
  if(msgEl)msgEl.textContent='Téléversement privé du justificatif puis enregistrement de la demande…';
  try{
   if(offer.value==='Appels'){
    var premiumCheck=await sb.from('statuts').select('premium_until').eq('user_id',me.id).maybeSingle();
    if(premiumCheck.error)throw premiumCheck.error;
    if(premiumCheck.data&&premiumCheck.data.premium_until&&new Date(premiumCheck.data.premium_until).getTime()>Date.now())throw new Error('Les appels audio et vidéo sont déjà inclus dans ton abonnement Premium actif. Tu ne dois pas payer le pass à 1 $.');
   }
   var duplicate=await sb.from('paiements').select('id,offre,statut,user_id,operateur').eq('code',code).eq('operateur',network).maybeSingle();
   if(duplicate.error)throw duplicate.error;
   if(duplicate.data){if(duplicate.data.user_id!==me.id)throw new Error('Cette référence de transaction a déjà été utilisée. Vérifie le nouveau code reçu de ton opérateur.');throw new Error('Cette référence a déjà été soumise (demande #'+duplicate.data.id+', statut : '+duplicate.data.statut+'). Consulte le suivi de tes demandes ; ne la soumets pas une deuxième fois.');}
   if(typeof malSubmitPayment!=='function')throw new Error('Le module sécurisé de justificatif est indisponible. Recharge la page puis réessaie.');
   var result=await malSubmitPayment({offer:offer.value,code:code,operator:network,file:proof.files[0]});
   if(result&&result.error)throw new Error(result.error);
   if(msgEl)msgEl.textContent='Demande enregistrée avec justificatif privé. L’accès sera activé après vérification du transfert par l’administrateur.';
   if(input)input.value='';
   proof.value='';
   await loadMyPayments();
  }catch(e){console.error('Soumission paiement Malachite',e);if(msgEl)msgEl.textContent='Échec de la soumission : '+(e&&e.message?e.message:'erreur réseau')+'. Vérifie le suivi avant de réessayer.'}
  finally{if(button){button.disabled=false;button.textContent='Soumettre le paiement avec justificatif'}}
 };
 var oldTrt=window.trt;
 window.trt=async function(id,ok){
  var reason=null;if(!ok){reason=prompt('Indique la raison précise du refus (obligatoire, 500 caractères maximum) :');if(reason===null)return;reason=reason.trim();if(!reason||reason.length>500){alert('La raison du refus est obligatoire.');return}}
  var r=await sb.rpc('traiter_paiement',{pid:id,accepter:ok,raison:reason});
  if(r.error){alert('Traitement impossible : '+r.error.message);return}
  alert(ok?'Paiement validé. L’avantage correspondant est activé.':'Paiement refusé. Le membre recevra le motif.');
  if(typeof loadAdm==='function')await loadAdm();
 };
 var adminPaymentChannel=null,adminPaymentUserId=null,adminPaymentPendingFor=null,userNotificationChannel=null,seenNotificationIds=Object.create(null);
 function stopPaymentRealtime(){
  if(adminPaymentChannel){try{sb.removeChannel(adminPaymentChannel)}catch(e){}}
  adminPaymentChannel=null;adminPaymentUserId=null;adminPaymentPendingFor=null;
 }
 function showUserNotification(row){
  if(!row||!row.id||seenNotificationIds[row.id])return;
  seenNotificationIds[row.id]=true;
  if(typeof window.malAnnounceUserNotification==='function')window.malAnnounceUserNotification(row);
  else notify(row.title||'Notification Malachite',row.body||'Tu as une nouvelle notification.','offres',String(row.id));
 }
 async function startUserNotifications(){
  if(!me)return;
  try{
   await sb.rpc('check_my_entitlement_expirations');
   if(typeof window.malRefreshNotificationState==='function')await window.malRefreshNotificationState();
  }catch(e){console.warn('Notifications Malachite',e)}
  if(!userNotificationChannel){
   userNotificationChannel=sb.channel('mal-user-notifications-'+me.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'user_notifications',filter:'user_id=eq.'+me.id},function(ev){showUserNotification(ev&&ev.new)}).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')userNotificationChannel=null});
  }
 }
 async function startPaymentRealtime(){
  if(!me)return;
  var uid=me.id;
  if(adminPaymentChannel&&adminPaymentUserId===uid)return;
  if(adminPaymentChannel&&adminPaymentUserId!==uid)stopPaymentRealtime();
  if(adminPaymentPendingFor===uid)return;
  adminPaymentPendingFor=uid;
  try{
   var access=await sb.rpc('malachite_ai_manager_is_admin');
   if(!me||me.id!==uid||access.error||access.data!==true)return;
   if(adminPaymentChannel&&adminPaymentUserId===uid)return;
   var channel=sb.channel('mal-admin-payment-inbox-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'paiements'},function(ev){
    var row=ev&&ev.new;if(!row||!me||me.id!==uid)return;
    notify('💳 Nouvelle demande de paiement',row.offre+' · Code : '+row.code,'adm','payment-'+row.id);
    if(tab==='adm'&&typeof loadAdm==='function')loadAdm();
   });
   adminPaymentChannel=channel;adminPaymentUserId=uid;
   channel.subscribe(function(status){
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
     if(adminPaymentChannel===channel){adminPaymentChannel=null;adminPaymentUserId=null}
    }
   });
  }catch(e){console.warn('Notifications administrateur des paiements indisponibles',e)}
  finally{if(adminPaymentPendingFor===uid)adminPaymentPendingFor=null}
 }
 var originalSub=window.sub;
 if(typeof originalSub==='function')window.sub=function(){originalSub();startInbox();startPaymentRealtime();startUserNotifications();setTimeout(function(){refreshCallProviderStatus(true)},0)};
 var originalGo=window.go;
 if(typeof originalGo==='function')window.go=function(t){originalGo(t);if(t==='offres')setTimeout(loadMyPayments,0)};

 var style=document.createElement('style');style.textContent='.mal-call-head{border:0!important;border-radius:50%!important;width:38px;height:38px;padding:0!important;background:#fce9f0!important;color:#9b315e!important;font-size:18px!important;flex:none}.mal-call-overlay{position:fixed;inset:0;z-index:100000;background:#0c1218e8;display:flex;align-items:center;justify-content:center;padding:12px}.mal-call-card{width:min(100%,720px);background:#fff;border-radius:20px;overflow:hidden;color:#25313a}.mal-call-card header{display:flex;justify-content:space-between;padding:14px 16px;background:#075e54;color:#fff}.mal-call-body{text-align:center;padding:12px}.mal-call-live{font-size:13px;font-weight:700}.mal-call-controls{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;padding:8px}.mal-call-controls button{border:0;border-radius:999px;padding:10px 14px;background:#edf3f4;color:#203338;font-weight:700}.mal-call-controls small{display:block;width:100%;font-weight:400;color:#667}.mal-audio-route{display:flex;align-items:center;gap:6px;font-size:12px;color:#344;max-width:100%}.mal-audio-route select{max-width:150px;border:1px solid #d4e0e2;border-radius:10px;padding:8px;background:#fff;color:#203338}.mal-call-actions{display:flex;justify-content:center;gap:10px;padding:12px}.mal-call-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:700}.mal-call-actions .accept{background:#087e55;color:white}.mal-call-actions .reject,.mal-call-actions .hangup{background:#c62828;color:white}#malJitsiMount{width:100%;height:min(68vh,620px);min-height:340px;background:#101820}@media(max-width:520px){.mal-call-overlay{padding:0}.mal-call-card{width:100%;height:100%;border-radius:0;display:flex;flex-direction:column}.mal-call-body{padding:10px 8px}.mal-call-live{flex:none}#malJitsiMount{flex:1;height:auto;min-height:0}.mal-call-actions{flex:none}}';document.head.appendChild(style);
 sb.auth.onAuthStateChange(function(event,session){
  var next=session&&session.user?session.user:null;
  if(callInboxUserId&&(!next||next.id!==callInboxUserId))stopCallInbox();
  if(adminPaymentUserId&&(!next||next.id!==adminPaymentUserId))stopPaymentRealtime();
  if(!next&&callState)finishCall(true);
  if(!next){CALL_PROVIDER_ENABLED=false;window.CALL_PROVIDER_ENABLED=false;providerStatusCheckedFor=null;providerStatusCheckedAt=0;stopCallInbox()}
  if(next&&callInboxUserId!==next.id)startInbox();
  if(next)startPaymentRealtime();
  setTimeout(function(){refreshCallProviderStatus(true)},0);
 });
 window.addEventListener('online',function(){if(me){refreshCallProviderStatus(true);startInbox();startPaymentRealtime()}});
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&me){refreshCallProviderStatus(false);startInbox();startPaymentRealtime()}});
 if(me){refreshCallProviderStatus(true);startInbox();startPaymentRealtime()};
})();
