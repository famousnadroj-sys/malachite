
/* Malachite: paid real-time audio/video calls and faster private profile photo loading. */
(function(){
 'use strict';
 var photoCache=Object.create(null),callInbox=null,callInboxUserId=null,sessionChannel=null,callState=null,incoming=null,jitsiApi=null,callBusy=false,joiningCallId=null,callClockTimer=null,callStartedAt=0,audioOutputDevices=[],offerStatusFor=null,offerStatusPending=false;
 if(typeof PRIX==='object')PRIX.Appels='1 $ / semaine';

 function readPhotoCache(key,now){
  var v=photoCache[key];
  if(v&&v.exp>now+30000)return v;
  try{var raw=localStorage.getItem('mal_photo_cache:'+key);if(raw){v=JSON.parse(raw);if(v&&v.url&&v.exp>now+30000){photoCache[key]=v;return v}localStorage.removeItem('mal_photo_cache:'+key)}}catch(e){}
  return null;
 }
 function writePhotoCache(key,value){photoCache[key]=value;try{localStorage.setItem('mal_photo_cache:'+key,JSON.stringify(value))}catch(e){}}
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
 function startInbox(){
  if(!me)return;var uid=me.id;
  if(callInbox&&callInboxUserId===uid)return;
  if(callInbox)stopCallInbox();
  callInboxUserId=uid;
  callInbox=sb.channel('malachite-call-inbox-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_sessions',filter:'callee_id=eq.'+uid},function(ev){
   var row=ev&&ev.new;
   if(!row||row.status!=='pending'||new Date(row.expires_at)<=new Date())return;
   if(!me||me.id!==uid)return;
   if(callState||callBusy||incoming){
    if(!incoming||incoming.id!==row.id)sb.from('call_sessions').update({status:'rejected'}).eq('id',row.id).eq('callee_id',uid).eq('status','pending').then(function(){});
    return;
   }
   incoming=row;var p=prof(row.caller_id)||{},name=p.prenom||'Un membre';
   try{if(typeof beep==='function')beep();if(navigator.vibrate)navigator.vibrate([250,120,250])}catch(e){}
   overlay(row.mode==='video'?'Appel vidéo entrant':'Appel audio entrant','<div style="font-size:48px">📲</div><h2>'+esc(name)+'</h2><p>Appel entrant · '+(row.mode==='video'?'Vidéo':'Audio')+'</p><p>Souhaites-tu répondre ?</p>','<button class="reject" onclick="malRejectCall()">Refuser</button><button class="accept" onclick="malAcceptCall()">Accepter</button>',false);
  }).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){if(callInboxUserId===uid){callInbox=null;callInboxUserId=null}console.warn('Réception des appels indisponible : '+status)}});
 }
 async function acceptIncoming(){
  var row=incoming;if(!row||!me)return;
  var r=await sb.from('call_sessions').update({status:'accepted'}).eq('id',row.id).eq('callee_id',me.id).eq('status','pending');
  if(r.error){alert('Impossible d’accepter : '+r.error.message);incoming=null;closeUI();return}
  callState={id:row.id,caller:false,caller_id:row.caller_id,callee_id:row.callee_id,mode:row.mode,room:row.room,status:'accepted'};
  incoming=null;await joinJitsi(callState);
 }
 async function rejectIncoming(){var row=incoming;if(row&&me)await sb.from('call_sessions').update({status:'rejected'}).eq('id',row.id).eq('callee_id',me.id).eq('status','pending');incoming=null;closeUI()}
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
   callState.timeout=setTimeout(async function(){if(callState&&callState.id===id&&callState.status==='pending'){await sb.from('call_sessions').update({status:'expired'}).eq('id',id);finishCall(false);alert('Aucune réponse. Réessaie plus tard.')}},90000);
  }catch(e){console.error('Appel Malachite',e);var em=e&&e.message?e.message:'erreur inconnue';if(em.indexOf('call_entitlement_required')>=0)em='Les appels nécessitent Premium actif ou un Pass Appels validé.';else if(em.indexOf('mutual_match_required')>=0)em='Appel impossible : ce membre ne figure pas comme match réciproque dans la base. Ouvre un match confirmé.';else if(em.indexOf('call_already_active')>=0)em='Un appel est déjà en cours pour toi ou ce membre. Termine-le avant de recommencer.';else if(em.indexOf('row-level security')>=0||em.indexOf('42501')>=0)em='La base a refusé la création de l’appel. Réessaie après reconnexion.';alert('Appel impossible : '+em);if(sessionChannel){sb.removeChannel(sessionChannel);sessionChannel=null}callState=null}
  finally{callBusy=false}
 }
 async function loadJitsi(){
  if(window.JitsiMeetExternalAPI)return;
  await new Promise(function(resolve,reject){var s=document.querySelector('script[data-mal-jitsi]');if(s){s.addEventListener('load',resolve,{once:true});s.addEventListener('error',function(){reject(new Error('Jitsi ne se charge pas.'))},{once:true});setTimeout(function(){window.JitsiMeetExternalAPI?resolve():reject(new Error('Délai Jitsi dépassé.'))},15000);return}
   s=document.createElement('script');s.src='https://meet.jit.si/external_api.js';s.async=true;s.dataset.malJitsi='1';s.onload=resolve;s.onerror=function(){reject(new Error('Impossible de charger Jitsi.'))};document.head.appendChild(s);
  });
 }
 async function joinJitsi(state){
  if(!state||!callState||callState.id!==state.id||joiningCallId===state.id||jitsiApi)return;
  joiningCallId=state.id;
  try{
   await loadJitsi();
   if(!callState||callState.id!==state.id)return;
   var p=prof(state.caller?state.callee_id:state.caller_id)||{},name=(mine&&mine.prenom)||'Membre Malachite';
   overlay(state.mode==='video'?'Appel vidéo avec '+(p.prenom||'ton match'):'Appel audio avec '+(p.prenom||'ton match'),
    '<div class="mal-call-live"><span id="malCallStatus">Connexion sécurisée en cours…</span><div class="mal-call-controls"><button type="button" onclick="malToggleMic()" id="malMicBtn">🎙️ Micro activé</button><button type="button" onclick="malToggleCamera()" id="malCameraBtn">📷 Caméra</button><label class="mal-audio-route">🔊 Sortie audio <select id="malAudioOutput" onchange="malSetAudioOutput(this.value)"><option value="">Haut-parleur par défaut</option></select></label></div></div>',
    '<button class="hangup" onclick="malHangup()">Raccrocher</button>',true);
   var mount=document.getElementById('malJitsiMount');
   if(!mount)throw new Error('Interface de l’appel introuvable.');
   jitsiApi=new JitsiMeetExternalAPI('meet.jit.si',{
    roomName:state.room,parentNode:mount,width:'100%',height:'100%',userInfo:{displayName:name},
    configOverwrite:{prejoinPageEnabled:false,enableWelcomePage:false,startWithAudioMuted:false,startWithVideoMuted:state.mode==='audio',disableDeepLinking:true,p2p:{enabled:true}},
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
  if(updateServer&&s&&me&&s.status!=='ended'&&s.status!=='rejected'&&s.status!=='expired')await sb.from('call_sessions').update({status:'ended'}).eq('id',s.id);
  closeUI();callState=null;callBusy=false;if(sessionChannel){sb.removeChannel(sessionChannel);sessionChannel=null}
 }
 window.malHangup=function(){finishCall(true)};
 window.call=function(mode){return startCall(mode||'audio')};
 if(typeof call==='function')call=function(mode){return startCall(mode||'audio')};

 var oldMatch=window.matchBox;
 if(typeof oldMatch==='function')window.matchBox=function(){var h=oldMatch().replace('<button disabled>📹 Appels sécurisés indisponibles</button>','<button onclick="call(&quot;audio&quot;)">📞 Appel audio</button><button onclick="call(&quot;video&quot;)">🎥 Appel vidéo</button>');return h.replace('Appels sécurisés indisponibles','Appels audio et vidéo inclus dans Premium ; sinon Pass Appels à 1 USD / 7 jours.')};
 var oldThread=window.thread;
 if(typeof oldThread==='function')window.thread=function(){return oldThread().replace('Voir le profil ›</i></button>','Voir le profil ›</i></button><button class="mal-call-head" onclick="call(&quot;audio&quot;)" aria-label="Appel audio">📞</button><button class="mal-call-head" onclick="call(&quot;video&quot;)" aria-label="Appel vidéo">🎥</button>')};
 var oldSub=window.sub;
 if(typeof oldSub==='function')window.sub=function(){oldSub();startInbox()};
 window.startCallInbox=startInbox;

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
  var callsCard=premiumActive?'<div class="plan" style="border:2px solid var(--pink)"><h3>📞 Appels audio + vidéo</h3><p>Inclus dans ton Premium actif : aucun paiement supplémentaire pour les appels.</p></div>':'<div class="plan"><h3>📞 Pass Appels audio + vidéo <span>1 $ / 7 jours</span></h3><p>Appels audio et vidéo avec tes matchs pendant 7 jours après validation. Si tu passes à Premium, ce pass n’est plus nécessaire : les appels sont inclus.</p></div>';
  var callOption=premiumActive?'':'<option value="Appels">Pass Appels audio + vidéo — 1 USD / 7 jours</option>';
  var airtelNumber=NUM?'<div class="card"><b>Numéro Airtel Money destinataire</b><div style="font-size:20px;font-weight:800;letter-spacing:1px">'+esc(NUM)+'</div></div>':'<p class="note">Numéro Airtel Money non configuré.</p>';var orangeNumber=ORANGE?'<div class="card"><b>Numéro Orange Money destinataire</b><div style="font-size:20px;font-weight:800;letter-spacing:1px">'+esc(ORANGE)+'</div></div>':'<p class="note">Numéro Orange Money non configuré.</p>';
  return '<h2>⭐ Nos offres</h2><div class="list"><div class="plan"><h3>Gratuit <span>0 $</span></h3><p>Profil, découverte, likes, messages illimités dans les conversations existantes, jusqu’à 15 nouvelles conversations initiées par jour et 1 rendez-vous par semaine.</p></div><div class="plan" style="border:2px solid var(--pink)"><h3>👑 Premium <span>3 $ / 30 jours</span></h3><p>Tout le confort Premium pendant 30 jours : appels audio et vidéo inclus, nouvelles conversations sans quota, rendez-vous illimités et accès aux coordonnées de tes matchs sans payer le déblocage contact séparément. À l’expiration, les avantages Premium s’arrêtent automatiquement ; renouvelle pour les retrouver.</p></div>'+callsCard+'<div class="plan"><h3>🔥 Boost <span>0,50 $ / 24 h</span></h3><p>Ton profil passe en priorité en haut de Découvrir pendant 24 heures pour augmenter sa visibilité. Le Boost n’ajoute pas de fonctionnalités de messagerie ou d’appel.</p></div><div class="plan"><h3>Déblocage d’un contact <span>1 $ / personne</span></h3><p>Pour les membres gratuits : après un match réciproque, déverrouille les coordonnées d’un contact. Inclus sans frais supplémentaires avec Premium.</p></div></div><h2>💳 Payer et soumettre le code de transaction</h2><div class="box list"><p>1. Choisis l’offre et le moyen de paiement configuré. 2. Envoie exactement le montant affiché au numéro destinataire ci-dessous. 3. Copie la référence de transaction reçue d’Airtel Money. 4. Soumets cette référence. L’accès est activé seulement après vérification par l’administrateur, avec une réponse visée sous deux heures.</p>'+airtelNumber+orangeNumber+'<label>Offre<select id="of"><option value="Premium">Premium — 3 USD / 30 jours (appels inclus)</option>'+callOption+'<option value="Boost">Boost — 0,50 USD / 24 heures</option></select></label><label>Moyen de paiement<select id="malOperator"><option value="airtel">Airtel Money</option><option value="orange">Orange Money</option></select></label><label>Code de transaction<input id="cd" maxlength="100" autocomplete="off" placeholder="Référence exacte reçue après transfert"></label><p class="note">Ne communique jamais ton PIN ni ton code OTP. Choisis le réseau correspondant au transfert : la référence est vérifiée avec ce réseau.</p><button class="b1" id="malSubmitPayment" onclick="pay()">Soumettre le code de transaction</button><div class="note" id="pm" aria-live="polite"></div></div><section id="malPaymentHistory"><h3>Suivi de mes demandes</h3><p class="note">Chargement…</p></section>';
 };
 async function loadMyPayments(){
  var node=document.getElementById('malPaymentHistory');if(!node||!me)return;
  var r=await sb.from('paiements').select('id,offre,statut,created_at,reviewed_at,admin_reason').eq('user_id',me.id).order('created_at',{ascending:false}).limit(10);
  if(r.error){node.innerHTML='<p class="note">Impossible de charger le suivi : '+esc(r.error.message)+'</p>';return}
  node.innerHTML='<h3>Suivi de mes demandes</h3>'+(r.data&&r.data.length?'<div class="list">'+r.data.map(function(x){var label=x.statut==='valide'?'Demande vérifiée — accès activé':x.statut==='rejete'?'Demande refusée':'En cours de vérification';var detail=x.statut==='rejete'?'Motif : '+esc(x.admin_reason||'Aucun motif communiqué.'):x.statut==='attente'?'Notre équipe te répond au plus tard sous 2 heures.':'Ton avantage est maintenant actif.';detail+=' · '+(x.operateur==='orange'?'Orange Money':'Airtel Money');return '<div class="card"><b>Demande #'+x.id+' · '+esc(x.offre)+'</b><div>'+label+'</div><div class="note">'+detail+'</div><small>'+new Date(x.created_at).toLocaleString('fr-FR')+'</small></div>'}).join('')+'</div>':'<p class="note">Aucune demande de paiement pour le moment.</p>');
 }
 window.loadMyPayments=loadMyPayments;
 window.pay=async function(){
  var input=document.getElementById('cd'),offer=document.getElementById('of'),operator=document.getElementById('malOperator'),msgEl=document.getElementById('pm'),button=document.getElementById('malSubmitPayment');
  if(!me){if(msgEl)msgEl.textContent='Connecte-toi avant de soumettre un paiement.';return}
  var code=input?input.value.trim():'';if(code.length<4||code.length>100){if(msgEl)msgEl.textContent='Code invalide : saisis entre 4 et 100 caractères.';return}
  if(!offer||!['Premium','Appels','Boost'].includes(offer.value)){if(msgEl)msgEl.textContent='Choisis une offre valide.';return}
  if(button){button.disabled=true;button.textContent='Envoi en cours…'}
  if(msgEl)msgEl.textContent='Transmission sécurisée de ta demande…';
  try{
   if(offer.value==='Appels'){
    var premiumCheck=await sb.from('statuts').select('premium_until').eq('user_id',me.id).maybeSingle();
    if(premiumCheck.error)throw premiumCheck.error;
    if(premiumCheck.data&&premiumCheck.data.premium_until&&new Date(premiumCheck.data.premium_until).getTime()>Date.now())throw new Error('Les appels audio et vidéo sont déjà inclus dans ton abonnement Premium actif. Tu ne dois pas payer le pass à 1 $.');
   }
   var network=operator?operator.value:'airtel';
   var duplicate=await sb.from('paiements').select('id,offre,statut,user_id,operateur').eq('code',code).maybeSingle();
   if(duplicate.error)throw duplicate.error;
   if(duplicate.data){if(duplicate.data.user_id!==me.id)throw new Error('Cette référence de transaction a déjà été utilisée. Vérifie le nouveau code reçu de ton opérateur.');throw new Error('Cette référence a déjà été soumise (demande #'+duplicate.data.id+', statut : '+duplicate.data.statut+'). Consulte le suivi de tes demandes ; ne la soumets pas une deuxième fois.');}
   var payload={user_id:me.id,offre:offer.value,code:code,operateur:network,statut:'attente'};
   var r=await sb.from('paiements').insert(payload).select('id,offre,statut,created_at').single();
   if(r.error){if(r.error.code==='23505')throw new Error('Cette référence de transaction a déjà été utilisée. Vérifie que tu as saisi le nouveau code SMS du transfert.');throw r.error;}
   if(msgEl)msgEl.textContent='Demande #'+r.data.id+' soumise avec succès. Statut : en cours de vérification. Réponse au plus tard sous 2 heures.';
   if(input)input.value='';
   await loadMyPayments();
  }catch(e){console.error('Soumission paiement Malachite',e);if(msgEl)msgEl.textContent='Échec de la soumission : '+(e&&e.message?e.message:'erreur réseau')+'. Réessaie ; aucun paiement n’a été enregistré.'}
  finally{if(button){button.disabled=false;button.textContent='Soumettre le code de transaction'}}
 };
 var oldTrt=window.trt;
 window.trt=async function(id,ok){
  var reason=null;if(!ok){reason=prompt('Indique la raison précise du refus (obligatoire, 500 caractères maximum) :');if(reason===null)return;reason=reason.trim();if(!reason||reason.length>500){alert('La raison du refus est obligatoire.');return}}
  var r=await sb.rpc('traiter_paiement',{pid:id,accepter:ok,raison:reason});
  if(r.error){alert('Traitement impossible : '+r.error.message);return}
  alert(ok?'Paiement validé. L’avantage correspondant est activé.':'Paiement refusé. Le membre recevra le motif.');
  if(typeof loadAdm==='function')await loadAdm();
 };
 var adminPaymentChannel=null,userNotificationChannel=null,seenNotificationIds=Object.create(null);
 function showUserNotification(row){
  if(!row||!row.id||seenNotificationIds[row.id])return;
  seenNotificationIds[row.id]=true;
  notify(row.title||'Notification Malachite',row.body||'Tu as une nouvelle notification.','offres',String(row.id));
  if(me)sb.from('user_notifications').update({read_at:new Date().toISOString()}).eq('id',row.id).eq('user_id',me.id).is('read_at',null).then(function(){});
 }
 async function startUserNotifications(){
  if(!me)return;
  try{
   await sb.rpc('check_my_entitlement_expirations');
   var pending=await sb.from('user_notifications').select('id,title,body').eq('user_id',me.id).is('read_at',null).order('created_at',{ascending:false}).limit(8);
   if(!pending.error)(pending.data||[]).reverse().forEach(showUserNotification);
  }catch(e){console.warn('Notifications Malachite',e)}
  if(!userNotificationChannel){
   userNotificationChannel=sb.channel('mal-user-notifications-'+me.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'user_notifications',filter:'user_id=eq.'+me.id},function(ev){showUserNotification(ev&&ev.new)}).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')userNotificationChannel=null});
  }
 }
 function startPaymentRealtime(){
  if(!me)return;
  if(me.email==='famousnadroj@gmail.com'&&!adminPaymentChannel){
   adminPaymentChannel=sb.channel('mal-admin-payment-inbox').on('postgres_changes',{event:'INSERT',schema:'public',table:'paiements'},function(ev){
    var row=ev&&ev.new;if(!row)return;
    notify('💳 Nouvelle demande de paiement',row.offre+' · Code : '+row.code,'adm');
    if(tab==='adm'&&typeof loadAdm==='function')loadAdm();
   }).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')adminPaymentChannel=null});
  }
 }
 var originalSub=window.sub;
 if(typeof originalSub==='function')window.sub=function(){originalSub();startInbox();startPaymentRealtime();startUserNotifications()};
 var originalGo=window.go;
 if(typeof originalGo==='function')window.go=function(t){originalGo(t);if(t==='offres')setTimeout(loadMyPayments,0)};

 var style=document.createElement('style');style.textContent='.mal-call-head{border:0!important;border-radius:50%!important;width:38px;height:38px;padding:0!important;background:#fce9f0!important;color:#9b315e!important;font-size:18px!important;flex:none}.mal-call-overlay{position:fixed;inset:0;z-index:100000;background:#0c1218e8;display:flex;align-items:center;justify-content:center;padding:12px}.mal-call-card{width:min(100%,720px);background:#fff;border-radius:20px;overflow:hidden;color:#25313a}.mal-call-card header{display:flex;justify-content:space-between;padding:14px 16px;background:#075e54;color:#fff}.mal-call-body{text-align:center;padding:12px}.mal-call-live{font-size:13px;font-weight:700}.mal-call-controls{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;padding:8px}.mal-call-controls button{border:0;border-radius:999px;padding:10px 14px;background:#edf3f4;color:#203338;font-weight:700}.mal-call-controls small{display:block;width:100%;font-weight:400;color:#667}.mal-audio-route{display:flex;align-items:center;gap:6px;font-size:12px;color:#344;max-width:100%}.mal-audio-route select{max-width:150px;border:1px solid #d4e0e2;border-radius:10px;padding:8px;background:#fff;color:#203338}.mal-call-actions{display:flex;justify-content:center;gap:10px;padding:12px}.mal-call-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:700}.mal-call-actions .accept{background:#087e55;color:white}.mal-call-actions .reject,.mal-call-actions .hangup{background:#c62828;color:white}#malJitsiMount{width:100%;height:min(68vh,620px);min-height:340px;background:#101820}@media(max-width:520px){.mal-call-overlay{padding:0}.mal-call-card{width:100%;height:100%;border-radius:0;display:flex;flex-direction:column}.mal-call-body{padding:10px 8px}.mal-call-live{flex:none}#malJitsiMount{flex:1;height:auto;min-height:0}.mal-call-actions{flex:none}}';document.head.appendChild(style);
 sb.auth.onAuthStateChange(function(event,session){
  var next=session&&session.user?session.user:null;
  if(callInboxUserId&&(!next||next.id!==callInboxUserId))stopCallInbox();
  if(!next&&callState)finishCall(true);
  if(next&&callInboxUserId!==next.id)startInbox();
 });
 window.addEventListener('online',function(){if(me)startInbox()});
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&me)startInbox()});
})();
