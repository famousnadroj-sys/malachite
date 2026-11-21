
var sb=supabase.createClient('https://tscsmemsvgacqioncash.supabase.co','sb_publishable_XDpqSzsPNeVduv6aGyjuoA_suakeFN0',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}});
var malReferralId=(function(){try{var v=new URLSearchParams(window.location.search).get('ref')||'';return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null}catch(e){return null}})(),malReferralPreviewStarted=false;
var malStartupPending=true,malStartupMessage='',malAvatarTouched=false,malAvatar3dDraft=null,profilesLoadedAt=0,me=null,mine=null,profileDraft={},signupDraft={},signupStep=1,pendingSignupAvatar=null,pendingSignupPhoto=null,pendingSignupPreview='',pendingSignupEmail='',loginPrefillEmail='',phUrls=[],loadSeq=0,loadedUid=null,profileEditing=false,pendingProfileFile=null,pendingProfilePreview='',profileSaving=false,privLoadFailed=false,admSuspensions=[],ADM='famousnadroj@gmail.com',av2=null,mutual=false,ct=null,lastSig='',rdvFor=null,fresh=false,adm=[],admPage=0,admTotal=0,admSearch='',admPaymentStatus='attente',admPaymentPeriod='today',sigs=[],referralRows=[],blocked=[],blockedProfiles=[],matchNoticeChecked={},blockedCurrent=false,blockedCheckedFor=null,NUM='',ORANGE='',rdvs=[],pos='',priv={},profs=[],st={},tab='home',open=null,msgs=[],convs=[],chatCursor=null,chatCursorId=0,chatCursorFor=null,chatLoadBusy=false,chatLoadQueued=false,chatSending=false,chatBeforeId=0,chatHasOlder=false,chatOlderBusy=false,chatInitialLoading=false,chatLoadBusyKeys=Object.create(null),chatLoadQueuedKeys=Object.create(null),msgRealtimeReady=false,chatMediaUrlCache=Object.create(null),receiptByMessage=Object.create(null),msgChannel=null,subUserId=null,backgroundTimersStarted=false,presenceChannel=null,presenceUserId=null,presenceReady=false,onlineIds=Object.create(null),typingChannel=null,typingTarget=null,typingStopTimer=null,typingHideTimer=null,typingActive=false,ph=[],msg='',F={g:'',c:'',a:18,b:99},timer,mode='in';
var $=function(i){return document.getElementById(i)};
if(malReferralId){mode='up';signupStep=1;}
function malTogglePassword(button){var input=button&&button.previousElementSibling;if(!input)return;var show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Masquer':'Afficher';button.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe')}
async function malLoadReferralPreview(){if(!malReferralId||malReferralPreviewStarted)return;malReferralPreviewStarted=true;try{var result=await sb.rpc('get_malachite_referrer_preview',{p_referrer_id:malReferralId});var el=$('malReferrerWelcome');if(el&&result.data){var p=Array.isArray(result.data)?result.data[0]:result.data;if(p)el.textContent='Tu as été invité par '+(p.prenom||'un membre de MALACHITE')+(p.username?' · @'+p.username:'')}}catch(e){console.warn('Aperçu du parrain indisponible',e)}}
var malDeferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',function(event){event.preventDefault();malDeferredInstallPrompt=event;});
window.addEventListener('appinstalled',function(){var el=$('malInstallBanner');if(el)el.remove();malDeferredInstallPrompt=null;});
function malDismissInstall(){var el=$('malInstallBanner');if(el)el.remove();try{sessionStorage.setItem('malInstallDismissed','1')}catch(e){}}
async function malInstallSite(){
 if(malDeferredInstallPrompt){
  try{await malDeferredInstallPrompt.prompt();var choice=await malDeferredInstallPrompt.userChoice;if(choice&&choice.outcome==='accepted'){var el=$('malInstallBanner');if(el)el.remove()}malDeferredInstallPrompt=null;return}catch(e){}
 }
 var ua=navigator.userAgent||'';
 if(/iPhone|iPad|iPod/i.test(ua)){
  alert('Pour ajouter Malachite sur ton écran d’accueil : ouvre ce site dans Safari, touche le bouton Partager, puis « Sur l’écran d’accueil » et confirme.');
 }else{
  alert('Pour ajouter Malachite sur ton écran d’accueil : dans Chrome, touche le menu ⋮ en haut à droite, puis « Installer l’application » ou « Ajouter à l’écran d’accueil », et confirme. Aucun paiement ni téléchargement depuis un magasin n’est nécessaire.');
 }
}
try{if(sessionStorage.getItem('malInstallDismissed')==='1'){var installBanner=$('malInstallBanner');if(installBanner)installBanner.remove()}}catch(e){}

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function on(t){return t&&new Date(t)>new Date()}
function av(p){var u=p&&p.photoUrls&&p.photoUrls[0],a=p&&p.avatar;if(a&&a.type==='humanforge-3d'&&a.imageUrl)return '<div class="av mal-human-avatar"><img src="'+esc(a.imageUrl)+'" alt="Avatar 3D de '+esc(p.prenom||'membre')+'" onerror="malRefreshAvatar(this,\''+esc(p.id)+'\')"></div>';if(u)return '<div class="av" style="background-image:url('+esc(u)+');background-size:cover;background-position:center"></div>';if(a&&a.emoji)return '<div class="av" style="background:'+esc(a.color||'#F7B7D0')+';display:grid;place-items:center;font-size:30px">'+esc(a.emoji)+'</div>';return '<div class="av">'+esc(p&&p.prenom?p.prenom[0]:'?')+'</div>'}function card(p){
 var s=st[p.id]||{},photos=(p.photoUrls||[]).filter(Boolean),first=photos[0],isOnline=online(p),locked=!!p.profile_private;
 var cover=p.avatar&&p.avatar.type==='humanforge-3d'&&p.avatar.imageUrl?'<img src="'+esc(p.avatar.imageUrl)+'" alt="Avatar 3D de '+esc(p.prenom||'membre')+'" loading="lazy">':first?'<img src="'+esc(first)+'" alt="Photo de profil de '+esc(p.prenom||'membre')+'" loading="lazy">':'<div class="mal-card-placeholder">'+esc((p.prenom||'?').slice(0,1))+'</div>'
 var title=esc(p.prenom||'Membre')+(locked?'':(p.age?', '+esc(p.age):''))+(locked?'':(on(s.verified_until)?'<span class="tag">✔ Vérifié</span>':'')+(on(s.premium_until)?'<span class="tag vip">👑 Premium</span>':'')+(on(s.boost_until)?'<span class="tag">🔥</span>':''));
 var details=locked?'<div class="sub">Profil privé</div>':'<div class="sub">'+[p.commune,p.quartier,p.profession].filter(Boolean).map(esc).join(' · ')+'</div>';
 var more=locked?'<div class="mal-profile-private-note">🔒 Ce membre garde les détails de son profil privés.</div>':'<p class="mal-card-bio">'+(p.bio?esc(p.bio):'Ce membre n’a pas encore ajouté de biographie.')+'</p>'+qaHtml(p)+'<div class="mal-card-interests">'+(p.interets||[]).map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join('')+'</div>';
 return '<article class="card mal-profile-card" data-mal-profile="'+esc(p.id)+'"><div class="mal-card-cover" onclick="viewProf(\''+p.id+'\')">'+cover+(!locked&&isOnline?'<span class="mal-card-online">● En ligne</span>':'')+'</div><div class="mal-card-heading" onclick="viewProf(\''+p.id+'\')">'+av(p)+'<div><div class="nm">'+title+'</div>'+details+'</div></div>'+(!locked&&photos.length>1?'<div class="ph">'+photos.slice(1).map(function(u){return '<img alt="Autre photo de '+esc(p.prenom||'membre')+'" loading="lazy" src="'+esc(u)+'" onclick="viewProf(\''+p.id+'\')">'}).join('')+'</div>':'')+more+'<div class="acts"><button class="b1" onclick="talk(\''+p.id+'\')">💬 Écrire</button><button onclick="rep(\''+p.id+'\')">Signaler</button><button onclick="toggleBlock(\''+p.id+'\')">Bloquer</button></div></article>';
}
async function rep(id){var motif=prompt('Pourquoi souhaites-tu signaler ce profil ?\n\nMotifs possibles : faux profil, harcèlement, contenu inapproprié, spam ou autre. Décris brièvement le problème :');if(motif===null)return;motif=motif.trim();if(!motif){alert('Le motif est obligatoire.');return}if(motif.length>300){alert('300 caractères maximum.');return}var r=await sb.from('signalements').insert({de:me.id,profil:id,motif:motif});if(r.error){alert('Le signalement n’a pas été enregistré : '+r.error.message);return}alert('Merci. Ton signalement a bien été transmis à la modération.')}
function others(){return profs.filter(function(p){return p.id!=me.id&&blocked.indexOf(p.id)<0}).sort(function(a,b){return (on((st[b.id]||{}).boost_until)?1:0)-(on((st[a.id]||{}).boost_until)?1:0)})}
function storagePath(bucket,value){if(!value)return '';var marker='/storage/v1/object/public/'+bucket+'/';var i=String(value).indexOf(marker);if(i>=0)return decodeURIComponent(String(value).slice(i+marker.length).split('?')[0]);return String(value)}
async function signedUrl(bucket,path,download){if(!path)return '';var r=download?await sb.storage.from(bucket).createSignedUrl(path,3600,{download:true}):await sb.storage.from(bucket).createSignedUrl(path,3600);return r.error?'':r.data.signedUrl}
async function malRefreshAvatar(img,userId){if(!img||img.dataset.refreshing==='1')return;img.dataset.refreshing='1';try{var p=mine&&mine.id===userId?mine:profs.find(function(x){return x.id===userId});var path=p&&p.avatar&&p.avatar.imagePath;if(!path)return;var url=await signedUrl('profile-photos',path);if(url){p.avatar.imageUrl=url;img.src=url}}catch(e){console.warn('Renouvellement du lien avatar différé.',e)}finally{img.dataset.refreshing='0'}}
var profilePhotoSignedCache=Object.create(null);
async function resolveProfilePhotos(p){
 if(!p)return;
 var now=Date.now(),photos=Array.isArray(p.photos)?p.photos:[],resolved=new Array(photos.length),groups=Object.create(null),avatarPath=p.avatar&&p.avatar.type==='humanforge-3d'&&p.avatar.imagePath?String(p.avatar.imagePath):'';
 function add(bucket,path,index){
  var key=bucket+'|'+path,cached=profilePhotoSignedCache[key];
  if(cached&&cached.expiresAt>now+30000){if(index==='avatar')p.avatar.imageUrl=cached.url;else resolved[index]=cached.url;return}
  if(!groups[bucket])groups[bucket]=Object.create(null);
  if(!groups[bucket][path])groups[bucket][path]=[];
  groups[bucket][path].push(index);
 }
 photos.forEach(function(raw,index){
  if(!raw)return;
  var str=String(raw),bucket=str.indexOf('/storage/v1/object/public/photos/')>=0?'photos':'profile-photos';
  if(str.indexOf('/storage/v1/object/public/profile-photos/')>=0)bucket='profile-photos';
  var path=storagePath(bucket,raw);
  if(/^https?:\/\//i.test(str)&&str.indexOf('/storage/v1/object/')<0){resolved[index]=str;return}
  add(bucket,path,index);
 });
 if(avatarPath)add('profile-photos',avatarPath,'avatar');
 await Promise.all(Object.keys(groups).map(async function(bucket){
  var paths=Object.keys(groups[bucket]);if(!paths.length)return;
  try{
   var result=await sb.storage.from(bucket).createSignedUrls(paths,3600);
   if(result.error)throw result.error;
   (result.data||[]).forEach(function(item,index){
    var path=item.path||paths[index],url=item.signedUrl||'';
    if(!url)return;
    profilePhotoSignedCache[bucket+'|'+path]={url:url,expiresAt:now+3500000};
    (groups[bucket][path]||[]).forEach(function(slot){
     if(slot==='avatar')p.avatar.imageUrl=url;else resolved[slot]=url;
    });
   });
  }catch(error){console.warn('Chargement groupé des photos de profil ('+bucket+')',error)}
 }));
 p.photoUrls=resolved.filter(Boolean);
 if(avatarPath&&!p.avatar.imageUrl){
  var cachedAvatar=profilePhotoSignedCache['profile-photos|'+avatarPath];
  if(cachedAvatar&&cachedAvatar.expiresAt>now+30000)p.avatar.imageUrl=cachedAvatar.url;
 }
}
async function resolveProfilePhotosBatch(profiles){
 var now=Date.now(),groups=Object.create(null),jobs=[];
 (profiles||[]).forEach(function(p){
  if(!p)return;
  var photos=Array.isArray(p.photos)?p.photos:[],resolved=new Array(photos.length),avatarPath=p.avatar&&p.avatar.type==='humanforge-3d'&&p.avatar.imagePath?String(p.avatar.imagePath):'';
  function add(bucket,path,slot){
   if(!path)return;
   var key=bucket+'|'+path,cached=profilePhotoSignedCache[key];
   if(cached&&cached.expiresAt>now+30000){if(slot==='avatar')p.avatar.imageUrl=cached.url;else resolved[slot]=cached.url;return}
   if(!groups[bucket])groups[bucket]=Object.create(null);
   if(!groups[bucket][path])groups[bucket][path]=[];
   groups[bucket][path].push({profile:p,slot:slot,resolved:resolved});
  }
  photos.forEach(function(raw,index){
   if(!raw)return;
   var str=String(raw),bucket=str.indexOf('/storage/v1/object/public/photos/')>=0?'photos':'profile-photos';
   if(str.indexOf('/storage/v1/object/public/profile-photos/')>=0)bucket='profile-photos';
   var path=storagePath(bucket,raw);
   if((str.indexOf('https://')===0||str.indexOf('http://')===0)&&str.indexOf('/storage/v1/object/')<0){resolved[index]=str;return}
   add(bucket,path,index);
  });
  if(avatarPath)add('profile-photos',avatarPath,'avatar');
  jobs.push({profile:p,resolved:resolved,avatarPath:avatarPath});
 });
 await Promise.all(Object.keys(groups).map(async function(bucket){
  var paths=Object.keys(groups[bucket]);if(!paths.length)return;
  try{
   var result=await sb.storage.from(bucket).createSignedUrls(paths,3600);
   if(result.error)throw result.error;
   (result.data||[]).forEach(function(item,index){
    var path=item.path||paths[index],url=item.signedUrl||'';
    if(!url)return;
    profilePhotoSignedCache[bucket+'|'+path]={url:url,expiresAt:now+3500000};
    (groups[bucket][path]||[]).forEach(function(job){
     if(job.slot==='avatar')job.profile.avatar.imageUrl=url;else job.resolved[job.slot]=url;
    });
   });
  }catch(error){console.warn('Signature groupée des photos de profil ('+bucket+')',error)}
 }));
 jobs.forEach(function(job){
  job.profile.photoUrls=job.resolved.filter(Boolean);
  if(job.avatarPath&&!job.profile.avatar.imageUrl){
   var cached=profilePhotoSignedCache['profile-photos|'+job.avatarPath];
   if(cached&&cached.expiresAt>now+30000)job.profile.avatar.imageUrl=cached.url;
  }
 });
}
function messageMediaLocation(m){
 var raw=String(m.media_url||''),bucket='chat-media',path=raw;
 if(raw.indexOf('/storage/v1/object/public/photos/')>=0){bucket='photos';path=storagePath(bucket,raw)}
 else if(raw.indexOf('/storage/v1/object/public/chat-media/')>=0){bucket='chat-media';path=storagePath(bucket,raw)}
 return {bucket:bucket,path:path};
}
function readChatMediaCache(key,now){
 var value=chatMediaUrlCache[key];
 if(value&&value.expiresAt>now+30000)return value;
 try{var raw=localStorage.getItem('mal_chat_media:'+key);if(raw){value=JSON.parse(raw);if(value&&value.url&&value.expiresAt>now+30000){chatMediaUrlCache[key]=value;return value}localStorage.removeItem('mal_chat_media:'+key)}}catch(e){}
 return null;
}
function writeChatMediaCache(key,value){
 chatMediaUrlCache[key]=value;
 try{localStorage.setItem('mal_chat_media:'+key,JSON.stringify(value))}catch(e){}
}
async function resolveMessagesMedia(rows){
 var groups=Object.create(null),docs=Object.create(null),now=Date.now();
 (rows||[]).forEach(function(m){
  if(!m||!m.media_url||m.media_type==='call'||m.display_url)return;
  var loc=messageMediaLocation(m),key=loc.bucket+'|'+loc.path,cached=readChatMediaCache(key,now);
  if(cached&&cached.expiresAt>now+30000){m.display_url=cached.url;if(m.media_type==='document'){if(cached.downloadUrl)m.download_url=cached.downloadUrl;else{if(!docs[loc.bucket])docs[loc.bucket]={};if(!docs[loc.bucket][loc.path])docs[loc.bucket][loc.path]=[];docs[loc.bucket][loc.path].push(m)}}return}
  if(!groups[loc.bucket])groups[loc.bucket]={};
  if(!groups[loc.bucket][loc.path])groups[loc.bucket][loc.path]=[];
  groups[loc.bucket][loc.path].push(m);
 });
 await Promise.all(Object.keys(groups).map(async function(bucket){
  try{
   var paths=Object.keys(groups[bucket]);if(!paths.length)return;
   var result=await sb.storage.from(bucket).createSignedUrls(paths,3600);
   if(result.error)throw result.error;
   (result.data||[]).forEach(function(item,index){
    var path=item.path||paths[index],url=item.signedUrl||'';
    (groups[bucket][path]||[]).forEach(function(m){
     if(url){m.display_url=url;var key=bucket+'|'+path,cache=chatMediaUrlCache[key]||{};cache.url=url;cache.expiresAt=now+3500000;writeChatMediaCache(key,cache)}
    });
   });
   var docPaths=Array.from(new Set(paths.filter(function(path){return (groups[bucket][path]||[]).some(function(m){return m.media_type==='document'})}).concat(Object.keys(docs[bucket]||{}))));
   if(docPaths.length){
    var downloads=await sb.storage.from(bucket).createSignedUrls(docPaths,3600,{download:true});
    if(downloads.error)throw downloads.error;
    (downloads.data||[]).forEach(function(item,index){
     var path=item.path||docPaths[index],url=item.signedUrl||'';
     (groups[bucket][path]||[]).concat(docs[bucket]&&docs[bucket][path]||[]).forEach(function(m){if(m.media_type==='document'&&url){m.download_url=url;var key=bucket+'|'+path,cache=chatMediaUrlCache[key]||{};cache.downloadUrl=url;cache.expiresAt=now+3500000;chatMediaUrlCache[key]=cache}});
    });
   }
  }catch(error){console.warn('Signature des médias de la conversation ('+bucket+')',error)}
 }));
 return rows;
}
function patchMessageMedia(rows){
 var box=$('msgs');if(!box)return;
 (rows||[]).forEach(function(m){
  if(!m||!m.display_url||m.id==null)return;
  var old=Array.from(box.querySelectorAll('.m[data-message-id]')).find(function(n){return String(n.dataset.messageId)===String(m.id)});
  if(!old)return;
  var index=msgs.findIndex(function(x){return String(x.id)===String(m.id)});
  var holder=document.createElement('div');holder.innerHTML=bub(m,index);
  if(holder.firstElementChild)old.replaceWith(holder.firstElementChild);
 });
}
async function resolveMessageMedia(m){
 if(!m||!m.media_url||m.media_type==='call')return m;
 var localPreview=m.display_url&&String(m.display_url).indexOf('blob:')===0?m.display_url:'';
 if(m.display_url&&!localPreview)return m;
 if(localPreview)m.display_url='';
 try{await resolveMessagesMedia([m])}catch(error){if(localPreview)m.display_url=localPreview;throw error}
 if(!m.display_url&&localPreview)m.display_url=localPreview;
 return m;
}
function appendChatRows(rows){
 var box=$('msgs');if(!box){draw(true);return}
 var near=box.scrollHeight-box.scrollTop-box.clientHeight<140;
 if(!box.querySelector('.m')){box.querySelectorAll('.dsep,.ice').forEach(function(n){n.remove()})}
 var rendered=box.querySelectorAll('.m'),lastNode=rendered.length?rendered[rendered.length-1]:null;
 var lastRow=lastNode?msgs.find(function(m){return String(m.id)===String(lastNode.dataset.messageId)}):null;
 var day=lastRow?new Date(lastRow.created_at).toDateString():'';
 (rows||[]).forEach(function(m){
  if(box.querySelector('.m[data-message-id="'+String(m.id)+'"]'))return;
  var d=new Date(m.created_at),k=d.toDateString();
  if(k!==day){box.insertAdjacentHTML('beforeend','<div class="dsep">'+(k===new Date().toDateString()?'Aujourd’hui':d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))+'</div>');day=k}
  var holder=document.createElement('div');holder.innerHTML=bub(m,msgs.indexOf(m));
  if(holder.firstElementChild)box.appendChild(holder.firstElementChild);
 });
 if(near)box.scrollTop=box.scrollHeight;
}
async function loadOlderMessages(){
 if(chatOlderBusy||!chatHasOlder||!open||!me||!chatBeforeId||tab!=='chat')return;
 var target=open,before=chatBeforeId,box=$('msgs');if(!box)return;
 chatOlderBusy=true;var oldHeight=box.scrollHeight,oldTop=box.scrollTop;
 try{
  var r=await sb.from('messages').select('id,de,a,texte,created_at,media_type,media_url').or('and(de.eq.'+me.id+',a.eq.'+target+'),and(de.eq.'+target+',a.eq.'+me.id+')').lt('id',before).order('id',{ascending:false}).limit(50);
  if(open!==target||tab!=='chat')return;
  if(r.error)throw r.error;
  var older=(r.data||[]).reverse();
  if(!older.length){chatHasOlder=false;return}
  var known=Object.create(null);msgs.forEach(function(m){known[String(m.id)]=1});
  older=older.filter(function(m){return !known[String(m.id)]});
  if(!older.length){chatHasOlder=(r.data||[]).length===50;return}
  msgs=older.concat(msgs).sort(function(a,b){return Number(a.id)-Number(b.id)});
  chatBeforeId=Number(older[0].id)||chatBeforeId;
  chatHasOlder=(r.data||[]).length===50;
  await resolveMessagesMedia(older);
  if(open!==target||tab!=='chat')return;
  draw(true);
  var next=$('msgs');if(next)next.scrollTop=oldTop+(next.scrollHeight-oldHeight);
 }catch(error){console.warn('Chargement des anciens messages Malachite',error)}
 finally{chatOlderBusy=false}
}

async function ensureSignupProfile(user,metadata){
 var md=metadata||user.user_metadata||{},age=Number(md.age),uid=user.id;
 if(!md.malachite_consent||!md.prenom||!Number.isInteger(age)||age<18||age>100)return null;
 var isPrivate=md.profile_visibility==='private',photos=[],uploaded='';
 try{
  var file=pendingSignupPhoto||pendingProfileFile;
  if(file){
   var ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
   if(!ext)throw new Error('Format de photo non pris en charge.');
   uploaded=uid+'/profile-initial.'+ext;
   var up=await sb.storage.from('profile-photos').upload(uploaded,file,{contentType:file.type,upsert:true});
   if(up.error)throw up.error;
   photos=[uploaded];
  }
  var privateFields={age:age,genre:md.genre||'H',commune:md.commune||'Lubumbashi',quartier:md.quartier||'',profession:md.profession||'',bio:md.bio||'',interets:[],photos:photos,prompts:[]};
  var prefs={profile_visibility:{mode:isPrivate?'private':'public'},profile_private:privateFields,relation_pref:md.relation_pref||'Amour'};
  var pub={id:uid,username:md.username||null,prenom:md.prenom,age:isPrivate?null:age,genre:isPrivate?null:(md.genre||'H'),commune:isPrivate?null:(md.commune||'Lubumbashi'),quartier:isPrivate?null:(md.quartier||''),profession:isPrivate?null:(md.profession||''),bio:isPrivate?null:(md.bio||''),interets:[],photos:isPrivate?photos.slice(0,1):photos,prompts:[],profile_private:isPrivate};
  var privData={nom_complet:md.nom_complet||md.prenom,adresse:'',telephone:md.telephone||user.phone||'',profile_age:age,prefs:prefs};
  var saved=await sb.rpc('save_my_profile',{p_profile:pub,p_private:privData});
  if(saved.error||!saved.data||saved.data.id!==uid)throw new Error(saved.error?saved.error.message:'La base n’a pas confirmé le profil.');
  pendingSignupPhoto=null;pendingProfileFile=null;pendingSignupEmail='';signupDraft={};
  return {profile:saved.data,privateData:privData};
 }catch(err){
  if(uploaded){try{await sb.storage.from('profile-photos').remove([uploaded])}catch(cleanup){}}
  console.warn('Création initiale du profil Malachite non confirmée',err);
  return null;
 }
}
async function load(){
 var uid=me&&me.id;if(!uid)return;var seq=++loadSeq;
 var keepWarmCache=loadedUid===uid&&profs.length>0&&Date.now()-profilesLoadedAt<300000;
 if(keepWarmCache){sub();return;}
 if(!keepWarmCache){mine=null;profileDraft={};ph=[];phUrls=[];priv={};privLoadFailed=false;}
 var results=await Promise.all([
  sb.from('profiles').select('id,username,prenom,age,genre,commune,quartier,profession,bio,interets,photos,created_at,prompts,derniere_vue,avatar,profile_private'),
  sb.from('prives').select('nom_complet,adresse,telephone,prefs').eq('id',uid).maybeSingle()
 ]);
 if(seq!==loadSeq||!me||me.id!==uid)return;
 var r=results[0],q=results[1];
 if(r.error){msg='Impossible de charger les profils : '+r.error.message;return}
 profs=r.data||[];mine=profs.filter(function(p){return p.id===uid})[0]||null;if(mine&&mine.avatar&&(mine.avatar.type==='pro-vector'||mine.avatar.type==='pro-photo')&&mine.avatar.config){var savedAvatar=Object.assign({},mine.avatar.config);if(savedAvatar.gender==='female')savedAvatar.gender='woman';if(savedAvatar.gender==='male')savedAvatar.gender='man';Object.keys(malAvatarState).forEach(function(k){if(savedAvatar[k]!==undefined)malAvatarState[k]=savedAvatar[k]})}malAvatarTouched=false;
 if(!mine){
  var signupMeta=me.user_metadata||{};
  if(pendingSignupPhoto&&pendingSignupEmail&&me.email===pendingSignupEmail)pendingProfileFile=pendingSignupPhoto;
  var created=await ensureSignupProfile(me,signupMeta);
  if(seq!==loadSeq||!me||me.id!==uid)return;
  if(created){mine=created.profile;priv=created.privateData;profs.push(mine)}
 }
 if(q.error){msg='Impossible de charger tes informations privées : '+q.error.message;priv={};privLoadFailed=true}else priv=q.data||{};if(typeof created!=='undefined'&&created)priv=created.privateData;
 if(mine){
  mine.prefs=priv.prefs||{};
  if(mine.profile_private){var pf=(priv.prefs&&priv.prefs.profile_private)||{};['age','genre','commune','quartier','profession','bio','interets','prompts'].forEach(function(k){if(pf[k]!==undefined)mine[k]=pf[k]});if(Array.isArray(pf.photos))mine.photos=pf.photos.slice()}
  ph=(mine.photos||[]).slice();phUrls=(mine.photoUrls||[]).slice();profileEditing=false;
  var profileTarget=mine,profileUid=uid;Promise.resolve().then(function(){return resolveProfilePhotos(profileTarget)}).then(function(){if(seq===loadSeq&&me&&me.id===profileUid&&mine===profileTarget){ph=(mine.photos||[]).slice();phUrls=(mine.photoUrls||[]).slice();if(tab==='me')draw(true)}}).catch(function(e){console.warn('Chargement différé des photos du profil',e)});
 }else{
  profileEditing=true;
  var md=me.user_metadata||{};
  profileDraft={prenom:md.prenom||'',nom_complet:md.nom_complet||'',age:md.age||'',profession:md.profession||'',genre:md.genre||'H',commune:md.commune||'Lubumbashi',quartier:md.quartier||'',bio:md.bio||'',interets:[],profile_visibility:md.profile_visibility||'public',relation_pref:md.relation_pref||'Amour'};
  if(pendingSignupPhoto&&pendingSignupEmail&&me.email===pendingSignupEmail){pendingProfileFile=pendingSignupPhoto;pendingProfilePreview=pendingSignupPreview}
 }
 loadedUid=uid;profilesLoadedAt=Date.now();if(tab==='me')draw(true);
 // Do not hold the profile screen while discovery, messages and secondary data load.
 var background=(async function(){
  var otherProfiles=profs.filter(function(p){return p.id!==uid});
  var othersPhotos=window.resolveProfilePhotosBatch?window.resolveProfilePhotosBatch(otherProfiles):Promise.all(otherProfiles.map(resolveProfilePhotos));
  var tasks=await Promise.all([
   sb.rpc('blocked_user_ids'),
   sb.rpc('my_blocked_profiles'),
   sb.from('statuts').select('*'),
   sb.from('config').select('cle,valeur').in('cle',['airtel','orange'])
  ]);
  if(seq!==loadSeq||!me||me.id!==uid)return;
  blocked=tasks[0].error?[]:(tasks[0].data||[]);blockedProfiles=tasks[1].error?[]:(tasks[1].data||[]);
  st={};(tasks[2].data||[]).forEach(function(x){st[x.user_id]=x});NUM='';ORANGE='';(tasks[3].data||[]).forEach(function(x){if(x.cle==='airtel')NUM=x.valeur||'';if(x.cle==='orange')ORANGE=x.valeur||''});
  if(tab==='home'||tab==='search')draw(true);
  await Promise.all([othersPhotos,loadRdv(),loadAns(),loadMyAvis()]);
  if(seq!==loadSeq||!me||me.id!==uid)return;
  if(tab==='home'||tab==='search')draw(true);
 })();
 background.catch(function(err){if(seq===loadSeq)console.warn('Chargement secondaire Malachite',err)});
 sub();
}
function authView(){
 var up=mode==='up';
 var imgs=['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=480&h=650&fit=crop&crop=faces&auto=format&q=65','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=480&h=650&fit=crop&crop=faces&auto=format&q=65','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=480&h=650&fit=crop&crop=faces&auto=format&q=65'];
 if(up){
  var step=signupStep||1,d=signupDraft||{},fields='';
  if(step===1)fields='<div class="mal-step-fields"><label>Nom affiché *<input id="suFirst" autocomplete="name" value="'+esc(d.prenom||'')+'" placeholder="Ex. Nadroj"></label><label>Nom d’utilisateur unique *<input id="suUsername" autocomplete="username" value="'+esc(d.username||'')+'" placeholder="Ex. nadroj_01"><small>3 à 24 caractères : lettres, chiffres et _</small></label><label>Adresse e-mail *<input id="suEmail" type="email" autocomplete="email" value="'+esc(d.email||'')+'" placeholder="exemple@email.com"></label><label>Mot de passe *<div style="display:flex;gap:6px;align-items:center"><input id="suPassword" type="password" autocomplete="new-password" value="'+esc(d.password||'')+'" placeholder="8 caractères minimum" style="flex:1;min-width:0"><button type="button" onclick="malTogglePassword(this)" aria-label="Afficher le mot de passe" style="white-space:nowrap;padding:9px 10px">Afficher</button></div></label><label>Confirmer le mot de passe *<div style="display:flex;gap:6px;align-items:center"><input id="suPasswordConfirm" type="password" autocomplete="new-password" value="'+esc(d.passwordConfirm||'')+'" placeholder="Répète ton mot de passe" style="flex:1;min-width:0"><button type="button" onclick="malTogglePassword(this)" aria-label="Afficher le mot de passe" style="white-space:nowrap;padding:9px 10px">Afficher</button></div></label></div>';
  if(step===2)fields='<div class="mal-step-fields"><div class="g2"><label>Âge *<input id="suAge" type="number" min="18" max="100" inputmode="numeric" value="'+esc(d.age||'')+'" placeholder="18 ans ou plus"></label><label>Je suis<select id="suGender"><option value="H" '+(d.genre!=='F'?'selected':'')+'>Un homme</option><option value="F" '+(d.genre==='F'?'selected':'')+'>Une femme</option></select></label></div><label>Téléphone <small>(facultatif, jamais utilisé pour se connecter)</small><input id="suPhone" type="tel" autocomplete="tel" inputmode="tel" value="'+esc(d.telephone||'')+'" placeholder="+243…"></label><label>Commune<select id="suCommune">'+['Lubumbashi','Kampemba','Katuba','Kenya','Ruashi','Annexe','Golf','Bel-Air','Autre'].map(function(x){return '<option '+((d.commune||'Lubumbashi')===x?'selected':'')+'>'+x+'</option>'}).join('')+'</select></label><label>Activité / profession<input id="suJob" autocomplete="organization-title" value="'+esc(d.profession||'')+'" placeholder="Étudiant, entrepreneur…"></label><label>Quelques mots sur toi<textarea id="suBio" rows="3" maxlength="300" placeholder="Ta personnalité, tes passions…">'+esc(d.bio||'')+'</textarea></label><div class="mal-relation"><b>Que recherches-tu ?</b><div class="mal-relation-grid">'+[['Amour','💗'],['Amitié','🤝'],['Rencontre','✨'],['Autre','🌿']].map(function(x){return '<label class="mal-relation-option"><input type="radio" name="suRelation" value="'+x[0]+'" '+((d.relation||'Amour')===x[0]?'checked':'')+'><span>'+x[1]+' '+x[0]+'</span></label>'}).join('')+'</div></div></div>';
  if(step===3)fields='<div class="mal-step-fields"><div class="mal-signup-photo"><div id="malSignupPreview" class="mal-signup-avatar" style="'+(pendingSignupPreview?'background-image:url('+pendingSignupPreview+')':'')+'">'+(pendingSignupPreview?'':(pendingSignupAvatar?'👤':'📷'))+'</div><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center"><label class="btn">＋ Ajouter ma photo<input id="malSignupPhoto" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onchange="stageSignupPhoto(this)"></label><button type="button" class="btn" onclick="openMalAvatarBuilder(true)">'+(pendingSignupAvatar?'✦ Modifier mon avatar 3D':'✦ Créer un avatar 3D')+'</button></div><small id="malSignupPhotoHint">'+(pendingSignupAvatar?'Avatar 3D prêt · il sera affiché sur ton profil':(pendingSignupPhoto?'Photo prête à être enregistrée':'Photo facultative · ou crée un avatar 3D réaliste'))+'</small></div><div class="mal-welcome-copy"><span>BIENVENUE CHEZ MALACHITE</span><h2>Les belles histoires commencent par une rencontre.</h2><p>Découvre des personnes, échange avec respect et écris la suite. 💗</p></div><label class="mal-consent-row"><input id="malConsent" type="checkbox" '+(d.consent?'checked':'')+' onchange="signupConsentChanged(this)"><span>J’ai 18 ans ou plus et j’accepte les conditions d’utilisation et la politique de confidentialité.</span></label></div>';
  return '<main class="ml-auth-wrap mal-signup-shell"><section class="mal-signup-heading"><span class="ml-auth-kicker">MALACHITE · LUBUMBASHI</span><h1>Une belle rencontre peut <i>tout changer.</i></h1><p id="malReferrerWelcome">'+(malReferralId?'Tu as été invité sur MALACHITE. Connecte-toi ou crée ton compte.':'Crée ton compte en trois étapes simples.')+'</p><div class="mal-signup-photos"><img src="'+imgs[(step-1)%3]+'" alt="Portrait d’illustration"><img src="'+imgs[step%3]+'" alt="Portrait d’illustration"></div></section><section class="box ml-auth-card mal-step-card"><div class="seg"><button type="button" onclick="mode=\'in\';msg=\'\';draw()">Connexion</button><button type="button" class="sel">Inscription</button></div><div class="mal-step-progress"><span>ÉTAPE '+step+' SUR 3</span><b>'+['','Ton compte','Ton profil','Ta photo et bienvenue'][step]+'</b><div><i style="width:'+(step*33.333)+'%"></i></div></div><div class="mal-step-content"><div class="mal-step-kicker">0'+step+' · '+['','COMPTE','PROFIL','BIENVENUE'][step]+'</div><h2>'+['','Créons ton accès.','Faisons connaissance.','Bienvenue sur Malachite.'][step]+'</h2>'+fields+'<div class="mal-step-actions">'+(step>1?'<button type="button" onclick="signupBack()">← Retour</button>':'<button type="button" onclick="mode=\'in\';draw()">Annuler</button>')+(step<3?'<button type="button" class="b1" onclick="signupNext()">Continuer →</button>':'<button type="button" id="malFinishSignup" class="b1" onclick="auth()" '+(d.consent?'':'disabled')+'>Créer mon compte ♡</button>')+'</div><div class="err" id="ae">'+esc(msg)+'</div></div><p class="ml-auth-foot">Réservé aux personnes de 18 ans et plus. Tes coordonnées restent privées.</p></section></main>';
 }
 return '<main class="ml-auth-wrap"><section class="ml-auth-story"><span class="ml-auth-kicker">♡ MALACHITE · LUBUMBASHI</span><h1>Les belles rencontres commencent <i>ici.</i></h1><p>Une communauté pour faire des rencontres sincères, d’abord à Lubumbashi.</p><div class="ml-auth-promises"><span>♡ Rencontres sincères</span><span>⌕ Découvertes locales</span><span>✦ Respect &amp; confiance</span></div><div class="ml-portrait-scene"><div class="ml-portrait one"><img src="'+imgs[0]+'" alt="Portrait d’illustration"></div><div class="ml-portrait two"><img src="'+imgs[1]+'" alt="Portrait d’illustration"></div><div class="ml-portrait three"><img src="'+imgs[2]+'" alt="Portrait d’illustration"></div><div class="ml-portrait-note">Et si c’était le début de quelque chose ? ✨</div></div></section><section class="box list ml-auth-card"><div class="ml-auth-card-kicker">BIENVENUE À NOUVEAU</div><div><h2>Heureux de te revoir</h2><p class="ml-auth-sub">Connecte-toi avec ton e-mail ou ton nom d’utilisateur.</p></div><div class="seg"><button type="button" class="sel">Connexion</button><button type="button" onclick="mode=\'up\';signupStep=1;signupDraft={};msg=\'\';draw()">Inscription</button></div><label>E-mail ou nom d’utilisateur<input id="loginId" type="text" autocomplete="username" value="'+esc(loginPrefillEmail||'')+'" placeholder="ton@email.com ou ton_nom"></label><label>Mot de passe<div style="display:flex;gap:6px;align-items:center"><input id="pw" type="password" autocomplete="current-password" placeholder="Ton mot de passe" style="flex:1;min-width:0"><button type="button" onclick="malTogglePassword(this)" aria-label="Afficher le mot de passe" style="white-space:nowrap;padding:9px 10px">Afficher</button></div></label><button class="b1 big" onclick="auth()">Me connecter →</button><div class="err" id="ae">'+esc(msg)+'</div><p class="ml-auth-foot">Le téléphone est une information facultative de ton profil. Il ne sert pas à la connexion.</p></section></main>';
}
function clearFieldErrors(){
 document.querySelectorAll('.mal-field-error').forEach(function(x){x.remove()});
 document.querySelectorAll('[aria-invalid="true"]').forEach(function(x){x.removeAttribute('aria-invalid');x.style.borderColor=''});
}
function showFieldError(id,message){
 if(mode==='up'){var targetStep=/^(suFirst|suUsername|suEmail|suPassword|suPasswordConfirm)$/.test(id)?1:/^(suAge|suPhone)$/.test(id)?2:3;if(signupStep!==targetStep){signupStep=targetStep;draw()}}
 clearFieldErrors();var el=$(id);if(!el){msg=message;var ae=$('ae');if(ae)ae.textContent=message;return}
 el.setAttribute('aria-invalid','true');el.style.borderColor='#B42318';
 var host=el.closest('label')||el.parentElement,span=document.createElement('small');span.className='mal-field-error';span.textContent=message;host.appendChild(span);
 el.focus();el.scrollIntoView({behavior:'smooth',block:'center'});
}
function signupCollect(){
 var d=signupDraft||{};
 if($('suFirst'))d.prenom=$('suFirst').value.trim();
 if($('suUsername'))d.username=$('suUsername').value.trim().toLowerCase();
 if($('suEmail'))d.email=$('suEmail').value.trim().toLowerCase();
 if($('suPhone'))d.telephone=$('suPhone').value.trim();
 if($('suPassword'))d.password=$('suPassword').value;
 if($('suPasswordConfirm'))d.passwordConfirm=$('suPasswordConfirm').value;
 if($('suAge'))d.age=$('suAge').value;
 if($('suGender'))d.genre=$('suGender').value;
 if($('suCommune'))d.commune=$('suCommune').value;
 if($('suJob'))d.profession=$('suJob').value.trim();
 if($('suBio'))d.bio=$('suBio').value.trim();
 var rel=document.querySelector('input[name="suRelation"]:checked');if(rel)d.relation=rel.value;
 if($('malConsent'))d.consent=$('malConsent').checked;
 signupDraft=d;
}
function signupConsentChanged(el){signupCollect();var b=$('malFinishSignup');if(b)b.disabled=!el.checked}
async function signupNext(){
 signupCollect();var d=signupDraft||{};clearFieldErrors();
 if(signupStep===1){
  if(!d.prenom)return showFieldError('suFirst','Indique le nom affiché sur ton profil.');
  if(!/^[a-z0-9_]{3,24}$/.test(d.username||''))return showFieldError('suUsername','3 à 24 caractères : lettres, chiffres ou _.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email||''))return showFieldError('suEmail','Saisis une adresse e-mail valide.');
  if((d.password||'').length<8)return showFieldError('suPassword','8 caractères minimum.');
  if(d.password!==d.passwordConfirm)return showFieldError('suPasswordConfirm','Les deux mots de passe ne correspondent pas.');
  var check=await sb.functions.invoke('username-login',{body:{action:'check',username:d.username}});
  if(check.error||!check.data)return showFieldError('suUsername','Vérification impossible pour le moment. Réessaie.');
  if(!check.data.available)return showFieldError('suUsername','Ce nom est déjà utilisé. Choisis-en un autre.');
 }
 if(signupStep===2){
  var age=Number(d.age);
  if(!Number.isInteger(age)||age<18||age>100)return showFieldError('suAge','Malachite est réservé aux personnes de 18 ans et plus.');
  if(d.telephone&&!/^\+?[0-9\s().-]{7,20}$/.test(d.telephone))return showFieldError('suPhone','Vérifie le numéro ou laisse ce champ vide.');
 }
 signupStep=Math.min(3,signupStep+1);if(signupStep>=2)malWarmAvatarBuilder();msg='';draw();
}
function signupBack(){signupCollect();signupStep=Math.max(1,signupStep-1);msg='';draw()}
function stageSignupPhoto(el){var f=el.files&&el.files[0];if(!f)return;if(['image/jpeg','image/png','image/webp','image/gif'].indexOf(f.type)<0||f.size>5e6){var h=$('malSignupPhotoHint');if(h)h.textContent='Format non accepté ou fichier supérieur à 5 Mo.';el.value='';return}pendingSignupPhoto=f;if(pendingSignupPreview)URL.revokeObjectURL(pendingSignupPreview);pendingSignupPreview=URL.createObjectURL(f);var p=$('malSignupPreview');if(p){p.style.backgroundImage='url('+pendingSignupPreview+')';p.textContent=''}var hint=$('malSignupPhotoHint');if(hint)hint.textContent='Photo prête : elle sera ajoutée à ton profil après création du compte.'}
async function auth(){
 if(window.bz)return;window.bz=1;var unlock=function(){window.bz=0};msg='';clearFieldErrors();
 try{
  if(mode==='up'){
   signupCollect();var d=signupDraft||{},age=Number(d.age);
   if(signupStep!==3)throw new Error('Termine les trois étapes avant de créer ton compte.');
   if(!d.prenom)return showFieldError('suFirst','Indique ton nom affiché.');
   if(!d.username)return showFieldError('suUsername','Indique ton nom d’utilisateur.');
   if(!d.email)return showFieldError('suEmail','Indique ton adresse e-mail.');
   if(!Number.isInteger(age)||age<18||age>100)return showFieldError('suAge','Malachite est réservé aux personnes de 18 ans et plus.');
   if(!d.consent)return showFieldError('malConsent','Tu dois accepter les conditions pour créer ton compte.');
   pendingSignupEmail=d.email;pendingProfileFile=pendingSignupPhoto;pendingProfilePreview=pendingSignupPreview;
   var metadata={prenom:d.prenom,username:d.username,nom_complet:d.prenom,telephone:d.telephone||'',age:age,profession:d.profession||'',genre:d.genre||'H',commune:d.commune||'Lubumbashi',quartier:'',bio:d.bio||'',profile_visibility:'public',relation_pref:d.relation||'Amour',malachite_consent:true,referrer_id:malReferralId||null};
   var r=await sb.auth.signUp({email:d.email,password:d.password,options:{data:metadata}});
   if(r.error)throw r.error;
   if(!r.data.session){
    loginPrefillEmail=d.email;mode='in';signupDraft={};msg='Compte créé. Vérifie ta boîte e-mail et clique sur le lien de confirmation. Ensuite, connecte-toi avec ton e-mail ou ton nom d’utilisateur.';
    draw();return;
   }
   me=r.data.user||me;signupDraft={};tab='home';msg='';if(pendingSignupAvatar){await load();await malAttachPendingSignupAvatar();pendingSignupAvatar=null;}
  }else{
   var ident=$('loginId')?$('loginId').value.trim():'',p=$('pw')?$('pw').value:'';
   if(!ident)return showFieldError('loginId','Saisis ton e-mail ou ton nom d’utilisateur.');
   if(!p)return showFieldError('pw','Saisis ton mot de passe.');
   if(ident.indexOf('@')>-1){
    var r=await sb.auth.signInWithPassword({email:ident,password:p});
    if(r.error)throw r.error;
   }else{
    var r=await sb.functions.invoke('username-login',{body:{username:ident,password:p}});
    if(r.error||!r.data||!r.data.session)throw new Error(r.data&&r.data.error?r.data.error:(r.error&&r.error.message)||'Identifiants incorrects.');
    var set=await sb.auth.setSession({access_token:r.data.session.access_token,refresh_token:r.data.session.refresh_token});
    if(set.error)throw set.error;
   }
   loginPrefillEmail='';tab='home';msg='';
  }
 }catch(err){
  var raw=err&&err.message?err.message:'Impossible de traiter cette demande.';
  if(/already registered|already exists|user already/i.test(raw))showFieldError('suEmail','Cette adresse e-mail est déjà utilisée. Connecte-toi ou utilise une autre adresse.');
  else if(/username|duplicate key|profiles_username/i.test(raw))showFieldError(mode==='up'?'suUsername':'loginId','Ce nom d’utilisateur est indisponible ou incorrect.');
  else if(mode==='in')showFieldError('pw','E-mail/nom d’utilisateur ou mot de passe incorrect.');
  else{msg=raw;var ae=$('ae');if(ae)ae.textContent=msg}
 }finally{unlock()}
}
async function out(){await sb.auth.signOut()}
function mascotHint(){return '<aside class="mascot-hint" aria-label="Conseil Malachite"><div class="mascot" role="img" aria-label="Mascotte Malachite"><i class="eyes"></i><i class="smile"></i><span class="heart">💗</span></div><div><b>Un petit conseil de Malachite</b><div class="note">Prends le temps de découvrir les personnes et reste toi-même. Les belles rencontres commencent par une conversation sincère.</div></div></aside>'}
function discoverCard(p){
 var photos=(p.photoUrls||[]).filter(Boolean),cover=(p.avatar&&p.avatar.type==='humanforge-3d'&&p.avatar.imageUrl)||photos[0]||'',locked=!!p.profile_private;
 return '<article class="mal-discover-card" onclick="viewProf(\''+p.id+'\')"><div class="mal-discover-photo" '+(cover?'style="background-image:url('+esc(cover)+')"':'')+'>'+(cover?'':(p.avatar&&p.avatar.type==='pro-vector'?'<div class="mal-discover-avatar">'+malAvatarSvg(p.avatar.config)+'</div>':(p.avatar&&p.avatar.emoji?'<span>'+esc(p.avatar.emoji)+'</span>':'<span>'+esc((p.prenom||'M')[0])+'</span>')))+(online(p)?'<i>● En ligne</i>':'')+'</div><div class="mal-discover-info"><b>'+esc(p.prenom||'Membre')+(locked?'':(p.age?', '+esc(p.age):''))+'</b><small>'+ (locked?'Profil privé':esc(p.commune||'Lubumbashi')+(p.profession?' · '+esc(p.profession):''))+'</small><div><button type="button" onclick="event.stopPropagation();viewProf(\''+p.id+'\')">Voir le profil</button><button type="button" class="b1" onclick="event.stopPropagation();talk(\''+p.id+'\')">Écrire</button></div></div></article>';
}
function home(){
 var o=others();
 return '<section class="mal-discover-top"><div><span class="ml-auth-kicker">MALACHITE · HAUT-KATANGA</span><h1>Les rencontres commencent <i>ici.</i></h1><p>Découvre les membres de Malachite à Lubumbashi.</p></div><div class="mal-discover-count"><b>'+o.length+'</b><small>membre'+(o.length>1?'s':'')+'</small></div></section>'+malPublicCampaignMarkup()+'<div class="mal-discover-photo-strip"><img src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=360&h=440&fit=crop" alt="Couple souriant, photo d’illustration" loading="lazy"><img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=360&h=440&fit=crop" alt="Couple, photo d’illustration" loading="lazy"><img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=360&h=440&fit=crop" alt="Famille, photo d’illustration" loading="lazy"><img src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=360&h=440&fit=crop" alt="Couple, photo d’illustration" loading="lazy"></div><div class="mal-discover-section-head"><div><span class="ml-auth-kicker">À RENCONTRER</span><h2>Les membres</h2><p>Fais défiler les profils de gauche à droite.</p></div><button class="b1" onclick="qreset()">Tout découvrir →</button></div><div class="mal-discover-carousel" aria-label="Profils des membres">'+(o.length?o.map(discoverCard).join(''):'<div class="box" style="min-width:100%;text-align:center"><b>Les premières rencontres arrivent bientôt.</b><p class="note">Les profils des membres apparaîtront ici dès leur inscription.</p></div>')+'</div><div class="mal-discover-footer"><span>📍 Lubumbashi · Haut-Katanga</span><span>Les portraits du bandeau sont des images d’illustration.</span></div>'+mascotHint();
}
function prof(id){return profs.filter(function(p){return p.id==id})[0]}
async function loadChat(){
 var current=open,key=current||'__conversation_list__';
 if(chatLoadBusyKeys[key]){chatLoadQueuedKeys[key]=true;return}
 chatLoadBusyKeys[key]=true;
 var firstLoad=!!current&&chatCursorFor!==current;
 try{
  if(tab!=='chat')return;
  if(current){
   if(current===me.id){open=null;chatCursorFor=null;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;msgs=[];lastSig='';msg='Tu ne peux pas ouvrir une conversation avec ton propre compte.';draw(true);return}
   if(firstLoad){
    chatCursorFor=current;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;msgs=[];lastSig='';blockedCheckedFor=null;blockedCurrent=false;chatInitialLoading=true;
   }
   var blockedTask=null;
   if(blockedCheckedFor!==current){
    blockedCheckedFor=current;
    blockedTask=sb.rpc('is_blocked_with',{p_other:current}).then(function(bx){
     if(open!==current||tab!=='chat')return;
     blockedCurrent=!bx.error&&!!bx.data;
     if(blockedCurrent){var bar=document.querySelector('.sendbar');if(bar)bar.innerHTML='<div class="note">🚫 Envoi de messages et médias désactivé pour cette conversation.</div>'}
    }).catch(function(error){console.warn('Vérification du blocage',error)});
   }
   var query=sb.from('messages').select('id,de,a,texte,created_at,media_type,media_url').or('and(de.eq.'+me.id+',a.eq.'+current+'),and(de.eq.'+current+',a.eq.'+me.id+')');
   if(firstLoad)query=query.order('id',{ascending:false}).limit(60);
   else query=query.gt('id',chatCursorId).order('id',{ascending:true}).limit(100);
   var r=await query;
   if(open!==current||tab!=='chat')return;
   if(r.error)throw r.error;
   var incoming=r.data||[];
   if(firstLoad)incoming.reverse();
   var known=Object.create(null);msgs.forEach(function(m){if(m.id!=null)known[String(m.id)]=1});
   var fresh=[],mediaRows=[];
   incoming.forEach(function(row){
    if(row.id!=null&&known[String(row.id)])return;
    var pendingIndex=msgs.findIndex(function(m){return m._pending&&m.media_url&&m.media_url===row.media_url&&m.de===row.de});
    if(pendingIndex>=0){
     var pending=msgs[pendingIndex];row.display_url=pending.display_url||'';row._local_preview=pending._local_preview||pending.display_url||'';msgs[pendingIndex]=row;
    }else fresh.push(row);
    if(row.id!=null)known[String(row.id)]=1;
    if(row.media_url)mediaRows.push(row);
   });
   if(firstLoad){
    msgs=msgs.concat(fresh).sort(function(a,b){return Number(a.id)-Number(b.id)});
    chatInitialLoading=false;
    chatCursorId=msgs.reduce(function(max,m){return Math.max(max,Number(m.id)||0)},0);
    chatBeforeId=msgs.length?(Number(msgs[0].id)||0):0;
    chatHasOlder=incoming.length===60;
    lastSig='';draw(true);
   }else if(fresh.length){
    msgs=msgs.concat(fresh).sort(function(a,b){return Number(a.id)-Number(b.id)});
    appendChatRows(fresh);
   }
   var maxId=chatCursorId;
   incoming.forEach(function(m){var n=Number(m.id);if(Number.isFinite(n)&&n>maxId)maxId=n});
   chatCursorId=maxId;
   if(mediaRows.length)resolveMessagesMedia(mediaRows).then(function(){if(open===current&&tab==='chat')patchMessageMedia(mediaRows)}).catch(function(error){console.warn('Chargement des médias de la conversation',error)});
   if(firstLoad||fresh.length){markSeen(current);updNav();markIncomingReceipts(incoming,document.visibilityState==='visible').catch(function(e){console.warn('Statut de lecture',e)})}
   loadReceiptsForRows(fresh).catch(function(e){console.warn('Statut des messages envoyés',e)});
   
   if(firstLoad){
    Promise.all([sb.from('avis_match').select('ok').eq('autre',current).maybeSingle(),sb.rpc('est_match',{p_autre:current})]).then(async function(checks){
     if(open!==current||tab!=='chat')return;
     av2=checks[0].data?checks[0].data.ok:null;mutual=!!checks[1].data;ct=null;
     if(mutual){ensureMatchNotice(current).catch(function(){});var cc=await sb.rpc('contact_de',{p_autre:current});if(open!==current||tab!=='chat')return;ct=cc.data&&cc.data[0]?cc.data[0]:null}
     var match=$('chatMatchBox');if(match)match.innerHTML=matchBox();
    }).catch(function(error){console.warn('Chargement des informations de match',error)});
   }
  }else{
   chatCursorFor=null;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;chatInitialLoading=false;
   var c=await sb.from('messages').select('de,a,texte,created_at,media_type').order('created_at',{ascending:false}).limit(200);
   if(tab!=='chat'||open)return;
   if(c.error)throw c.error;
   var seen=Object.create(null);convs=[];
   (c.data||[]).forEach(function(m){var other=m.de===me.id?m.a:m.de;if(!seen[other]){seen[other]=1;convs.push({o:other,t:m.texte,at:m.created_at,me:m.de===me.id})}});
   var sig=JSON.stringify(convs.slice(0,100).map(function(x){return [x.o,x.at,x.t]}));
   if(sig!==lastSig){lastSig=sig;draw(true)}
  }
 }catch(error){
  console.warn('Chargement de conversation Malachite',error);
  if(open===current&&tab==='chat'&&firstLoad){chatCursorFor=null;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;chatInitialLoading=false;msg='Impossible de charger les messages pour le moment. Réessaie.';draw(true)}
 }finally{
  delete chatLoadBusyKeys[key];
  if(chatLoadQueuedKeys[key]){delete chatLoadQueuedKeys[key];if(tab==='chat'&&open===current)loadChat()}
 }
}
async function insertChatMessage(payload,targetOverride){
 var target=targetOverride||open;
 if(!me||!target)throw new Error('conversation_introuvable');
 if(target===me.id)throw new Error('self_message_blocked');
 var safePayload=Object.assign({de:me.id,a:target},payload||{});
 var temp={id:'pending-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),de:me.id,a:target,texte:safePayload.texte||'',media_type:safePayload.media_type||null,media_url:safePayload.media_url||null,created_at:new Date().toISOString(),_pending:true};
 if(open===target){msgs.push(temp);appendChatRows([temp])}
 try{
  var result=await sb.from('messages').insert(safePayload).select('*').single();
  if(result.error)throw result.error;
  var row=result.data;
  if(open!==target)return row;
  msgs=msgs.filter(function(m){return m.id!==temp.id&&(!row.id||String(m.id)!==String(row.id))});
  msgs.push(row);
  msgs.sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at)||Number(a.id||0)-Number(b.id||0)});
  if(row.created_at&&(!chatCursor||new Date(row.created_at)>new Date(chatCursor)))chatCursor=row.created_at;
  chatCursorId=Math.max(chatCursorId,Number(row.id)||0);
  var pendingNode=document.querySelector('[data-message-id="'+temp.id+'"]');
  if(pendingNode){var holder=document.createElement('div');holder.innerHTML=bub(row,msgs.indexOf(row));if(holder.firstElementChild)pendingNode.replaceWith(holder.firstElementChild)}else appendChatRows([row]);
  if(row.media_url)resolveMessageMedia(row).then(function(){if(open===target)patchMessageMedia([row])}).catch(function(){});
  return row;
 }catch(error){
  if(open===target){msgs=msgs.filter(function(m){return m.id!==temp.id});var pendingNode=document.querySelector('[data-message-id="'+temp.id+'"]');if(pendingNode)pendingNode.remove();}
  throw error;
 }
}
async function snd(){
 var input=$('mi'),raw=input?input.value.trim():'';
 if(!raw||!open||chatSending)return;
 var target=open,wasFocused=!!(input&&document.activeElement===input);
 if(target===me.id){msg='Tu ne peux pas envoyer un message à ton propre compte.';var err=$('chatSendError');if(err){err.textContent=msg;err.hidden=false}return}
 var t=replyDraft?'↪ '+replyDraft.name+' : '+replyDraft.text+'\n'+raw:raw;
 chatSending=true;msg='';
 if(input){input.value='';input.disabled=true}
 try{
  await insertChatMessage({de:me.id,a:target,texte:t});
  if(open===target){replyDraft=null;var preview=document.querySelector('.reply-preview');if(preview)preview.remove()}
 }catch(e){
  if(open===target){
   msg=e.message==='self_message_blocked'?'Tu ne peux pas t’envoyer un message à toi-même.':
    /limite_gratuite/.test(e.message)?'Tu as atteint la limite de 15 nouvelles conversations initiées aujourd’hui.':
    e.message==='conversation_bloquee'?'Cette conversation est bloquée.':
    /row-level security|42501|403/i.test(e.message)?'Envoi refusé : vérifie que tu as ouvert la conversation du bon membre.':
    'Message non envoyé : '+(e.message||'erreur inconnue');
   var err=$('chatSendError');if(err){err.textContent=msg;err.hidden=false}
   var restored=$('mi');
   if(restored){restored.value=raw;restored.focus();restored.setSelectionRange(raw.length,raw.length)}
  }
 }finally{
  chatSending=false;
  var now=$('mi');if(now){now.disabled=false;if(wasFocused&&!now.value)now.focus()}
 }
}
async function sendSticker(emoji){
 var target=open;if(!target||!me)return;
 if(target===me.id){msg='Tu ne peux pas envoyer un sticker à ton propre compte.';var err=$('chatSendError');if(err){err.textContent=msg;err.hidden=false}return}
 try{await insertChatMessage({de:me.id,a:target,texte:emoji})}
 catch(e){msg='Sticker non envoyé : '+(e.message||'erreur inconnue');var err=$('chatSendError');if(err){err.textContent=msg;err.hidden=false}}
 var panel=$('chatEmojiPanel');if(panel)panel.hidden=true;
}
function talk(id){if(!id||!me)return;if(id===me.id){msg='Tu consultes ton propre profil : tu ne peux pas ouvrir une conversation avec toi-même.';return}if(blocked.indexOf(id)>-1){alert('Cette personne est bloquée. Débloque-la pour reprendre contact.');return}openConv(id)}
var ST={attente:'En attente',confirme:'Confirmé ✔',refuse:'Refusé'};
async function loadRdv(){var r=await sb.from('rendez_vous').select('*').order('quand');rdvs=r.data||[]}
function rdv(){var o=others();return '<h2>Mes rendez-vous</h2><div class="list">'+(rdvs.length?rdvs.map(function(x){var p=prof(x.de==me.id?x.a:x.de)||{},d=new Date(x.quand).toLocaleString('fr-FR',{dateStyle:'full',timeStyle:'short'});return '<div class="card"><div class="top">'+av(p)+'<div><div class="nm">'+esc(p.prenom||'Membre')+'</div><div class="sub">'+(x.de==me.id?'Tu as invité':'Invitation reçue')+' · '+ST[x.statut]+'</div></div></div><div>📅 '+esc(d)+'</div><div>📍 '+esc(x.lieu)+(/^https:\/\/maps\.google\.com\//.test(x.lien_carte||'')?' · <a href="'+esc(x.lien_carte)+'" target="_blank" rel="noopener">Voir sur la carte</a>':'')+'</div>'+(x.message?'<div class="note">'+esc(x.message)+'</div>':'')+(x.statut=='confirme'?'<button onclick="ics('+x.id+')">📆 Ajouter à mon calendrier</button>':'')+(x.a==me.id&&x.statut=='attente'?'<div class="acts"><button class="b1" onclick="repRdv('+x.id+',\'confirme\')">Confirmer</button><button onclick="repRdv('+x.id+',\'refuse\')">Refuser</button></div>':'')+'</div>'}).join(''):'<p class="note">Aucun rendez-vous.</p>')+'</div><h2>Créer un rendez-vous</h2><div class="box list"><p class="note" style="margin:0">Pour une première rencontre, choisis toujours un lieu public (restaurant, café).</p><label>Avec qui ?<select id="ra">'+o.map(function(p){return '<option value="'+p.id+'"'+(p.id==rdvFor?' selected':'')+'>'+esc(p.prenom)+'</option>'}).join('')+'</select></label><label>Date et heure<input id="rd" type="datetime-local"></label><label>Lieu (nom et quartier)<input id="rl" placeholder="Ex. Café du Centre, Lubumbashi"></label><label>Message<textarea id="rm" rows="2" maxlength="300"></textarea></label><button onclick="gps()">📍 Ajouter ma position</button><div class="note" style="color:var(--pink)" id="gp">'+esc(msg)+'</div><button class="b1" onclick="mkRdv()">Envoyer l’invitation</button></div>'}
function gps(){navigator.geolocation.getCurrentPosition(function(p){pos='https://maps.google.com/?q='+p.coords.latitude+','+p.coords.longitude;$('gp').textContent='Position ajoutée ✔'},function(){$('gp').textContent='Position refusée.'})}
async function mkRdv(){var a=$('ra').value,q=$('rd').value,l=$('rl').value.trim();if(!a||!q||!l){msg='Choisis la personne, la date et le lieu.';return draw()}var r=await sb.from('rendez_vous').insert({a:a,quand:new Date(q).toISOString(),lieu:l,message:$('rm').value.trim(),lien_carte:pos||null});msg=r.error?(/limite_rdv/.test(r.error.message)?'Les membres gratuits ont 1 rendez-vous par semaine. Passe en Premium (onglet Offres).':'Rendez-vous non créé.'):'Invitation envoyée ✔';pos='';await loadRdv();draw()}
async function repRdv(id,s){await sb.from('rendez_vous').update({statut:s}).eq('id',id);await loadRdv();draw()}
var PRIX={'Premium':'2 $','Boost':'0,50 $','Contact':'1 $'};
function hearts(){for(var i=0;i<18;i++){var h=document.createElement('span');h.className='hrt';h.textContent=['💗','❤️','💖','💕'][i%4];h.style.left=Math.random()*95+'vw';h.style.animationDelay=Math.random()*.8+'s';h.style.fontSize=(18+Math.random()*22)+'px';document.body.appendChild(h);(function(x){setTimeout(function(){x.remove()},3600)})(h)}}
function welcome(){var d=document.createElement('div');d.className='wel';d.innerHTML='<div><div class="cup" style="font-size:54px"><span class="cb">😇🏹</span><span class="ar">➳</span><span class="ht">💗</span></div><h2>Bienvenue sur Malachite !</h2><p>Ton compte est créé. Crée ton profil et trouve ta moitié.</p><button class="b1" style="width:100%">C’est parti 💕</button></div>';d.onclick=function(){d.remove();go('me')};document.body.appendChild(d);hearts()}
function matchBox(){var o=open;if(blockedCurrent)return '<div class="mrow">🚫 Cette conversation est bloquée. Tu peux débloquer ce membre avec le bouton 🚫.</div>';
if(av2===null)return '<div class="mrow pop"><span>Vous avez bien discuté ?</span><button class="b1" onclick="avis(true)">💗 Ça match</button><button onclick="avis(false)">Pas pour moi</button></div>';
if(av2===false)return '<div class="mrow"><span class="note">Tu as répondu « Pas pour moi ».</span><button onclick="avis(true)">Changer d’avis</button></div>';
if(!mutual)return '<div class="mrow pop"><span>💗 Ton « Ça match » est envoyé. On attend l’autre personne.</span></div>';
var h='<div class="mrow pop" style="border:2px solid var(--pink)"><b>🎉 Match !</b><button class="b1" onclick="rdvFor=\''+o+'\';go(\'rdv\')">📅 Rendez-vous</button><button disabled title="Les appels sécurisés seront réactivés après leur mise en place">📹 Appel indisponible</button>'+(ct?'':'<button onclick="payOpen=!payOpen;lastSig=\'\';loadChat()">🔓 Contact 1 $</button>')+'</div>';
if(ct)h+='<div class="mrow">📞 <b>'+esc(ct.nom||'')+'</b> · <a href="tel:'+esc(ct.tel||'')+'">'+esc(ct.tel||'pas de numéro')+'</a></div>';
else if(payOpen)h+='<div class="mrow" style="display:block">Envoie 1 $ au <b>'+esc(NUM)+'</b> par Airtel Money (gratuit en Premium), puis écris le code reçu par SMS.<div class="send" style="margin-top:6px"><input id="uc" placeholder="Code de transaction"><button onclick="payC()">Débloquer</button></div><div class="note" id="um"></div></div>';
return h}
async function ensureMatchNotice(id){
 if(!id||matchNoticeChecked[id])return;
 var body='💗 Match confirmé ! Vous vous êtes choisis mutuellement. Vous pouvez maintenant apprendre à vous connaître et proposer un rendez-vous.';
 var q=await sb.from('messages').select('id').eq('de',me.id).eq('a',id).eq('texte',body).limit(1);
 if(q.error)return;
 if(!q.data||!q.data.length){var w=await sb.from('messages').insert({a:id,texte:body});if(w.error)return}
 matchNoticeChecked[id]=true;
}
async function avis(ok){ans[open]=ok;await sb.from('avis_match').upsert({autre:open,ok:ok});if(ok)hearts();lastSig='';loadChat()}
async function compressChatImage(file){
 if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type)||file.size<500*1024||!window.createImageBitmap)return {file:file,mime:file.type};
 var bitmap=null;
 try{
  bitmap=await createImageBitmap(file);
  var scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  var canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  var ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/webp',0.80)});
  if(blob&&blob.size<file.size*0.9)return {file:blob,mime:'image/webp',ext:'webp'};
 }catch(e){}finally{if(bitmap&&bitmap.close)bitmap.close()}
 return {file:file,mime:file.type};
}
async function sendChatMediaFast(file,opts){
 var target=open;if(!target||!me||!file)return;
 if(target===me.id){setChatUploadStatus('Choisis une conversation avec un autre membre.');return}
 var localUrl='',temp=null,path=opts.path,uploaded=false,row=null;
 try{
  localUrl=URL.createObjectURL(file);
  temp={id:'pending-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),de:me.id,a:target,texte:opts.text,media_type:opts.type,media_url:path,display_url:localUrl,_local_preview:localUrl,created_at:new Date().toISOString(),_pending:true};
  if(open===target){
   msgs.push(temp);
   var box=$('msgs'),near=!box||box.scrollHeight-box.scrollTop-box.clientHeight<140;
   if(box){var wrap=document.createElement('div');wrap.innerHTML=bub(temp,msgs.length-1);if(wrap.firstElementChild)box.appendChild(wrap.firstElementChild);if(near)box.scrollTop=box.scrollHeight}
   else draw(true);
  }
  setChatUploadStatus(opts.progressText||'Préparation de l’envoi…');
  var uploadFile=file,uploadMime=opts.mime;
  if(opts.optimizeImage){
   setChatUploadStatus('Optimisation de la photo…');
   var optimized=await compressChatImage(file);uploadFile=optimized.file;uploadMime=optimized.mime||uploadMime;
   if(optimized.ext)path=path.replace(/\.[^.]+$/,'.'+optimized.ext);
   temp.media_url=path;
  }
  await uploadChatAsset(path,uploadFile,uploadMime);uploaded=true;
  setChatUploadStatus('Enregistrement du message…');
  if(target===me.id)throw new Error('self_message_blocked');
  var result=await sb.from('messages').insert({de:me.id,a:target,texte:opts.text,media_url:path,media_type:opts.type}).select('*').single();
  if(result.error){
   var recovery=await sb.from('messages').select('*').eq('de',me.id).eq('a',target).eq('media_url',path).order('id',{ascending:false}).limit(1).maybeSingle();
   if(recovery.error||!recovery.data)throw result.error;
   row=recovery.data;
  }else row=result.data;
  if(open!==target){if(localUrl)URL.revokeObjectURL(localUrl);return row}
  row.display_url=localUrl;row._local_preview=localUrl;
  var existingIndex=msgs.findIndex(function(m){return m.id!=null&&String(m.id)===String(row.id)});
  var pendingIndex=msgs.findIndex(function(m){return temp&&m.id===temp.id});
  if(existingIndex>=0){
   if(pendingIndex>=0&&pendingIndex!==existingIndex){msgs.splice(pendingIndex,1);if(pendingIndex<existingIndex)existingIndex--}
   row=Object.assign({},msgs[existingIndex],row);msgs[existingIndex]=row;
  }else if(pendingIndex>=0)msgs[pendingIndex]=row;
  else msgs.push(row);
  msgs.sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at)||Number(a.id||0)-Number(b.id||0)});
  var node=document.querySelector('[data-message-id="'+temp.id+'"]')||document.querySelector('[data-message-id="'+row.id+'"]');
  if(node){
   var holder=document.createElement('div');holder.innerHTML=bub(row,msgs.indexOf(row));
   var fresh=holder.firstElementChild;if(fresh)node.replaceWith(fresh);
  }else draw(true);
  setChatUploadStatus('Envoyé ✓');
  resolveMessageMedia(row).then(function(){
   if(open!==target)return;
   var currentIndex=msgs.findIndex(function(m){return String(m.id)===String(row.id)});
   var oldNode=document.querySelector('[data-message-id="'+row.id+'"]');
   if(oldNode&&currentIndex>=0){var holder=document.createElement('div');holder.innerHTML=bub(row,currentIndex);var fresh=holder.firstElementChild;if(fresh)oldNode.replaceWith(fresh)}
   if(row._local_preview){URL.revokeObjectURL(row._local_preview);delete row._local_preview}
  }).catch(function(){});
  setTimeout(function(){if(open===target)setChatUploadStatus('')},1800);
  return row;
 }catch(error){
  if(localUrl)URL.revokeObjectURL(localUrl);
  if(open===target){
   msgs=msgs.filter(function(m){return !temp||m.id!==temp.id});
   var node=temp?document.querySelector('[data-message-id="'+temp.id+'"]'):null;if(node)node.remove();
   setChatUploadStatus('Échec : '+(error&&error.message?error.message:'envoi impossible'));
  }
  if(uploaded&&path){try{await sb.storage.from('chat-media').remove([path])}catch(cleanup){}}
  return null;
 }
}
var malTusLoadPromise=null;
function loadTusClient(){
 if(window.tus&&window.tus.Upload)return Promise.resolve();
 if(malTusLoadPromise)return malTusLoadPromise;
 malTusLoadPromise=new Promise(function(resolve,reject){
  var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/dist/tus.min.js';script.async=true;
  script.onload=function(){if(window.tus&&window.tus.Upload)resolve();else reject(new Error('Le module de transfert vidéo est indisponible.'))};
  script.onerror=function(){malTusLoadPromise=null;reject(new Error('Impossible de charger le module de transfert vidéo.'))};
  document.head.appendChild(script);
 });
 return malTusLoadPromise;
}
async function uploadChatAsset(path,file,forcedType){
 if(file.size<=6*1024*1024){
  var standard=await sb.storage.from('chat-media').upload(path,file,{contentType:forcedType||file.type||'application/octet-stream',upsert:false,cacheControl:'3600'});
  if(standard.error)throw standard.error;
  return standard.data;
 }
 await loadTusClient();
 if(!window.tus||!window.tus.Upload)throw new Error('Le module de transfert vidéo fiable ne s’est pas chargé. Actualise la page et réessaie.');
 var sessionResult=await sb.auth.getSession(),session=sessionResult.data&&sessionResult.data.session;
 if(sessionResult.error||!session||!session.access_token)throw new Error('Session expirée. Reconnecte-toi puis réessaie.');
 return await new Promise(function(resolve,reject){
  var upload=new window.tus.Upload(file,{
   endpoint:'https://tscsmemsvgacqioncash.storage.supabase.co/storage/v1/upload/resumable',
   retryDelays:[0,1000,3000,5000,10000],
   headers:{authorization:'Bearer '+session.access_token,apikey:'sb_publishable_XDpqSzsPNeVduv6aGyjuoA_suakeFN0'},
   uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,
   metadata:{bucketName:'chat-media',objectName:path,contentType:forcedType||file.type||'application/octet-stream',cacheControl:'3600'},
   onError:function(error){reject(error)},
   onProgress:function(sent,total){var el=$('chatUploadStatus');if(el)el.textContent='Transfert… '+Math.round(sent/total*100)+'%'},
   onSuccess:function(){resolve({path:path})}
  });
  upload.start();
 });
}
function setChatUploadStatus(text){var el=$('chatUploadStatus');if(el)el.textContent=text||''}
function toggleChatAttach(){var el=$('chatAttachMenu');if(el)el.hidden=!el.hidden}
function toggleChatEmoji(){var el=$('chatEmojiPanel');if(el)el.hidden=!el.hidden}
function insertChatEmoji(value){var input=$('mi');if(!input)return;var start=input.selectionStart||input.value.length,end=input.selectionEnd||start;input.value=input.value.slice(0,start)+value+input.value.slice(end);input.focus();input.setSelectionRange(start+value.length,start+value.length)}

async function sendImg(el){
 var f=el&&el.files&&el.files[0];if(!f)return;
 var clear=function(){if(el)el.value=''},target=open;if(!target||!me){clear();return}
 var imgTypes={'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','gif':'image/gif'},imgExt=(f.name||'').split('.').pop().toLowerCase(),mime=imgTypes[imgExt]||f.type,allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
 if(!allowed[mime]){setChatUploadStatus('Format photo non accepté.');clear();return}
 if(f.size>5*1024*1024){setChatUploadStatus('Photo trop lourde : 5 Mo maximum.');clear();return}
 var path=me.id+'/'+target+'/photo-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.'+allowed[mime];
 clear();sendChatMediaFast(f,{path:path,type:'image',mime:mime,text:'📷 Photo',progressText:'Envoi de la photo…',optimizeImage:true});
}
function banner(){if(!me)return '';var nb=(tab=='home'&&'Notification' in window&&Notification.permission=='default')?'<div class="wall pop">🔔 <b>Active les notifications</b> pour ne rater aucun message ni rendez-vous.<button class="b1" style="width:100%;margin-top:8px" onclick="askNotif()">Activer</button></div>':'';var t=new Date().toDateString();return nb+rdvs.filter(function(x){return x.statut=='confirme'&&new Date(x.quand).toDateString()==t}).map(function(x){var p=prof(x.de==me.id?x.a:x.de)||{};return '<div class="wall pop">🔔 <b>Aujourd’hui</b> : rendez-vous avec '+esc(p.prenom||'ton match')+' à '+new Date(x.quand).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+' · '+esc(x.lieu)+'</div>'}).join('')}
function ics(id){var x=rdvs.filter(function(y){return y.id==id})[0];if(!x)return;var d=new Date(x.quand),e=new Date(+d+36e5),f=function(z){return z.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'};var t='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:malachite-'+id+'@malachite\r\nDTSTAMP:'+f(new Date())+'\r\nDTSTART:'+f(d)+'\r\nDTEND:'+f(e)+'\r\nSUMMARY:Rendez-vous Malachite\r\nLOCATION:'+String(x.lieu).replace(/[,;\r\n]/g,' ')+'\r\nBEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Rendez-vous Malachite\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/calendar'}));a.download='rendez-vous.ics';a.click()}
var admLoadPromise=null,admLoadQueued=false,admLoadedFor=null;
async function loadAdm(){
 if(!me||me.email!==ADM||tab!=='adm'||document.hidden)return;
 if(admLoadPromise){admLoadQueued=true;return admLoadPromise}
 var uid=me.id;
 admLoadPromise=(async function(){
  do{
   admLoadQueued=false;
   if(!me||me.id!==uid||me.email!==ADM||tab!=='adm')break;
   var results=await Promise.all([
    sb.from('paiements').select('*').eq('statut','attente').order('created_at'),
    sb.from('signalements').select('*').order('created_at',{ascending:false}).limit(100),
    sb.from('suspensions').select('user_id,depuis,motif').order('depuis',{ascending:false}),
    sb.from('avis_site').select('*').order('created_at',{ascending:false}).limit(50),
    sb.rpc('admin_malachite_referrals')
   ]);
   if(!me||me.id!==uid||me.email!==ADM||tab!=='adm')break;
   var labels=['paiements','signalements','suspensions','avis_site','parrainages'];
   results.forEach(function(r,i){if(r.error)console.warn('Chargement admin '+labels[i],r.error)});
   if(!results[0].error)adm=results[0].data||[];
   if(!results[1].error)sigs=results[1].data||[];
   if(!results[2].error)admSuspensions=results[2].data||[];
   if(!results[3].error)avs=results[3].data||[];
   if(!results[4].error)referralRows=results[4].data||[];
   admLoadedFor=uid;
   if(tab==='adm'&&me&&me.id===uid)draw(true);
  }while(admLoadQueued);
 })().catch(function(e){console.error('Chargement du tableau administrateur',e)})
 .finally(function(){admLoadPromise=null});
 return admLoadPromise;
}
async function trt(id,ok){
 if(!me||me.email!==ADM)return;
 var reason=null;
 if(ok&&!confirm('As-tu vérifié auprès de l’opérateur que l’argent est réellement arrivé ? Confirmer ce paiement et activer l’offre ?'))return;
 if(!ok){reason=prompt('Motif du refus :');if(reason===null)return;reason=reason.trim();if(!reason||reason.length>500){alert('Le motif est obligatoire (500 caractères maximum).');return}}
 var buttons=Array.from(document.querySelectorAll('[data-payment-action="'+id+'"]'));buttons.forEach(function(b){b.disabled=true});
 try{var args={pid:id,accepter:ok};if(!ok)args.raison=reason;var r=await sb.rpc('traiter_paiement',args);if(r.error)throw r.error;
  if(r.data==='introuvable')alert('Ce paiement a déjà été traité ou n’est plus en attente.');
  else if(ok&&r.data!=='ok')alert('Paiement non confirmé : '+String(r.data));
  else if(ok){if(typeof toast==='function')toast('Paiement confirmé. Offre activée.');else alert('Paiement confirmé. Offre activée.')}
  else{if(typeof toast==='function')toast('Paiement refusé.');else alert('Paiement refusé.')}
  await loadAdm();
 }catch(e){alert('Action non effectuée : '+(e.message||'erreur inconnue'));await loadAdm()}
}async function moderate(id,status){var r=await sb.from('signalements').update({statut:status,traite_par:me.id,traite_le:new Date().toISOString()}).eq('id',id);if(r.error){alert('Impossible de traiter le signalement : '+r.error.message);return}loadAdm()}
async function suspendMember(id){var reason=prompt('Motif de suspension (300 caractères maximum) :');if(reason===null)return;reason=reason.trim();if(!reason||reason.length>300){alert('Le motif est obligatoire et limité à 300 caractères.');return}if(!confirm('Confirmer la suspension de ce compte ?'))return;var r=await sb.functions.invoke('admin-user-moderation',{body:{user_id:id,action:'suspend',reason:reason}});if(r.error){alert('Suspension impossible : '+(r.data&&r.data.error?r.data.error:r.error.message));return}alert('Suspension enregistrée et transmise à Auth.');await loadAdm()}
async function toggleBlock(id){var isBlocked=blocked.indexOf(id)>-1;if(!confirm(isBlocked?'Débloquer ce membre ?':'Bloquer ce membre ? Il ne pourra plus voir ton profil ni t’envoyer de messages.'))return;var r=isBlocked?await sb.from('blocages').delete().eq('user_id',me.id).eq('cible',id):await sb.from('blocages').insert({user_id:me.id,cible:id});if(r.error){alert('Action impossible : '+r.error.message);return}await load();if(!isBlocked&&open===id){open=null;go('home')}else{if(open===id){blockedCheckedFor=null;await loadChat()}draw(true)}}
var payOpen=false,subOn=false;
function handleOwnMessageEvent(payload){
 var row=payload&&payload.new;if(!row||!me||(row.de!==me.id&&row.a!==me.id))return;
 var other=row.de===me.id?row.a:row.de,incoming=row.a===me.id&&row.de!==me.id;
 if(incoming){
  markIncomingReceipts([row],tab==='chat'&&open===other&&document.visibilityState==='visible').catch(function(e){console.warn('Statut de réception',e)});
  allMsgs=[row].concat((allMsgs||[]).filter(function(m){return String(m.id)!==String(row.id)})).slice(0,200);
  lastMsgId=Math.max(lastMsgId,Number(row.id)||0);
  // The durable inbox trigger announces this message once; avoid a second transient toast.
 }
 if(tab==='chat'){
  if(open===other&&incoming){
   if(!msgs.some(function(m){return String(m.id)===String(row.id)})){
    msgs.push(row);msgs.sort(function(a,b){return Number(a.id)-Number(b.id)});
    chatCursorId=Math.max(chatCursorId,Number(row.id)||0);
    if(!chatBeforeId)chatBeforeId=Number(row.id)||0;
    appendChatRows([row]);
    if(row.media_url)resolveMessageMedia(row).then(function(){if(open===other)patchMessageMedia([row])}).catch(function(e){console.warn('Média reçu',e)});
    loadReceiptsForRows([row]).catch(function(e){console.warn('Accusé du message reçu',e)});
    markSeen(other);updNav();
   }
  }else if(!open){loadChat()}
  else updNav();
 }else if(incoming)updNav();
}
function sub(){
 if(!me)return;
 if(subOn&&subUserId===me.id)return;
 if(msgChannel){sb.removeChannel(msgChannel);msgChannel=null}
 subOn=true;subUserId=me.id;msgRealtimeReady=false;
 if(!backgroundTimersStarted){
  backgroundTimersStarted=true;setInterval(poll,120000);poll();if(tab!=='chat')matchPoll();setInterval(function(){if(tab!=='chat')matchPoll()},180000);initSW();setInterval(beat,120000);beat();setInterval(cupidPass,90000);document.addEventListener('visibilitychange',function(){if(document.hidden){beat(true);if(presenceChannel)presenceChannel.untrack().catch(function(e){console.warn('Arrêt de présence',e)})}else{trackPresence();beat();poll();matchPoll();syncIncomingDeliveries().catch(function(e){console.warn('Synchronisation après retour',e)});if(tab==='chat'&&open)markIncomingReceipts(msgs,true).catch(function(e){console.warn('Lecture après retour au premier plan',e)})}});window.addEventListener('pagehide',function(){beat(true)});window.addEventListener('online',function(){trackPresence();syncIncomingDeliveries().catch(function(e){console.warn('Synchronisation après reconnexion',e)});if(tab==='chat'&&open)markIncomingReceipts(msgs,true).catch(function(e){console.warn('Lecture après reconnexion',e)});});
 }
 startPresence();
 msgChannel=sb.channel('msgs-'+me.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'a=eq.'+me.id},handleOwnMessageEvent)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'de=eq.'+me.id},handleOwnMessageEvent)
  .on('postgres_changes',{event:'*',schema:'public',table:'message_receipts',filter:'sender_id=eq.'+me.id},handleReceiptEvent)
  .subscribe(function(status,error){
   if(status==='SUBSCRIBED'){
    msgRealtimeReady=true;if(tab==='chat'&&open)loadChat();
   }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
    msgRealtimeReady=false;console.warn('Canal de messagerie Realtime indisponible : '+status,error||'');
   }
  });
 syncIncomingDeliveries().catch(function(e){console.warn('Synchronisation des accusés',e)});
}
var cel={};
function celebrate(){var d=document.createElement('div');d.className='wel';d.innerHTML='<div><div class="cup" style="font-size:60px"><span class="cb">😇🏹</span><span class="ar">➳</span><span class="ht">💘</span></div><h2>🎉 C’est un match !</h2><p>Vous vous plaisez tous les deux. Proposez-vous un rendez-vous !</p><button class="b1">Super 💗</button></div>';d.onclick=function(){d.remove()};document.body.appendChild(d);hearts();setTimeout(function(){d.remove()},5000)}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button,.btn');if(!b)return;var h=document.createElement('span');h.className='mh';h.textContent='💗';h.style.left=(e.clientX-10)+'px';h.style.top=(e.clientY-10)+'px';document.body.appendChild(h);setTimeout(function(){h.remove()},900)});
var ans={},ICE=['Salut ! Tu es de quelle commune ? 😊','Rumba ou Ndombolo ? 🎶','Ton plat congolais préféré ?','Un week-end idéal à Lubumbashi, ça ressemble à quoi ?','Karibu ! Comment s’est passée ta journée ?'];
async function loadAns(){var r=await sb.from('avis_match').select('autre,ok');ans={};(r.data||[]).forEach(function(x){ans[x.autre]=x.ok})}
function ice(i){var m=$('mi');if(m){m.value=ICE[i];m.focus()}}
function affs(p){if(!mine)return -1;var a=(mine.interets||[]).map(function(y){return y.toLowerCase()}),sh=(p.interets||[]).filter(function(x){return a.indexOf(x.toLowerCase())>-1}).length;return Math.min(98,50+Math.min(sh,4)*12+(mine.commune==p.commune?10:0))}
function meter(){var m=mine||{},n=[ph.length,m.bio,(m.interets||[]).length,m.profession,priv.telephone].filter(Boolean).length,pc=n*20;return '<div class="meter"><div style="display:flex;justify-content:space-between"><b>Profil complété à '+pc+' %</b><span>'+(pc==100?'🏆':'💗')+'</span></div><div class="bar"><i style="width:'+pc+'%"></i></div>'+(pc<100?'<div class="note">Complète ton profil pour mieux te faire connaître.</div>':'')+'</div>'}
function cands(){return others().filter(function(p){return ans[p.id]===undefined}).sort(function(a,b){return sc(b)-sc(a)})}
function deck(){var c=cands()[0];if(!c)return '<div class="box" style="text-align:center;margin-top:12px">Plus de nouveaux profils pour l’instant 💫<div class="note">Reviens bientôt, ou invite tes amis !</div></div>';var f=c.photoUrls&&c.photoUrls[0],locked=!!c.profile_private;return '<div class="dk"><div class="dcard'+(on((st[c.id]||{}).premium_until)?' vipc':'')+'" id="dc" data-id="'+c.id+'"><div class="dph" style="'+(f?'background-image:url('+esc(f)+')':'')+'">'+(f?'':'<span>'+esc((c.prenom||'?')[0])+'</span>')+'</div><div class="dinfo"><div class="nm" style="font-size:22px">'+esc(c.prenom)+(locked?'':(c.age?', '+esc(c.age):''))+'</div>'+(locked?'<div class="sub">Profil privé</div>':'<div class="sub">'+esc(c.commune||'')+(c.profession?' · '+esc(c.profession):'')+'</div>'+aff(c)+'<p style="margin:6px 0">'+esc(c.bio||'')+'</p>'+qaHtml(c)+'<div>'+(c.interets||[]).map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join('')+'</div>')+'</div></div><div class="dbtn"><button onclick="swipe(-1)" aria-label="Passer">✖</button><button class="yes" onclick="swipe(1)" aria-label="J’aime">💗</button></div><p class="note" style="text-align:center">Glisse à droite pour aimer, à gauche pour passer.</p></div>'}
async function swipe(d){try{navigator.vibrate&&navigator.vibrate(d>0?[20,40,20]:10)}catch(e){}var el=$('dc');if(!el||el.dataset.busy)return;el.dataset.busy=1;var id=el.dataset.id;el.style.transition='transform .35s,opacity .35s';el.style.transform='translateX('+(d*130)+'vw) rotate('+(d*25)+'deg)';el.style.opacity=0;if(d>0)hearts();ans[id]=d>0;await sb.from('avis_match').upsert({autre:id,ok:d>0});if(d>0){var m=await sb.rpc('est_match',{p_autre:id});if(m.data){cel[id]=1;celebrate()}}setTimeout(function(){draw(true)},250)}
function bindDrag(){var el=$('dc');if(!el)return;var x0=null;el.onpointerdown=function(e){x0=e.clientX;try{el.setPointerCapture(e.pointerId)}catch(z){}el.style.transition='none'};el.onpointermove=function(e){if(x0===null)return;var dx=e.clientX-x0;el.style.transform='perspective(900px) translateX('+dx+'px) rotate('+dx/18+'deg) rotateY('+dx/14+'deg)';el.classList.toggle('lk',dx>40);el.classList.toggle('ps',dx<-40)};el.onpointerup=function(e){if(x0===null)return;var dx=e.clientX-x0;x0=null;if(Math.abs(dx)>90)swipe(dx>0?1:-1);else{el.style.transition='transform .25s';el.style.transform='';el.classList.remove('lk','ps')}}}
var INT=['Musique','Cuisine','Voyage','Football','Église','Cinéma','Lecture','Business','Danse','Mode','Photo','Sport'],REL=['Relation sérieuse','Mariage','Amitié','On verra'],COM=['Lubumbashi','Kampemba','Katuba','Kenya','Rwashi','Annexe'];
function toks(t){return (String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z]{5,}/g)||[]).map(function(w){return w.slice(0,5)})}
function fit(pr,p){if(!pr||!Object.keys(pr).length)return null;if(pr.genre&&p.genre!=pr.genre)return -1;if((pr.amin&&p.age<pr.amin)||(pr.amax&&p.age>pr.amax))return -1;var s=50;if((pr.communes||[]).length&&pr.communes.indexOf(p.commune)>-1)s+=15;var pi=(p.interets||[]).map(function(x){return x.toLowerCase()});s+=Math.min(4,(pr.ints||[]).filter(function(x){return pi.indexOf(x.toLowerCase())>-1}).length)*6;var T=toks([p.bio,(p.interets||[]).join(' '),p.profession].join(' ')),k=toks(pr.desc).filter(function(w,i,a){return a.indexOf(w)==i});s+=Math.min(3,k.filter(function(w){return T.indexOf(w)>-1}).length)*4;return Math.min(s,99)}
function sc(p){var r=fit(mine&&mine.prefs,p);return r===null?(mine?affs(p):0):r}
function recip(p){return false}
function pour(){var pr=mine&&mine.prefs;if(!mine)return '';if(!pr||!Object.keys(pr).length)return '<div class="wall pop" style="margin-top:14px"><b>🎯 Dis-nous qui tu cherches</b><p class="note">Le site classera les profils qui te correspondent.</p><button class="b1" style="width:100%" onclick="go(\'me\')">💘 Mes préférences</button></div>';var l=others().filter(function(p){return fit(pr,p)>=60}).sort(function(a,b){return sc(b)-sc(a)}).slice(0,6);return '<h2>🎯 Faits pour toi</h2>'+(l.length?'<div class="scroller">'+l.map(card).join('')+'</div>':'<p class="note">Pas encore de profil qui te correspond. Invite tes amis, ou élargis tes critères.</p>')}
function chips(c,list,sel){return list.map(function(x){return '<label class="lg chp"><input type="checkbox" class="'+c+'" value="'+x+'"'+((sel||[]).indexOf(x)>-1?' checked':'')+'><span>'+x+'</span></label>'}).join('')}
function vals(c){return [].slice.call(document.querySelectorAll('.'+c+':checked')).map(function(x){return x.value})}
function prefsBox(){if(!mine)return '<div class="box" style="margin-top:14px">Enregistre d’abord ton profil, puis dis-nous qui tu cherches 💘</div>';var r=mine.prefs||{};return '<h2>💘 Mes préférences</h2><div class="box list"><p class="note" style="margin:0">Dis qui tu cherches : le site classe automatiquement les profils qui te correspondent.</p><div class="g2"><label>Je cherche<select id="xg"><option value="">Peu importe</option><option value="F"'+(r.genre=='F'?' selected':'')+'>Une femme</option><option value="H"'+(r.genre=='H'?' selected':'')+'>Un homme</option></select></label><label>Âge (min – max)<span class="pw"><input id="xa" type="number" inputmode="numeric" value="'+esc(r.amin||18)+'"><input id="xb" type="number" inputmode="numeric" value="'+esc(r.amax||60)+'"></span></label></div><b style="font-size:14px">Communes</b><div>'+chips('xc',COM,r.communes)+'</div><b style="font-size:14px">Ce qu’elle ou il aime</b><div>'+chips('xi',INT,r.ints)+'</div><b style="font-size:14px">Type de relation</b><div>'+chips('xr',REL,r.rel)+'</div><label>Décris la personne idéale (avec tes mots)<textarea id="xd" rows="3" maxlength="300" placeholder="Ex. quelqu’un de sérieux, qui aime voyager et la musique">'+esc(r.desc)+'</textarea></label><button class="b1" onclick="savePrefs()">🔎 Trouver mes profils compatibles</button></div>'}
async function savePrefs(){var pr={genre:$('xg').value,amin:+$('xa').value||18,amax:+$('xb').value||99,communes:vals('xc'),ints:vals('xi'),rel:vals('xr'),desc:$('xd').value.trim()},merged=Object.assign({},priv.prefs||mine.prefs||{},pr);var r=await sb.from('prives').upsert({id:me.id,prefs:merged});if(r.error){msg='Préférences non enregistrées : '+r.error.message;return draw()}priv.prefs=merged;mine.prefs=merged;radar()}
function radar(){var n=others().filter(function(p){return fit(mine.prefs,p)>=60}).length,d=document.createElement('div');d.className='wel';d.innerHTML='<div><div class="rdr"><i></i><i></i><i></i><span>💘</span></div><h2 id="rt">Recherche de personnes compatibles…</h2></div>';document.body.appendChild(d);setTimeout(function(){var t=$('rt');if(!t)return;if(!n){t.textContent='Personne pour l’instant. Invite tes amis !';return}t.innerHTML='🎉 <b id="cn">0</b> personne'+(n>1?'s te correspondent':' te correspond')+' !';var i=0,iv=setInterval(function(){i++;var c=$('cn');if(c)c.textContent=i;if(i>=n)clearInterval(iv)},140);hearts()},1700);setTimeout(function(){d.remove();go('home')},4300)}
var allMsgs=[],lastMsgId=0,pollInit=false,rseen=null,mset=null,swr=null,seen={},notified={};try{seen=JSON.parse(localStorage.getItem('seen')||'{}')}catch(e){}
function markSeen(id){seen[id]=Date.now();try{localStorage.setItem('seen',JSON.stringify(seen))}catch(e){}}
function unr(o){return allMsgs.filter(function(m){return m.de==o&&new Date(m.created_at)>(seen[o]||0)}).length}
function bdg(k){var n=0;if(k=='chat')n=allMsgs.filter(function(m){return m.de!=me.id&&new Date(m.created_at)>(seen[m.de]||0)}).length;else if(k=='rdv')n=rdvs.filter(function(x){return x.a==me.id&&x.statut=='attente'}).length;return n?'<em class="bd">'+(n>9?'9+':n)+'</em>':''}
function updNav(){document.querySelectorAll('nav button').forEach(function(el){var s=el.querySelector('span'),e=s&&s.querySelector('.bd');if(e)e.remove();if(s&&el.dataset.k&&me)s.insertAdjacentHTML('beforeend',bdg(el.dataset.k))})}
function beep(){try{var a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.value=.04;o.start();o.stop(a.currentTime+.12)}catch(e){}}
function toast(t,b,dest,id){var d=document.createElement('div');d.className='toast';d.innerHTML='<b>'+esc(t)+'</b><span>'+esc(b)+'</span>';d.onclick=function(){d.remove();if(dest=='chat'){open=id||null;go('chat')}else go(dest)};document.body.appendChild(d);setTimeout(function(){d.remove()},5500)}
function notify(t,b,dest,id){toast(t,b,dest,id);try{if(navigator.vibrate)navigator.vibrate([100,50,100])}catch(e){}if(document.hidden&&'Notification' in window&&Notification.permission=='granted'&&swr)swr.showNotification(t,{body:b,tag:t+b,vibrate:[100,50,100]});beep()}
function initSW(){
 if(!('serviceWorker' in navigator)||window.__malSwInitStarted)return;
 window.__malSwInitStarted=true;
 var applying=false;
 function offerUpdate(reg){if(!reg||!reg.waiting||!navigator.serviceWorker.controller||document.getElementById('malSwUpdateNotice'))return;var notice=document.createElement('div');notice.id='malSwUpdateNotice';notice.className='toast';notice.innerHTML='<b>Nouvelle version de Malachite disponible</b><span>Tes données enregistrées restent sur ton compte. Actualise quand tu es prêt.</span><button type="button" class="b1">Actualiser</button>';notice.querySelector('button').addEventListener('click',function(){if(applying)return;applying=true;notice.querySelector('button').disabled=true;reg.waiting.postMessage({type:'SKIP_WAITING'})});document.body.appendChild(notice)}
 navigator.serviceWorker.addEventListener('controllerchange',function(){if(applying)window.location.reload()});
 navigator.serviceWorker.register('sw.js').then(function(reg){swr=reg;offerUpdate(reg);reg.addEventListener('updatefound',function(){var worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',function(){if(worker.state==='installed')offerUpdate(reg)})});setInterval(function(){reg.update().catch(function(){})},600000)}).catch(function(){});
}
initSW();
function askNotif(){if(!('Notification' in window)){alert('Ton navigateur ne gère pas les notifications.');return}Notification.requestPermission().then(function(){draw(true)})}
function rdvEvents(){var cur={},now=Date.now();rdvs.forEach(function(x){cur[x.id]=x.statut});if(rseen)rdvs.forEach(function(x){if(rseen[x.id]===undefined&&x.a==me.id)notify('📅 Invitation à un rendez-vous',((prof(x.de)||{}).prenom||'Quelqu’un')+' · '+x.lieu,'rdv','rdv-'+x.id);else if(rseen[x.id]==='attente'&&x.statut=='confirme'&&x.de==me.id)notify('✅ Rendez-vous confirmé',((prof(x.a)||{}).prenom||'Ton match')+' a confirmé','rdv','rdv-'+x.id)});rseen=cur;rdvs.forEach(function(x){var t=new Date(x.quand)-now;if(x.statut=='confirme'&&t>0&&t<3*36e5&&!notified['r'+x.id]){notified['r'+x.id]=1;notify('🔔 Rappel : rendez-vous bientôt','Dans '+Math.round(t/6e4)+' min · '+x.lieu,'rdv','reminder-rdv-'+x.id)}})}
var pollBusy=false,rdvPolledAt=0;
async function poll(){
 if(!me||document.hidden||pollBusy)return;
 pollBusy=true;
 try{
  var messageTask=null;
  if(tab!=='chat'&&!msgRealtimeReady){
   var query=sb.from('messages').select('id,de,a,texte,created_at,media_type');
   query=pollInit?query.gt('id',lastMsgId).order('id',{ascending:true}).limit(100):query.order('id',{ascending:false}).limit(200);
   messageTask=query;
  }
  var shouldRefreshRdv=tab==='rdv'||Date.now()-rdvPolledAt>120000;
  var tasks=await Promise.all([messageTask||Promise.resolve(null),shouldRefreshRdv?loadRdv():Promise.resolve(null)]);
  if(!me||document.hidden)return;
  var r=tasks[0];
  if(r&&!r.error){
   var batch=r.data||[];
   // Persistent message notifications are created by the database trigger; no duplicate polling toast.
   var known=Object.create(null),merged=[];
   (batch.concat(allMsgs||[])).forEach(function(m){var key=String(m.id);if(!known[key]){known[key]=1;merged.push(m)}});
   allMsgs=merged.slice(0,200);
   var mx=batch.reduce(function(a,m){return Math.max(a,Number(m.id)||0)},lastMsgId);
   lastMsgId=Math.max(lastMsgId,mx);pollInit=true;
  }
  if(shouldRefreshRdv)rdvPolledAt=Date.now();
  rdvEvents();
  var ids=tab==='chat'?(open?[open]:convs.map(function(x){return x.o}).filter(Boolean)):profs.map(function(x){return x.id}).filter(Boolean);
  if(ids.length&&!presenceReady){
   var q=await sb.from('profiles').select('id,derniere_vue').in('id',Array.from(new Set(ids)).slice(0,100));
   (q.data||[]).forEach(function(x){var pp=prof(x.id);if(pp)pp.derniere_vue=x.derniere_vue});
  }
  var e=$('pst');if(e&&open)e.innerHTML=presence(prof(open));updNav();
 }catch(error){console.warn('Synchronisation périodique Malachite',error)}
 finally{pollBusy=false}
}
var matchPollBusy=false;
async function matchPoll(){
 if(!me||document.hidden||matchPollBusy)return;
 matchPollBusy=true;
 try{
  var ids=Object.keys(ans).filter(function(k){return ans[k]===true}).slice(0,12);
  var results=await Promise.all(ids.map(function(id){return sb.rpc('est_match',{p_autre:id})}));
  if(!me||document.hidden)return;
  var cur={};
  results.forEach(function(result,index){
   if(result&&!result.error&&result.data){var id=ids[index];cur[id]=1;if(mset&&!mset[id])notify('💘 C’est un match !',((prof(id)||{}).prenom||'Quelqu’un')+' t’aime aussi','chat',id)}
  });
  mset=cur;
 }catch(error){console.warn('Vérification des matchs Malachite',error)}
 finally{matchPollBusy=false}
}
function ago(t){var d=new Date(t);return d.toDateString()==new Date().toDateString()?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
function chat(){if(open)return thread();return '<h2>Messages</h2><div class="list">'+(convs.length?convs.map(function(c){var p=prof(c.o)||{},u=unr(c.o);return '<button class="conv'+(u?' un':'')+'" onclick="openConv(\''+c.o+'\')"><span class="conv-avatar" onclick="event.stopPropagation();viewProf(\''+c.o+'\')" role="button" aria-label="Voir le profil de '+esc(p.prenom||'ce membre')+'">'+av(p)+'</span><div class="cb2"><div class="cn"><b>'+esc(p.prenom||'Membre')+(online(p)?'<i class="dot"></i>':'')+'</b><span class="ct">'+ago(c.at)+'</span></div><div class="cm">'+(c.me?'Toi : ':'')+esc(c.t).slice(0,60)+(u?'<em class="bd2">'+u+'</em>':'')+'</div></div></button>'}).join(''):'<div class="box" style="text-align:center">Aucune conversation pour l’instant 💬<div class="note">Aime un profil dans Découvrir, puis écris-lui !</div></div>')+'</div>'}
async function call(){alert('Les appels vidéo sont temporairement désactivés pour protéger la confidentialité.');}
var TH=[['Rose bonbon','linear-gradient(180deg,#FFF5F9,#FFD9E8)','#7A5566'],['Lavande','linear-gradient(180deg,#F6F0FF,#DCCBFF)','#5B4B7A'],['Ciel','linear-gradient(180deg,#EFF8FF,#BFE3FF)','#3F6280'],['Menthe','linear-gradient(180deg,#F0FFF7,#BDF1D6)','#3C6B55'],['Pêche','linear-gradient(180deg,#FFF6EE,#FFD3B5)','#7A5A45'],['Coucher de soleil','linear-gradient(180deg,#FFB199,#FF0844)','#fff'],['Océan','linear-gradient(180deg,#43C6AC,#191654)','#fff'],['Nuit étoilée','linear-gradient(180deg,#232526,#414345)','#ddd'],['Or','linear-gradient(180deg,#FFF8E1,#F5C451)','#6B4E10'],['Cerise','linear-gradient(180deg,#E6195E,#7A0A33)','#fff']],cth=0,thOpen=false;
try{cth=+localStorage.getItem('cth')||0}catch(e){}
function setTh(i){cth=i;try{localStorage.setItem('cth',i)}catch(e){}thOpen=false;draw(true)}
function openConv(id){if(!id||!me)return;if(id===me.id){msg='Conversation invalide : ton propre compte ne peut pas être destinataire.';return}closeTypingChannel();open=id;tab='chat';startTypingChannel(id);chatCursor=null;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;chatCursorFor=null;chatInitialLoading=true;blockedCurrent=false;blockedCheckedFor=null;msgs=[];lastSig='';replyDraft=null;msg='';clearInterval(timer);persistMalView();draw(true);loadChat();timer=setInterval(function(){if(tab==='chat'&&open&&!document.hidden&&!msgRealtimeReady)loadChat()},15000)}
async function openLinkedMessage(userId,messageId){
 if(!me||!userId||!messageId)return;
 var target=String(userId),targetMessage=Number(messageId);
 if(!Number.isSafeInteger(targetMessage)||targetMessage<1){openConv(target);return}
 openConv(target);
 for(var attempt=0;attempt<80;attempt++){
  if(open!==target||tab!=='chat')return;
  if(!chatLoadBusyKeys[target]&&chatCursorFor===target)break;
  await new Promise(function(resolve){setTimeout(resolve,40)});
 }
 if(open!==target||tab!=='chat')return;
 try{
  var result=await sb.from('messages').select('id,de,a,texte,created_at,media_type,media_url')
   .or('and(de.eq.'+me.id+',a.eq.'+target+'),and(de.eq.'+target+',a.eq.'+me.id+')')
   .lte('id',targetMessage).order('id',{ascending:false}).limit(60);
  if(result.error)throw result.error;
  var rows=(result.data||[]);
  if(!rows.some(function(row){return Number(row.id)===targetMessage})){
   var exact=await sb.from('messages').select('id,de,a,texte,created_at,media_type,media_url').eq('id',targetMessage).maybeSingle();
   if(exact.error||!exact.data||!((exact.data.de===me.id&&exact.data.a===target)||(exact.data.de===target&&exact.data.a===me.id))){
    console.warn('Message lié introuvable ou inaccessible',exact.error||'not found');return;
   }
   rows.push(exact.data);rows.sort(function(a,b){return Number(a.id)-Number(b.id)});
  }else rows.reverse();
  if(open!==target||tab!=='chat')return;
  msgs=rows;chatCursorFor=target;
  chatCursorId=rows.reduce(function(max,row){return Math.max(max,Number(row.id)||0)},0);
  chatBeforeId=rows.length?(Number(rows[0].id)||0):0;
  chatHasOlder=rows.length===60;chatInitialLoading=false;lastSig='';
  await resolveMessagesMedia(rows);
  if(open!==target||tab!=='chat')return;
  draw(true);
  if(typeof loadReceiptsForRows==='function')loadReceiptsForRows(rows).catch(function(error){console.warn('Accusés du message ciblé',error)});
  requestAnimationFrame(function(){
   var node=document.querySelector('[data-message-id="'+targetMessage+'"]');
   if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.add('mal-notification-target-message');setTimeout(function(){node.classList.remove('mal-notification-target-message')},2400)}
  });
 }catch(error){console.warn('Ouverture du message depuis une notification',error)}
}
window.openLinkedMessage=openLinkedMessage;

function closeConv(){closeTypingChannel();open=null;chatCursor=null;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;chatCursorFor=null;chatInitialLoading=false;msgs=[];lastSig='';go('chat')}
function goTab(k){if(k=='chat'){open=null;chatCursor=null;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;chatCursorFor=null;chatInitialLoading=false;msgs=[];lastSig=''}go(k)}
function online(p){if(!p||!p.id)return false;if(presenceReady)return !!onlineIds[p.id];return !!(p.derniere_vue&&Date.now()-new Date(p.derniere_vue)<120000)}
function presence(p){
 if(online(p))return '<span class="on2">🟢 En ligne</span>';
 var t=p&&p.derniere_vue?new Date(p.derniere_vue):null;if(!t||!Number.isFinite(t.getTime()))return '<span class="off">Hors ligne</span>';
 var diff=Math.max(0,Date.now()-t.getTime()),label;
 if(diff<60000)label='à l’instant';
 else if(diff<3600000)label='il y a '+Math.max(1,Math.floor(diff/60000))+' min';
 else if(diff<86400000)label='il y a '+Math.max(1,Math.floor(diff/3600000))+' h';
 else if(diff<172800000)label='hier à '+t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 else label='le '+t.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' à '+t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 return '<span class="off">Hors ligne · '+label+'</span>';
}
function refreshPresenceUI(){
 var state=presenceChannel&&presenceChannel.presenceState?presenceChannel.presenceState():{};
 onlineIds=Object.create(null);
 Object.keys(state||{}).forEach(function(key){(state[key]||[]).forEach(function(meta){var id=meta&&meta.user_id||key;if(id)onlineIds[id]=true})});
 presenceReady=true;
 var profileNode=document.querySelector('.mal-profile-presence');
 if(profileNode)profileNode.innerHTML=presence(malProfileViewerUser||prof(open)||{});
 if(tab==='chat'&&open){var node=$('pst');if(node)node.innerHTML=presence(prof(open)||{})}
 else if(tab==='chat')draw(true);
}
function trackPresence(){if(!presenceChannel||!me||document.hidden)return;presenceChannel.track({user_id:me.id,online:true}).catch(function(error){console.warn('Présence Malachite non publiée',error)})}
function startPresence(){if(!me)return;if(presenceChannel&&presenceUserId===me.id)return;if(presenceChannel){sb.removeChannel(presenceChannel);presenceChannel=null}presenceUserId=me.id;presenceReady=false;onlineIds=Object.create(null);presenceChannel=sb.channel('malachite-online-v1').on('presence',{event:'sync'},refreshPresenceUI).on('presence',{event:'join'},refreshPresenceUI).on('presence',{event:'leave'},refreshPresenceUI).subscribe(function(status,error){if(status==='SUBSCRIBED'){refreshPresenceUI();trackPresence()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')console.warn('Canal de présence indisponible : '+status,error||'')})}
function stopPresence(){if(presenceChannel){sb.removeChannel(presenceChannel);presenceChannel=null}presenceUserId=null;presenceReady=false;onlineIds=Object.create(null)}
function startTypingChannel(id){if(!me||!id)return;if(typingChannel){stopTyping();sb.removeChannel(typingChannel);typingChannel=null}typingTarget=id;var pair=[me.id,id].sort().join(':');typingChannel=sb.channel('malachite-typing-'+pair).on('broadcast',{event:'typing'},function(event){var payload=event&&event.payload||{};if(payload.user_id===me.id)return;var node=$('chatTyping');if(!node)return;node.hidden=!payload.typing;clearTimeout(typingHideTimer);if(payload.typing)typingHideTimer=setTimeout(function(){var current=$('chatTyping');if(current)current.hidden=true},2200)}).subscribe(function(status,error){if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('Canal de saisie indisponible',error||status)})}
function setTyping(){if(!typingChannel||!me||typingTarget!==open)return;var input=$('mi');if(!input||!input.value.trim()){stopTyping();return}if(!typingActive){typingActive=true;typingChannel.send({type:'broadcast',event:'typing',payload:{user_id:me.id,typing:true}})}clearTimeout(typingStopTimer);typingStopTimer=setTimeout(stopTyping,1400)}
function stopTyping(){clearTimeout(typingStopTimer);if(typingChannel&&typingActive&&me)typingChannel.send({type:'broadcast',event:'typing',payload:{user_id:me.id,typing:false}});typingActive=false}
function closeTypingChannel(){stopTyping();clearTimeout(typingHideTimer);if(typingChannel){sb.removeChannel(typingChannel);typingChannel=null}typingTarget=null}
function beat(force){if(!me||(!force&&document.hidden))return;sb.from('profiles').update({derniere_vue:new Date().toISOString()}).eq('id',me.id).then(function(r){if(r&&r.error)console.warn('Mise à jour de la dernière présence',r.error)})}
function cupidPass(){if(document.hidden||!me||tab=='chat'||document.documentElement.classList.contains('mal-low-power'))return;var c=document.createElement('div');c.className='cpf';c.style.top=(25+Math.random()*40)+'%';c.textContent='😇➳';document.body.appendChild(c);setTimeout(function(){c.remove()},7200)}
(function(){var b=document.createElement('div');b.id='bgfx';for(var i=0;i<8;i++){var e=document.createElement('i');e.textContent=['💗','💕','🌸','💖'][i%4];e.style.left=(5+i*12)+'%';e.style.animationDelay=(i*2)+'s';e.style.fontSize=(18+i%3*8)+'px';b.appendChild(e)}document.body.appendChild(b)})();
function thread(){var p=prof(open)||{},day='',T=TH[cth],h=fxl()+'<div class="chtop"><div class="top"><button onclick="closeConv()" aria-label="Retour" style="padding:8px 12px">←</button>'+'<button class="mal-chat-profile" type="button" data-profile-id="'+esc(open)+'" onclick="window.malOpenProfile(this.dataset.profileId)" aria-label="Ouvrir le profil de '+esc(p.prenom||'ce membre')+'">'+av(p)+'<span><b>'+esc(p.prenom||'Membre')+'</b><small id="pst">'+presence(p)+'</small></span><i>Voir le profil ›</i></button><button onclick="thOpen=!thOpen;draw(true)" aria-label="Changer le fond" style="padding:8px 12px">🎨</button><button onclick="toggleBlock(open)" aria-label="Bloquer ou débloquer ce membre" style="padding:8px 12px">🚫</button></div>'+(thOpen?'<div class="ths">'+TH.map(function(t,i){return '<button class="'+(i==cth?'sel':'')+'" title="'+t[0]+'" style="background:'+t[1]+'" onclick="setTh('+i+')"></button>'}).join('')+'</div><div class="note">Fond : '+esc(T[0])+'</div>':'')+'<div id="chatMatchBox">'+matchBox()+'</div></div><div id="chatTyping" class="chat-typing" aria-live="polite" hidden><span></span><span></span><span></span> '+esc(p.prenom||'Cette personne')+' écrit…</div><div class="chat" id="msgs" style="--cfg:'+T[2]+'">';
msgs.forEach(function(m,i){var d=new Date(m.created_at),k=d.toDateString();if(k!=day){day=k;h+='<div class="dsep">'+(k==new Date().toDateString()?'Aujourd’hui':d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}))+'</div>'}h+=bub(m,i)});
if(!msgs.length){if(chatInitialLoading)h+='<div class="chat-loading"><span class="chat-loading-dot"></span> Ouverture de la conversation…</div>';else h+='<div class="dsep">Dis bonjour 👋</div><div class="ice">'+ICE.map(function(t,i){return '<button onclick="ice('+i+')">'+esc(t)+'</button>'}).join('')+'</div>'}
return h+'</div>'+(blockedCurrent?'<div class="sendbar"><div class="note">🚫 Envoi de messages et médias désactivé pour cette conversation.</div></div>':'<div class="sendbar">'+(replyDraft?'<div class="reply-preview"><div><b>Réponse à '+esc(replyDraft.name)+'</b><span>'+esc(replyDraft.text)+'</span></div><button type="button" onclick="cancelReply()" aria-label="Annuler la réponse">✕</button></div>':'')+'<div class="err" id="chatSendError"'+(msg?'':' hidden')+'>'+esc(msg)+'</div>' + (/Premium/.test(msg)?'<button style="margin:4px 0" onclick="go(\'offres\')">⭐ Voir Premium</button>':'')+'<div class="chat-emoji-panel" id="chatEmojiPanel" hidden><button type="button" onclick="insertChatEmoji(this.textContent)">😊</button><button type="button" onclick="insertChatEmoji(this.textContent)">😂</button><button type="button" onclick="insertChatEmoji(this.textContent)">🥰</button><button type="button" onclick="insertChatEmoji(this.textContent)">😍</button><button type="button" onclick="insertChatEmoji(this.textContent)">😘</button><button type="button" onclick="insertChatEmoji(this.textContent)">❤️</button><button type="button" onclick="insertChatEmoji(this.textContent)">🌹</button><button type="button" onclick="insertChatEmoji(this.textContent)">🎉</button><button type="button" onclick="insertChatEmoji(this.textContent)">🤗</button><button type="button" onclick="insertChatEmoji(this.textContent)">👍</button><div class="chat-sticker-label" style="width:100%;font-weight:700;font-size:12px">Stickers · toucher pour envoyer</div><div class="chat-stickers" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" style="font-size:26px" onclick="sendSticker(&quot;🥰&quot;)">🥰</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;😂&quot;)">😂</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;😍&quot;)">😍</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;😘&quot;)">😘</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;💖&quot;)">💖</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;🤗&quot;)">🤗</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;🎉&quot;)">🎉</button><button type="button" style="font-size:26px" onclick="sendSticker(&quot;🌹&quot;)">🌹</button></div></div><div class="chat-attach-menu" id="chatAttachMenu" hidden><button type="button" onclick="document.getElementById(this.dataset.target).click();toggleChatAttach()" data-target="chatCameraInput">📸 <span>Appareil photo</span></button><button type="button" onclick="document.getElementById(this.dataset.target).click();toggleChatAttach()" data-target="chatImageInput">🖼️ <span>Photos</span></button><button type="button" onclick="document.getElementById(this.dataset.target).click();toggleChatAttach()" data-target="chatVideoInput">🎬 <span>Vidéo</span></button><button type="button" onclick="document.getElementById(this.dataset.target).click();toggleChatAttach()" data-target="chatDocumentInput">📎 <span>Document</span></button></div><div class="send chat-composer"><input id="chatCameraInput" class="chat-hidden-file" type="file" accept="image/*" capture="environment" onchange="sendImg(this)"><input id="chatImageInput" class="chat-hidden-file" type="file" accept="image/*" onchange="sendImg(this)"><input id="chatVideoInput" class="chat-hidden-file" type="file" accept="video/*,.mp4,.mov,.webm,.3gp" onchange="sendVideo(this)"><input id="chatDocumentInput" class="chat-hidden-file" type="file" accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onchange="sendDocument(this)"><button type="button" class="chat-tool" onclick="toggleChatAttach()" aria-label="Joindre un fichier">＋</button><button type="button" class="chat-tool" onclick="toggleChatEmoji()" aria-label="Emojis et stickers">☺</button><input id="mi" placeholder="Écris un message…" aria-label="Message" autocomplete="off" oninput="setTyping()" onkeydown="if(event.key==\'Enter\')snd()"><button onclick="recStart()" aria-label="Message vocal" class="chat-tool mic">🎤</button><button onclick="snd()" aria-label="Envoyer" class="chat-send">➤</button></div><div id="chatUploadStatus" class="chat-upload-status" aria-live="polite"></div></div>')}
var replyDraft=null, messageActionLayer=null;
function closeMessageActions(){if(messageActionLayer){messageActionLayer.remove();messageActionLayer=null}}
function openMessageActions(i,event){if(event&&event.target&&event.target.closest&&event.target.closest('audio,video,a,button'))return;var m=msgs[i];if(!m)return;closeMessageActions();var name=m.de==me.id?'Toi':((prof(m.de)||{}).prenom||'Membre'),txt=(m.texte|| (m.media_type=='image'?'Photo':m.media_type=='audio'?'Message vocal':'Message')).slice(0,220);var layer=document.createElement('div');layer.className='msg-action-backdrop';layer.innerHTML='<div class="msg-action-sheet" role="dialog" aria-label="Actions du message"><div class="msg-action-grip"></div><div class="msg-action-quote"><b>'+esc(name)+'</b><span>'+esc(txt)+'</span></div><div class="msg-action-buttons"><button type="button" onclick="replyToMessage('+i+')">↩️ Répondre</button><button type="button" onclick="copyMessage('+i+')">📋 Copier</button><button type="button" onclick="shareMessage('+i+')">↗️ Partager</button></div><button type="button" class="msg-action-cancel" onclick="closeMessageActions()">Annuler</button></div>';layer.addEventListener('click',function(e){if(e.target===layer)closeMessageActions()});document.body.appendChild(layer);messageActionLayer=layer}
function replyToMessage(i){var m=msgs[i];if(!m)return;replyDraft={name:m.de==me.id?'Toi':((prof(m.de)||{}).prenom||'Membre'),text:(m.texte|| (m.media_type=='image'?'📷 Photo':m.media_type=='audio'?'🎤 Message vocal':'Message')).slice(0,180)};closeMessageActions();draw(true);var input=$('mi');if(input)input.focus()}
function cancelReply(){replyDraft=null;draw(true)}
async function copyMessage(i){var m=msgs[i];if(!m)return;var t=m.texte|| (m.media_type=='image'?'📷 Photo':m.media_type=='audio'?'🎤 Message vocal':'Message');try{await navigator.clipboard.writeText(t);closeMessageActions();alert('Message copié dans le presse-papiers.')}catch(e){closeMessageActions();alert('Copie indisponible sur ce navigateur.')}}
async function shareMessage(i){var m=msgs[i];if(!m)return;var t=m.texte|| (m.media_type=='image'?'📷 Photo':m.media_type=='audio'?'🎤 Message vocal':'Message');try{if(navigator.share)await navigator.share({title:'Message Malachite',text:t});else{await navigator.clipboard.writeText(t);alert('Texte copié : tu peux le partager.')}}catch(e){}closeMessageActions()}
var mr=null,chunks=[],rt=0,rtm=null,rcancel=false,aud=null,audBtn=null,star=0,avs=[],STT=['Choisis une note','Décevant','Moyen','Bien','Très bien','Excellent !'];
async function recStart(){
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){msg='Ton navigateur ne prend pas en charge les messages vocaux.';return draw(true)}
 var stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}
 catch(e){msg='Micro refusé ou indisponible. Autorise le micro dans les réglages du navigateur.';return draw(true)}
 var choices=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg','audio/mp4'];
 var chosen='';for(var i=0;i<choices.length;i++){if(MediaRecorder.isTypeSupported(choices[i])){chosen=choices[i];break}}
 try{mr=new MediaRecorder(stream,chosen?{mimeType:chosen}:{});}
 catch(e){stream.getTracks().forEach(function(t){t.stop()});msg='Impossible de démarrer l’enregistrement sur cet appareil.';return draw(true)}
 chunks=[];rcancel=false;rt=0;
 mr.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
 mr.onerror=function(){stream.getTracks().forEach(function(t){t.stop()});msg='Erreur pendant l’enregistrement vocal.';draw(true)};
 mr.onstop=function(){
  stream.getTracks().forEach(function(t){t.stop()});clearInterval(rtm);
  var bar=$('recbar');if(bar)bar.remove();
  if(!rcancel&&chunks.length)sendAudio(new Blob(chunks,{type:mr.mimeType||chosen||'audio/webm'}),rt);
 };
 mr.start();
 var b=document.createElement('div');b.id='recbar';b.className='recbar pop';
 b.innerHTML='<button type="button" onclick="recStop(true)" aria-label="Annuler le vocal">🗑</button><span class="rdot"></span><b id="rtm">0:00</b><span class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><button type="button" class="b1" onclick="recStop(false)" aria-label="Envoyer le vocal">➤</button>';
 document.body.appendChild(b);
 rtm=setInterval(function(){rt++;var e=$('rtm');if(e)e.textContent=Math.floor(rt/60)+':'+('0'+rt%60).slice(-2);if(rt>=120)recStop(false)},1000);
}
function recStop(c){rcancel=!!c;if(mr&&mr.state!='inactive')mr.stop()}
async function sendAudio(blob,sec){
 var target=open;if(!target||!me||!blob||!blob.size)return;
 if(blob.size>8*1024*1024){setChatUploadStatus('Vocal trop volumineux : 8 Mo maximum.');return}
 var raw=(blob.type||'audio/webm').split(';')[0].toLowerCase(),types={'audio/webm':'webm','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/ogg':'ogg','audio/aac':'aac','audio/mpeg':'mp3'},ext=types[raw];
 if(!ext){setChatUploadStatus('Format audio non pris en charge.');return}
 var path=me.id+'/'+target+'/vocal-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.'+ext;
 sendChatMediaFast(blob,{path:path,type:'audio',mime:raw,text:'🎤 Message vocal ('+(sec||0)+' s)',progressText:'Envoi du message vocal…'});
}
async function sendDocument(el){
 var f=el&&el.files&&el.files[0];if(!f)return;
 var target=open,clear=function(){if(el)el.value=''};if(!target||!me){clear();return}
 var types={'application/pdf':'pdf','text/plain':'txt','text/csv':'csv','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-powerpoint':'ppt','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx'},mimeByExt={pdf:'application/pdf',txt:'text/plain',csv:'text/csv',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
 var ext=types[f.type]||(f.name&&f.name.split('.').pop().toLowerCase()),mime=mimeByExt[ext]||f.type;
 if(!['pdf','txt','csv','doc','docx','xls','xlsx','ppt','pptx'].includes(ext)){setChatUploadStatus('Format de document non accepté.');clear();return}
 if(f.size>8*1024*1024){setChatUploadStatus('Document trop lourd : 8 Mo maximum.');clear();return}
 var path=me.id+'/'+target+'/document-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.'+ext;
 var label=f.name;clear();sendChatMediaFast(f,{path:path,type:'document',mime:mime,text:'📎 '+label,progressText:'Envoi du document…'});
}
function playV(b){if(aud){aud.pause();if(audBtn){audBtn.textContent='▶';audBtn.parentNode.classList.remove('pl')}if(audBtn===b){aud=null;audBtn=null;return}}aud=new Audio(b.dataset.src);audBtn=b;b.textContent='⏸';b.parentNode.classList.add('pl');aud.onended=function(){b.textContent='▶';b.parentNode.classList.remove('pl');aud=null;audBtn=null};aud.play().catch(function(){b.textContent='▶';b.parentNode.classList.remove('pl')})}
function setStar(i){star=i;document.querySelectorAll('#st button').forEach(function(b,k){b.classList.toggle('on',k<i);b.classList.remove('pp');if(k<i){void b.offsetWidth;b.style.animationDelay=(k*70)+'ms';b.classList.add('pp')}});$('stt').textContent=STT[i];if(i==5)hearts()}
function referralsAdmin(){return '<h2>🔗 Parrainages ('+referralRows.length+')</h2><p class="note">Chaque inscription confirmée est associée une seule fois au compte qui a partagé le lien.</p><div class="list">'+(referralRows.length?referralRows.map(function(x){return '<div class="card"><b>'+esc(x.referred_name||'Nouveau membre')+(x.referred_username?' · @'+esc(x.referred_username):'')+'</b><div class="sub">Invité par '+esc(x.referrer_name||'Membre')+(x.referrer_username?' · @'+esc(x.referrer_username):'')+'</div><div class="note">Inscription : '+new Date(x.joined_at).toLocaleString('fr-FR')+'</div></div>'}).join(''):'<p class="note">Aucun parrainage enregistré pour le moment.</p>')+'</div>'}
function avisList(){var avg=avs.length?(avs.reduce(function(a,x){return a+x.note},0)/avs.length).toFixed(1):'–';return '<h2>⭐ Avis des membres ('+avs.length+' · moyenne '+avg+'/5)</h2><div class="list">'+(avs.length?avs.map(function(x){var p=prof(x.user_id)||{};return '<div class="card"><div><b>'+esc(p.prenom||'Membre')+'</b> · '+'★'.repeat(x.note)+'☆'.repeat(5-x.note)+(x.categorie?' · '+esc(x.categorie):'')+'</div>'+(x.message?'<div>'+esc(x.message)+'</div>':'')+'<div class="note">'+ago(x.created_at)+'</div></div>'}).join(''):'<p class="note">Aucun avis pour l’instant.</p>')+'</div>'}
function reportsAdmin(){var n=sigs.filter(function(x){return x.statut==='nouveau'}).length;return '<h2>🚩 Signalements ('+n+' nouveaux)</h2><div class="list">'+(sigs.length?sigs.map(function(x){var reporter=prof(x.de)||{},target=prof(x.profil)||{};return '<div class="card"><b>'+esc(target.prenom||'Profil indisponible')+'</b><div class="sub">Signalé par '+esc(reporter.prenom||'Membre')+' · '+ago(x.created_at)+'</div><div>'+esc(x.motif||'Motif non précisé')+'</div><div class="sub">État : '+esc(x.statut||'nouveau')+'</div>'+(x.statut==='nouveau'?'<div class="acts"><button class="b1" onclick="moderate('+x.id+',\'examine\')">Examiner</button><button onclick="moderate('+x.id+',\'rejete\')">Classer sans suite</button></div>':'')+(x.profil&&x.profil!==me.id?'<button class="err" onclick="suspendMember(\''+esc(x.profil)+'\')">🚫 Suspendre ce compte</button>':'')+'</div>'}).join(''):'<p class="note">Aucun signalement.</p>')+'</div>'}
async function unsuspendMember(id){if(!confirm('Réactiver ce compte ?'))return;var r=await sb.functions.invoke('admin-user-moderation',{body:{user_id:id,action:'unsuspend'}});if(r.error){alert('Réactivation impossible : '+(r.data&&r.data.error?r.data.error:r.error.message));return}alert('Suspension levée.');await loadAdm()}
function suspensionsAdmin(){return '<h2>Comptes suspendus ('+admSuspensions.length+')</h2><div class="list">'+(admSuspensions.length?admSuspensions.map(function(x){var p=prof(x.user_id)||{};return '<div class="card"><b>'+esc(p.prenom||'Compte')+'</b><div class="sub">Depuis '+ago(x.depuis)+'</div><div>'+esc(x.motif||'Motif non précisé')+'</div><button class="b1" onclick="unsuspendMember(&quot;'+esc(x.user_id)+'&quot;)">Réactiver le compte</button></div>'}).join(''):'<p class="note">Aucun compte suspendu.</p>')+'</div>'}
var malAdminPage='payments',malSettingsPage='publicite',malCampaignRows=[];
function malSetAdminPage(page){if(['payments','members','copilots','settings'].indexOf(page)<0)return;malAdminPage=page;draw(true);if(page!=='copilots')loadAdm()}
function malSetSettingsPage(page){if(['publicite','support','avis','notifications','parrainages'].indexOf(page)<0)return;malSettingsPage=page;draw(true);loadAdm()}
function malSettings(){
 var nav='<div class="mal-settings-tabs"><button class="'+(malSettingsPage==='publicite'?'sel':'')+'" onclick="malSetSettingsPage(\'publicite\')">📢 Publicité</button><button class="'+(malSettingsPage==='support'?'sel':'')+'" onclick="malSetSettingsPage(\'support\')">🛟 Support</button><button class="'+(malSettingsPage==='avis'?'sel':'')+'" onclick="malSetSettingsPage(\'avis\')">⭐ Avis</button><button class="'+(malSettingsPage==='notifications'?'sel':'')+'" onclick="malSetSettingsPage(\'notifications\')">🔔 Appareils</button><button class="'+(malSettingsPage==='parrainages'?'sel':'')+'" onclick="malSetSettingsPage(\'parrainages\')">🔗 Parrainages</button></div>';
 var body=malSettingsPage==='publicite'?campaignsAdmin():malSettingsPage==='support'?supportAdmin():malSettingsPage==='avis'?avisList():malSettingsPage==='parrainages'?referralsAdmin():'<h2>Notifications administrateur</h2><div class="card"><p class="note" id="malPushStatus">Active les alertes sur cet appareil pour recevoir les nouvelles demandes.</p><div id="malPushDevices" class="list"></div><div class="acts"><button class="b1" onclick="malEnableAdminPush()">Activer ici</button><button onclick="malTestAdminPush()">Tester</button><button onclick="malDisableAdminPush()">Désactiver ici</button></div></div>';
 return nav+body;
}
function receiptMarkup(m,pending){
 if(pending)return '<span class="msg-status pending" role="img" aria-label="En attente d’envoi"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3.2 2"></path></svg></span>';
 if(!m||m.de!==me.id)return '';
 var r=receiptByMessage[String(m.id)],kind=r&&r.read_at?'read':r&&r.delivered_at?'delivered':'sent';
 if(kind==='read')return '<span class="msg-status read" role="img" aria-label="Lu"><svg viewBox="0 0 28 18" aria-hidden="true"><path d="m1.5 9 5 5 10-10"></path><path d="m9 9 5 5L26 2"></path></svg></span>';
 if(kind==='delivered')return '<span class="msg-status delivered" role="img" aria-label="Reçu"><svg viewBox="0 0 28 18" aria-hidden="true"><path d="m1.5 9 5 5 10-10"></path><path d="m9 9 5 5L26 2"></path></svg></span>';
 return '<span class="msg-status sent" role="img" aria-label="Envoyé"><svg viewBox="0 0 24 18" aria-hidden="true"><path d="m3 9 5 5L21 2"></path></svg></span>';
}
function patchReceipt(messageId){
 var node=document.querySelector('.m[data-message-id="'+String(messageId)+'"]');
 if(!node)return;
 var m=msgs.find(function(x){return String(x.id)===String(messageId)});
 var status=node.querySelector('.msg-status');
 if(!m||m.de!==me.id)return;
 var html=receiptMarkup(m,!!m._pending);
 if(status){var holder=document.createElement('span');holder.innerHTML=html;var next=holder.firstElementChild;if(next)status.replaceWith(next)}
 else{var tm=node.querySelector('.tm');if(tm)tm.insertAdjacentHTML('beforeend',html)}
}
async function loadReceiptsForRows(rows){
 var ids=(rows||[]).filter(function(m){return m&&m.de===me.id&&m.id&&!m._pending}).map(function(m){return m.id});
 if(!ids.length)return;
 var r=await sb.from('message_receipts').select('message_id,sender_id,recipient_id,delivered_at,read_at').in('message_id',ids);
 if(r.error){console.warn('Chargement des confirmations',r.error);return}
 (r.data||[]).forEach(function(x){receiptByMessage[String(x.message_id)]=x;patchReceipt(x.message_id)});
}
async function markIncomingReceipts(rows,asRead){
 if(!me||!Array.isArray(rows))return;
 var incoming=rows.filter(function(m){return m&&m.id&&m.de!==me.id&&m.a===me.id});
 if(!incoming.length)return;
 var now=new Date().toISOString();
 var payload=incoming.map(function(m){return {message_id:m.id,sender_id:m.de,recipient_id:me.id,delivered_at:now}});
 var ins=await sb.from('message_receipts').upsert(payload,{onConflict:'message_id',ignoreDuplicates:true});
 if(ins.error){console.warn('Confirmation de réception',ins.error);return}
 if(asRead&&document.visibilityState==='visible'){
  var ids=incoming.map(function(m){return m.id});
  var upd=await sb.from('message_receipts').update({read_at:now}).in('message_id',ids).eq('recipient_id',me.id).is('read_at',null);
  if(upd.error)console.warn('Confirmation de lecture',upd.error);
 }
}
function handleReceiptEvent(payload){
 var row=payload&&payload.new;if(!row||row.sender_id!==me.id)return;
 receiptByMessage[String(row.message_id)]=row;
 patchReceipt(row.message_id);
}
async function syncIncomingDeliveries(){
 if(!me)return;
 var r=await sb.from('messages').select('id,de,a').eq('a',me.id).neq('de',me.id).order('id',{ascending:false}).limit(200);
 if(r.error){console.warn('Synchronisation des réceptions',r.error);return}
 await markIncomingReceipts(r.data||[],false);
}

function bub(m,i){var pending=!!m._pending,u=!!m.display_url,j=m.media_type=='call'&&/^https:\/\/meet\.jit\.si\//.test(m.media_url||''),t=new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),file=(m.media_url||'').split('/').pop()||'document';var body=u&&m.media_type=='image'?'<img alt="photo" class="pic" loading="lazy" decoding="async" onclick="viewImg(this.src,event)" src="'+esc(m.display_url)+'">':u&&m.media_type=='video'?'<video class="chat-video" controls playsinline preload="metadata" src="'+esc(m.display_url)+'"></video>':u&&m.media_type=='audio'?'<audio class="aud" controls preload="metadata" src="'+esc(m.display_url)+'"></audio><a class="ol" href="'+esc(m.display_url)+'" target="_blank" rel="noopener">Si ça ne joue pas : ouvrir le vocal</a>':u&&m.media_type=='document'?'<a class="chat-document" href="'+esc(m.display_url)+'" target="_blank" rel="noopener" download><b>📄 '+esc((m.texte||file).slice(2))+'</b><small>Télécharger le document</small></a>':j?'📹 <b>Appel vidéo indisponible temporairement</b>':esc(m.texte);return '<div class="m '+(m.de==me.id?'out':'in')+'" data-message-id="'+esc(m.id)+'" data-message-index="'+i+'" onclick="openMessageActions('+i+',event)" role="button" tabindex="0" aria-label="Options du message">'+body+'<span class="tm">'+(pending?'Envoi…':t)+receiptMarkup(m,pending)+'</span></div>'}
function viewImg(u,event){if(event)event.stopPropagation();var d=document.createElement('div');d.className='lbx';d.innerHTML='<button class="lx" aria-label="Fermer">✕</button><img alt="photo" src="'+esc(u)+'"><div class="lbar"><button class="b1" id="lsv">⬇ Enregistrer</button><button id="lsh">↗ Partager</button></div>';d.onclick=function(e){if(e.target===d||e.target.className=='lx')d.remove()};document.body.appendChild(d);
$('lsv').onclick=async function(){try{var r=await fetch(u),b=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='malachite-'+Date.now()+'.jpg';document.body.appendChild(a);a.click();a.remove()}catch(e){window.open(u,'_blank')}};
$('lsh').onclick=async function(){try{var r=await fetch(u),b=await r.blob(),f=new File([b],'photo.jpg',{type:b.type||'image/jpeg'});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f]});else if(navigator.share)await navigator.share({url:u});else{await navigator.clipboard.writeText(u);alert('Lien copié')}}catch(e){}}}
function fxl(){return '<div class="fxl" style="background:'+TH[cth][1]+'"></div>'}
async function loadMyAvis(){var r=await sb.from('avis_site').select('*').eq('user_id',me.id).order('created_at',{ascending:false});myAvis=r.data||[]}
function avisInner(){var l=myAvis.length?'<h3 style="margin:8px 0">Tes avis envoyés</h3><div class="list">'+myAvis.map(function(x){return '<div class="card"><div style="color:#F5B301;font-size:18px">'+'★'.repeat(x.note)+'<span style="color:#E5D3DB">'+'★'.repeat(5-x.note)+'</span></div>'+(x.categorie?'<div><span class="chip">'+esc(x.categorie)+'</span></div>':'')+(x.message?'<div>'+esc(x.message)+'</div>':'')+'<div class="note">Envoyé '+ago(x.created_at)+'</div></div>'}).join('')+'</div>':'';return '<h2>⭐ Ton avis sur Malachite</h2>'+l+'<div class="box list fb" style="margin-top:10px"><p class="note" style="margin:0">'+(myAvis.length?'Tu peux envoyer un nouvel avis quand tu veux.':'Dis-nous ce que tu penses du site. Ton avis nous aide à l’améliorer !')+'</p><div class="stars" id="st">'+[1,2,3,4,5].map(function(i){return '<button class="'+(i<=star?'on':'')+'" onclick="setStar('+i+')" aria-label="'+i+' étoiles">★</button>'}).join('')+'</div><div class="note" id="stt" style="text-align:center">'+STT[star]+'</div><div>'+['🎨 Design','💬 Conversations','💘 Rencontres','⚡ Rapidité','Autre'].map(function(c){return '<label class="lg chp"><input type="radio" name="fc" class="fcat" value="'+c+'"><span>'+c+'</span></label>'}).join('')+'</div><textarea id="fm" rows="3" maxlength="500" placeholder="Ton message : ce que tu aimes, ce qu’on doit améliorer…"></textarea><button class="b1" onclick="sendAvis()">Envoyer mon avis 💌</button><div class="note" id="fbm"></div></div>'}
function avisBox(){return '<div id="avb">'+avisInner()+'</div>'}
async function sendAvis(){if(!star){$('fbm').textContent='Choisis une note de 1 à 5 étoiles.';return}var c=document.querySelector('.fcat:checked'),row={note:star,categorie:c?c.value:null,message:$('fm').value.trim()},r=await sb.from('avis_site').insert(row);if(r.error){$('fbm').textContent='Avis non envoyé : '+r.error.message;return}row.created_at=new Date().toISOString();myAvis.unshift(row);star=0;hearts();$('avb').innerHTML=avisInner();var n=$('fbm');if(n)n.textContent='Merci pour ton avis ! 💌'}
var IC={home:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',rdv:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',offres:'<path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7L12 17.8 5.7 21.3l1.6-7L2 9.6 9 9z"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',adm:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>'};
function ico(k){return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(IC[k]||'')+'</svg>'}
var Q={t:'',name:'',job:'',area:'',passion:'',g:'',c:'',a:18,b:99,ints:[],on:false,ver:false,ph:false,sort:'rel'};
function nz(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function qp(l,o,fn){return '<button class="pill'+(o?' on':'')+'" onclick="'+fn+'">'+l+'</button>'}
function search(){return '<section class="ml-search-intro"><span class="ml-auth-kicker">DÉCOUVRIR · MALACHITE</span><h2>Trouvez une belle rencontre.</h2><p>Un prénom, un métier, un quartier ou une passion : commencez votre recherche et découvrez les profils qui vous correspondent.</p></section><div class="ml-search-box"><div class="sbar"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="qt" placeholder="Recherche libre : prénom, métier, quartier, passion…" value="'+esc(Q.t)+'" oninput="Q.t=this.value;res()" autocomplete="off"></div><div class="ml-search-hint">Ou cible directement un critère pour trouver plus facilement la bonne personne.</div><div class="ml-search-fields"><label>Prénom / nom<input id="qname" placeholder="Ex. : Nadine" value="'+esc(Q.name||'')+'" oninput="Q.name=this.value;res()"></label><label>Métier / profession<input id="qjob" placeholder="Ex. : entrepreneur" value="'+esc(Q.job||'')+'" oninput="Q.job=this.value;res()"></label><label>Quartier / commune<input id="qarea" placeholder="Ex. : Golf, Kampemba" value="'+esc(Q.area||'')+'" oninput="Q.area=this.value;res()"></label><label>Centre d’intérêt<input id="qpassion" placeholder="Ex. : musique, voyage" value="'+esc(Q.passion||'')+'" oninput="Q.passion=this.value;res()"></label></div></div><div id="fq"></div><div id="rc" class="list ml-results-grid"></div>'}
function fqr(){$('fq').innerHTML='<div class="fx2">'+qp('Tous',!Q.g,"qset('g','')")+qp('Femmes',Q.g=='F',"qset('g','F')")+qp('Hommes',Q.g=='H',"qset('g','H')")+qp('En ligne',Q.on,"qtog('on')")+qp('Vérifiés',Q.ver,"qtog('ver')")+qp('Avec photo',Q.ph,"qtog('ph')")+'</div><div class="fx2"><select id="qc" onchange="Q.c=this.value;res()"><option value="">Toutes communes</option>'+COM.concat(['Autre']).map(function(c){return '<option'+(Q.c==c?' selected':'')+'>'+c+'</option>'}).join('')+'</select><input type="number" inputmode="numeric" value="'+Q.a+'" oninput="Q.a=+this.value||18;res()" aria-label="Âge min" style="width:64px"><input type="number" inputmode="numeric" value="'+Q.b+'" oninput="Q.b=+this.value||99;res()" aria-label="Âge max" style="width:64px"><select onchange="Q.sort=this.value;res()"><option value="rel"'+(Q.sort=='rel'?' selected':'')+'>Pertinence</option><option value="on"'+(Q.sort=='on'?' selected':'')+'>En ligne d’abord</option><option value="new"'+(Q.sort=='new'?' selected':'')+'>Plus récents</option></select></div><div class="fx2">'+INT.map(function(x){return qp(x,Q.ints.indexOf(x)>-1,"qint('"+x+"')")}).join('')+'</div>'}
function qset(k,v){Q[k]=v;fqr();res()}
function qtog(k){Q[k]=!Q[k];fqr();res()}
function qint(x){var i=Q.ints.indexOf(x);if(i>-1)Q.ints.splice(i,1);else Q.ints.push(x);fqr();res()}
function qreset(){Q={t:'',name:'',job:'',area:'',passion:'',g:'',c:'',a:18,b:99,ints:[],on:false,ver:false,ph:false,sort:'rel'};go('search')}
function res(){var t=nz(Q.t).trim().split(/\s+/).filter(Boolean),L=others().filter(function(p){var hay=nz([p.prenom,p.profession,p.commune,p.bio,(p.interets||[]).join(' ')].join(' '));if(!t.every(function(w){return hay.indexOf(w)>-1}))return false;if(Q.name&&!nz(p.prenom).includes(nz(Q.name).trim()))return false;if(Q.job&&!nz(p.profession).includes(nz(Q.job).trim()))return false;if(Q.area&&!nz(p.commune).includes(nz(Q.area).trim()))return false;if(p.profile_private&&(Q.job||Q.area||Q.passion||Q.g||Q.c||Q.a>18||Q.b<99||Q.ints.length))return false;if(Q.passion&&!(p.interets||[]).some(function(x){return nz(x).includes(nz(Q.passion).trim())})&&!nz(p.bio).includes(nz(Q.passion).trim()))return false;if(Q.g&&p.genre!=Q.g)return false;if(Q.c&&p.commune!=Q.c)return false;if(!p.profile_private&&(p.age<Q.a||p.age>Q.b))return false;if(Q.on&&!online(p))return false;if(Q.ver&&!on((st[p.id]||{}).verified_until))return false;if(Q.ph&&!(p.photos&&p.photos.length))return false;if(Q.ints.length&&!Q.ints.every(function(x){return (p.interets||[]).map(nz).indexOf(nz(x))>-1}))return false;return true}),nm=function(p){return t.length&&nz(p.prenom).indexOf(t[0])==0?1:0};
L.sort(function(a,b){if(Q.sort=='on')return (online(b)?1:0)-(online(a)?1:0);if(Q.sort=='new')return new Date(b.created_at||0)-new Date(a.created_at||0);return nm(b)-nm(a)||sc(b)-sc(a)});
var e=$('rc');if(e)e.innerHTML='<div class="note">'+L.length+' résultat'+(L.length>1?'s':'')+'</div>'+(L.length?L.map(row).join(''):'<div class="box" style="text-align:center">Aucun profil trouvé.<div class="note">Essaie un autre nom ou élargis les filtres.</div><button class="b1" style="margin-top:8px" onclick="qreset()">Réinitialiser</button></div>')}
function row(p){return card(p)}
var malProfileViewerUser=null,malProfileViewerPhotos=[],malProfileViewerIndex=0;
function malProfilePhoto(index){
 if(!malProfileViewerPhotos.length)return;
 malProfileViewerIndex=(index+malProfileViewerPhotos.length)%malProfileViewerPhotos.length;
 var img=$('malProfileHeroImage'),count=$('malProfilePhotoCount');
 if(img)img.src=malProfileViewerPhotos[malProfileViewerIndex];
 if(count)count.textContent=(malProfileViewerIndex+1)+' / '+malProfileViewerPhotos.length;
 document.querySelectorAll('.mal-profile-thumb').forEach(function(x,i){x.classList.toggle('active',i===malProfileViewerIndex)});
}
async function viewProf(id,startIndex){
  if(typeof window!=='undefined'&&typeof window.malOpenProfile==='function')return window.malOpenProfile(id,startIndex);
  console.warn('Lecteur de profil Malachite pas encore initialisé');
}
window.malOpenProfile=async function(id,startIndex){if(!me)return;var p=prof(id);if(!p){var q=await sb.from('profiles').select('id,username,prenom,age,genre,commune,quartier,profession,bio,interets,photos,created_at,prompts,derniere_vue,avatar,profile_private').eq('id',id).maybeSingle();if(q.error||!q.data){alert('Ce profil est indisponible.');return}p=q.data;await resolveProfilePhotos(p);profs.push(p)}else if(!p.photoUrls)await resolveProfilePhotos(p);var owner=p.id===me.id,locked=!!p.profile_private&&!owner,photos=locked?[]:(p.photoUrls||[]).filter(Boolean),a=p.avatar||{},avatar=(a.type==='humanforge-3d'&&a.imageUrl)?'<img class="mal-profile-3d-image" src="'+esc(a.imageUrl)+'" alt="Avatar 3D">':a.emoji?'<span class="mal-legacy-avatar">'+esc(a.emoji)+'</span>':'<span>'+esc((p.prenom||'M')[0])+'</span>',hero=photos.length&&!(a&&(a.type==='pro-vector'||a.type==='pro-photo')&&a.config&&a.config.useAsProfilePhoto!==false)?'<img id="malProfileHeroImage" src="'+esc(photos[0])+'" alt="Photo de '+esc(p.prenom||'membre')+'">':'<div class="mal-profile-no-photo mal-profile-avatar-hero">'+avatar+'</div>',facts=locked?'<div class="mal-profile-section"><p>Ce membre a choisi de garder les informations de son profil privées.</p></div>':'<div class="mal-profile-facts">'+(p.age?'<div><small>ÂGE</small><b>'+esc(p.age)+' ans</b></div>':'')+(p.commune?'<div><small>COMMUNE</small><b>'+esc(p.commune)+'</b></div>':'')+(p.profession?'<div><small>ACTIVITÉ</small><b>'+esc(p.profession)+'</b></div>':'')+(p.genre?'<div><small>PROFIL</small><b>'+(p.genre==='H'?'Homme':'Femme')+'</b></div>':'')+'</div>'+(p.bio?'<section class="mal-profile-section"><small>À PROPOS</small><p>'+esc(p.bio)+'</p></section>':'')+((p.interets||[]).length?'<section class="mal-profile-section"><small>CENTRES D’INTÉRÊT</small><div class="mal-profile-tags">'+p.interets.map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div></section>':'')+qaHtml(p);malProfileViewerUser=p;malProfileViewerPhotos=photos;malProfileViewerIndex=0;var html='<section id="malProfileOverlay" class="mal-profile-overlay" role="dialog" aria-modal="true" aria-label="Profil de '+esc(p.prenom||'membre')+'"><button class="mal-profile-close" type="button" onclick="closeMalProfile()" aria-label="Fermer">×</button><div class="mal-profile-hero">'+hero+'<div class="mal-profile-hero-shade"></div><div class="mal-profile-hero-caption"><span>MALACHITE · PROFIL</span><h1>'+esc(p.prenom||'Membre')+(locked?'':(p.age?', '+esc(p.age):''))+'</h1><p>'+esc(locked?'Profil privé':(p.commune||'Membre Malachite'))+'</p></div>'+(photos.length>1?'<button class="mal-profile-arrow prev" type="button" onclick="malProfilePhoto(malProfileViewerIndex-1)" aria-label="Photo précédente">‹</button><button class="mal-profile-arrow next" type="button" onclick="malProfilePhoto(malProfileViewerIndex+1)" aria-label="Photo suivante">›</button><span id="malProfilePhotoCount" class="mal-profile-photo-count">1 / '+photos.length+'</span>':'')+'</div><div class="mal-profile-body"><div class="mal-profile-presence">'+(online(p)?'● En ligne':'Membre Malachite')+'</div>'+(photos.length>1?'<div class="mal-profile-thumbs">'+photos.map(function(u,i){return '<button type="button" class="mal-profile-thumb '+(i===0?'active':'')+'" onclick="malProfilePhoto('+i+')"><img src="'+esc(u)+'" alt="Photo '+(i+1)+'"></button>'}).join('')+'</div>':'')+facts+'<div class="mal-profile-actions">'+(owner?'<button type="button" class="b1" onclick="closeMalProfile();goTab(\'me\')">Modifier mon profil</button>':(!locked?'<button type="button" class="b1" onclick="closeMalProfile();talk(\''+p.id+'\')">Écrire à '+esc(p.prenom||'ce membre')+'</button>':'') )+'<button type="button" onclick="closeMalProfile()">Fermer</button></div></div></section>';var old=$('malProfileOverlay');if(old)old.remove();document.body.insertAdjacentHTML('beforeend',html);var layer=$('malProfileOverlay');if(layer){layer.className='mal-profile-viewer';layer.classList.add('mal-profile-overlay')}document.body.classList.add('mal-profile-open');document.body.style.overflow='hidden';if(photos.length)malProfilePhoto(Math.max(0,Math.min(photos.length-1,Number(startIndex)||0)));};
function closeMalProfile(){var el=$('malProfileOverlay');if(el)el.remove();document.body.classList.remove('mal-profile-open');document.body.style.overflow='';}
var HP='M20 35C8 26 4 19 4 13.5 4 9 7.5 6 11.5 6c3.5 0 6.5 2 8.5 5 2-3 5-5 8.5-5C32.5 6 36 9 36 13.5 36 19 32 26 20 35z',FC='M11.5 6 20 11 28.5 6M4 13.5h32M4 13.5 20 35 36 13.5M13 13.5 20 11 27 13.5 20 35z';
function logo(z){return '<svg class="logo" viewBox="0 0 40 40" width="'+z+'" height="'+z+'" aria-hidden="true"><path d="'+HP+'" fill="url(#lg)"/><path d="'+FC+'" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9" stroke-linejoin="round"/><path d="M33 1v6M30 4h6" stroke="#C9A227" stroke-width="1.1" stroke-linecap="round"/></svg>'}
/* Startup splash removed: it could cover the entry screen on slow or stalled devices. */
function aff(p){if(!mine)return '';var r=fit(mine.prefs,p);if(r!==null&&r<0)return '';var s=r===null?affs(p):r;return '<div class="aff"><span class="ring" style="--p:'+s+'"><b>'+s+'%</b></span><span>'+(r===null?'Affinités (intérêts, commune)':'Selon tes préférences')+(recip(p)?'<span class="tag">Réciproque</span>':'')+'</span></div>'}
var PQ=['Mon coin préféré à Lubumbashi…','Le plat que je cuisine (ou mange) le mieux…','Rumba, Ndombolo ou Amapiano ? Ma réponse…','Un week-end parfait, c’est…','Ce que je recherche vraiment…','Mon rêve le plus fou…','Je ne peux pas vivre sans…'];
function pq(){var cur=(mine&&mine.prompts)||[];return '<h3 style="margin:6px 0 0">Mes questions-réponses</h3><p class="note" style="margin:0">Montre ta personnalité : choisis une question et réponds en une phrase.</p>'+[0,1,2].map(function(i){var c=cur[i]||{};return '<div class="qa"><select class="pqs">'+PQ.map(function(q,k){return '<option'+((c.q==q||(!c.q&&k==i))?' selected':'')+'>'+esc(q)+'</option>'}).join('')+'</select><input class="pqa" maxlength="120" placeholder="Ta réponse" value="'+esc(c.a)+'"></div>'}).join('')}
function pqv(){var q=document.querySelectorAll('.pqs'),a=document.querySelectorAll('.pqa'),o=[];for(var i=0;i<q.length;i++)if(a[i].value.trim())o.push({q:q[i].value,a:a[i].value.trim()});return o}
function qaHtml(p){return (p.prompts||[]).map(function(x){return '<div class="qa2"><small>'+esc(x.q)+'</small><div>'+esc(x.a)+'</div></div>'}).join('')}
function blockedPanel(){if(!blockedProfiles.length)return '';return '<h2>🚫 Membres bloqués</h2><div class="list">'+blockedProfiles.map(function(p){return '<div class="row"><div class="ri"><b>'+esc(p.prenom||'Membre')+'</b><div class="rs">'+esc(p.commune||'')+'</div></div><button onclick="toggleBlock(\''+p.id+'\')">Débloquer</button></div>'}).join('')+'</div>'}
function profilePrivacyControl(){var mode=priv.prefs&&priv.prefs.profile_visibility&&priv.prefs.profile_visibility.mode||(profileDraft&&profileDraft.profile_visibility)||'public';return '<section class="mal-privacy-box"><b>🔐 Confidentialité de mon profil</b><p>En mode public, les membres voient les informations que tu as ajoutées. En mode privé, ils voient uniquement ton prénom et ta photo principale. Ton âge, ta commune, ton métier, ta biographie, tes passions et tes autres photos restent privés.</p><label>Qui peut voir mes informations ?<select id="profileVisibility"><option value="public"'+(mode==='public'?' selected':'')+'>🌍 Profil public</option><option value="private"'+(mode==='private'?' selected':'')+'>🔒 Profil privé</option></select></label></section>'}
function accountIdentityCard(){
 var username=(mine&&mine.username)||(me&&me.user_metadata&&me.user_metadata.username)||'';
 return '<section class="mal-account-identity"><div><small>COMPTE ACTUELLEMENT CONNECTÉ</small><b>'+esc(me&&me.email||'Adresse e-mail indisponible')+'</b><span>'+(username?'@'+esc(username):'Nom d’utilisateur non défini')+'</span></div><div><small>TÉLÉPHONE (FACULTATIF)</small><b>'+esc(priv.telephone||'Non renseigné')+'</b></div><p>Tu es connecté à ce compte Malachite. Ton e-mail et ton téléphone ne sont pas affichés aux autres membres.</p></section>';
}
function moi(){var m=mine||profileDraft||{};function o(a,v){return a.map(function(x){return '<option'+(x==v?' selected':'')+'>'+x+'</option>'}).join('')}
 if(mine&&!profileEditing){
  var photos=(mine.photoUrls||phUrls||[]).filter(Boolean),ownAvatar=mine.avatar&&mine.avatar.type==='humanforge-3d'&&mine.avatar.imageUrl?'<div class="mal-own-avatar-preview"><img src="'+esc(mine.avatar.imageUrl)+'" alt="Mon avatar 3D" onerror="malRefreshAvatar(this,\''+esc(mine.id)+'\')"><span>MON AVATAR 3D</span></div>':'',cover=(mine.avatar&&mine.avatar.type==='humanforge-3d'&&mine.avatar.imageUrl)||photos[0]||'';
  return accountIdentityCard()+'<section class="mal-own-profile"><div class="mal-own-cover">'+(cover?'<img class="mal-own-cover-image" src="'+esc(cover)+'" alt="" fetchpriority="high" decoding="async" onerror="this.remove()">':'<span>💗</span>')+'<div class="mal-own-cover-label">MALACHITE · MON ESPACE</div><div class="mal-own-cover-shade"></div><div class="mal-own-cover-caption"><b>'+esc(m.prenom||'Mon profil')+(m.age?', '+esc(m.age):'')+'</b><span>'+esc(m.commune||'')+(m.profession?' · '+esc(m.profession):'')+'</span></div></div><div class="mal-own-main"><div class="mal-own-heading"><div class="mal-own-avatar-large">'+av(m)+'</div><div><h2>'+esc(m.prenom||'Mon profil')+(m.age?', '+esc(m.age):'')+'</h2><p>'+esc(m.commune||'')+(m.quartier?' · '+esc(m.quartier):'')+(m.profession?' · '+esc(m.profession):'')+'</p>'+(m.genre?'<small class="mal-own-meta">'+(m.genre==='H'?'Homme':'Femme')+'</small>':'')+'</div><span class="mal-own-status">Profil actif</span></div>'+ownAvatar+(m.bio?'<p class="mal-own-bio">'+esc(m.bio)+'</p>':'<p class="mal-own-empty">Ajoute une biographie pour permettre aux autres de mieux te connaître.</p>')+'<div class="mal-own-section"><b>Ce qui me passionne</b><div class="mal-own-chips">'+(m.interets||[]).map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div></div>'+((m.prompts||[]).filter(function(x){return x&&x.q&&x.a}).length?'<div class="mal-own-section"><b>Quelques réponses personnelles</b>'+(m.prompts||[]).filter(function(x){return x&&x.q&&x.a}).map(function(x){return '<div class="mal-own-prompt"><small>'+esc(x.q)+'</small><p>'+esc(x.a)+'</p></div>'}).join('')+'</div>':'')+'<div class="mal-own-gallery">'+photos.map(function(u,i){return '<img src="'+esc(u)+'" alt="Ma photo '+(i+1)+'" loading="'+(i===0?'eager':'lazy')+'" decoding="async"'+(i===0?' fetchpriority="high"':'')+' onclick="viewProf(me.id,'+i+')">'}).join('')+'</div><div class="mal-own-actions"><label class="btn mal-own-secondary">📷 '+(photos.length?'Ajouter une photo':'Ajouter ma photo')+'<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style="position:absolute;width:1px;height:1px;opacity:0" onchange="up(this)"></label>'+(profileSaving?'<button class="b1" disabled>Enregistrement…</button>':'<button class="b1" onclick="profileEditing=true;draw()">✎ Modifier mon profil</button><button class="btn mal-own-secondary" onclick="profileEditing=true;draw()">🎨 Modifier mon avatar</button>')+'</div><div class="note mal-own-note" style="margin-top:10px">'+esc(msg)+'</div></div></section>'+blockedPanel()+prefsBox()+avisBox()+'<button style="width:100%;margin-top:14px" onclick="out()">Me déconnecter</button>';
 }
 var m=mine||{};
 return accountIdentityCard()+'<h2>Construisons ton profil</h2><p class="note">Tes informations sont enregistrées sur ton compte. Tu pourras les modifier quand tu veux.</p>'+malAvatarPanel()+blockedPanel()+'<div class="box list"><div style="text-align:center"><div class="av" id="malProfilePhotoPreview" style="width:110px;height:110px;margin:0 auto 10px;font-size:40px;'+((pendingProfilePreview||phUrls[0])?'background-image:url('+esc(pendingProfilePreview||phUrls[0])+')':'')+'">'+((pendingProfilePreview||phUrls[0])?'':'📷')+'</div><label class="btn b1" style="position:relative;overflow:hidden">📷 '+(pendingProfileFile?'Photo prête à enregistrer':(ph.length?'Ajouter une autre photo':'Ajouter ma photo de profil'))+'<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style="position:absolute;inset:0;opacity:0;width:100%;height:100%" onchange="stageProfilePhoto(this)"></label><div class="ph" style="justify-content:center;margin-top:8px">'+phUrls.map(function(u,i){return '<div><img alt="" src="'+esc(u)+'"><br><button style="padding:3px 8px;font-size:12px" onclick="rm('+i+')">Retirer</button></div>'}).join('')+'</div><div id="malProfileMsg" class="note" style="color:var(--pink)">'+esc(msg)+'</div></div><label>Prénom<input id="pn" value="'+esc(m.prenom)+'"></label><label>Nom d’utilisateur de connexion<input id="pu" autocomplete="username" value="'+esc(m.username||((me.user_metadata&&me.user_metadata.username)||''))+'" placeholder="ex. nadroj_01"><small>Unique · 3 à 24 lettres, chiffres ou _ · facultatif</small></label><div class="g2"><label>Âge<input id="pa" type="number" inputmode="numeric" value="'+esc(m.age)+'"></label><label>Profession<input id="pj" value="'+esc(m.profession)+'"></label></div><div class="g2"><label>Je suis<select id="pg"><option value="H"'+(m.genre=='H'?' selected':'')+'>Un homme</option><option value="F"'+(m.genre=='F'?' selected':'')+'>Une femme</option></select></label><label>Commune<select id="pc">'+o(['Lubumbashi','Kampemba','Katuba','Kenya','Ruashi','Annexe','Golf','Bel-Air','Autre'],m.commune)+'</select></label></div><label>Quartier / avenue<input id="pqtr" value="'+esc(m.quartier)+'" placeholder="Ex. Golf, Bel-Air, quartier..."></label><label>Centres d’intérêt (sépare par des virgules)<input id="pi" value="'+esc((m.interets||[]).filter(function(x){return x.indexOf('🗣')<0}).join(', '))+'"></label><div><b style="font-size:14px">Langues parlées</b><div style="margin-top:4px">'+['Français','Swahili','Lingala','Kikongo','Tshiluba','Anglais'].map(function(l){return '<label class="lg"><input type="checkbox" class="lgc" value="'+l+'"'+((m.interets||[]).indexOf('🗣 '+l)>-1?' checked':'')+'> '+l+'</label>'}).join('')+'</div></div><label>Ma biographie<textarea id="pb" rows="4" maxlength="300">'+esc(m.bio)+'</textarea></label>'+pq()+profilePrivacyControl()+'<h3 style="margin:6px 0 0">Informations privées</h3><p class="note" style="margin:0">Visibles par toi seulement.</p><label>Nom complet<input id="pnm" value="'+esc(priv.nom_complet||m.nom_complet)+'"></label><label>Adresse<input id="pad" value="'+esc(priv.adresse)+'"></label><label>Téléphone<input id="ptl" type="tel" value="'+esc(priv.telephone)+'"></label><label style="display:flex;gap:8px;font-weight:400"><input type="checkbox" id="pok" style="width:auto"'+((mine||(me&&me.user_metadata&&me.user_metadata.malachite_consent))?' checked':'')+'> Je confirme avoir 18 ans ou plus et accepte les règles de respect.</label><button class="b1" onclick="save()">Enregistrer mon profil</button>'+(mine?'<button onclick="profileEditing=false;draw()">Annuler les modifications</button>':'')+'<button onclick="out()">Me déconnecter</button></div>'+prefsBox()+avisBox();
}
async function persistProfilePhotoList(next){
 var isPrivate=!!mine.profile_private,basePrefs=Object.assign({},priv.prefs||mine.prefs||{}),hidden=Object.assign({},basePrefs.profile_private||{});
 hidden.age=mine.age;hidden.genre=mine.genre;hidden.commune=mine.commune;hidden.quartier=mine.quartier;hidden.profession=mine.profession;hidden.bio=mine.bio;hidden.interets=mine.interets||[];hidden.prompts=mine.prompts||[];hidden.photos=next.slice();
 var prefs=Object.assign({},basePrefs,{profile_visibility:{mode:isPrivate?'private':'public'},profile_private:hidden});
 var pub={id:me.id,prenom:mine.prenom,age:isPrivate?null:mine.age,genre:isPrivate?null:mine.genre,commune:isPrivate?null:mine.commune,quartier:isPrivate?null:mine.quartier,profession:isPrivate?null:mine.profession,bio:isPrivate?null:mine.bio,interets:isPrivate?[]:(mine.interets||[]),photos:isPrivate?next.slice(0,1):next,prompts:isPrivate?[]:(mine.prompts||[]),profile_private:isPrivate};
 var privRow={nom_complet:priv.nom_complet||'',adresse:priv.adresse||'',telephone:priv.telephone||'',profile_age:mine.age,prefs:prefs};
 var r=await sb.rpc('save_my_profile',{p_profile:pub,p_private:privRow});if(r.error||!r.data)throw new Error(r.error?r.error.message:'Sauvegarde non confirmée');
 priv.prefs=prefs;mine=Object.assign({},r.data,hidden,{id:me.id,photos:next.slice(),prefs:prefs,profile_private:isPrivate});await resolveProfilePhotos(mine);ph=next.slice();phUrls=(mine.photoUrls||[]).slice();
 var ix=profs.findIndex(function(x){return x.id===me.id});if(ix>=0)profs[ix]=mine;else profs.push(mine);
}
async function up(el){
 var f=el.files&&el.files[0];if(!f)return;
 if(!me||!mine){msg='Enregistre d’abord ton profil.';return draw()}
 if(ph.length>=3){msg='3 photos maximum.';return draw()}
 if(['image/jpeg','image/png','image/webp','image/gif'].indexOf(f.type)<0||f.size>5e6){msg='Choisis une image JPEG, PNG, WebP ou GIF de 5 Mo maximum.';return draw()}
 var ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[f.type],path=me.id+'/'+Date.now()+'.'+ext;
 var upload=await sb.storage.from('profile-photos').upload(path,f,{contentType:f.type,upsert:false});
 if(upload.error){msg='Photo non envoyée : '+upload.error.message;return draw()}
 var next=ph.concat([path]);
 try{await persistProfilePhotoList(next);msg='Photo ajoutée à ton profil ✔';draw()}
 catch(e){await sb.storage.from('profile-photos').remove([path]);msg='Photo non associée : '+e.message;draw()}
}
async function rm(i){
 var path=ph[i];if(!path)return;if(ph.length<=1){msg='Garde au moins une photo de profil visible.';return draw()}
 var next=ph.filter(function(x,k){return k!==i});
 try{await persistProfilePhotoList(next);var bucket=String(path).indexOf('/storage/v1/object/public/photos/')>=0?'photos':'profile-photos',stored=storagePath(bucket,path);if(bucket==='profile-photos')await sb.storage.from(bucket).remove([stored]);msg='Photo retirée du profil.';draw()}
 catch(e){msg='Mise à jour impossible : '+e.message;draw()}
}
function profileSaveFeedback(t){msg=t;var e=$('malProfileMsg')||document.querySelector('.mal-own-note');if(e)e.textContent=t;}
function stageProfilePhoto(el){var f=el.files&&el.files[0];if(!f)return;if(['image/jpeg','image/png','image/webp','image/gif'].indexOf(f.type)<0||f.size>5e6){profileSaveFeedback('Choisis une photo JPEG, PNG, WebP ou GIF de 5 Mo maximum.');el.value='';return}pendingProfileFile=f;if(pendingProfilePreview)URL.revokeObjectURL(pendingProfilePreview);pendingProfilePreview=URL.createObjectURL(f);var p=$('malProfilePhotoPreview');if(p){p.style.backgroundImage='url('+pendingProfilePreview+')';p.textContent=''}profileSaveFeedback('Photo prête. Appuie sur « Enregistrer mon profil » pour enregistrer ensemble tes informations et ta photo.')}
async function save(){
 if(profileSaving)return;
 if(privLoadFailed){profileSaveFeedback('Chargement de tes informations privées impossible. Recharge la page avant de sauvegarder : rien ne sera écrasé.');return}
 if(!me||!me.id){profileSaveFeedback('Ta session a expiré. Reconnecte-toi avant d’enregistrer.');return}
 var name=$('pn').value.trim(),age=+$('pa').value,username=$('pu')?$('pu').value.trim().toLowerCase():((mine&&mine.username)||'');
 if(!name||age<18||(!(mine||(me.user_metadata&&me.user_metadata.malachite_consent))&&!$('pok').checked)){profileSaveFeedback('Prénom, âge (18 ans ou plus) et accord obligatoires.');return}
 if(username&&!/^[a-z0-9_]{3,24}$/.test(username)){profileSaveFeedback('Le nom d’utilisateur doit contenir 3 à 24 lettres, chiffres ou _.');$('pu').focus();return}
 if(username){var usernameCheck=await sb.functions.invoke('username-login',{body:{action:'check',username:username}});if(usernameCheck.error||!usernameCheck.data||!usernameCheck.data.available){profileSaveFeedback('Ce nom d’utilisateur est déjà utilisé ou ne peut pas être vérifié.');$('pu').focus();return}}
 var uid=me.id,mode=$('profileVisibility')?$('profileVisibility').value:'public',isPrivate=mode==='private';
 var raw={prenom:name,username:username||((mine&&mine.username)||null),age:age,genre:$('pg').value,commune:$('pc').value,quartier:$('pqtr').value.trim(),profession:$('pj').value.trim(),bio:$('pb').value.trim(),interets:$('pi').value.split(',').map(function(x){return x.trim()}).filter(Boolean).slice(0,6).concat([].slice.call(document.querySelectorAll('.lgc:checked')).map(function(x){return '🗣 '+x.value})),prompts:pqv()};
 var previewPhotos=pendingProfilePreview?[pendingProfilePreview].concat(phUrls||[]).slice(0,3):(phUrls||[]).slice(0,3);
 var oldPrefs=Object.assign({},priv.prefs||(mine&&mine.prefs)||{});
 var avatarForSave=malAvatar3dDraft||(mine&&mine.avatar&&Object.keys(mine.avatar).length&&!malAvatarTouched?mine.avatar:{});
 mine=Object.assign({},mine||{},raw,{id:uid,photos:ph.slice(),photoUrls:previewPhotos,profile_private:isPrivate,prefs:oldPrefs,avatar:avatarForSave});
 phUrls=previewPhotos;profileEditing=false;profileSaving=true;tab='me';msg='Ton profil s’affiche maintenant. Enregistrement sécurisé en cours…';
 var idx=profs.findIndex(function(x){return x.id===uid});if(idx>=0)profs[idx]=mine;else profs.push(mine);malAvatar3dDraft=null;
 draw();var own=document.querySelector('.mal-own-profile');if(own){own.classList.remove('mal-profile-reveal');void own.offsetWidth;own.classList.add('mal-profile-reveal')}
 var uploadedPath='';
 try{
  var allPhotos=ph.slice();
  if(pendingProfileFile){
   var file=pendingProfileFile,ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
   uploadedPath=uid+'/profile-'+Date.now()+'.'+ext;
   var upload=await sb.storage.from('profile-photos').upload(uploadedPath,file,{contentType:file.type,upsert:false});
   if(upload.error)throw new Error('Photo non enregistrée : '+upload.error.message);
   allPhotos=[uploadedPath].concat(allPhotos).slice(0,3);
  }
  var privateFields={age:raw.age,genre:raw.genre,commune:raw.commune,quartier:raw.quartier,profession:raw.profession,bio:raw.bio,interets:raw.interets,photos:allPhotos,prompts:raw.prompts};
  var nextPrefs=Object.assign({},oldPrefs,{profile_visibility:{mode:mode},profile_private:privateFields});
  var publicProfile={id:uid,username:raw.username||(me.user_metadata&&me.user_metadata.username)||null,prenom:raw.prenom,age:isPrivate?null:raw.age,genre:isPrivate?null:raw.genre,commune:isPrivate?null:raw.commune,quartier:isPrivate?null:raw.quartier,profession:isPrivate?null:raw.profession,bio:isPrivate?null:raw.bio,interets:isPrivate?[]:raw.interets,photos:isPrivate?allPhotos.slice(0,1):allPhotos,prompts:isPrivate?[]:raw.prompts,profile_private:isPrivate,avatar:avatarForSave};
  var privateProfile={nom_complet:$('pnm').value.trim()||raw.prenom,adresse:$('pad').value.trim(),telephone:$('ptl').value.trim(),profile_age:raw.age,prefs:nextPrefs};
  var result=await sb.rpc('save_my_profile',{p_profile:publicProfile,p_private:privateProfile});
  if(result.error||!result.data||result.data.id!==uid)throw new Error(result.error?result.error.message:'La base n’a pas confirmé la sauvegarde.');
  priv=Object.assign({},priv,{nom_complet:privateProfile.nom_complet,adresse:privateProfile.adresse,telephone:privateProfile.telephone,prefs:nextPrefs});
  mine=Object.assign({},result.data,privateFields,{id:uid,prenom:raw.prenom,photos:allPhotos,prefs:nextPrefs,profile_private:isPrivate});profileDraft={};
  await resolveProfilePhotos(mine);ph=allPhotos.slice();phUrls=(mine.photoUrls||[]).slice();
  malAvatarTouched=false;pendingProfileFile=null;if(pendingProfilePreview)URL.revokeObjectURL(pendingProfilePreview);pendingProfilePreview='';pendingSignupPhoto=null;pendingSignupPreview='';pendingSignupEmail='';
  idx=profs.findIndex(function(x){return x.id===uid});if(idx>=0)profs[idx]=mine;else profs.push(mine);
  profileSaving=false;msg='Profil enregistré durablement. Tu peux le modifier quand tu veux.';draw();profileSaveFeedback(msg);
 }catch(error){
  if(uploadedPath){try{await sb.storage.from('profile-photos').remove([uploadedPath])}catch(cleanupError){}}
  profileSaving=false;profileSaveFeedback('Le profil est affiché, mais sa sauvegarde n’est pas confirmée : '+(error&&error.message?error.message:'erreur inconnue')+'. Ouvre « Modifier mon profil » et réessaie.');
 }
}
function malStartupView(){return '<section class="mal-startup-screen" aria-label="Chargement de Malachite"><img class="mal-startup-logo" src="icons/malachite.svg" alt="Malachite"></section>'}
async function malRetrySession(){malStartupMessage='Vérification de ta session…';draw();try{var r=await sb.auth.getSession();if(r.error)throw r.error;me=r.data&&r.data.session?r.data.session.user:null;if(!me){malStartupPending=false;malStartupMessage='';malAuthBooted=true;draw();return}restoreMalView();await load();malStartupPending=false;malStartupMessage='';malAuthBooted=true;if(tab==='chat')await loadChat();draw(true)}catch(e){malStartupPending=true;malStartupMessage='Connexion non vérifiée. Vérifie Internet puis réessaie.';draw()}}
function draw(keep){if(!me&&malReferralId)malLoadReferralPreview();if(malStartupPending){document.body.classList.remove('mal-chat-mode');var root=$('v'),nav=$('nav');if(root)root.innerHTML=malStartupView();if(nav)nav.innerHTML='';return}var oldMsgs=$('msgs'),nearBottom=!oldMsgs||oldMsgs.scrollHeight-oldMsgs.scrollTop-oldMsgs.clientHeight<140,oldTop=oldMsgs?oldMsgs.scrollTop:0;document.body.classList.toggle('mal-chat-mode',!!(me&&tab==='chat'&&open));var y=scrollY,tv=$('mi')?$('mi').value:'';$('v').innerHTML=!me?authView():((tab==='chat'&&open)?'':banner())+{home:home,search:search,chat:chat,rdv:rdv,offres:offres,me:moi,adm:admin}[tab]();if(me&&tab=='search'){fqr();res()}if(tv&&$('mi'))$('mi').value=tv;if(me&&tab=='home')bindDrag();if(tab=='chat'&&open&&$('msgs'))$('msgs').scrollTop=nearBottom?$('msgs').scrollHeight:oldTop;$('nav').innerHTML=me?[['home','💘','Découvrir'],['search','🔍','Recherche'],['chat','💬','Messages'],['rdv','📅','RDV'],['offres','⭐','Offres'],['me','👤','Moi']].concat(me.email==ADM?[['adm','🛠','Admin']]:[]).map(function(x){return '<button data-k="'+x[0]+'" class="'+(tab==x[0]?'on':'')+'" onclick="goTab(\''+x[0]+'\')"><span>'+ico(x[0])+bdg(x[0])+'</span>'+x[2]+'</button>'}).join(''):'';if(!(tab=='chat'&&open))scrollTo(0,keep?y:0)}
function go(t){if(t!=='chat')closeTypingChannel();document.querySelectorAll('.sheetbg,.viewer,.lbx').forEach(function(e){e.remove()});tab=t;msg='';lastSig='';clearInterval(timer);if(t=='chat'){loadChat();timer=setInterval(function(){if(tab==='chat'&&!document.hidden&&!msgRealtimeReady)loadChat()},20000);if(open)return}else if(t=='home'||t=='search'){load().then(draw)}else if(t=='rdv'){loadRdv().then(draw)}else if(t=='adm'){loadAdm()}draw();/* Les photos personnelles sont déjà résolues une seule fois par load(). Ne pas relancer ici une seconde signature Storage concurrente à l’ouverture de Moi. */}
sb.auth.onAuthStateChange(function(e,s){if(e==='INITIAL_SESSION')return;var previousId=me&&me.id,nextUser=s?s.user:null;if(previousId&&(!nextUser||previousId!==nextUser.id)){stopPresence();closeTypingChannel()}me=nextUser;if(!me){if(e==='SIGNED_OUT'||!s){malStartupPending=false;malAuthBooted=true;open=null;msgs=[];chatCursor=null;chatCursorId=0;chatCursorFor=null;lastSig='';draw()}return}var identityChanged=previousId!==me.id;if(e==='SIGNED_IN'&&identityChanged){malStartupPending=false;malAuthBooted=true;restoreMalView();if(loadedUid===me.id&&profs.length&&Date.now()-profilesLoadedAt<300000)draw(true);load().then(async function(){try{await malAttachPendingSignupAvatar()}catch(e){console.warn('Pending signup avatar could not be attached',e)}if(tab==='chat')loadChat();else draw(true);if(fresh)fresh=false}).catch(function(error){console.warn('Malachite sign-in profile load failed',error);draw(true)});return}if(identityChanged||e==='USER_UPDATED'){load().then(function(){if(tab==='chat')loadChat();else draw(true)})}});
var malResumeBusy=false,malResumeAt=0;
async function malResumeSession(){if(malResumeBusy||!malAuthBooted||Date.now()-malResumeAt<1500)return;malResumeBusy=true;malResumeAt=Date.now();try{var r=await sb.auth.getSession();if(r.error)throw r.error;var next=r.data&&r.data.session?r.data.session.user:null;var sameWarmUser=!!(next&&me&&next.id===me.id&&loadedUid===next.id&&profs.length&&Date.now()-profilesLoadedAt<60000);me=next;if(me){restoreMalView();if(sameWarmUser){draw(true);if(tab==='chat'&&open)loadChat();return}await load();if(tab==='chat'&&open)await loadChat()}else{open=null;msgs=[]}draw(true)}catch(e){console.warn('Malachite session refresh failed',e);draw(true)}finally{malResumeBusy=false}}
document.addEventListener('visibilitychange',function(){if(!document.hidden)malResumeSession()});
window.addEventListener('pageshow',function(e){if(e.persisted)malResumeSession()});
draw(); // Le logo reste seul à l’écran pendant une courte transition.
sb.auth.getSession().then(function(r){if(r.error)throw r.error;me=r.data&&r.data.session?r.data.session.user:null;malStartupPending=false;malStartupMessage='';malAuthBooted=true;if(me){restoreMalView();draw(true);load().then(async function(){try{await malAttachPendingSignupAvatar()}catch(e){console.warn('Pending signup avatar could not be attached',e)}if(tab==='chat')loadChat();draw(true);if(fresh)fresh=false}).catch(function(error){console.warn('Malachite profile load failed',error);draw(true)})}else draw()}).catch(function(error){console.warn('Malachite session restore failed',error);malStartupPending=false;malStartupMessage='';malAuthBooted=true;draw()});
