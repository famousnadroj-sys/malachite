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
var appAvatarSvg=window.malAvatarSvg,appAvatarSet=window.malAvatarSet,appAvatarPreview=window.malAvatarPreview,appSaveAvatar=window.malSaveAvatar;
window.malAvatarSvg=function(a){return appAvatarSvg?appAvatarSvg(a&&a.config?a.config:a):''};
window.malAvatarSet=function(k,v){if(appAvatarSet)appAvatarSet(k,v)};
window.malAvatarPreview=function(){if(appAvatarPreview)appAvatarPreview()};
window.malSaveAvatar=async function(){if(appSaveAvatar)return appSaveAvatar()};
var oldCentre=window.centre;
window.centre=function(){if(window.mine&&window.mine.avatar&&window.mine.avatar.type==='pro-vector')window.malAvatarState=Object.assign({},window.malAvatarState,window.mine.avatar.config||{});return oldCentre?oldCentre():''};
var originalAv=window.av;
window.av=function(p){
 var photo=p&&p.photoUrls&&p.photoUrls[0];
 if(photo)return '<div class="av" style="background-image:url('+String(photo).replace(/["<>]/g,'')+');background-size:cover;background-position:center"></div>';
 var a=p&&p.avatar;
 if(a&&a.type==='pro-vector')return '<div class="av mal-vector-avatar">'+window.malAvatarSvg(a.config)+'</div>';
 if(a&&a.type==='vector')return '<div class="av mal-vector-avatar">'+window.malAvatarSvg(a)+'</div>';
 if(a&&a.emoji)return '<div class="av" style="background:'+((/^#[0-9a-f]{6}$/i.test(a.color||''))?a.color:'#F7B7D0')+';display:grid;place-items:center;font-size:30px">'+String(a.emoji).replace(/[&<>"]/g,'')+'</div>';
 return originalAv?originalAv(p):'<div class="av">?</div>';
};
var observer=new MutationObserver(function(records){records.forEach(function(r){if(r.type==='characterData')translateNode(r.target);else r.addedNodes.forEach(function(n){translateTree(n)})})});
function start(){apply();observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.malApplyTranslations=apply;
})();