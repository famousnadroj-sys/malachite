
/* Malachite: paid real-time audio/video calls and faster private profile photo loading. */
(function(){
 'use strict';
 var photoCache=Object.create(null),callInbox=null,sessionChannel=null,callState=null,incoming=null,jitsiApi=null,callBusy=false;
 if(typeof PRIX==='object')PRIX.Appels='1 $ / 30 jours';

 async function resolveProfilePhotosFast(p){
  if(!p)return p;
  var photos=(p.photos||[]).filter(Boolean),items=photos.map(function(raw){
   var s=String(raw),bucket=s.indexOf('/storage/v1/object/public/photos/')>=0?'photos':'profile-photos';
   var path=storagePath(bucket,raw),key=bucket+'|'+path;return {bucket:bucket,path:path,key:key};
  });
  var byBucket=Object.create(null);items.forEach(function(x){if(!byBucket[x.bucket])byBucket[x.bucket]=[];byBucket[x.bucket].push(x)});
  var resolved=Object.create(null),now=Date.now();
  await Promise.all(Object.keys(byBucket).map(async function(bucket){
   var missing=byBucket[bucket].filter(function(x){var v=photoCache[x.key];if(v&&v.exp>now+30000){resolved[x.key]=v.url;return false}return true});
   if(!missing.length)return;
   var paths=Array.from(new Set(missing.map(function(x){return x.path})));
   try{var r=await sb.storage.from(bucket).createSignedUrls(paths,3600);if(r.error)throw r.error;
    (r.data||[]).forEach(function(v,i){var path=v.path||paths[i],url=v.signedUrl||'';if(url){var key=bucket+'|'+path;resolved[key]=url;photoCache[key]={url:url,exp:now+3500000}}});
   }catch(e){console.warn('Photos profil: signature groupée impossible',e)}
  }));
  p.photoUrls=items.map(function(x){return resolved[x.key]||''}).filter(Boolean);
  return p;
 }
 window.resolveProfilePhotos=resolveProfilePhotosFast;
 if(typeof resolveProfilePhotos==='function')resolveProfilePhotos=resolveProfilePhotosFast;

 function overlay(title,body,actions,mount){
  var old=document.getElementById('malCallOverlay');if(old)old.remove();
  var html='<div id="malCallOverlay" class="mal-call-overlay"><section class="mal-call-card"><header><b>'+esc(title)+'</b><button onclick="malCloseCallUI()" aria-label="Fermer" style="background:transparent;border:0;color:white;font-size:22px">×</button></header><div class="mal-call-body">'+body+'</div>'+(mount?'<div id="malJitsiMount"></div>':'')+(actions?'<div class="mal-call-actions">'+actions+'</div>':'')+'</section></div>';
  document.body.insertAdjacentHTML('beforeend',html);
 }
 function closeUI(){if(jitsiApi){try{jitsiApi.dispose()}catch(e){}jitsiApi=null}var el=document.getElementById('malCallOverlay');if(el)el.remove()}
 window.malCloseCallUI=closeUI;
 function startInbox(){
  if(!me||callInbox)return;var uid=me.id;
  callInbox=sb.channel('malachite-call-inbox-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'call_sessions',filter:'callee_id=eq.'+uid},function(ev){
   var row=ev&&ev.new;if(!row||row.status!=='pending'||new Date(row.expires_at)<=new Date()||incoming||callBusy)return;
   incoming=row;var p=prof(row.caller_id)||{},name=p.prenom||'Un membre';
   try{beep();navigator.vibrate&&navigator.vibrate([250,120,250])}catch(e){}
   overlay(row.mode==='video'?'Appel vidéo entrant':'Appel audio entrant','<div style="font-size:48px">📲</div><h2>'+esc(name)+'</h2><p>Souhaites-tu accepter cet appel ?</p>','<button class="reject" onclick="malRejectCall()">Refuser</button><button class="accept" onclick="malAcceptCall()">Accepter</button>',false);
  }).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')callInbox=null});
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
  var since=new Date(Date.now()-7*86400000).toISOString();
  var r=await sb.from('paiements').select('id').eq('user_id',me.id).eq('offre','Appels').eq('statut','valide').gte('created_at',since).limit(1);
  if(r.error)throw r.error;return !!(r.data&&r.data.length);
 }
 function subscribeReady(ch){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(!done){done=true;reject(new Error('Le service temps réel ne répond pas.'))}},12000);ch.subscribe(function(status,error){if(done)return;if(status==='SUBSCRIBED'){done=true;clearTimeout(t);resolve()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){done=true;clearTimeout(t);reject(error||new Error('Connexion Realtime impossible'))}})})}
 async function startCall(mode){
  if(!me||!open){alert('Ouvre une conversation.');return}
  if(mode!=='audio'&&mode!=='video')mode='audio';
  if(!mutual){alert('Les appels sont réservés aux matchs réciproques.');return}
  if(callBusy||callState){alert('Un appel est déjà en cours.');return}
  callBusy=true;
  try{
   if(!(await hasPass())){alert('Le Pass Appels coûte 1 USD pour 30 jours. Soumets la référence dans Offres ; activation après vérification du paiement.');go('offres');return}
   var target=open,id=crypto.randomUUID(),room='Malachite-'+id.replace(/-/g,'');
   var ch=sb.channel('malachite-call-session-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'call_sessions',filter:'id=eq.'+id},function(ev){
    var row=ev&&ev.new;if(!row||!callState||callState.id!==id)return;callState.status=row.status;
    if(row.status==='accepted'&&callState.caller&&!jitsiApi)joinJitsi(callState);
    else if(row.status==='rejected'){alert('L’autre membre a refusé l’appel.');finishCall(false)}
    else if(row.status==='ended'||row.status==='expired'){if(jitsiApi)finishCall(false);else{closeUI();callState=null;alert(row.status==='expired'?'Pas de réponse.':'Appel terminé.')}}
   });
   await subscribeReady(ch);sessionChannel=ch;
   var ins=await sb.from('call_sessions').insert({id:id,caller_id:me.id,callee_id:target,room:room,mode:mode,status:'pending',expires_at:new Date(Date.now()+90000).toISOString()});
   if(ins.error)throw ins.error;
   callState={id:id,caller:true,caller_id:me.id,callee_id:target,mode:mode,room:room,status:'pending'};
   overlay(mode==='video'?'Appel vidéo en cours':'Appel audio en cours','<p>Appel envoyé à '+esc((prof(target)||{}).prenom||'ton match')+'. En attente de réponse…</p>','<button class="hangup" onclick="malHangup()">Annuler l’appel</button>',false);
   callState.timeout=setTimeout(async function(){if(callState&&callState.id===id&&callState.status==='pending'){await sb.from('call_sessions').update({status:'expired'}).eq('id',id);finishCall(false);alert('Aucune réponse. Réessaie plus tard.')}},90000);
  }catch(e){console.error('Appel Malachite',e);alert('Appel impossible : '+(e.message||'erreur inconnue'));if(sessionChannel){sb.removeChannel(sessionChannel);sessionChannel=null}callState=null}
  finally{callBusy=false}
 }
 async function loadJitsi(){
  if(window.JitsiMeetExternalAPI)return;
  await new Promise(function(resolve,reject){var s=document.querySelector('script[data-mal-jitsi]');if(s){s.addEventListener('load',resolve,{once:true});s.addEventListener('error',function(){reject(new Error('Jitsi ne se charge pas.'))},{once:true});setTimeout(function(){window.JitsiMeetExternalAPI?resolve():reject(new Error('Délai Jitsi dépassé.'))},15000);return}
   s=document.createElement('script');s.src='https://meet.jit.si/external_api.js';s.async=true;s.dataset.malJitsi='1';s.onload=resolve;s.onerror=function(){reject(new Error('Impossible de charger Jitsi.'))};document.head.appendChild(s);
  });
 }
 async function joinJitsi(state){
  if(!state||!callState||callState.id!==state.id)return;
  try{await loadJitsi();var p=prof(state.caller?state.callee_id:state.caller_id)||{},name=(mine&&mine.prenom)||me.email||'Membre Malachite';
   overlay(state.mode==='video'?'Appel vidéo avec '+(p.prenom||'ton match'):'Appel audio avec '+(p.prenom||'ton match'),'<p>Connexion à Jitsi…</p>','<button class="hangup" onclick="malHangup()">Raccrocher</button>',true);
   jitsiApi=new JitsiMeetExternalAPI('meet.jit.si',{roomName:state.room,parentNode:document.getElementById('malJitsiMount'),width:'100%',height:'100%',userInfo:{displayName:name},configOverwrite:{prejoinPageEnabled:false,startWithAudioMuted:false,startWithVideoMuted:state.mode==='audio',disableDeepLinking:true,p2p:{enabled:true}},interfaceConfigOverwrite:{TOOLBAR_BUTTONS:['microphone','camera','hangup','chat','tileview','fullscreen']}});
   jitsiApi.addListener('readyToClose',function(){finishCall(true)});jitsiApi.addListener('videoConferenceLeft',function(){finishCall(true)});
  }catch(e){alert('Connexion Jitsi impossible : '+e.message+'. Le service public peut demander au créateur de salle de se connecter.');await finishCall(true)}
 }
 async function finishCall(updateServer){
  var s=callState;if(s&&s.timeout)clearTimeout(s.timeout);
  if(jitsiApi){var api=jitsiApi;jitsiApi=null;try{api.dispose()}catch(e){}}
  if(updateServer&&s&&me&&s.status!=='ended'&&s.status!=='rejected'&&s.status!=='expired')await sb.from('call_sessions').update({status:'ended'}).eq('id',s.id);
  closeUI();callState=null;callBusy=false;if(sessionChannel){sb.removeChannel(sessionChannel);sessionChannel=null}
 }
 window.malHangup=function(){finishCall(true)};
 window.call=function(mode){return startCall(mode||'audio')};
 if(typeof call==='function')call=function(mode){return startCall(mode||'audio')};

 var oldMatch=window.matchBox;
 if(typeof oldMatch==='function')window.matchBox=function(){var h=oldMatch().replace('<button disabled>📹 Appels sécurisés indisponibles</button>','<button onclick="call(&quot;audio&quot;)">📞 Appel audio</button><button onclick="call(&quot;video&quot;)">🎥 Appel vidéo</button>');return h.replace('Appels sécurisés indisponibles','Appels audio et vidéo disponibles avec le Pass Appels (1 USD / 30 jours).')};
 var oldThread=window.thread;
 if(typeof oldThread==='function')window.thread=function(){return oldThread().replace('Voir le profil ›</i></button>','Voir le profil ›</i></button><button class="mal-call-head" onclick="call(&quot;audio&quot;)" aria-label="Appel audio">📞</button><button class="mal-call-head" onclick="call(&quot;video&quot;)" aria-label="Appel vidéo">🎥</button>')};
 var oldSub=window.sub;
 if(typeof oldSub==='function')window.sub=function(){oldSub();startInbox()};
 window.startCallInbox=startInbox;

 window.offres=function(){return '<h2>⭐ Nos offres</h2><div class="list"><div class="plan"><h3>Gratuit <span>0 $</span></h3><p>Profil, découverte, likes et conversations.</p></div><div class="plan"><h3>Premium <span>3 $ / mois</span></h3><p>Accès Premium pendant 30 jours après validation. À l’échéance, le statut Premium expire automatiquement et peut être renouvelé.</p></div><div class="plan" style="border:2px solid var(--pink)"><h3>Pass Appels audio + vidéo <span>1 $ / semaine</span></h3><p>Appels audio et vidéo avec tes matchs pendant 7 jours après validation du paiement.</p></div><div class="plan"><h3>Boost 24 h <span>0,50 $</span></h3><p>Visibilité prioritaire pendant 24 heures après validation.</p></div><div class="plan"><h3>Déblocage d’un contact <span>1 $ / personne</span></h3><p>Après un match réciproque, demande un contact depuis la conversation. Ce paiement est vérifié avant activation.</p></div></div><h2>💳 Soumettre un paiement</h2><div class="box list"><label>Offre<select id="of"><option value="Premium">Premium — 3 USD / 30 jours</option><option value="Appels">Pass Appels audio + vidéo — 1 USD / 7 jours</option><option value="Boost">Boost — 0,50 USD / 24 heures</option></select></label><label>Moyen de paiement<select id="malOperator"><option value="airtel">Airtel Money</option><option value="orange">Orange Money</option></select></label><label>Code de transaction<input id="cd" maxlength="100" autocomplete="off" placeholder="Saisis le code de transaction reçu"></label><p class="note">Après soumission, ta demande passe en cours de vérification. Notre équipe répond au plus tard sous 2 heures. N’envoie jamais ton PIN ni ton code OTP.</p><button class="b1" id="malSubmitPayment" onclick="pay()">Soumettre le code de transaction</button><div class="note" id="pm" aria-live="polite"></div></div><section id="malPaymentHistory"><h3>Suivi de mes demandes</h3><p class="note">Chargement…</p></section>'};
 async function loadMyPayments(){
  var node=document.getElementById('malPaymentHistory');if(!node||!me)return;
  var r=await sb.from('paiements').select('id,offre,statut,created_at,reviewed_at,admin_reason').eq('user_id',me.id).order('created_at',{ascending:false}).limit(10);
  if(r.error){node.innerHTML='<p class="note">Impossible de charger le suivi : '+esc(r.error.message)+'</p>';return}
  node.innerHTML='<h3>Suivi de mes demandes</h3>'+(r.data&&r.data.length?'<div class="list">'+r.data.map(function(x){var label=x.statut==='valide'?'Demande vérifiée — accès activé':x.statut==='rejete'?'Demande refusée':'En cours de vérification';var detail=x.statut==='rejete'?'Motif : '+esc(x.admin_reason||'Aucun motif communiqué.'):x.statut==='attente'?'Notre équipe te répond au plus tard sous 2 heures.':'Ton avantage est maintenant actif.';return '<div class="card"><b>Demande #'+x.id+' · '+esc(x.offre)+'</b><div>'+label+'</div><div class="note">'+detail+'</div><small>'+new Date(x.created_at).toLocaleString('fr-FR')+'</small></div>'}).join('')+'</div>':'<p class="note">Aucune demande de paiement pour le moment.</p>');
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
   var payload={user_id:me.id,offre:offer.value,code:code,operateur:operator?operator.value:'airtel',statut:'attente'};
   var r=await sb.from('paiements').insert(payload).select('id,offre,statut,created_at').single();
   if(r.error)throw r.error;
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
 var adminPaymentChannel=null,userPaymentChannel=null;
 function startPaymentRealtime(){
  if(!me)return;
  if(me.email==='famousnadroj@gmail.com'&&!adminPaymentChannel){
   adminPaymentChannel=sb.channel('mal-admin-payment-inbox').on('postgres_changes',{event:'INSERT',schema:'public',table:'paiements'},function(ev){
    var row=ev&&ev.new;if(!row)return;
    notify('💳 Nouvelle demande de paiement',row.offre+' · Code : '+row.code,'adm');
    if(tab==='adm'&&typeof loadAdm==='function')loadAdm();
   }).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')adminPaymentChannel=null});
  }
  if(!userPaymentChannel){
   userPaymentChannel=sb.channel('mal-user-payment-status-'+me.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'paiements',filter:'user_id=eq.'+me.id},function(ev){
    var row=ev&&ev.new;if(!row)return;
    var message=row.statut==='valide'?'Paiement vérifié : '+row.offre+' est activé.':row.statut==='rejete'?'Paiement refusé : '+(row.admin_reason||'Consulte le suivi de tes demandes.'):'Paiement en cours de vérification.';
    notify('Mise à jour de paiement',message,'offres');
    if(tab==='offres')loadMyPayments();
   }).subscribe(function(status){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')userPaymentChannel=null});
  }
 }
 var originalSub=window.sub;
 if(typeof originalSub==='function')window.sub=function(){originalSub();startInbox();startPaymentRealtime()};
 var originalGo=window.go;
 if(typeof originalGo==='function')window.go=function(t){originalGo(t);if(t==='offres')setTimeout(loadMyPayments,0);if(t==='adm'&&me&&me.email==='nadroj.famous@gmail.com'&&typeof loadAdm==='function')loadAdm()};

 var style=document.createElement('style');style.textContent='.mal-call-head{border:0!important;border-radius:50%!important;width:38px;height:38px;padding:0!important;background:#fce9f0!important;color:#9b315e!important;font-size:18px!important;flex:none}.mal-call-overlay{position:fixed;inset:0;z-index:100000;background:#0c1218e8;display:flex;align-items:center;justify-content:center;padding:12px}.mal-call-card{width:min(100%,620px);background:#fff;border-radius:20px;overflow:hidden;color:#25313a}.mal-call-card header{display:flex;justify-content:space-between;padding:14px 16px;background:#075e54;color:#fff}.mal-call-body{text-align:center;padding:18px}.mal-call-actions{display:flex;justify-content:center;gap:10px;padding:14px}.mal-call-actions button{border:0;border-radius:12px;padding:12px 18px;font-weight:700}.mal-call-actions .accept{background:#087e55;color:white}.mal-call-actions .reject,.mal-call-actions .hangup{background:#c62828;color:white}#malJitsiMount{width:100%;height:min(76vh,650px);min-height:360px}@media(max-width:520px){.mal-call-overlay{padding:0}.mal-call-card{width:100%;height:100%;border-radius:0}#malJitsiMount{height:calc(100dvh - 60px);min-height:300px}}';document.head.appendChild(style);
})();
