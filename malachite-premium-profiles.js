
(function(){
 if(window.__malPremiumProfiles)return;window.__malPremiumProfiles=true;
 var oldCard=window.card;
 if(typeof oldCard==="function")window.card=function(p){
  var html=oldCard(p);
  return html.replace('<div class="card">','<div class="card mal-profile-card" data-mal-profile="'+esc(p.id)+'">');
 };
 window.av=function(p){
  var u=p&&p.photoUrls&&p.photoUrls[0];
  if(u)return '<div class="av" style="background-image:url('+esc(u)+');background-size:cover;background-position:center" aria-label="Photo de '+esc(p.prenom||'profil')+'"></div>';
  var a=p&&p.avatar;
  if(a&&a.emoji)return '<div class="av" style="background:'+esc(a.color||'#DDF5E9')+';display:grid;place-items:center;font-size:30px">'+esc(a.emoji)+'</div>';
  return '<div class="av">'+esc(p&&p.prenom?p.prenom[0]:'?')+'</div>';
 };
 var activeViewer=null,activeIndex=0;
 function closeViewer(){
  if(activeViewer){activeViewer.remove();activeViewer=null;document.body.style.overflow='';}
  document.removeEventListener('keydown',viewerKeys);
 }
 function viewerKeys(e){
  if(e.key==='Escape')closeViewer();
  if(e.key==='ArrowRight')stepPhoto(1);
  if(e.key==='ArrowLeft')stepPhoto(-1);
 }
 function stepPhoto(n){
  if(!activeViewer)return;
  var p=activeViewer._profile,photos=(p.photoUrls||[]).filter(Boolean);
  if(photos.length<2)return;
  activeIndex=(activeIndex+n+photos.length)%photos.length;
  renderPhoto();
 }
 function renderPhoto(){
  if(!activeViewer)return;
  var p=activeViewer._profile,photos=(p.photoUrls||[]).filter(Boolean),img=activeViewer.querySelector('.mal-view-photo img'),fallback=activeViewer.querySelector('.mal-view-fallback');
  if(photos.length){
   img.src=photos[activeIndex];img.alt='Photo de '+(p.prenom||'membre');img.hidden=false;fallback.hidden=true;
   activeViewer.querySelector('.mal-view-count').textContent=(activeIndex+1)+' / '+photos.length;
   activeViewer.querySelector('.mal-view-dots').innerHTML=photos.map(function(_,i){return '<button type="button" class="'+(i===activeIndex?'active':'')+'" data-photo-index="'+i+'" aria-label="Afficher la photo '+(i+1)+'"></button>'}).join('');
  }else{
   img.hidden=true;fallback.hidden=false;fallback.textContent=p.avatar&&p.avatar.emoji?p.avatar.emoji:(p.prenom||'?').slice(0,1);
   activeViewer.querySelector('.mal-view-count').textContent='Profil';
   activeViewer.querySelector('.mal-view-dots').innerHTML='';
  }
  var arrows=activeViewer.querySelectorAll('.mal-view-arrow');arrows.forEach(function(b){b.hidden=photos.length<2});
 }
 window.malOpenProfile=async function(id,startIndex){
  if(!id)return;
  var p=typeof prof==='function'?prof(id):null;
  try{
   if(typeof sb!=='undefined'&&sb&&sb.from){
    var fresh=await sb.from('profiles').select('id,username,prenom,age,genre,commune,quartier,profession,bio,interets,photos,created_at,prompts,derniere_vue,avatar,profile_private').eq('id',id).maybeSingle();
    if(fresh&&fresh.data){
     p=Object.assign({},p||{},fresh.data);
     if(Array.isArray(profs)){var cachedIndex=profs.findIndex(function(x){return x.id===id});if(cachedIndex>=0)profs[cachedIndex]=p;else profs.push(p)}
    }else if(fresh&&fresh.error){
     console.warn('Lecture du profil impossible',fresh.error);
     if(!p){alert('Impossible de lire ce profil : '+(fresh.error.message||'erreur de permission ou de connexion')+'.');return;}
    }else if(!p){
     console.warn('Aucune fiche de profil accessible pour ce compte de conversation');
     p={id:id,prenom:'Profil indisponible',age:null,genre:null,commune:null,quartier:null,profession:null,bio:'Aucune fiche de profil ne peut être affichée pour le moment. Le compte peut être incomplet ou soumis à une restriction. Les informations personnelles restent protégées.',interets:[],photos:[],prompts:[],avatar:{},profile_private:false,_profileUnavailable:true};
    }
   }
   if(p&&typeof resolveProfilePhotos==='function')await resolveProfilePhotos(p);
  }catch(profileError){
   console.warn('Erreur pendant le chargement du profil',profileError);
   if(!p){alert('Impossible de charger ce profil pour le moment. Vérifie ta connexion puis réessaie.');return;}
  }
  if(!p){alert('Profil introuvable.');return;}
  closeViewer();activeIndex=Math.max(0,Number(startIndex)||0);
  if(p.profile_private){
   activeIndex=0;
   var privateHtml='<div class="mal-view-photo"><img alt="" hidden><div class="mal-view-fallback" hidden></div><div class="mal-view-photo-shade"></div><button class="mal-view-close" type="button" aria-label="Fermer">×</button><button class="mal-view-arrow mal-view-prev" type="button" aria-label="Photo précédente">‹</button><button class="mal-view-arrow mal-view-next" type="button" aria-label="Photo suivante">›</button><div class="mal-view-dots"></div><div class="mal-view-count"></div><div class="mal-view-photo-caption"><span>MALACHITE · PROFIL PRIVÉ</span><b>'+esc(p.prenom||'Membre')+'</b></div></div><section class="mal-view-content"><span class="mal-view-eyebrow">CONFIDENTIALITÉ RESPECTÉE</span><h2 class="mal-view-title">'+esc(p.prenom||'Membre')+'</h2><p>Cette personne a choisi de garder les détails de son profil privés.</p><div class="mal-view-actions"><button class="mal-view-message" type="button">💬 Envoyer un message</button><button class="mal-view-close-bottom" type="button">Fermer le profil</button></div></section>';
   var privateLayer=document.createElement('div');privateLayer.className='mal-profile-viewer';privateLayer.setAttribute('role','dialog');privateLayer.setAttribute('aria-modal','true');privateLayer.setAttribute('aria-label','Profil privé de '+(p.prenom||'membre'));privateLayer.innerHTML=privateHtml;privateLayer._profile=p;document.body.appendChild(privateLayer);activeViewer=privateLayer;document.body.style.overflow='hidden';renderPhoto();document.addEventListener('keydown',viewerKeys);
   privateLayer.addEventListener('click',function(e){if(e.target===privateLayer||e.target.closest('.mal-view-close,.mal-view-close-bottom')){closeViewer();return}if(e.target.closest('.mal-view-prev')){stepPhoto(-1);return}if(e.target.closest('.mal-view-next')){stepPhoto(1);return}if(e.target.closest('.mal-view-message')){closeViewer();if(typeof talk==='function')talk(id)}});
   return;
  }
  var photos=(p.photoUrls||[]).filter(Boolean);if(activeIndex>=photos.length)activeIndex=0;
  var interests=(p.interets||[]).filter(function(x){return String(x).indexOf('🗣')!==0;});
  var prompts=(p.prompts||[]).filter(function(x){return x&&x.q&&x.a;});
  var status=typeof presence==='function'?presence(p):'';
  var tags=interests.length?interests.map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join(''):'<p class="mal-view-empty">Cette personne n’a pas encore ajouté ses centres d’intérêt.</p>';
  var questions=prompts.length?'<section class="mal-view-section"><span class="mal-view-eyebrow">POUR FAIRE CONNAISSANCE</span><h3>Quelques réponses personnelles</h3><div class="mal-view-prompts">'+prompts.map(function(x){return '<article class="mal-view-prompt"><small>'+esc(x.q)+'</small><p>'+esc(x.a)+'</p></article>'}).join('')+'</div></section>':'';
  var html='<div class="mal-view-photo"><img alt="" hidden><div class="mal-view-fallback" hidden></div><div class="mal-view-photo-shade"></div><button class="mal-view-close" type="button" aria-label="Fermer">×</button><button class="mal-view-arrow mal-view-prev" type="button" aria-label="Photo précédente">‹</button><button class="mal-view-arrow mal-view-next" type="button" aria-label="Photo suivante">›</button><div class="mal-view-dots"></div><div class="mal-view-count"></div><div class="mal-view-photo-caption"><span>MALACHITE · RENCONTRES AUTHENTIQUES</span><b>'+esc(p.prenom||'Membre')+(p.age?', '+esc(p.age):'')+'</b><small>'+esc(p.commune||'')+(p.profession?' · '+esc(p.profession):'')+'</small></div></div><section class="mal-view-content"><div class="mal-view-status">'+status+'</div><div class="mal-view-intro"><span class="mal-view-eyebrow">FAISONS CONNAISSANCE</span><h2 class="mal-view-title">'+esc(p.prenom||'Membre')+(p.age?', '+esc(p.age):'')+'</h2><div class="mal-view-meta">'+esc(p.commune||'')+(p.profession?' · '+esc(p.profession):'')+'</div></div><section class="mal-view-section"><span class="mal-view-eyebrow">SON HISTOIRE</span><h3>À propos</h3><p class="mal-view-bio">'+(p.bio?esc(p.bio):'Cette personne n’a pas encore écrit sa biographie. Tu peux commencer par lui dire bonjour.')+'</p></section><section class="mal-view-section"><span class="mal-view-eyebrow">CE QUI L’ANIME</span><h3>Centres d’intérêt</h3><div class="mal-view-interests">'+tags+'</div></section>'+questions+'<div class="mal-view-extra">'+(typeof aff==='function'?aff(p):'')+'</div><div class="mal-view-actions"><button class="mal-view-message" type="button">💬 Envoyer un message</button><button class="mal-view-close-bottom" type="button">Fermer le profil</button></div></section>';
  var layer=document.createElement('div');layer.className='mal-profile-viewer';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Profil de '+(p.prenom||'membre'));layer.innerHTML=html;layer._profile=p;document.body.appendChild(layer);activeViewer=layer;document.body.style.overflow='hidden';renderPhoto();document.addEventListener('keydown',viewerKeys);
  layer.addEventListener('click',function(e){
   if(e.target===layer||e.target.closest('.mal-view-close,.mal-view-close-bottom')){closeViewer();return;}
   if(e.target.closest('.mal-view-prev')){stepPhoto(-1);return;}
   if(e.target.closest('.mal-view-next')){stepPhoto(1);return;}
   var dot=e.target.closest('[data-photo-index]');if(dot){activeIndex=Number(dot.dataset.photoIndex)||0;renderPhoto();return;}
   if(e.target.closest('.mal-view-message')){closeViewer();if(typeof talk==='function')talk(id);}
  });
 };
 document.addEventListener('click',function(e){
  var photo=e.target.closest('.mal-profile-card .ph img');
  if(photo){var pc=photo.closest('.mal-profile-card');if(pc){var idx=Array.prototype.indexOf.call(pc.querySelectorAll('.ph img'),photo);window.malOpenProfile(pc.dataset.malProfile,idx);}return;}
  var top=e.target.closest('.mal-profile-card .top');
  if(top){var card=top.closest('.mal-profile-card');window.malOpenProfile(card.dataset.malProfile,0);return;}
  var deckPhoto=e.target.closest('.dcard .dph');
  if(deckPhoto){var deck=deckPhoto.closest('.dcard');if(deck&&deck.dataset.id)window.malOpenProfile(deck.dataset.id,0);}
 },true);
 function enrichAvatarStudio(){
  var select=document.getElementById('malEmoji');if(!select||select.dataset.malExpanded)return;
  select.dataset.malExpanded='1';
  ['🐯','🦁','🐸','🐨','🐹','🐮','🐷','🐵','🐙','🦉','🐧','🐬','🦋','🐝','🐢','🐲','🦄','🤖','👾','🌻','⭐','💚','😇','🤩','🥳','😺','😻','🧸'].forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;select.appendChild(o)});
 }
 var phrases=['Salut ! Moi, c’est Mali 💗 Je peux te guider dans Malachite.','Astuce : une belle photo et une bio sincère aident les autres à te découvrir.','Explore les profils à ton rythme et privilégie les échanges respectueux.','Ton personnage peut changer de style et de couleur dans le Centre Malachite.'];
 var buddy=document.createElement('button');buddy.type='button';buddy.id='malachite-companion';buddy.setAttribute('aria-label','Compagnon animé Mali');buddy.innerHTML='<span class="mal-buddy-bubble">Salut ! Moi, c’est Mali 🌿 Je peux te guider dans Malachite.</span><svg class="mal-buddy" viewBox="0 0 76 82" role="img" aria-label="Mascotte rose Malachite"><g class="mal-buddy-body"><path d="M38 8C20 8 9 22 10 43c1 18 12 30 28 30s27-12 28-30C67 22 56 8 38 8Z" fill="#FF4F8B" stroke="#E6195E" stroke-width="3"/><path d="M31 10C25 1 31-2 38 7c6-12 15-6 8 5" fill="#FFC2D8" stroke="#E6195E" stroke-width="2"/><ellipse cx="28" cy="37" rx="4" ry="6" fill="#fff" class="mal-buddy-eye"/><ellipse cx="48" cy="37" rx="4" ry="6" fill="#fff" class="mal-buddy-eye"/><circle cx="29" cy="38" r="2" fill="#3A1224"/><circle cx="47" cy="38" r="2" fill="#3A1224"/><path d="M31 51q7 7 14 0" fill="none" stroke="#3A1224" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="47" r="4" fill="#F7B6A8" opacity=".8"/><circle cx="56" cy="47" r="4" fill="#F7B6A8" opacity=".8"/></g><path class="mal-buddy-arm" d="M13 43Q1 35 4 24" fill="none" stroke="#FF4F8B" stroke-width="8" stroke-linecap="round"/><path d="M63 43q12-8 9-19" fill="none" stroke="#FF4F8B" stroke-width="8" stroke-linecap="round"/></svg>';
 document.body.appendChild(buddy);
 buddy.title='Glisse Mali pour le déplacer';
 buddy.style.touchAction='none';
 var dragState=null,dragged=false;
 try{
  var saved=JSON.parse(localStorage.getItem('malachite_mali_position')||'null');
  if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
   buddy.style.setProperty('right','auto','important');buddy.style.setProperty('bottom','auto','important');
   buddy.style.left=Math.max(0,Math.min(innerWidth-70,saved.x))+'px';
   buddy.style.top=Math.max(0,Math.min(innerHeight-76,saved.y))+'px';
  }
 }catch(e){}
 buddy.addEventListener('pointerdown',function(e){
  if(e.target.closest('.mal-buddy-bubble'))return;
  var r=buddy.getBoundingClientRect();dragState={dx:e.clientX-r.left,dy:e.clientY-r.top,x:e.clientX,y:e.clientY};dragged=false;
  try{buddy.setPointerCapture(e.pointerId)}catch(err){}
 });
 buddy.addEventListener('pointermove',function(e){
  if(!dragState)return;
  if(Math.abs(e.clientX-dragState.x)+Math.abs(e.clientY-dragState.y)>7)dragged=true;
  if(!dragged)return;
  var x=Math.max(4,Math.min(innerWidth-buddy.offsetWidth-4,e.clientX-dragState.dx));
  var y=Math.max(4,Math.min(innerHeight-buddy.offsetHeight-4,e.clientY-dragState.dy));
  buddy.style.setProperty('right','auto','important');buddy.style.setProperty('bottom','auto','important');
  buddy.style.left=x+'px';buddy.style.top=y+'px';
 });
 function finishMaliDrag(){
  if(dragState&&dragged){var r=buddy.getBoundingClientRect();try{localStorage.setItem('malachite_mali_position',JSON.stringify({x:r.left,y:r.top}))}catch(e){}}
  dragState=null;
  if(dragged){setTimeout(function(){dragged=false},80)}
 }
 buddy.addEventListener('pointerup',finishMaliDrag);
 buddy.addEventListener('pointercancel',finishMaliDrag);
 buddy.addEventListener('click',function(e){if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false}},true);
 var phrase=0,timer=null;
 buddy.addEventListener('click',function(){phrase=(phrase+1)%phrases.length;buddy.querySelector('.mal-buddy-bubble').textContent=phrases[phrase];buddy.classList.add('speaking');clearTimeout(timer);timer=setTimeout(function(){buddy.classList.remove('speaking')},5000)});
 setTimeout(function(){buddy.classList.add('speaking');timer=setTimeout(function(){buddy.classList.remove('speaking')},5000)},2200);
 var observer=new MutationObserver(enrichAvatarStudio);observer.observe(document.body,{childList:true,subtree:true});enrichAvatarStudio();
})();
