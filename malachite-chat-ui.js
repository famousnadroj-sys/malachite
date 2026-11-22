
function matchBox(){
 if(blockedCurrent)return '<div class="mrow">🚫 Cette conversation est bloquée.</div>';
 if(av2===null)return '<div class="mrow pop"><span>Vous avez bien discuté ?</span><button class="b1" onclick="avis(true)">💗 Ça match</button><button onclick="avis(false)">Pas pour moi</button></div>';
 if(av2===false)return '<div class="mrow"><span class="note">Tu as répondu « Pas pour moi ».</span><button onclick="avis(true)">Changer d’avis</button></div>';
 if(!mutual)return '<div class="mrow pop"><span>💗 Ton « Ça match » est envoyé. On attend l’autre personne.</span></div>';
 var h='<div class="mrow pop"><b>🎉 Match !</b><button class="b1" onclick="rdvFor=\''+open+'\';go(\'rdv\')">📅 Rendez-vous</button><button disabled>📹 Appels sécurisés indisponibles</button>'+(ct?'':'<button onclick="payOpen=!payOpen;lastSig=\'\';loadChat()">🔓 Contact 1 $</button>')+'</div>';
 if(ct)h+='<div class="mrow">📞 <b>'+esc(ct.nom||'')+'</b> · <a href="tel:'+esc(ct.tel||'')+'">'+esc(ct.tel||'pas de numéro')+'</a></div>';
 else if(payOpen)h+='<div class="mrow" style="display:block">Choisis l’opérateur, envoie 1 USD, saisis la référence et joins le reçu.<select id="malContactOperator"><option value="airtel">Airtel Money · +243 993 315 532</option><option value="orange">Orange Money · +243 848 775 992</option></select><div class="send"><input id="uc" maxlength="100" placeholder="Référence de transaction"></div><label>Capture du reçu (JPEG, PNG ou WebP, 5 Mo max)<input id="ucProof" type="file" accept="image/jpeg,image/png,image/webp"></label><button onclick="payC()">Soumettre</button><div id="um" class="note"></div></div>'
 return h
}
function admin0(){
 var pages=Math.max(1,Math.ceil(admTotal/50));
 return '<h2>💳 Paiements à confirmer</h2><p class="note">'+admTotal+' demande(s) en attente. Traitement individuel, maximum 50 affichées à la fois.</p><div class="mal-payment-filters"><label>Période<select id="admPaymentPeriod" onchange="admPeriodChange()"><option value="today" '+(admPaymentPeriod==='today'?'selected':'')+'>Aujourd’hui</option><option value="yesterday" '+(admPaymentPeriod==='yesterday'?'selected':'')+'>Hier</option><option value="older" '+(admPaymentPeriod==='older'?'selected':'')+'>Plus anciens</option><option value="all" '+(admPaymentPeriod==='all'?'selected':'')+'>Toutes les dates</option></select></label><label>Recherche<input id="admPaymentSearch" value="'+esc(admSearch)+'" placeholder="Référence ou offre" onkeydown="if(event.key===\'Enter\')admSearchChange()"></label><button onclick="admSearchChange()">Chercher</button></div><div class="mal-payment-count">Page '+(admPage+1)+' / '+pages+' · '+adm.length+' demande(s) affichée(s)</div><div class="list">'+(adm.length?adm.map(function(x){var p=prof(x.user_id)||{},c=x.cible?prof(x.cible):null;var date=new Date(x.created_at);return '<article class="mal-payment-card"><div class="mal-payment-head"><div><b>'+esc(p.prenom||'Membre')+'</b><div class="sub">'+esc(x.offre)+' · '+esc(PRIX[x.offre]||'')+'</div></div><span class="mal-payment-status">À confirmer</span></div>'+(c?'<div class="sub">Pour : '+esc(c.prenom||'un membre')+'</div>':'')+'<div class="mal-payment-detail"><span>Opérateur</span><b>'+esc(x.operateur==='airtel'?'Airtel Money':x.operateur==='orange'?'Orange Money':x.operateur||'Non précisé')+'</b></div><div class="mal-payment-detail"><span>Référence</span><b>'+esc(x.code)+'</b></div>'+(x.receipt_url?'<a class="mal-payment-receipt" href="'+esc(x.receipt_url)+'" target="_blank" rel="noopener noreferrer">Voir le reçu ↗</a>':'<div class="note">Aucun reçu joint</div>')+(x.receipt_path?'<div class="mal-ai-payment-review" id="malAiPaymentReview'+x.id+'"><b>Malakit AI · lecture automatique</b><p>Préparation de l’analyse de la capture…</p><button type="button" onclick="malAiAnalyzePayment('+x.id+')">Lire avec Malakit AI</button></div>':'')+'<small class="note">'+date.toLocaleString('fr-FR')+'</small><div class="mal-payment-actions"><button class="b1" data-payment-action="'+x.id+'" onclick="trt('+x.id+',true)">✔ Confirmer reçu</button><button data-payment-action="'+x.id+'" onclick="trt('+x.id+',false)">Refuser</button></div></article>'}).join(''):'<div class="card"><b>Aucun paiement en attente dans cette période.</b><p class="note">Choisis une autre période ou efface la recherche.</p></div>')+'</div><div class="acts"><button '+(admPage<=0?'disabled':'')+' onclick="admPageChange(-1)">← Précédent</button><span class="note">'+(admPage+1)+' / '+pages+'</span><button '+(admPage+1>=pages?'disabled':'')+' onclick="admPageChange(1)">Suivant →</button></div>';
}
function malShowLegal(){alert("CONDITIONS D’UTILISATION — 18 ans et plus\n\n"+mt("termsBody")+"\n\nCONFIDENTIALITÉ\n"+mt("privacyBody")+"\n\nSÉCURITÉ\n"+mt("safetyBody")+"\n\n"+mt("pending"))}
function persistMalView(){
 if(!me)return;
 try{sessionStorage.setItem('malachite:view:'+me.id,JSON.stringify({tab:tab,open:tab==='chat'&&open&&open!==me.id?open:null}))}catch(e){}
}
function restoreMalView(){
 var state=null;try{state=JSON.parse(sessionStorage.getItem('malachite:view:'+me.id)||'null')}catch(e){}
 var allowed=['home','search','chat','rdv','offres','me','centre','adm'];
 tab=state&&allowed.indexOf(state.tab)>=0?state.tab:'home';
 // Never reopen the app on the profile/avatar setup screen after a fresh page load.
 if(tab==='me'){tab='home';try{sessionStorage.removeItem('malachite:view:'+me.id)}catch(e){}}
 if(tab==='adm'&&me.email!==ADM)tab='home';
 open=tab==='chat'&&state&&state.open&&state.open!==me.id?state.open:null;
 chatCursor=null;chatCursorId=0;chatCursorFor=null;msgs=[];lastSig='';
 return tab;
}
var malAuthBooted=false;
function go(t){
 if(t==='home'&&typeof loadPublicCampaigns==='function')loadPublicCampaigns();
 if(t==="centre"&&!me){malShowLegal();return}
 document.querySelectorAll(".sheetbg,.viewer,.lbx").forEach(function(e){e.remove()});
 tab=t;msg="";lastSig="";clearInterval(timer);persistMalView();
 if(t==="chat"){if(open&&chatCursorFor!==open){chatInitialLoading=true;chatCursorId=0;chatBeforeId=0;chatHasOlder=false;msgs=[]}draw(true);loadChat();timer=setInterval(function(){if(tab==="chat"&&!document.hidden&&!msgRealtimeReady)loadChat()},15000);return}
 if(t==="home"||t==="search"){
  if(loadedUid===me.id&&profs.length&&Date.now()-profilesLoadedAt<60000){draw(true);return}
  load().then(function(){if(tab===t)draw(true)});draw(true);return
 }
 if(t==="rdv"){loadRdv().then(function(){if(tab===t)draw(true)});draw(true);return}
 if(t==="adm"){loadAdm();return}
 draw(true);
}
IC.centre='<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>';
