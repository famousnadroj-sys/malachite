
var malLang=localStorage.getItem('malachite_lang')||'fr';

var malAvatarState={skin:'deep',hair:'curly',hairColor:'black',shirt:'blue',gender:'man',beard:'none',glasses:'none',background:'sage',useAsProfilePhoto:true},malSupportBusy=false;
var MAL_AVATAR_SKIN={light:'#f1c9aa',medium:'#d99b73',dark:'#a96845',deep:'#75452f'},MAL_AVATAR_HAIR={black:'#211b1b',brown:'#4b2c20',chestnut:'#75412d',blonde:'#c69a45',auburn:'#8d3d2b',blue:'#273d67'},MAL_AVATAR_SHIRT={rose:'#b85e78',blue:'#315b78',green:'#356c59',purple:'#67517e',black:'#29343b',cream:'#c9b99c'},MAL_AVATAR_BG={sage:'#dce9df',navy:'#dce5ef',sand:'#eee5d8',plum:'#e9dfe8',white:'#f1f4f2'};
function malAvatarSvg(input){
 var a=Object.assign({},malAvatarState,input||{}),skin=MAL_AVATAR_SKIN[a.skin]||MAL_AVATAR_SKIN.deep,hairColor=MAL_AVATAR_HAIR[a.hairColor]||MAL_AVATAR_HAIR.black,shirt=MAL_AVATAR_SHIRT[a.shirt]||MAL_AVATAR_SHIRT.blue,bg=MAL_AVATAR_BG[a.background]||MAL_AVATAR_BG.sage,female=a.gender==='woman',hair=a.hair||'curly',beard=a.beard||'none',glasses=a.glasses||'none';
 var backHair=(hair==='long'||hair==='braids')?'<path d="M43 104Q29 18 100 17Q171 18 157 104L160 194Q143 182 140 135L60 135Q57 182 40 194Z" fill="url(#avHair)"/>':'';
 var topHair=hair==='shaved'?'<path d="M54 68Q55 25 100 23Q145 25 146 68Q127 49 100 49Q73 49 54 68Z" fill="url(#avHair)" opacity=".28"/>':hair==='afro'?'<path d="M39 91Q30 18 100 13Q170 18 161 91Q151 62 137 57Q124 37 109 48Q91 29 76 51Q53 51 39 91Z" fill="url(#avHair)"/>':hair==='curly'?'<path d="M43 83Q34 22 63 28Q72 5 91 25Q105 4 119 25Q145 7 151 42Q170 51 156 88Q143 63 131 58Q116 39 100 53Q81 36 65 62Q52 62 43 83Z" fill="url(#avHair)"/>':hair==='long'||hair==='braids'?'<path d="M44 90Q35 22 100 19Q165 22 156 90Q139 62 128 55Q111 39 99 53Q77 39 61 61Z" fill="url(#avHair)"/>':'<path d="M48 82Q43 24 100 21Q157 24 152 82Q135 55 100 54Q65 55 48 82Z" fill="url(#avHair)"/>';
 var fringe=hair==='long'||hair==='braids'?'<path d="M48 78Q67 53 88 58Q108 64 124 54Q140 58 151 78Q136 68 124 72Q105 81 89 69Q69 64 48 78Z" fill="url(#avHair)"/>':'';
 var braidDetails=hair==='braids'?'<g fill="none" stroke="'+hairColor+'" stroke-width="5" stroke-linecap="round"><path d="M48 88Q35 118 45 166Q49 183 43 197"/><path d="M152 88Q165 118 155 166Q151 183 157 197"/></g>':'';
 var beardShape=!female&&beard==='short'?'<path d="M66 113Q100 138 134 113Q130 148 100 151Q70 148 66 113Z" fill="url(#avHair)"/>' :!female&&beard==='full'?'<path d="M62 107Q100 132 138 107Q141 158 100 161Q59 158 62 107Z" fill="url(#avHair)"/>':'';
 var specs=glasses==='none'?'':'<g fill="#fff" fill-opacity=".12" stroke="#26333c" stroke-width="3"><rect x="60" y="79" width="34" height="24" rx="'+(glasses==='round'?12:6)+'"/><rect x="106" y="79" width="34" height="24" rx="'+(glasses==='round'?12:6)+'"/><path d="M94 88h12"/></g>';
 var shirtPath='<path d="M20 220Q26 165 68 151L83 146L100 165L117 146L132 151Q174 165 180 220Z" fill="url(#avShirt)"/><path d="M77 151L100 178L123 151L113 143H87Z" fill="'+skin+'"/><path d="M73 158L100 184L127 158" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="3"/>';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" role="img" aria-label="Personnage virtuel personnalisable"><defs><linearGradient id="avBg" x2="0" y2="1"><stop stop-color="'+bg+'"/><stop offset="1" stop-color="#fff" stop-opacity=".72"/></linearGradient><linearGradient id="avSkin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+skin+'"/><stop offset=".55" stop-color="'+skin+'"/><stop offset="1" stop-color="#4a251d" stop-opacity=".22"/></linearGradient><linearGradient id="avHair" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".16"/><stop offset=".42" stop-color="'+hairColor+'"/><stop offset="1" stop-color="#171313" stop-opacity=".45"/></linearGradient><linearGradient id="avShirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+shirt+'"/><stop offset="1" stop-color="#111b25" stop-opacity=".42"/></linearGradient><filter id="avShadow"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="200" height="220" rx="28" fill="url(#avBg)"/><ellipse cx="100" cy="211" rx="68" ry="8" fill="#24333b" opacity=".13" filter="url(#avShadow)"/>'+backHair+'<path d="M43 220Q47 166 75 151L100 145L125 151Q153 166 157 220Z" fill="url(#avShirt)"/><path d="M80 145L100 174L120 145L112 137H88Z" fill="url(#avSkin)"/><ellipse cx="52" cy="94" rx="10" ry="17" fill="url(#avSkin)"/><ellipse cx="148" cy="94" rx="10" ry="17" fill="url(#avSkin)"/><path d="M52 80Q49 37 100 34Q151 37 148 80L141 112Q133 143 100 146Q67 143 59 112Z" fill="url(#avSkin)"/><path d="M69 88Q80 82 91 87M109 87Q120 82 131 88" stroke="#382a26" stroke-width="3.2" fill="none" stroke-linecap="round"/><ellipse cx="82" cy="98" rx="5" ry="6" fill="#fff"/><ellipse cx="118" cy="98" rx="5" ry="6" fill="#fff"/><ellipse cx="83" cy="99" rx="2.8" ry="4" fill="#292622"/><ellipse cx="117" cy="99" rx="2.8" ry="4" fill="#292622"/><circle cx="84" cy="97" r="1.2" fill="#fff"/><circle cx="118" cy="97" r="1.2" fill="#fff"/><path d="M100 99L95 115Q100 119 105 115" stroke="#8d5c49" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M87 127Q100 135 113 127" stroke="#873f43" stroke-width="3" fill="none" stroke-linecap="round"/>'+topHair+fringe+braidDetails+beardShape+specs+shirtPath+'</svg>';
}
function malAvatarSet(k,v){
 var choices={useAsProfilePhoto:[true,false],skin:['light','medium','dark','deep'],hair:['short','curly','long','braids','afro','shaved'],hairColor:['black','brown','chestnut','blonde','auburn','blue'],shirt:['rose','blue','green','purple','black','cream'],gender:['man','woman'],beard:['none','short','full'],glasses:['none','round','square'],background:['sage','navy','sand','plum','white']};
 if(!choices[k]||choices[k].indexOf(v)<0)return;
 if(k==='gender'&&v==='woman')malAvatarState.beard='none';
 malAvatarState[k]=v;malAvatarTouched=true;
 document.querySelectorAll('.mal-avatar-genders button').forEach(function(b){b.classList.toggle('selected',b.getAttribute('data-gender')===v)});
 var p=$('malAvatarPreview');if(p)p.innerHTML=malAvatarSvg(malAvatarState);
}
function malAvatarSelect(label,key,opts){return '<label>'+label+'<select aria-label="'+label+'" onchange="malAvatarSet(\''+key+'\',this.value)">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(malAvatarState[key]===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label>'}
var malAvatarPreloadFrame=null,malAvatarPreloadReady=false,malAvatarPreloadGender='male',malAvatarLoadingText='Chargement des modèles…',malAvatarWatchdog=0;
function malAvatarGender(forSignup){return forSignup?((signupDraft&&signupDraft.genre==='F')?'female':'male'):((mine&&mine.genre==='F')?'female':'male')}
function malPlaceAvatarFrame(frame){
 frame.style.cssText='position:relative;z-index:2;display:block;flex:1 1 auto;width:100%;height:100%;min-height:0;min-width:0;border:0;background:#fff;opacity:1;pointer-events:auto;';
}
function malWarmAvatarBuilder(){ /* Chargement à la demande : aucun iframe WebGL caché. */ }
function malShowAvatarLoadFailure(message){var loading=$('malAvatarBuilderLoading');if(!loading)return;loading.style.pointerEvents='auto';loading.innerHTML='<div style="font-size:34px">⚠️</div><div>Le créateur 3D ne démarre pas.</div><div style="font-size:12px;font-weight:400">'+esc(message)+'</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button type="button" onclick="closeMalAvatarBuilder();openMalAvatarBuilder()">Réessayer</button><button type="button" onclick="window.open(\'avatar-builder.html?gender='+((malAvatarPreloadGender==='female')?'female':'male')+'&v=22\',\'_blank\')">Ouvrir séparément</button><button type="button" onclick="closeMalAvatarBuilder()">Fermer</button></div>';}
function closeMalAvatarBuilder(){
 var overlay=$('malAvatarBuilderOverlay');if(!overlay)return;
 var frame=overlay.querySelector('iframe');if(frame){frame.src='about:blank';frame.remove()}
 overlay.remove();if(malAvatarWatchdog)clearTimeout(malAvatarWatchdog);malAvatarWatchdog=0;malAvatarPreloadFrame=null;malAvatarPreloadReady=false;
}
function openMalAvatarBuilder(forSignup){
 if(!forSignup&&(!me||!me.id)){alert('Connecte-toi pour créer ton avatar.');return}
 var gender=malAvatarGender(!!forSignup),old=$('malAvatarBuilderOverlay');
 if(old)closeMalAvatarBuilder();
 var overlay=document.createElement('div');overlay.id='malAvatarBuilderOverlay';
 overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column;align-items:stretch;justify-content:stretch;padding:0;overflow:hidden;min-height:0';
 var loading=document.createElement('div');loading.id='malAvatarBuilderLoading';
 loading.style.cssText='position:absolute;inset:0;display:grid;place-content:center;gap:12px;text-align:center;color:#71334b;background:#fff;font:600 15px system-ui;z-index:3;pointer-events:none';
 loading.innerHTML='<div style="font-size:38px">✦</div><div>Préparation de ton avatar 3D…</div><div id="malAvatarBuilderProgress" style="font-size:12px;font-weight:400;opacity:.85">Connexion aux ressources 3D…</div>';
 var frame=document.createElement('iframe');frame.title='Créateur d’avatar 3D Malachite';frame.setAttribute('allow','fullscreen');frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
 malPlaceAvatarFrame(frame);frame.dataset.gender=gender;frame.loading='eager';frame.src='avatar-builder.html?gender='+gender+'&v=22';
 frame.addEventListener('load',function(){var p=$('malAvatarBuilderProgress');if(p)p.textContent='Page chargée · initialisation du moteur 3D…'});frame.addEventListener('error',function(){malShowAvatarLoadFailure('La page du créateur 3D ne répond pas. Vérifie ta connexion puis réessaie.')});
 overlay.appendChild(frame);overlay.appendChild(loading);
 overlay.addEventListener('click',function(e){if(e.target===overlay)closeMalAvatarBuilder()});
 document.body.appendChild(overlay);
 malAvatarPreloadFrame=frame;malAvatarPreloadGender=gender;malAvatarPreloadReady=false;
 if(malAvatarWatchdog)clearTimeout(malAvatarWatchdog);
 malAvatarWatchdog=setTimeout(function(){if(malAvatarPreloadFrame===frame&&!malAvatarPreloadReady)malShowAvatarLoadFailure('Le moteur 3D met trop longtemps à démarrer sur cet appareil.')},22000);
}
async function malPersistAvatar3d(config,image){
 if(!me||!me.id)throw new Error('Session expirée. Reconnecte-toi.');
 if(!config||typeof config!=='object'||typeof image!=='string'||image.indexOf('data:image/png;base64,')!==0)throw new Error('Export 3D invalide.');
 var blob=await fetch(image).then(function(r){return r.blob()});
 if(blob.size>5*1024*1024)throw new Error('L’image de l’avatar dépasse 5 Mo.');
 var path=me.id+'/avatar-'+Date.now()+'.png';
 var upload=await sb.storage.from('profile-photos').upload(path,blob,{contentType:'image/png',upsert:false});
 if(upload.error)throw upload.error;
 var avatar={type:'humanforge-3d',version:1,config:config,imagePath:path};avatar.imageUrl=await signedUrl('profile-photos',path);
 try{
  if(mine&&mine.id){
   var r=await sb.rpc('update_my_avatar',{p_avatar:avatar});
   if(r.error)throw r.error;if(!r.data)throw new Error('Profil introuvable.');
   mine=Object.assign({},mine,r.data);try{await resolveProfilePhotos(mine)}catch(photoError){console.warn('Avatar enregistré; actualisation des autres photos différée.',photoError)}
   var ix=profs.findIndex(function(p){return p.id===me.id});if(ix>=0)profs[ix]=mine;else profs.push(mine);
  }else{malAvatar3dDraft=avatar;profileDraft.avatar=avatar}
  malAvatarTouched=false;if(malAvatarPreloadFrame&&malAvatarPreloadFrame.contentWindow)malAvatarPreloadFrame.contentWindow.postMessage({source:'malachite-avatar-parent',type:'saved'},location.origin);closeMalAvatarBuilder();tab='me';profileEditing=false;msg='Ton avatar 3D est enregistré et affiché sur ton profil.';draw(false);
 }catch(e){await sb.storage.from('profile-photos').remove([path]);throw e}
}
var malPendingAvatarAttachBusy=false;
async function malAttachPendingSignupAvatar(){
 if(!me||!me.id||malPendingAvatarAttachBusy)return;
 malPendingAvatarAttachBusy=true;
 try{
 var key='malachite-pending-avatar:'+String(me.email||'').toLowerCase(),raw='';
 try{raw=localStorage.getItem(key)||''}catch(_){return}
 if(!raw)return;
 var saved;try{saved=JSON.parse(raw)}catch(_){localStorage.removeItem(key);return}
 if(!saved||!saved.config||typeof saved.image!=='string'||saved.image.indexOf('data:image/png;base64,')!==0)return;
 var blob=await fetch(saved.image).then(function(r){return r.blob()});
 if(blob.size>5*1024*1024)throw new Error('Avatar trop volumineux.');
 var path=me.id+'/avatar-'+Date.now()+'.png';
 var up=await sb.storage.from('profile-photos').upload(path,blob,{contentType:'image/png',upsert:false});
 if(up.error)throw up.error;
 var avatar={type:'humanforge-3d',version:1,config:saved.config,imagePath:path};
 avatar.imageUrl=await signedUrl('profile-photos',path);
 var result=await sb.rpc('update_my_avatar',{p_avatar:avatar});
 if(result.error||!result.data){await sb.storage.from('profile-photos').remove([path]);throw result.error||new Error('Profil non prêt.')}
 mine=Object.assign({},mine||{},result.data);await resolveProfilePhotos(mine);
 var idx=profs.findIndex(function(p){return p.id===me.id});if(idx>=0)profs[idx]=mine;else profs.push(mine);
 localStorage.removeItem(key);
 }finally{malPendingAvatarAttachBusy=false}
}
window.addEventListener('message',async function(event){
 if(event.origin!==location.origin||!event.data||event.data.source!=='malachite-avatar-builder')return;
 if(event.data.type==='progress'){malAvatarLoadingText=event.data.total?String(event.data.phase||'Chargement')+' · '+event.data.done+'/'+event.data.total:String(event.data.phase||'Chargement des ressources 3D…');var progress=$('malAvatarBuilderProgress');if(progress)progress.textContent=malAvatarLoadingText;return}
 if(event.data.type==='ready'){malAvatarPreloadReady=true;if(malAvatarWatchdog)clearTimeout(malAvatarWatchdog);malAvatarWatchdog=0;var loading=$('malAvatarBuilderLoading');if(loading)loading.remove();return}
 if(event.data.type==='error'){malAvatarPreloadReady=false;if(malAvatarWatchdog)clearTimeout(malAvatarWatchdog);malAvatarWatchdog=0;malShowAvatarLoadFailure(String(event.data.message||'Une ressource 3D n’a pas pu être chargée.'));return}
 if(event.data.type==='mounted'){if(malAvatarPreloadFrame&&malAvatarPreloadFrame.contentWindow)malAvatarPreloadFrame.contentWindow.postMessage({source:'malachite-avatar-parent',type:'set-gender',gender:malAvatarPreloadFrame.dataset.gender||'male'},location.origin);return}
 if(event.data.type==='cancel'){closeMalAvatarBuilder();return}
 if(event.data.type==='save'){
  var frame=document.querySelector('#malAvatarBuilderOverlay iframe');if(frame)frame.contentWindow.postMessage({source:'malachite-avatar-parent',type:'saving'},location.origin);
  if(mode==='up'&&signupStep===3&&!me){
   pendingSignupAvatar={config:event.data.config,image:event.data.image};
   try{localStorage.setItem('malachite-pending-avatar:'+String(signupDraft.email||'').toLowerCase(),JSON.stringify(pendingSignupAvatar))}catch(e){alert('Impossible de conserver cet avatar sur cet appareil. Essaie une image plus légère.');return}
   try{var blob=await fetch(event.data.image).then(function(r){return r.blob()});if(pendingSignupPreview)URL.revokeObjectURL(pendingSignupPreview);pendingSignupPreview=URL.createObjectURL(blob)}catch(_){}
   if(malAvatarPreloadFrame&&malAvatarPreloadFrame.contentWindow)malAvatarPreloadFrame.contentWindow.postMessage({source:'malachite-avatar-parent',type:'saved'},location.origin);closeMalAvatarBuilder();draw();return;
  }
  var previousAvatar=mine&&mine.id?mine.avatar:null;
  if(mine&&mine.id){
   var optimisticAvatar={type:'humanforge-3d',version:1,config:event.data.config,imageUrl:event.data.image};
   mine=Object.assign({},mine,{avatar:optimisticAvatar});
   var optimisticIndex=profs.findIndex(function(p){return p.id===me.id});if(optimisticIndex>=0)profs[optimisticIndex]=mine;else profs.push(mine);
   closeMalAvatarBuilder();tab='me';profileEditing=false;draw(true);
  }
  malPersistAvatar3d(event.data.config,event.data.image).then(function(){tab='me';profileEditing=false;msg='Ton avatar 3D est enregistré et affiché sur ton profil.';draw(false)}).catch(function(e){
   if(mine&&mine.id){mine=Object.assign({},mine,{avatar:previousAvatar||null});var rollbackIndex=profs.findIndex(function(p){return p.id===me.id});if(rollbackIndex>=0)profs[rollbackIndex]=mine;draw(true)}
   if(malAvatarPreloadFrame&&malAvatarPreloadFrame.contentWindow)malAvatarPreloadFrame.contentWindow.postMessage({source:'malachite-avatar-parent',type:'save-error'},location.origin);
   alert('Avatar non enregistré : '+(e.message||'erreur inconnue'));
  });
 }
});
function malAvatarPanel(){var a=malAvatar3dDraft||mine&&mine.avatar||{},preview=a.imageUrl?'<div class="mal-avatar-preview"><img src="'+esc(a.imageUrl)+'" alt="Mon avatar 3D" onerror="malRefreshAvatar(this,\''+esc(me&&me.id||'')+'\')" style="width:100%;max-width:190px;border-radius:16px;display:block;margin:8px auto"></div>':'';return '<div class="mal-panel mal-avatar-builder"><h3>Créer mon avatar 3D réaliste</h3><p class="note">Choisis Homme ou Femme, puis personnalise le visage, la peau, les cheveux et les vêtements sur un véritable personnage 3D.</p>'+preview+'<button class="b1" type="button" onclick="openMalAvatarBuilder()">'+(a.imageUrl?'Modifier mon avatar 3D':'Ouvrir le créateur d’avatars 3D')+'</button><div class="note">Ton avatar sera enregistré et affiché sur ton profil.</div></div>'}


var MAL_TEXT={
fr:{title:'Centre Malachite',intro:'Personnalise ton expérience, consulte les règles et contacte notre assistance.',language:'Langue de l’interface',avatar:'Créer mon personnage',avatarHelp:'Choisis un personnage original, sa couleur et enregistre ton avatar sur ton profil.',save:'Enregistrer',payments:'Paiements Mobile Money RDC',airtel:'Airtel Money',orange:'Orange Money',paySteps:'Procédure de paiement',legal:'Conditions et confidentialité',terms:'Conditions d’utilisation',privacy:'Politique de confidentialité',safety:'Sécurité des rencontres',support:'Réclamations et assistance',category:'Catégorie',subject:'Objet',message:'Décris ta demande',send:'Envoyer la réclamation',sent:'Demande transmise à l’assistance.',noAuth:'Connecte-toi pour envoyer une réclamation.',numbers:'Numéros destinataires fournis par le propriétaire du site',manual:'Paiement manuel : Malachite ne lit pas les SMS de ton téléphone et ne confirme pas automatiquement un transfert. Garde la référence et attends la vérification par l’administrateur.',premium:'Premium : 2 USD / 30 jours',boost:'Boost : 0,50 USD / 24 h',contact:'Déblocage contact : 1 USD',disclaimer:'Les services de paiement dépendent de la disponibilité de ton opérateur. Ne communique jamais ton code PIN Mobile Money.',sms:'Téléphone facultatif',smsHelp:'Le numéro est une information privée du profil. Il ne sert jamais à se connecter.',phone:'Téléphone facultatif',otp:'',sendCode:'',verify:'',consent:'J’ai 18 ans ou plus et j’accepte les conditions et la politique de confidentialité.',complaint:'Une question, un paiement non reconnu, un bug ou un problème de sécurité ? Écris à l’assistance.',termsBody:'Malachite est un service de rencontres réservé aux adultes de 18 ans et plus. Tu dois fournir des informations sincères, respecter les autres membres, ne pas harceler, menacer, usurper une identité, escroquer ou publier du contenu illégal. Les profils et contenus peuvent être signalés et examinés par la modération. Les fonctions payantes ne sont activées qu’après vérification du paiement. Les tarifs affichés peuvent évoluer avec information préalable. Les rencontres physiques se font à ton initiative et sous ta responsabilité : privilégie un lieu public, informe un proche et ne transfère jamais d’argent à une personne rencontrée sur la plateforme. Malachite peut suspendre les comptes qui enfreignent ces règles.',privacyBody:'Malachite traite les données nécessaires au compte, au profil, aux rencontres, aux messages, à la sécurité, au support et aux paiements déclarés. Les données privées de contact ne sont pas affichées publiquement. Les photos de profil et médias privés sont stockés dans des espaces privés et servis par des liens temporaires. Les messages ne sont pas analysés pour extraire des numéros ou des liens. Les signalements et demandes d’assistance sont accessibles aux personnes autorisées à les traiter. Tu peux demander l’accès, la correction ou la suppression de tes données via l’assistance, sous réserve des obligations de sécurité et de conservation applicables.',safetyBody:'Rencontre d’abord dans un lieu public. Préviens un proche et organise ton propre transport. Ne partage pas ton adresse personnelle, tes documents, tes mots de passe ou ton code PIN. Signale tout comportement inquiétant et bloque le membre. Malachite ne garantit pas l’identité réelle d’un membre simplement parce qu’un profil est complet ou qu’une photo est présente.',pending:'Document de référence du produit, à faire relire par un juriste avant exploitation commerciale.'},
sw:{title:'Kituo cha Malachite',intro:'Badilisha matumizi yako, soma sheria na wasiliana na usaidizi.',language:'Lugha ya tovuti',avatar:'Unda mhusika wangu',avatarHelp:'Chagua mhusika na rangi, kisha hifadhi avatar kwenye wasifu wako.',save:'Hifadhi',payments:'Malipo ya simu DRC',airtel:'Airtel Money',orange:'Orange Money',paySteps:'Hatua za malipo',legal:'Masharti na faragha',terms:'Masharti ya matumizi',privacy:'Sera ya faragha',safety:'Usalama wa miadi',support:'Malalamiko na usaidizi',category:'Aina',subject:'Mada',message:'Eleza ombi lako',send:'Tuma malalamiko',sent:'Ombi limetumwa kwa usaidizi.',noAuth:'Ingia ili kutuma malalamiko.',numbers:'Nambari za malipo zilizotolewa na mmiliki wa tovuti',manual:'Malipo ya mkono: Malachite haisomi SMS za simu yako na haihakikishi uhamisho moja kwa moja. Hifadhi kumbukumbu na subiri uthibitisho.',premium:'Premium: USD 2 / siku 30',boost:'Boost: USD 0.50 / saa 24',contact:'Kufungua mawasiliano: USD 1',disclaimer:'Usitoe PIN yako ya Mobile Money.',sms:'Usajili kwa simu',smsHelp:'Pokea msimbo wa SMS; inategemea usanidi wa mtoa SMS katika Supabase Auth.',phone:'Nambari ya kimataifa',otp:'Msimbo wa SMS',sendCode:'Tuma msimbo',verify:'Thibitisha na fungua akaunti',consent:'Nina miaka 18 au zaidi na nakubali masharti na sera ya faragha.',complaint:'Swali, malipo yasiyotambuliwa, hitilafu au tatizo la usalama? Wasiliana na usaidizi.',termsBody:'Malachite ni huduma ya mahusiano kwa watu wenye miaka 18 na zaidi. Heshimu wanachama wengine; usinyanyase, kutishia, kujifanya mtu mwingine au kufanya ulaghai. Ripoti na zuia tabia isiyofaa. Malipo yanathibitishwa kabla ya huduma kulipiwa kuwashwa. Kutana mahali pa wazi na mjulishe mtu unayemwamini.',privacyBody:'Malachite hutumia data inayohitajika kwa akaunti, wasifu, ujumbe, usalama, usaidizi na malipo. Data ya faragha haionyeshwi hadharani. Picha na media za faragha huhifadhiwa kwa ruhusa maalum. Unaweza kuwasiliana na usaidizi kuhusu data yako.',safetyBody:'Kutana mahali pa wazi, mjulishe rafiki, usitoe PIN, nywila au hati zako. Ripoti na zuia akaunti zinazotia wasiwasi.',pending:'Masharti haya yanahitaji ukaguzi wa kisheria kabla ya matumizi ya kibiashara.'},
ln:{title:'Esika ya Malachite',intro:'Bongisa ndenge osalelaka, tanga mibeko mpe solola na lisungi.',language:'Monoko ya site',avatar:'Sala personnage na ngai',avatarHelp:'Pona personnage mpe langi, bomba avatar na profil na yo.',save:'Bomba',payments:'Mofuta na telefone na RDC',airtel:'Airtel Money',orange:'Orange Money',paySteps:'Nzela ya kofuta',legal:'Mibeko mpe bomoto',terms:'Mibeko ya kosalela',privacy:'Mibeko ya kobatela makambo ya moto',safety:'Bobateli ya kokutana',support:'Mituna mpe lisungi',category:'Lolenge',subject:'Motó ya likambo',message:'Limbolá likambo na yo',send:'Tinda likambo',sent:'Likambo etindami na lisungi.',noAuth:'Kota na compte mpo na kotinda likambo.',numbers:'Ban nimero ya kofuta epesami na mokolo ya site',manual:'Kofuta na maboko: Malachite etangaka SMS ya telefone na yo te mpe endimisaka transfert yango moko te. Bomba référence mpe zela botali.',premium:'Premium: 2 USD / mikolo 30',boost:'Boost: 0,50 USD / ngonga 24',contact:'Fungola contact: 1 USD',disclaimer:'Kopesa PIN ya Mobile Money na moto te.',sms:'Kokoma na telefone',smsHelp:'Code SMS etindamaka soki fournisseur SMS ezali configuré na Supabase Auth.',phone:'Nimero ya mokili',otp:'Code ya SMS',sendCode:'Tinda code',verify:'Tala code mpe fungola compte',consent:'Nazali na mibu 18 to koleka mpe nandimi mibeko.',complaint:'Motuna, kofuta oyo oyebi te, libunga to likambo ya bobateli? Koma na lisungi.',termsBody:'Malachite ezali site ya boyokani mpo na mikóló ya mibu 18 to koleka. Zala na limemya; kosala mobulu, kobangisa, komikosa lokola moto mosusu to kokosa bato epekisami. Tinda signalement soki likambo ezali mabe. Kofuta esengeli kotala liboso ya kofungola service. Bokutana na esika ya bato mingi.',privacyBody:'Malachite esalelaka makambo oyo esengeli mpo na compte, profil, message, bobateli mpe lisungi. Makambo ya privé ebimisamaka te na bato nyonso. Foto mpe media ya privé ebatelami na accès ya ndingisa.',safetyBody:'Bokutana na esika ya bato mingi, yebisa moninga, pesa PIN to mot de passe te. Bloquer mpe signaler compte oyo ezali kobangisa.',pending:'Mibeko esengeli kotala na juriste liboso ya kosalela na mombongo.'},
kg:{title:'Kibuka kia Malachite',intro:'Lungisa kusadila, tangila mambu ma nsiku ye lomba lusadisu.',language:'Ndinga ya site',avatar:'Sala muntu ame',avatarHelp:'Sola muntu ye langi, bika avatar mu profil aku.',save:'Bika',payments:'Mafutu ya telefone mu RDC',airtel:'Airtel Money',orange:'Orange Money',paySteps:'Nzila ya kufuta',legal:'Nsiku ye luvunu lwa muntu',terms:'Nsiku ya kusadila',privacy:'Nsiku ya kubumba mambu',safety:'Lutaninu lwa kukutana',support:'Mambu ye lusadisu',category:'Lutangu',subject:'Lutangu lwa mambu',message:'Longa mambu aku',send:'Tuma nsenga',sent:'Nsenga me kwenda ku lusadisu.',noAuth:'Nyla mu compte sambu na kutuma.',numbers:'Ban nimero ya kufuta me pesama na mfumu ya site',manual:'Kufuta na maboko: Malachite ke tangaka ve SMS ya telefone aku mpe ke ndimaka ve transfert na mbala mosi. Bumba référence mpe vingila kusosa.',premium:'Premium: 2 USD / mikolo 30',boost:'Boost: 0,50 USD / bangunga 24',contact:'Kangula contact: 1 USD',disclaimer:'Pesa muntu ve PIN ya Mobile Money.',sms:'Kukota na telefone',smsHelp:'Code SMS ke lomba fournisseur SMS ya Supabase Auth.',phone:'Nimero ya nsi ya mvimba',otp:'Code SMS',sendCode:'Tuma code',verify:'Ndima code ye kangula compte',consent:'Mono kele na bamvula 18 to kuluta ye ndima nsiku.',complaint:'Lombilu, kufuta ya nge zaba ve, erreur to lutaninu? Sonika lusadisu.',termsBody:'Malachite kele site ya kukutana sambu na bantu ya bamvula 18 to kuluta. Lemfuka bantu yankaka. Kusala violence, kukosa, kudia muntu to kusadila zina ya muntu yankaka kele ve mbote. Tuma signalement. Kufuta fwete tala na ntwala ya kufungula service. Kukutana na kisika ya bantu mingi.',privacyBody:'Malachite ke sadila mambu ya nkufi sambu na compte, profil, message, lutaninu ye lusadisu. Mambu ya privé ke monanaka ve na bantu nyonso. Foto ye media ya privé ke bumbamaka na nzila ya lutaninu.',safetyBody:'Kutana na kisika ya bantu mingi, zabisaka nduku, pesa PIN to mot de passe ve. Bloquer ye signaler compte ya mbi.',pending:'Nsiku fwete tala na juriste na ntwala ya kusadila mu mumbongo.'},
tsh:{title:'Cipangu ca Malachite',intro:'Lungisha mushindu wa kusadila, tangila milawu ne kulomba luse.',language:'Ndinga wa site',avatar:'Panga muntu wanyi',avatarHelp:'Sangula muntu ne langi, ubike avatar mu profil wenu.',save:'Bika',payments:'Kulipa na telefone mu RDC',airtel:'Airtel Money',orange:'Orange Money',paySteps:'Mishindu ya kulipa',legal:'Milawu ne bupole',terms:'Milawu ya kusadila',privacy:'Milawu ya kubika makambo',safety:'Bupole bwa kukumana',support:'Milombo ne luse',category:'Mushindu',subject:'Mutu wa makambo',message:'Longa makambo enu',send:'Tuma kulomba',sent:'Kulomba kwatumikwa ku luse.',noAuth:'Kota mu compte bua kutuma kulomba.',numbers:'Nimero ya kulipa ipeshibwe na mwene site',manual:'Kulipa ne maboko: Malachite kayi kutanga SMS ya telefone wenu to kuyikidija transfert ku nshingu. Bika référence ne ulindile kusungula.',premium:'Premium: 2 USD / mikolo 30',boost:'Boost: 0,50 USD / masaa 24',contact:'Kangula contact: 1 USD',disclaimer:'Kupesha muntu PIN ya Mobile Money kudi bibi.',sms:'Kukota ne telefone',smsHelp:'Code SMS udi mu bupe bua fournisseur SMS mu Supabase Auth.',phone:'Nimero ya nsi yonso',otp:'Code SMS',sendCode:'Tuma code',verify:'Sungula code ne kangula compte',consent:'Ndi ne myaka 18 to kuluta ne ndi nsonga milawu.',complaint:'Mulombo, kulipa kuudi kayi kumanya, erreur to bupole? Sonika ku luse.',termsBody:'Malachite udi site wa kukumana bua bantu ba myaka 18 to kuluta. Lemfuka bantu bonso. Kunyokola, kututa, kudia bantu to kusadila dina dia muntu mukwabo bidi bibi. Tuma signalement. Kulipa kusungululwa kumpala kua kufungula service. Kumana mu kisika ca bantu.',privacyBody:'Malachite usadila makambo adi ne mushinga bua compte, profil, message, bupole ne luse. Makambo a privé kayi kumonika ku bantu bonso. Foto ne media ya privé bidi mu bupole.',safetyBody:'Kumana mu kisika ca bantu, ambila munyi, kupesha PIN to mot de passe kudi bibi. Bloquer ne signaler compte wa bibi.',pending:'Milawu ifwaninwe kusungululwa ne juriste kumpala kua mushinga wa mushinga.'},
en:{title:'Malachite Center',intro:'Personalize your experience, review our rules and contact support.',language:'Interface language',avatar:'Build my avatar',avatarHelp:'Create a character by choosing skin tone, hairstyle and clothing, then save it to your profile.',save:'Save',payments:'Mobile Money payments in DRC',airtel:'Airtel Money',orange:'Orange Money',paySteps:'Payment steps',legal:'Terms and privacy',terms:'Terms of use',privacy:'Privacy policy',safety:'Dating safety',support:'Support and complaints',category:'Category',subject:'Subject',message:'Describe your request',send:'Send request',sent:'Your request was sent to support.',noAuth:'Sign in to send a request.',numbers:'Payment numbers provided by the website owner',manual:'Manual payment: Malachite does not read your phone SMS or automatically confirm a transfer. Keep the transaction reference and wait for administrator verification.',premium:'Premium: USD 2 / 30 days',boost:'Boost: USD 0.50 / 24 hours',contact:'Unlock contact: USD 1',disclaimer:'Payment services depend on your operator. Never share your Mobile Money PIN.',sms:'Optional phone number',smsHelp:'Your number is private profile information and is never used to sign in.',phone:'Optional phone number',otp:'',sendCode:'',verify:'',consent:'I am at least 18 years old and accept the terms and privacy policy.',complaint:'Questions, unrecognized payments, bugs or safety concerns? Contact support.',termsBody:'Malachite is a dating service for adults aged 18 and over. Provide truthful information and respect other members. Harassment, threats, impersonation, fraud and illegal content are prohibited. Profiles and content may be reported and reviewed by moderation. Paid features are enabled only after payment verification. Meet in public places, tell someone you trust and never send money to someone you met on the platform.',privacyBody:'Malachite processes the data needed for accounts, profiles, matches, messages, safety, support and declared payments. Private contact details are not publicly displayed. Private photos and media are stored in private spaces and served through temporary links. Reports and support requests are accessible only to authorized staff. You may request access, correction or deletion through support, subject to applicable security and retention obligations.',safetyBody:'Meet first in a public place. Tell someone you trust and arrange your own transport. Do not share your home address, documents, passwords or PIN. Report suspicious behavior and block the member. A complete profile or photo does not guarantee a member’s real identity.',pending:'This reference document should be reviewed by a lawyer before commercial operation.'}
};
function mt(k){return (MAL_TEXT[malLang]&&MAL_TEXT[malLang][k])||MAL_TEXT.fr[k]||k}
function malCentre(){return '<h2>🌸 '+mt('title')+'</h2><p class="note">'+mt('intro')+'</p>'+
'<div class="mal-panel"><label>'+mt('language')+'<select id="malLang" onchange="malSetLang(this.value)"><option value="fr">Français</option><option value="sw">Kiswahili</option><option value="ln">Lingála</option><option value="kg">Kikongo</option><option value="tsh">Tshiluba</option><option value="en">English</option></select></label></div>'+
malAvatarPanel()+
'<div class="mal-panel"><h3>💸 '+mt('payments')+'</h3><p class="note">'+mt('numbers')+'</p><div class="mal-grid"><div class="mal-provider"><strong>🔴 '+mt('airtel')+'</strong><p><b>+243 993 315 532</b></p><button onclick="malCopy(this.dataset.num)" data-num="+243993315532">Copier le numéro</button></div><div class="mal-provider"><strong>🟠 '+mt('orange')+'</strong><p><b>+243 848 775 992</b></p><button onclick="malCopy(this.dataset.num)" data-num="+243848775992">Copier le numéro</button></div></div><h3>'+mt('paySteps')+'</h3><ol><li>Ouvre le menu Mobile Money de ton opérateur.</li><li>Envoie exactement le montant de l’offre au numéro affiché.</li><li>Garde la référence SMS de la transaction.</li><li>Dans l’onglet Offres, choisis l’opérateur, saisis la référence et envoie la demande.</li><li>L’administrateur vérifie le portefeuille et accepte ou rejette la demande.</li></ol><p class="note">'+mt('manual')+'</p><p class="note">'+mt('disclaimer')+'</p><p>'+mt('premium')+' · '+mt('boost')+' · '+mt('contact')+'</p></div>'+
'<div class="mal-panel"><h3>📜 '+mt('legal')+'</h3><h4>'+mt('terms')+'</h4><div class="mal-legal">'+mt('termsBody')+'</div><h4>'+mt('privacy')+'</h4><div class="mal-legal">'+mt('privacyBody')+'</div><h4>'+mt('safety')+'</h4><div class="mal-legal">'+mt('safetyBody')+'</div><p class="note">'+mt('pending')+'</p></div>'+
'<div class="mal-panel"><h3>🛟 '+mt('support')+'</h3><p class="note">'+mt('complaint')+'</p><div class="list"><label>'+mt('category')+'<select id="malCat"><option value="compte">Compte / connexion</option><option value="paiement">Paiement Mobile Money</option><option value="securite">Sécurité / harcèlement</option><option value="bug">Erreur technique</option><option value="autre">Autre</option></select></label><label>'+mt('subject')+'<input id="malSubject" maxlength="120" placeholder="Ex. paiement en attente"></label><label>'+mt('message')+'<textarea id="malMessage" rows="4" maxlength="2000"></textarea></label><button class="b1" onclick="malSendSupport()">'+mt('send')+'</button><div id="malSupportMsg" class="note"></div></div></div>'+
'<div class="mal-panel"><h3>🔐 Compte et sécurité</h3><p class="note">Malachite est réservé aux personnes de 18 ans et plus. Utilise un mot de passe unique, bloque les comptes suspects et signale tout abus.</p><button onclick="go(\'offres\')">Voir les abonnements</button> <button onclick="go(\'me\')">Mon profil</button></div>'}
function centre(){return malCentre()}
function malSetLang(l){malLang=MAL_TEXT[l]?l:'fr';localStorage.setItem('malachite_lang',malLang);draw(true)}
function malAvatarPreview(){var e=$('malAvatarPreview');if(e)e.innerHTML=malAvatarSvg(malAvatarState)}
function malCopy(v){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(function(){alert('Numéro copié.')}).catch(function(){prompt('Copie ce numéro',v)})}else prompt('Copie ce numéro',v)}
async function malSaveAvatar(){
 var f=$('malAvMsg');
 if(!me||!me.id){if(f)f.textContent='Connecte-toi pour enregistrer ton avatar.';return}
 var a={type:'pro-vector',version:3,config:Object.assign({},malAvatarState)};
 if(!mine){malAvatarTouched=true;if(f)f.textContent='Avatar prêt. Il sera enregistré automatiquement avec ton premier enregistrement de profil.';return}
 try{
  var r=await sb.rpc('update_my_avatar',{p_avatar:a});
  if(r.error)throw r.error;
  if(!r.data)throw new Error('Ton profil n’existe pas encore. Enregistre d’abord les informations obligatoires de ton profil.');
  mine=Object.assign({},mine||{},r.data);
  var ix=profs.findIndex(function(p){return p.id===me.id});
  if(ix>=0)profs[ix]=mine;else profs.push(mine);
  malAvatarTouched=false;
  if(f)f.textContent='Avatar virtuel enregistré et appliqué à ton profil.';
 }catch(e){if(f)f.textContent='Avatar non enregistré : '+(e.message||'erreur inconnue')}
}
async function malSendSupport(){if(!me){$('malSupportMsg').textContent=mt('noAuth');return}var subject=$('malSubject').value.trim(),message=$('malMessage').value.trim(),category=$('malCat').value;if(subject.length<3||message.length<10){$('malSupportMsg').textContent='Objet de 3 caractères minimum et message de 10 caractères minimum.';return}if(malSupportBusy)return;malSupportBusy=true;var r=await sb.from('demandes_support').insert({categorie:category,sujet:subject,message:message});malSupportBusy=false;$('malSupportMsg').textContent=r.error?'Envoi impossible : '+r.error.message:mt('sent');if(!r.error){$('malSubject').value='';$('malMessage').value=''}}
function av(p){var u=p&&p.photoUrls&&p.photoUrls[0],a=p&&p.avatar;if(u)return '<div class="av" style="background-image:url('+esc(u)+');background-size:cover;background-position:center"></div>';if(a&&(a.type==='pro-vector'||a.type==='pro-photo'))return '<div class="av">'+malAvatarSvg(a.config||{})+'</div>';if(a&&a.emoji)return '<div class="av" style="background:'+esc(a.color||'#F7B7D0')+';display:grid;place-items:center;font-size:30px">'+esc(a.emoji)+'</div>';return '<div class="av">'+esc(p&&p.prenom?p.prenom[0]:'?')+'</div>'}
function offres(){return '<h2>⭐ Nos offres</h2><div class="list"><div class="plan"><h3>Gratuit <span>0 $</span></h3><p>Profil, découverte, likes, conversations existantes et jusqu’à 15 nouvelles conversations initiées par jour. 1 rendez-vous par semaine.</p></div><div class="plan" style="border:2px solid var(--pink)"><h3>Premium <span>2 $ / mois</span></h3><p>Nouvelles conversations sans quota, rendez-vous illimités et accès aux coordonnées après un match confirmé.</p></div><div class="plan"><h3>Boost 24 h <span>0,50 $</span></h3><p>Visibilité prioritaire pendant 24 heures.</p></div></div><div class="box list"><h3>💳 Paiement simple</h3><p><b>Premium : 2 USD pour 30 jours.</b> 1. Choisis ton opérateur. 2. Envoie le montant. 3. Saisis la référence reçue.</p><label>Offre<select id="of"><option value="Premium">Premium — 2 USD / mois</option><option value="Boost">Boost — 0,50 USD / 24 h</option></select></label><label>Moyen de paiement<select id="malOperator" onchange="changePaymentOperator()"><option value="airtel">Airtel Money</option><option value="orange">Orange Money</option></select></label><div class="wall"><b>Envoie le paiement à ce numéro :</b><div id="malPayNumber" style="font-size:22px;font-weight:800">+243 993 315 532</div></div><label>Référence du paiement<input id="cd" maxlength="100" placeholder="Référence exacte du SMS" autocomplete="off"></label><label>Justificatif (JPEG, PNG ou WebP · 5 Mo maximum)<input id="malReceipt" type="file" accept="image/jpeg,image/png,image/webp"></label><button class="b1 big" onclick="pay()">J’ai payé — envoyer</button><div class="note" id="pm">'+esc(msg)+'</div></div><p class="note">Ne communique jamais ton code PIN ni ton OTP. La demande reste en attente jusqu’à une confirmation fiable. Une capture d’écran seule ne déclenche jamais Premium.</p>'}
function changePaymentOperator(){var el=$('malPayNumber'),op=$('malOperator');if(el&&op)el.textContent=op.value==='orange'?'+243 848 775 992':'+243 993 315 532'}
async function malUploadPaymentReceipt(file){
 if(!file)return {error:'Joins une capture du reçu pour continuer.'};
 var types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'},ext=types[file.type];
 if(!ext||file.size<1||file.size>5*1024*1024)return {error:'Format non accepté ou fichier supérieur à 5 Mo. Utilise JPEG, PNG ou WebP.'};
 if(!me||!me.id)return {error:'Session expirée. Reconnecte-toi.'};
 var token=window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 var path=me.id+'/'+token+'.'+ext;
 var up=await sb.storage.from('payment-receipts').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
 return up.error?{error:'Envoi du justificatif impossible : '+up.error.message}:{path:path};
}
async function malSubmitPayment(data){
 var receipt=await malUploadPaymentReceipt(data.file);
 if(receipt.error)return {error:receipt.error};
 var payload={offre:data.offer,code:data.code,operateur:data.operator,receipt_path:receipt.path};
 if(data.target)payload.cible=data.target;
 var result;
 try{result=await sb.from('paiements').insert(payload)}
 catch(e){await sb.storage.from('payment-receipts').remove([receipt.path]);return {error:'Connexion interrompue. Le justificatif temporaire a été nettoyé si possible ; réessaie.'}}
 if(result.error){
  await sb.storage.from('payment-receipts').remove([receipt.path]);
  return {error:'Demande non enregistrée : '+result.error.message};
 }
 return {ok:true};
}
async function pay(){
 var c=$('cd').value.trim(),operator=$('malOperator').value,offer=$('of').value,file=$('malReceipt').files[0],btn=document.querySelector('#pm')&&document.querySelector('#pm').previousElementSibling;
 if(c.length<4||c.length>100){$('pm').textContent='Entre une référence valide (4 à 100 caractères).';return}
 if(btn)btn.disabled=true;
 $('pm').textContent='Envoi sécurisé du justificatif…';
 try{
  var r=await malSubmitPayment({offer:offer,code:c,operator:operator,file:file});
  $('pm').textContent=r.error||'Demande reçue avec justificatif privé. L’activation interviendra après vérification du transfert auprès de l’opérateur.';
  if(r.ok){$('cd').value='';$('malReceipt').value=''}
 }catch(e){$('pm').textContent='Erreur temporaire. Vérifie ta connexion puis réessaie.'}
 finally{if(btn)btn.disabled=false}
}async function payC(){
 var c=$('uc').value.trim(),operator=$('malContactOperator')?$('malContactOperator').value:'airtel',file=$('ucProof')&&$('ucProof').files[0],btn=$('um')&&$('um').previousElementSibling;
 if(c.length<4||c.length>100){$('um').textContent='Entre une référence valide (4 à 100 caractères).';return}
 if(btn)btn.disabled=true;
 $('um').textContent='Envoi sécurisé du justificatif…';
 try{
  var r=await malSubmitPayment({offer:'Contact',target:open,code:c,operator:operator,file:file});
  $('um').textContent=r.error||'Demande reçue. Le contact sera débloqué après vérification du transfert.';
  if(r.ok){$('uc').value='';$('ucProof').value=''}
 }catch(e){$('um').textContent='Erreur temporaire. Vérifie ta connexion puis réessaie.'}
 finally{if(btn)btn.disabled=false}
}
function admPageChange(delta){admPage=Math.max(0,admPage+delta);loadAdm()}
function admSearchChange(){var el=$('admPaymentSearch');admSearch=(el?el.value:'').trim().slice(0,80);admPage=0;loadAdm()}
function admStatusChange(){var el=$('admPaymentStatus');admPaymentStatus=el?el.value:'attente';admPage=0;loadAdm()}
function admPeriodChange(){var el=$('admPaymentPeriod');admPaymentPeriod=el?el.value:'all';admPage=0;loadAdm()}
function admPeriodBounds(){var n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate()),y=new Date(t.getTime()-86400000);return {today:t.toISOString(),tomorrow:new Date(t.getTime()+86400000).toISOString(),yesterday:y.toISOString()}}
async function loadAdm(){
 if(!me||me.email!==ADM||tab!=='adm')return;
 var safe=admSearch.replace(/[^a-zA-Z0-9À-ÿ _-]/g,'').trim();
 var paymentQuery=sb.from('paiements').select('*',{count:'exact'}).eq('statut','attente').order('created_at',{ascending:true}).range(admPage*50,admPage*50+49);
 if(admPaymentPeriod!=='all'){var bounds=admPeriodBounds();if(admPaymentPeriod==='today')paymentQuery=paymentQuery.gte('created_at',bounds.today).lt('created_at',bounds.tomorrow);else if(admPaymentPeriod==='yesterday')paymentQuery=paymentQuery.gte('created_at',bounds.yesterday).lt('created_at',bounds.today);else if(admPaymentPeriod==='older')paymentQuery=paymentQuery.lt('created_at',bounds.yesterday)}
 if(safe)paymentQuery=paymentQuery.or('code.ilike.%'+safe+'%,offre.ilike.%'+safe+'%,operateur.ilike.%'+safe+'%');
 var tasks=[paymentQuery],keys=['payments'];
 if(malAdminPage==='members'){tasks.push(sb.from('signalements').select('*').order('created_at',{ascending:false}).limit(100));keys.push('reports');tasks.push(sb.from('suspensions').select('user_id,depuis,motif').order('depuis',{ascending:false}));keys.push('suspensions')}
 if(malAdminPage==='settings'&&malSettingsPage==='support'){tasks.push(sb.from('demandes_support').select('*').order('created_at',{ascending:false}).limit(100));keys.push('support')}
 if(malAdminPage==='settings'&&malSettingsPage==='avis'){tasks.push(sb.from('avis_site').select('*').order('created_at',{ascending:false}).limit(50));keys.push('reviews')}
 var results=await Promise.all(tasks),byKey={};keys.forEach(function(k,i){byKey[k]=results[i]});
 var pr=byKey.payments;if(pr.error){console.error('Chargement paiements',pr.error);alert('Impossible de charger les paiements. Réessaie.');return}
 admTotal=pr.count||0;adm=pr.data||[];
 if(adm.length===0&&admPage>0){admPage=Math.max(0,Math.ceil(admTotal/50)-1);return loadAdm()}
 await Promise.all(adm.map(async function(x){if(!x.receipt_path)return;try{var signed=await sb.storage.from('payment-receipts').createSignedUrl(x.receipt_path,300);x.receipt_url=signed.error?null:signed.data.signedUrl}catch(e){x.receipt_url=null}}));
 if(byKey.reports){if(byKey.reports.error)console.warn('Signalements',byKey.reports.error);else sigs=byKey.reports.data||[]}
 if(byKey.suspensions){if(byKey.suspensions.error)console.warn('Suspensions',byKey.suspensions.error);else admSuspensions=byKey.suspensions.data||[]}
 if(byKey.support){if(byKey.support.error)console.warn('Support',byKey.support.error);else malSupportRows=byKey.support.data||[]}
 if(byKey.reviews){if(byKey.reviews.error)console.warn('Avis',byKey.reviews.error);else avs=byKey.reviews.data||[]}

 draw();
 malAiAutoAnalyzePayments(adm);
}
var malPaymentAiBusy=Object.create(null);
function malPaymentAiRender(id,analysis){
 var node=document.getElementById("malAiPaymentReview"+id);if(!node)return;
 var status=analysis.payment_status==="success"?"Le message affiche un paiement réussi":analysis.payment_status==="pending"?"Le message indique un paiement en attente":analysis.payment_status==="failed"?"Le message indique un échec":"Statut du paiement illisible";
 var flags=[];
 flags.push(analysis.reference_match===true?'<span class="mal-ai-flag good">Référence identique</span>':'<span class="mal-ai-flag warn">Référence à comparer</span>');
 if(analysis.operator==="airtel"||analysis.operator==="orange")flags.push(analysis.operator_match?'<span class="mal-ai-flag good">Opérateur concordant</span>':'<span class="mal-ai-flag warn">Opérateur différent</span>');
 if(analysis.duplicate_reference)flags.push('<span class="mal-ai-flag bad">Référence déjà utilisée</span>');
 var amount=analysis.amount==null?"Non détecté":String(analysis.amount)+(analysis.currency?" "+analysis.currency:"");
 node.innerHTML='<b>Malakit AI · lecture du justificatif</b><p>'+esc(status)+' · confiance '+esc(analysis.confidence||"faible")+'</p>'+
 '<div class="mal-ai-payment-fields"><div><small>Montant</small><b>'+esc(amount)+'</b></div><div><small>Référence lue</small><b>'+esc(analysis.transaction_reference||"Non détectée")+'</b></div>'+
 '<div><small>Numéro expéditeur</small><b>'+esc(analysis.sender_number||"Non détecté")+'</b></div><div><small>Numéro destinataire</small><b>'+esc(analysis.recipient_number||"Non détecté")+'</b></div>'+
 '<div><small>Date du message</small><b>'+esc(analysis.transaction_date||"Non détectée")+'</b></div><div><small>Opérateur lu</small><b>'+esc(analysis.operator||"Non identifié")+'</b></div></div>'+
 '<div class="mal-ai-payment-flags">'+flags.join("")+'</div>'+(analysis.notes?'<p>'+esc(analysis.notes)+'</p>':'')+
 '<p class="mal-ai-payment-warning">⚠️ L’IA lit l’image, elle ne vérifie pas l’encaissement. Compare le montant, le numéro destinataire et la référence dans ton historique Airtel/Orange avant de valider.</p>'+
 '<button type="button" onclick="malAiAnalyzePayment('+Number(id)+')">Afficher l’analyse</button>';
}
window.malAiAnalyzePayment=async function(id){
 id=Number(id);if(!Number.isSafeInteger(id)||id<=0||malPaymentAiBusy[id])return;
 if(!me||me.email!==ADM||!window.sb||!sb.functions)return;
 malPaymentAiBusy[id]=true;
 var node=document.getElementById("malAiPaymentReview"+id);
 if(node)node.innerHTML='<b>Malakit AI lit la capture…</b><p>Extraction du montant, de la référence et des numéros visibles. Aucune validation automatique.</p>';
 try{
  var result=await sb.functions.invoke("malachite-ai-manager",{body:{action:"analyze_payment_receipt",payment_id:id}});
  if(result.error||!result.data||!result.data.ok)throw new Error(result.data&&result.data.error||"analyse indisponible");
  malPaymentAiRender(id,result.data.analysis);
 }catch(error){
  if(node)node.innerHTML='<b>Lecture IA indisponible</b><p>'+esc(error&&error.message?error.message:"Erreur temporaire")+'. Vérifie manuellement le reçu auprès de l’opérateur.</p><button type="button" onclick="malAiAnalyzePayment('+id+')">Réessayer</button>';
 }finally{delete malPaymentAiBusy[id]}
};
async function malAiAutoAnalyzePayments(rows){
 if(!me||me.email!==ADM||tab!=="adm"||malAdminPage!=="payments")return;
 var queue=(rows||[]).filter(function(x){return x&&x.id&&x.receipt_path&&x.statut==="attente"}).slice(0,10);
 for(var i=0;i<queue.length;i++){
  if(!me||me.email!==ADM||tab!=="adm")return;
  await window.malAiAnalyzePayment(queue[i].id);
 }
}
var malSupportRows=[];
function supportAdmin(){return '<h2>🛟 Réclamations et assistance</h2><div class="list">'+(malSupportRows.length?malSupportRows.map(function(x){return '<div class="card"><b>'+esc(x.sujet)+'</b><div class="sub">'+esc(x.categorie)+' · '+esc(x.statut)+' · '+new Date(x.created_at).toLocaleString('fr-FR')+'</div><p>'+esc(x.message)+'</p><label>Réponse administrative<textarea id="malReply'+x.id+'" maxlength="1000">'+esc(x.reponse_admin||'')+'</textarea></label><select id="malStatus'+x.id+'"><option value="en_cours">En cours</option><option value="resolu">Résolu</option><option value="rejete">Rejeté</option></select><button onclick="malResolveSupport('+x.id+')">Enregistrer le traitement</button></div>'}).join(''):'<p class="note">Aucune demande.</p>')+'</div>'}
async function malResolveSupport(id){var status=$('malStatus'+id).value,reply=$('malReply'+id).value.trim();var r=await sb.from('demandes_support').update({statut:status,reponse_admin:reply,traite_par:me.id,traite_le:new Date().toISOString()}).eq('id',id);if(r.error){alert('Erreur : '+r.error.message);return}await loadAdm()}
function aiManagerPreview(){return '<section class="box list" style="margin-bottom:16px;border:1px solid var(--pink)"><div class="top"><div style="font-size:28px">🤖</div><div><b>Malachite AI Manager</b><div class="note">Centre de gestion intelligent · équipe de copilotes</div></div></div><div class="wall"><b>État : moteur IA Malachite existant</b><p class="note">Les copilotes s’appuient sur le moteur IA Malachite existant. Ils préparent analyses et recommandations ; les validations de paiements, sanctions et actions sensibles restent sous ton contrôle.</p></div><div class="g2"><div class="plan"><b>💳 Paiements</b><p>Détection des doublons, contrôle des références et suivi Premium.</p></div><div class="plan"><b>🛡️ Comptes</b><p>Détection des comportements anormaux et suspensions temporaires encadrées.</p></div><div class="plan"><b>🚩 Signalements</b><p>Classement par gravité et traitement des cas urgents.</p></div><div class="plan"><b>⭐ Avis & support</b><p>Réponses aux questions et regroupement des problèmes.</p></div></div><p class="note">Les paiements ambigus, sanctions définitives, contestations et actions irréversibles resteront soumis à ton contrôle. Chaque action sera journalisée.</p></section>'}
function admin(){
 var tabs='<section class="mal-admin-tabs"><button class="'+(malAdminPage==='payments'?'sel':'')+'" onclick="malSetAdminPage(\'payments\')">💳 Paiements</button><button class="'+(malAdminPage==='members'?'sel':'')+'" onclick="malSetAdminPage(\'members\')">👥 Membres</button><button class="'+(malAdminPage==='copilots'?'sel':'')+'" onclick="malSetAdminPage(\'copilots\')">🤖 Copilotes</button><button class="'+(malAdminPage==='settings'?'sel':'')+'" onclick="malSetAdminPage(\'settings\')">⚙️ Plus</button></section>';
 var body=malAdminPage==='payments'?admin0():malAdminPage==='members'?'<h2>Comptes et modération</h2>'+reportsAdmin()+suspensionsAdmin()+blockedPanel():malAdminPage==='copilots'?aiManagerPreview():malSettings();
 return '<section class="mal-admin"><h1>Administration</h1>'+tabs+body+'</section>';
}
function draw(keep){
 var oldMsgs=$('msgs'),nearBottom=!oldMsgs||oldMsgs.scrollHeight-oldMsgs.scrollTop-oldMsgs.clientHeight<140,oldTop=oldMsgs?oldMsgs.scrollTop:0;
 var oldInput=$('mi'),draft=oldInput?oldInput.value:'',hadFocus=!!(oldInput&&document.activeElement===oldInput),selStart=oldInput&&typeof oldInput.selectionStart==='number'?oldInput.selectionStart:0,selEnd=oldInput&&typeof oldInput.selectionEnd==='number'?oldInput.selectionEnd:selStart;
 var y=window.scrollY;
 document.body.classList.toggle('mal-chat-mode',!!(me&&tab==='chat'&&open));
 $('v').innerHTML=!me?authView():((tab==='chat'&&open)?'':banner())+{home:home,search:search,chat:chat,rdv:rdv,offres:offres,me:moi,centre:centre,adm:admin}[tab]();
 var newInput=$('mi');if(newInput&&draft)newInput.value=draft;
 if(me&&tab==='search'){fqr();res()}
 if(me&&tab==='home')bindDrag();
 $('nav').innerHTML=me?[['home','💘','Découvrir'],['search','🔍','Recherche'],['chat','💬','Messages'],['rdv','📅','RDV'],['offres','⭐','Offres'],['me','👤','Moi'],['centre','⚙️','Plus']].concat(me.email==ADM?[['adm','🛠','Admin']]:[]).map(function(x){return '<button data-k="'+x[0]+'" class="'+(tab==x[0]?'on':'')+'" onclick="goTab(\''+x[0]+'\')"><span>'+ico(x[0])+bdg(x[0])+'</span>'+x[2]+'</button>'}).join(''):'';
 if(me){var b=document.getElementById('malachite-mascot');if(!b){b=document.createElement('button');b.id='malachite-mascot';b.innerHTML='<span class="mface">🥰</span><span class="mlabel">Malachite</span>';b.onclick=function(){go('centre')};document.body.appendChild(b)}}else{var b=document.getElementById('malachite-mascot');if(b)b.remove()}
 if(tab==='centre'&&$('malLang'))$('malLang').value=malLang;
 if(tab==='chat'&&open&&$('msgs')){$('msgs').scrollTop=nearBottom?$('msgs').scrollHeight:Math.min(oldTop,$('msgs').scrollHeight);$('msgs').addEventListener('scroll',function(){if(this.scrollTop<55)loadOlderMessages()},{passive:true})}
 else window.scrollTo(0,keep?y:0);
 if(hadFocus&&newInput){newInput.focus();try{newInput.setSelectionRange(Math.min(selStart,newInput.value.length),Math.min(selEnd,newInput.value.length))}catch(e){}}
}


function centre(){if(mine&&mine.avatar&&mine.avatar.type==="pro-vector")malAvatarState=Object.assign({},malAvatarState,mine.avatar.config||{});return malCentre()}
function bub(m,i){
 var pending=!!m._pending,u=!!m.display_url,t=new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
 var file=(m.media_url||"").split("/").pop()||"document",label=String(m.texte||file).replace(/^📎\s*/,"")||file,body="";
 if(u&&m.media_type==="image")body='<img alt="photo" class="pic" onclick="viewImg(this.src,event)" src="'+esc(m.display_url)+'">';
 else if(u&&m.media_type==="audio")body='<audio class="aud" controls preload="metadata" src="'+esc(m.display_url)+'"></audio>';
 else if(u&&m.media_type==="video")body='<video class="chat-video" controls playsinline preload="none" src="'+esc(m.display_url)+'"></video><a class="chat-video-open" href="'+esc(m.display_url)+'" target="_blank" rel="noopener">Ouvrir la vidéo si la lecture bloque ↗</a>';
 else if(m.media_type==="document")body='<div class="chat-document"><b>📄 '+esc(label)+'</b><small>'+(u?'Document prêt':'Document enregistré · préparation du lien')+'</small><div class="chat-document-actions">'+(u?'<a href="'+esc(m.display_url)+'" target="_blank" rel="noopener">Ouvrir</a><a href="'+esc(m.download_url||m.display_url)+'" target="_blank" rel="noopener">Télécharger</a>':'<span>Réessaie dans un instant</span>')+'</div></div>';
 else body=esc(m.texte||"");
 return '<div class="m '+(m.de===me.id?'out':'in')+'" data-message-id="'+esc(m.id)+'" data-message-index="'+i+'" onclick="openMessageActions('+i+',event)" role="button" tabindex="0" aria-label="Options du message">'+body+'<span class="tm"><span class="msg-time">'+(pending?'Envoi…':t)+'</span>'+receiptMarkup(m,pending)+'</span></div>';
}
async function sendVideo(el){
 var f=el&&el.files&&el.files[0];if(!f)return;
 var target=open,clear=function(){if(el)el.value=''};if(!target||!me){clear();return}
 var byExt={'mp4':'video/mp4','webm':'video/webm','mov':'video/quicktime','3gp':'video/3gpp'},extName=(f.name||'').split('.').pop().toLowerCase(),mime=({'video/mp4':1,'video/webm':1,'video/quicktime':1,'video/3gpp':1}[f.type]?f.type:(byExt[extName]||f.type||'')),allowed={'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/3gpp':'3gp'};
 if(!allowed[mime]){setChatUploadStatus('Format vidéo non accepté.');clear();return}
 if(f.size>50*1024*1024){setChatUploadStatus('Vidéo trop lourde : 50 Mo maximum par vidéo.');clear();return}
 var path=me.id+'/'+target+'/video-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.'+allowed[mime];
 clear();sendChatMediaFast(f,{path:path,type:'video',mime:mime,text:'🎬 Vidéo',progressText:'Envoi de la vidéo…'});
}
