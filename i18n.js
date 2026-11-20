(function(){
'use strict';
var LANGS={
en:{
'Découvrir':'Discover','Recherche':'Search','Messages':'Messages','RDV':'Dates','Offres':'Plans','Moi':'Me','Plus':'More','Admin':'Admin',
'Mon profil':'My profile','Modifier mon profil':'Edit my profile','Mes préférences':'My preferences','Mes questions-réponses':'My Q&A',
'Faits pour toi':'Made for you','Aucune conversation pour l’instant 💬':'No conversations yet 💬','Écrire':'Message','Signaler':'Report','Bloquer':'Block',
'En ligne':'Online','Profil privé':'Private profile','Ce membre garde les détails de son profil privés.':'This member keeps their profile details private.',
'Voir les abonnements':'View plans','Voir mon profil':'View my profile','Enregistrer':'Save','Annuler':'Cancel','Retour':'Back','Fermer':'Close',
'Envoyer':'Send','Envoyer le message':'Send message','Rechercher':'Search','Rechercher un profil':'Search profiles','Aucun résultat':'No results',
'Nom':'Name','Prénom':'First name','Âge':'Age','Genre':'Gender','Commune':'Township','Quartier / avenue':'Neighborhood / street',
'Profession':'Occupation','Ma biographie':'My bio','Centres d’intérêt (sépare par des virgules)':'Interests (separate with commas)',
'Langues parlées':'Languages spoken','Informations privées':'Private information','Visibles par toi seulement.':'Visible only to you.',
'Nom complet':'Full name','Adresse':'Address','Téléphone':'Phone','Je cherche':'I am looking for','Peu importe':'Any',
'Une femme':'A woman','Un homme':'A man','Âge (min – max)':'Age (min – max)','Communes':'Townships','Type de relation':'Relationship type',
'Décris la personne idéale (avec tes mots)':'Describe your ideal person','Trouver mes profils compatibles':'Find compatible profiles',
'Gratuit':'Free','Premium':'Premium','Boost 24 h':'24-hour Boost','Paiement Airtel Money ou Orange Money':'Airtel Money or Orange Money payment',
'Offre':'Plan','Opérateur':'Provider','Référence de transaction':'Transaction reference','Soumettre la demande de paiement':'Submit payment request',
'Connecte-toi.':'Please sign in.','Aucune demande.':'No requests.','Compte et sécurité':'Account and security',
'Réclamations et assistance':'Support and complaints','Catégorie':'Category','Objet':'Subject','Décris ta demande':'Describe your request',
'Envoyer la réclamation':'Send request','Demande transmise à l’assistance.':'Request sent to support.',
'Les appels sécurisés sont indisponibles':'Secure calls are unavailable','Ouvrir la vidéo si la lecture bloque ↗':'Open video if playback fails ↗',
'Envoi…':'Sending…','Pas encore de profil qui te correspond. Invite tes amis, ou élargis tes critères.':'No matching profiles yet. Invite friends or broaden your preferences.',
'Les belles histoires commencent par une rencontre.':'Beautiful stories begin with a meeting.',
'Rencontres à Lubumbashi':'Dating in Lubumbashi','Mes photos':'My photos','Ajouter une photo':'Add a photo',
'Modifier':'Edit','Supprimer':'Delete','Enregistrer les modifications':'Save changes','Préférences enregistrées.':'Preferences saved.',
'Une erreur est survenue.':'Something went wrong.','Chargement…':'Loading…','Aucun profil disponible.':'No profiles available.',
'Connecte-toi pour continuer.':'Sign in to continue.','Déconnexion':'Sign out','Se déconnecter':'Sign out'
},
sw:{
'Découvrir':'Gundua','Recherche':'Tafuta','Messages':'Ujumbe','RDV':'Miadi','Offres':'Mipango','Moi':'Mimi','Plus':'Zaidi',
'Mon profil':'Wasifu wangu','Modifier mon profil':'Hariri wasifu wangu','Mes préférences':'Mapendeleo yangu','Faits pour toi':'Wanaokufaa',
'Écrire':'Andika','Signaler':'Ripoti','Bloquer':'Zuia','En ligne':'Yuko mtandaoni','Profil privé':'Wasifu wa faragha',
'Enregistrer':'Hifadhi','Annuler':'Ghairi','Retour':'Rudi','Fermer':'Funga','Envoyer':'Tuma','Rechercher':'Tafuta',
'Nom':'Jina','Prénom':'Jina la kwanza','Âge':'Umri','Genre':'Jinsia','Commune':'Manispaa','Profession':'Kazi',
'Ma biographie':'Wasifu wangu','Téléphone':'Simu','Adresse':'Anwani','Gratuit':'Bure','Offre':'Mpango','Opérateur':'Mtoa huduma'
},
ln:{
'Découvrir':'Yeba bato','Recherche':'Luka','Messages':'Bansango','RDV':'Mikutanó','Offres':'Makabo','Moi':'Ngai','Plus':'Mosusu',
'Mon profil':'Profil na ngai','Modifier mon profil':'Bongisa profil na ngai','Mes préférences':'Oyo nalingi','Faits pour toi':'Bato oyo bakoki na yo',
'Écrire':'Komá','Signaler':'Sakola','Bloquer':'Kanga','En ligne':'Azali na internet','Profil privé':'Profil ya sekele',
'Enregistrer':'Bomba','Annuler':'Longola','Retour':'Zonga','Fermer':'Kanga','Envoyer':'Tinda','Rechercher':'Luka',
'Nom':'Kombo','Prénom':'Kombo ya liboso','Âge':'Mbula','Genre':'Lolenge','Commune':'Komini','Profession':'Mosala',
'Ma biographie':'Lisolo na ngai','Téléphone':'Telefone','Adresse':'Adrɛsi','Gratuit':'Ofele','Offre':'Likabo','Opérateur':'Opérateur'
},
kg:{
'Découvrir':'Sosa bantu','Recherche':'Sosa','Messages':'Nsangu','RDV':'Kukutana','Offres':'Mambu ya kusola','Moi':'Mono','Plus':'Yankaka',
'Mon profil':'Profil ame','Modifier mon profil':'Lungisa profil ame','Mes préférences':'Mambu mono zola','Faits pour toi':'Bantu ya nge',
'Écrire':'Sonika','Signaler':'Songa','Bloquer':'Kanga','En ligne':'Na internet','Profil privé':'Profil ya nkaka',
'Enregistrer':'Bika','Annuler':'Bika ve','Retour':'Vutuka','Fermer':'Kanga','Envoyer':'Tuma','Rechercher':'Sosa',
'Nom':'Zina','Prénom':'Zina ya ntete','Âge':'Mvula','Genre':'Nitu','Commune':'Commune','Profession':'Kisalu',
'Ma biographie':'Mambu ma mono','Téléphone':'Telefone','Adresse':'Adresi','Gratuit':'Mpamba','Offre':'Nsadilu','Opérateur':'Opérateur'
},
tsh:{
'Découvrir':'Tala bantu','Recherche':'Sangula','Messages':'Nsangu','RDV':'Kukumana','Offres':'Mikalo','Moi':'Ndi','Plus':'Bikondo',
'Mon profil':'Profil wanyi','Modifier mon profil':'Lungisha profil wanyi','Mes préférences':'Mambu ndi musua','Faits pour toi':'Bantu bakuenzela',
'Écrire':'Sonika','Signaler':'Sakidila','Bloquer':'Kanga','En ligne':'Udi pa internet','Profil privé':'Profil wa bupole',
'Enregistrer':'Bika','Annuler':'Bika','Retour':'Vuluka','Fermer':'Kanga','Envoyer':'Tuma','Rechercher':'Sangula',
'Nom':'Dina','Prénom':'Dina dia kumpala','Âge':'Myaka','Genre':'Mushindu','Commune':'Komini','Profession':'Mulimo',
'Ma biographie':'Mambu a wanyi','Téléphone':'Telefone','Adresse':'Adiresi','Gratuit':'Mpamba','Offre':'Mikalo','Opérateur':'Opérateur'
}
};
var originals=new WeakMap(),attrOriginals=new WeakMap();
function current(){return window.malLang||localStorage.getItem('malachite_lang')||'fr'}
function excluded(node){
 var el=node.nodeType===1?node:node.parentElement;
 return !!(el&&el.closest('script,style,textarea,input,select,option,[contenteditable="true"],.chat,.mal-own-profile,.mal-profile-card,.mal-card-bio,.mal-own-bio,.mal-legal,.msg-action-quote'));
}
function translateNode(n){
 if(n.nodeType!==3||excluded(n))return;
 var original=originals.has(n)?originals.get(n):n.nodeValue;
 if(!original||!original.trim())return;
 if(!originals.has(n))originals.set(n,original);
 var key=original.trim(),dict=LANGS[current()],translated=dict&&dict[key];
 var next=translated?original.replace(key,translated):original;
 // Avoid writing identical text: MutationObserver would otherwise observe its own write forever.
 if(n.nodeValue!==next)n.nodeValue=next;
}
function translateAttrs(el){
 if(!el||el.nodeType!==1)return;
 var attrs=['placeholder','title','aria-label'];
 var saved=attrOriginals.get(el)||{};
 attrs.forEach(function(a){
  if(!el.hasAttribute(a))return;
  if(!(a in saved))saved[a]=el.getAttribute(a);
  var orig=saved[a],dict=LANGS[current()];
  if(dict&&dict[orig])el.setAttribute(a,dict[orig]);else el.setAttribute(a,orig);
 });
 attrOriginals.set(el,saved);
}
function translateTree(root){
 if(!root)return;
 if(root.nodeType===3){translateNode(root);return}
 if(root.nodeType===1)translateAttrs(root);
 var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 var n;while((n=walker.nextNode()))translateNode(n);
 if(root.querySelectorAll)root.querySelectorAll('*').forEach(translateAttrs);
}
function apply(){
 document.documentElement.lang=current();
 translateTree(document.body);
}
var originalSetLang=window.malSetLang;
if(typeof originalSetLang==='function'){
 window.malSetLang=function(l){originalSetLang(l);apply();};
}
window.malAvatarState={skin:'medium',hair:'short',shirt:'rose',style:'classic'};
var skinColors={light:'#F4D2B8',medium:'#C98D68',dark:'#8D573D',deep:'#5B382C'};
var shirtColors={rose:'#D81B60',blue:'#2878C8',green:'#248A63',purple:'#7652A8',black:'#30323A'};
function avatarState(a){a=a||{};return {skin:skinColors[a.skin]?a.skin:'medium',hair:['short','curly','long','shaved'].indexOf(a.hair)>=0?a.hair:'short',shirt:shirtColors[a.shirt]?a.shirt:'rose',style:a.style==='round'?'round':'classic'}}
window.malAvatarSvg=function(a){
 a=avatarState(a);var skin=skinColors[a.skin],shirt=shirtColors[a.shirt];
 var hair=a.hair==='shaved'?'':a.hair==='long'?
 '<path d="M24 42 Q17 8 50 8 Q83 8 76 42 L79 79 Q70 88 65 69 L35 69 Q30 88 21 79Z" fill="#30221F"/>':
 a.hair==='curly'?'<path d="M22 43 Q12 13 31 17 Q38 4 49 15 Q63 3 70 18 Q88 18 78 45 Q71 27 62 30 Q49 19 38 31 Q27 27 22 43Z" fill="#30221F"/>':
 '<path d="M22 43 Q18 10 50 10 Q82 10 78 43 Q68 27 60 28 Q48 18 37 29 Q28 27 22 43Z" fill="#30221F"/>';
 return '<svg viewBox="0 0 100 100" role="img" aria-label="Custom avatar" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="avbg" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#f8dce7"/></linearGradient></defs><circle cx="50" cy="50" r="49" fill="url(#avbg)"/><path d="M15 100 Q18 72 39 68 L61 68 Q83 72 86 100" fill="'+shirt+'"/><path d="M39 65 L39 76 Q50 86 61 76 L61 65" fill="'+skin+'"/><ellipse cx="50" cy="44" rx="27" ry="31" fill="'+skin+'"/>'+hair+'<ellipse cx="40" cy="47" rx="2.3" ry="3" fill="#30221F"/><ellipse cx="60" cy="47" rx="2.3" ry="3" fill="#30221F"/><path d="M44 59 Q50 64 56 59" fill="none" stroke="#8D3E45" stroke-width="2.2" stroke-linecap="round"/>'+(a.style==='round'?'<circle cx="31" cy="56" r="4" fill="#E88A8A" opacity=".35"/><circle cx="69" cy="56" r="4" fill="#E88A8A" opacity=".35"/>':'')+'</svg>';
};
window.malAvatarSet=function(k,v){if(['skin','hair','shirt','style'].indexOf(k)<0)return;var next=Object.assign({},window.malAvatarState);next[k]=v;window.malAvatarState=avatarState(next);var p=document.getElementById('malAvatarPreview');if(p)p.innerHTML=window.malAvatarSvg(window.malAvatarState)};
window.malAvatarPreview=function(){var p=document.getElementById('malAvatarPreview');if(p)p.innerHTML=window.malAvatarSvg(window.malAvatarState)};
window.malSaveAvatar=async function(){
 var out=document.getElementById('malAvMsg');if(!window.me){if(out)out.textContent='Connecte-toi.';return}
 var a=Object.assign({type:'vector'},avatarState(window.malAvatarState));
 var r=await window.sb.from('profiles').update({avatar:a}).eq('id',window.me.id);
 if(r.error){if(out)out.textContent='Avatar non enregistré : '+r.error.message;return}
 if(window.mine)window.mine.avatar=a;
 if(out)out.textContent=current()==='en'?'Avatar saved to your profile.':'Avatar enregistré sur ton profil.';
 if(typeof window.draw==='function')window.draw(true);
};
var oldCentre=window.centre;
window.centre=function(){
 if(window.mine&&window.mine.avatar&&window.mine.avatar.type==='vector')window.malAvatarState=avatarState(window.mine.avatar);
 else if(window.mine&&window.mine.avatar&&window.mine.avatar.emoji)window.malAvatarState=avatarState({});
 return typeof window.malCentre==='function'?window.malCentre():(oldCentre?oldCentre():'');
};
var originalAv=window.av;
window.av=function(p){
 var photo=p&&p.photoUrls&&p.photoUrls[0];if(photo)return '<div class="av" style="background-image:url('+String(photo).replace(/["<>]/g,'')+')"></div>';
 var a=p&&p.avatar;if(a&&a.type==='vector')return '<div class="av mal-vector-avatar">'+window.malAvatarSvg(a)+'</div>';
 if(a&&a.emoji)return '<div class="av" style="background:'+((/^#[0-9a-f]{6}$/i.test(a.color||''))?a.color:'#F7B7D0')+';display:grid;place-items:center;font-size:30px">'+String(a.emoji).replace(/[&<>"]/g,'')+'</div>';
 return originalAv?originalAv(p):'<div class="av">?</div>';
};
var observer=new MutationObserver(function(records){records.forEach(function(r){if(r.type==='characterData')translateNode(r.target);else r.addedNodes.forEach(function(n){translateTree(n)})})});
function start(){apply();observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.malApplyTranslations=apply;
})();