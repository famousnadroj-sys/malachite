/* Malachite AI Ad Studio — copy generation + locally rendered animated campaign artwork. */
(function(){
 "use strict";
 if(window.__malAdStudioLoaded)return;window.__malAdStudioLoaded=true;
 var generated=null,working=false;
 function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
 function val(id){var n=document.getElementById(id);return n?n.value.trim():""}
 function set(id,v){var n=document.getElementById(id);if(n)n.value=v||""}
 function style(){return '<style>.mal-ad-studio{display:grid;gap:12px}.mal-ad-preview{position:relative;overflow:hidden;min-height:310px;border-radius:24px;background:linear-gradient(135deg,#24102f,#9b2459 55%,#f3a35d);color:#fff;padding:28px;display:flex;flex-direction:column;justify-content:space-between;isolation:isolate}.mal-ad-preview:before,.mal-ad-preview:after{content:"";position:absolute;border:1px solid #ffffff55;border-radius:50%;width:240px;height:240px;right:-70px;top:-75px;animation:malAdOrbit 9s linear infinite;z-index:-1}.mal-ad-preview:after{width:170px;height:170px;right:40px;top:110px;animation-direction:reverse}.mal-ad-preview>*{position:relative}.mal-ad-kicker{font-size:10px;letter-spacing:.2em;font-weight:900;opacity:.85}.mal-ad-preview h3{font:600 clamp(28px,7vw,42px)/1.05 Fraunces,Georgia,serif;margin:18px 0 10px;max-width:460px}.mal-ad-preview p{font-size:14px;max-width:420px;line-height:1.5}.mal-ad-preview strong{align-self:flex-start;padding:10px 16px;border-radius:99px;background:#fff;color:#56203e;font-size:12px}.mal-ad-preview .mal-ad-glow{position:absolute;width:180px;height:180px;border-radius:50%;background:#ffb5d755;filter:blur(20px);right:-25px;bottom:30px;animation:malAdPulse 4s ease-in-out infinite;z-index:-1}@keyframes malAdOrbit{to{transform:rotate(360deg)}}@keyframes malAdPulse{50%{transform:scale(1.35);opacity:.5}}@media(prefers-reduced-motion:reduce){.mal-ad-preview:before,.mal-ad-preview:after,.mal-ad-glow{animation:none!important}}.mal-ad-note{font-size:12px;color:#806775}.mal-ad-actions{display:flex;gap:8px;flex-wrap:wrap}.mal-ad-actions button{flex:1;min-width:135px}</style>'}
 window.campaignsAdmin=function(){
  var rows=Array.isArray(window.malCampaignRows)?window.malCampaignRows:[];
  return style()+'<section class="mal-ad-studio"><h2>✦ Studio publicitaire IA</h2><p class="note">Décris ton offre. Malachite AI prépare le texte, puis crée une affiche visuelle animée à publier dans Découvrir.</p>'+
  '<div class="card"><label>Entreprise, marque ou produit<input id="malCampaignBusiness" maxlength="120" placeholder="Ex. Boutique Élégance"></label>'+
  '<label>Offre à promouvoir<textarea id="malCampaignOffer" rows="3" maxlength="300" placeholder="Ex. Nouvelle collection de chaussures, livraison disponible…"></textarea></label>'+
  '<div class="g2"><label>Prix (facultatif)<input id="malCampaignPrice" maxlength="60" placeholder="Ex. 25 000 CDF"></label><label>Public visé<input id="malCampaignAudience" maxlength="120" placeholder="Ex. Femmes et hommes à Lubumbashi"></label></div>'+
  '<div class="g2"><label>Ville / zone<input id="malCampaignLocation" maxlength="120" value="Lubumbashi"></label><label>Style<select id="malCampaignTone"><option value="Élégant et premium">Élégant et premium</option><option value="Moderne et dynamique">Moderne et dynamique</option><option value="Minimaliste et professionnel">Minimaliste et professionnel</option><option value="Chaleureux et convivial">Chaleureux et convivial</option><option value="Urgence commerciale sans exagération">Offre promotionnelle</option></select></label></div>'+
  '<label>Appel à l’action<input id="malCampaignCTA" maxlength="80" placeholder="Ex. Commander maintenant (facultatif)"></label>'+
  '<button class="b1" id="malAdGenerate" type="button" onclick="malGenerateAdCopy()">✦ Générer ma publicité avec l’IA</button><p class="mal-ad-note">Le moteur IA utilise la clé Gemini côté serveur. Ta clé ne sera jamais exposée dans le navigateur.</p></div>'+
  '<div class="card"><h3>2. Prévisualisation et publication</h3><div id="malAdPreview" class="mal-ad-preview"><span class="mal-ad-kicker">MALACHITE · CAMPAGNE SPONSORISÉE</span><div><h3 id="malAdPreviewTitle">Ta publicité apparaîtra ici</h3><p id="malAdPreviewBody">Génère ton texte pour voir le rendu.</p></div><strong id="malAdPreviewCTA">DÉCOUVRIR</strong><i class="mal-ad-glow"></i></div>'+
  '<label>Titre<input id="malCampaignTitle" maxlength="90" placeholder="Titre publicitaire"></label><label>Description<textarea id="malCampaignDescription" maxlength="500" rows="3" placeholder="Description"></textarea></label>'+
  '<label>Lien de destination (facultatif)<input id="malCampaignLink" type="url" maxlength="500" placeholder="https://..."></label>'+
  '<label>Format de campagne<select id="malCampaignMediaType"><option value="video">Vidéo publicitaire courte avec son</option><option value="animated">Affiche animée</option><option value="notice">Communiqué simple</option><option value="image">Image fixe</option></select></label><div class="g2"><label>Durée vidéo<select id="malCampaignDuration"><option value="10">10 secondes</option><option value="15" selected>15 secondes</option><option value="20">20 secondes</option></select></label><label>Texte que le narrateur dira<textarea id="malCampaignNarration" rows="3" maxlength="320" placeholder="Une phrase courte, naturelle et claire…"></textarea></label><label>Voix IA<select id="malCampaignVoice"><option value="Charon">Charon · posée</option><option value="Kore">Kore · claire</option><option value="Puck">Puck · énergique</option><option value="Aoede">Aoede · douce</option><option value="Fenrir">Fenrir · affirmée</option><option value="Zephyr">Zephyr · légère</option></select></label><div class="mal-ad-actions"><button type="button" onclick="malGenerateAdVoiceAI()">✦ Générer la voix IA</button></div><audio id="malAdVoicePreview" controls preload="none" style="display:none;width:100%"></audio><p class="mal-ad-note">Tu peux aussi enregistrer ta propre voix ci-dessous ; elle remplacera la voix IA.</p></div><label>Photo ou image du produit (facultatif)<input id="malCampaignSourceImage" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Vidéo réelle avec une personne ou un produit (facultatif, MP4/WebM · 20 Mo max)<input id="malCampaignSourceVideo" type="file" accept="video/mp4,video/webm"></label><p class="mal-ad-note">Tu peux fournir un vrai clip filmé avec ton téléphone. Malachite y ajoute le texte animé et la voix IA ou ta narration. Utilise une vidéo dont tu possèdes les droits et les autorisations.</p><div class="mal-ad-actions"><button type="button" onclick="malRecordAdVoice()">🎙️ Enregistrer ma voix</button><button type="button" onclick="malStopAdVoice()">Arrêter la voix</button></div><p class="mal-ad-note" id="malAdVoiceStatus">La voix enregistrée sera intégrée à la vidéo. Sans voix, une ambiance sonore synthétique douce sera ajoutée.</p>'+
  '<label>Statut<select id="malCampaignStatus"><option value="brouillon">Enregistrer en brouillon</option><option value="active">Publier dans Découvrir</option><option value="pause">En pause</option></select></label>'+
  '<div class="mal-ad-actions"><button type="button" onclick="malCreateAdPoster()">Créer l’affiche</button><button class="b1" type="button" onclick="malPublishAd()">Enregistrer / publier</button></div>'+
  '<input id="malCampaignImage" type="file" accept="image/jpeg,image/png,image/webp" hidden><input id="malCampaignVideo" type="file" accept="video/webm" hidden><input id="malCampaignEditId" type="hidden"><video id="malAdVideoPreview" controls playsinline muted style="display:none;width:100%;border-radius:16px;margin-top:12px"></video>'+
  '<p class="mal-ad-note">La vidéo est générée sur cet appareil au format WebM (10, 15 ou 20 secondes), avec une ambiance sonore et une voix IA ou ta propre voix. Les voix humaines réalistes générées par IA nécessitent un fournisseur vocal externe.</p></div>'+
  '<h3>Campagnes enregistrées ('+rows.length+')</h3><div class="list">'+(rows.length?rows.map(function(x){return '<article class="card"><b>'+esc(x.titre)+'</b><p class="note">'+esc(x.description)+'</p><span class="chip">'+esc(x.statut)+'</span><div class="acts"><button onclick="malEditCampaign(\''+x.id+'\')">Modifier</button>'+(x.statut==="active"?'<button onclick="malSetCampaignStatus(\''+x.id+'\',\'pause\')">Pause</button>':'<button class="b1" onclick="malSetCampaignStatus(\''+x.id+'\',\'active\')">Publier</button>')+'<button class="err" onclick="malDeleteCampaign(\''+x.id+'\')">Supprimer</button></div></article>'}).join(""):'<p class="note">Aucune campagne.</p>')+'</div></section>';
 };

 var adVoiceBlob=null,adVoiceRecorder=null,adVoiceParts=[],adVoicePreviewUrl=null;
 window.malGenerateAdVoiceAI=async function(){
  var script=val("malCampaignNarration"),voice=val("malCampaignVoice")||"Charon";
  var duration=Number(val("malCampaignDuration"))||15;
  var maxChars=duration===10?150:duration===15?220:300;
  if(script.length<8||script.length>maxChars){alert("Pour une vidéo de "+duration+" secondes, garde une narration de "+maxChars+" caractères maximum.");return}
  if(!window.sb||!sb.functions){alert("Connexion au service IA indisponible.");return}
  var button=Array.from(document.querySelectorAll(".mal-ad-actions button")).find(function(x){return x.getAttribute("onclick")==="malGenerateAdVoiceAI()"});
  if(button){button.disabled=true;button.textContent="La voix IA est en préparation…"}
  try{
   var result=await sb.functions.invoke("malachite-ad-creative",{body:{action:"voiceover",script:script,voice:voice}});
   if(result.error||!result.data||!result.data.audio_base64)throw new Error(result.data&&result.data.error==="ai_provider_not_configured"?"La clé Gemini n’est pas configurée dans Supabase.":result.data&&result.data.error==="rate_limited"?"Limite temporaire atteinte. Réessaie dans une minute.":"La voix IA n’a pas pu être générée.");
   var raw=atob(result.data.audio_base64),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   adVoiceBlob=new Blob([bytes],{type:result.data.mime_type||"audio/wav"});
   if(adVoicePreviewUrl)URL.revokeObjectURL(adVoicePreviewUrl);adVoicePreviewUrl=URL.createObjectURL(adVoiceBlob);
   var player=document.getElementById("malAdVoicePreview");if(player){player.src=adVoicePreviewUrl;player.style.display="block"}
   var status=document.getElementById("malAdVoiceStatus");if(status)status.textContent="Voix IA générée. Écoute-la, puis crée ta vidéo.";
   if(typeof window.toast==="function")window.toast("Voix IA prête.");
  }catch(e){alert(e.message||"Génération de la voix impossible")}finally{if(button){button.disabled=false;button.textContent="✦ Générer la voix IA"}}
 };
 window.malRecordAdVoice=async function(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){alert("L’enregistrement vocal n’est pas pris en charge par ce navigateur.");return}
  try{var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   adVoiceParts=[];adVoiceRecorder=new MediaRecorder(stream);
   adVoiceRecorder.ondataavailable=function(e){if(e.data&&e.data.size)adVoiceParts.push(e.data)};
   adVoiceRecorder.onstop=function(){adVoiceBlob=new Blob(adVoiceParts,{type:adVoiceRecorder.mimeType||"audio/webm"});stream.getTracks().forEach(function(t){t.stop()});if(adVoicePreviewUrl)URL.revokeObjectURL(adVoicePreviewUrl);adVoicePreviewUrl=URL.createObjectURL(adVoiceBlob);var player=document.getElementById("malAdVoicePreview");if(player){player.src=adVoicePreviewUrl;player.style.display="block"}var n=document.getElementById("malAdVoiceStatus");if(n)n.textContent="Voix enregistrée. Elle remplacera la voix IA dans la vidéo.";};
   adVoiceRecorder.start();var n=document.getElementById("malAdVoiceStatus");if(n)n.textContent="Enregistrement en cours… Parle clairement, puis appuie sur Arrêter.";
  }catch(e){alert("Microphone indisponible : "+(e.message||"autorisation refusée"))}
 };
 window.malStopAdVoice=function(){if(adVoiceRecorder&&adVoiceRecorder.state!=="inactive")adVoiceRecorder.stop()};
 window.malCreateAdVideo=async function(){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){alert("La création vidéo n’est pas prise en charge par ce navigateur. Utilise Chrome récent sur Android.");return}
  var title=val("malCampaignTitle"),desc=val("malCampaignDescription");if(!title||!desc){alert("Génère ou écris le titre et la description avant de créer la vidéo.");return}
  var duration=Math.max(10,Math.min(20,Number(val("malCampaignDuration"))||15));
  if(adVoiceBlob){
   var checkUrl=URL.createObjectURL(adVoiceBlob),checkAudio=new Audio(checkUrl);
   await new Promise(function(resolve){checkAudio.onloadedmetadata=resolve;checkAudio.onerror=resolve;checkAudio.src=checkUrl;setTimeout(resolve,2500)});
   var voiceDuration=checkAudio.duration;URL.revokeObjectURL(checkUrl);
   if(isFinite(voiceDuration)&&voiceDuration>duration+0.6){alert("Ta narration dure "+Math.ceil(voiceDuration)+" secondes. Raccourcis-la ou choisis une vidéo plus longue.");return}
  }
  var canvas=document.createElement("canvas");canvas.width=720;canvas.height=1280;var ctx=canvas.getContext("2d");
  var photoFile=document.getElementById("malCampaignSourceImage").files[0],photo=null;
  if(photoFile){try{photo=await createImageBitmap(photoFile)}catch(e){alert("Image source illisible.");return}}
  var sourceVideoFile=document.getElementById("malCampaignSourceVideo")&&document.getElementById("malCampaignSourceVideo").files[0],sourceVideo=null,sourceVideoUrl=null;
  if(sourceVideoFile){
   if(!/^video\/(mp4|webm)$/.test(sourceVideoFile.type)||sourceVideoFile.size>20971520){alert("Le clip doit être MP4 ou WebM et peser 20 Mo maximum.");return}
   sourceVideoUrl=URL.createObjectURL(sourceVideoFile);sourceVideo=document.createElement("video");sourceVideo.src=sourceVideoUrl;sourceVideo.loop=true;sourceVideo.playsInline=true;sourceVideo.preload="auto";
   try{await new Promise(function(resolve,reject){sourceVideo.onloadedmetadata=resolve;sourceVideo.onerror=reject;setTimeout(function(){if(!sourceVideo.videoWidth)reject(new Error("Vidéo source illisible"))},5000)})}catch(e){URL.revokeObjectURL(sourceVideoUrl);alert("Impossible de lire ce clip sur cet appareil.");return}
  }
  var stream=canvas.captureStream(24),audioCtx=null,audioDest=null,voiceEl=null,voiceUrl=null,oscillators=[];
  try{
   audioCtx=new (window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();audioDest=audioCtx.createMediaStreamDestination();
   var master=audioCtx.createGain();master.gain.value=.075;master.connect(audioDest);
   [261.63,329.63,392,523.25].forEach(function(freq,i){var osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type="sine";osc.frequency.value=freq;gain.gain.value=i===0?.22:.08;osc.connect(gain);gain.connect(master);osc.start();oscillators.push(osc)});
   if(sourceVideo){var footageSource=audioCtx.createMediaElementSource(sourceVideo),footageGain=audioCtx.createGain();footageGain.gain.value=.38;footageSource.connect(footageGain);footageGain.connect(audioDest)}
   if(adVoiceBlob){voiceUrl=URL.createObjectURL(adVoiceBlob);voiceEl=new Audio(voiceUrl);voiceEl.preload="auto";var voiceSource=audioCtx.createMediaElementSource(voiceEl);var voiceGain=audioCtx.createGain();voiceGain.gain.value=1.15;voiceSource.connect(voiceGain);voiceGain.connect(audioDest)}
   audioDest.stream.getAudioTracks().forEach(function(t){stream.addTrack(t)});
   var mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")?"video/webm;codecs=vp8,opus":"video/webm";
   var recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000,audioBitsPerSecond:96000}),chunks=[];
   recorder.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
   var start=performance.now(),end=start+duration*1000;
   function wrap(text,max,font){ctx.font=font;var words=text.split(/\s+/),lines=[],line="";words.forEach(function(w){var test=line?line+" "+w:w;if(ctx.measureText(test).width>max&&line){lines.push(line);line=w}else line=test});if(line)lines.push(line);return lines}
   function draw(now){
    var elapsed=Math.min(duration,(now-start)/1000),progress=elapsed/duration;
    var grad=ctx.createLinearGradient(0,0,720,1280);grad.addColorStop(0,"#171d45");grad.addColorStop(.52,"#74345e");grad.addColorStop(1,"#e38d67");ctx.fillStyle=grad;ctx.fillRect(0,0,720,1280);
    if(sourceVideo&&sourceVideo.readyState>=2){var videoScale=Math.max(720/sourceVideo.videoWidth,1280/sourceVideo.videoHeight);ctx.drawImage(sourceVideo,(720-sourceVideo.videoWidth*videoScale)/2,(1280-sourceVideo.videoHeight*videoScale)/2,sourceVideo.videoWidth*videoScale,sourceVideo.videoHeight*videoScale);ctx.fillStyle="rgba(12,15,38,.42)";ctx.fillRect(0,0,720,1280)}
    var pulse=(Math.sin(elapsed*1.4)+1)/2;ctx.fillStyle="rgba(255,255,255,"+(.05+pulse*.09)+")";ctx.beginPath();ctx.arc(610+Math.sin(elapsed*.7)*35,220,145+pulse*25,0,Math.PI*2);ctx.fill();
    if(photo&&!sourceVideo){ctx.save();ctx.globalAlpha=.78;var scale=Math.max(420/photo.width,390/photo.height);ctx.drawImage(photo,360-photo.width*scale/2,380-photo.height*scale/2,photo.width*scale,photo.height*scale);ctx.restore()}
    ctx.fillStyle="#ffffff";ctx.font="bold 21px Arial";ctx.fillText("MALACHITE  ·  SPONSORISÉ",48,90);
    var reveal=Math.min(1,Math.max(0,(progress-.08)/.24));ctx.globalAlpha=reveal;ctx.fillStyle="#fff";var titleLines=wrap(title,620,"bold 54px Arial");ctx.font="bold 54px Arial";var y=720+(1-reveal)*28;titleLines.slice(0,3).forEach(function(line){ctx.fillText(line,48,y);y+=65});
    ctx.globalAlpha=Math.min(1,Math.max(0,(progress-.28)/.22));ctx.font="27px Arial";var descLines=wrap(desc,610,"27px Arial");descLines.slice(0,4).forEach(function(line,i){ctx.fillText(line,50,y+24+i*38)});
    ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.beginPath();ctx.roundRect(48,1120,350,82,41);ctx.fill();ctx.fillStyle="#512343";ctx.font="bold 25px Arial";ctx.fillText((generated&&generated.cta||"EN SAVOIR PLUS").toUpperCase().slice(0,24),78,1172);
    ctx.fillStyle="rgba(255,255,255,.5)";ctx.fillRect(48,1232,624,5);ctx.fillStyle="#fff";ctx.fillRect(48,1232,624*progress,5);
   }
   var preview=document.getElementById("malAdVideoPreview");if(preview){preview.style.display="block";preview.removeAttribute("src");preview.load()}
   recorder.start(250);if(sourceVideo){try{await sourceVideo.play()}catch(e){}}if(voiceEl){try{await voiceEl.play()}catch(e){}}
   await new Promise(function(resolve){function frame(t){draw(t);if(t<end)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame);setTimeout(resolve,duration*1000+350)});
   await new Promise(function(resolve){recorder.onstop=resolve;recorder.stop()});
   var blob=new Blob(chunks,{type:"video/webm"});if(blob.size>18*1024*1024){alert("La vidéo dépasse la limite de 18 Mo. Réduis la durée ou la photo.");return}
   var file=new File([blob],"malachite-ad-"+Date.now()+".webm",{type:"video/webm"}),input=document.getElementById("malCampaignVideo"),dt=new DataTransfer();dt.items.add(file);input.files=dt.files;
   if(preview){var u=URL.createObjectURL(blob);preview.src=u;preview.muted=true;preview.currentTime=0;preview.play().catch(function(){})}
   if(typeof window.toast==="function")window.toast("Vidéo créée avec piste sonore. Vérifie-la avant publication.");else alert("Vidéo créée.");
  }catch(e){alert("Création vidéo impossible : "+(e.message||"erreur inconnue"))}
  finally{oscillators.forEach(function(o){try{o.stop()}catch(e){}});if(sourceVideo){sourceVideo.pause();sourceVideo.removeAttribute("src");sourceVideo.load()}if(sourceVideoUrl)URL.revokeObjectURL(sourceVideoUrl);if(audioCtx)audioCtx.close().catch(function(){});if(voiceUrl)URL.revokeObjectURL(voiceUrl);stream.getTracks().forEach(function(t){t.stop()})}
 };

 window.malGenerateAdCopy=async function(){
  if(working)return;
  var business=val("malCampaignBusiness"),offer=val("malCampaignOffer");
  if(business.length<2||offer.length<3){alert("Indique le nom de l’entreprise et décris l’offre.");return}
  if(!window.sb||!sb.functions){alert("Connexion au service IA indisponible.");return}
  working=true;var b=document.getElementById("malAdGenerate");if(b){b.disabled=true;b.textContent="L’IA prépare ta publicité…"}
  try{
   var r=await sb.functions.invoke("malachite-ad-creative",{body:{business:business,offer:offer,price:val("malCampaignPrice"),audience:val("malCampaignAudience"),location:val("malCampaignLocation"),tone:val("malCampaignTone"),cta:val("malCampaignCTA")}});
   if(r.error||!r.data||!r.data.creative)throw new Error(r.data&&r.data.error==="ai_provider_not_configured"?"La clé Gemini n’est pas configurée dans Supabase.":"Le service IA n’a pas répondu. Réessaie.");
   generated=r.data.creative;set("malCampaignTitle",generated.title);set("malCampaignDescription",[generated.subtitle,generated.description].filter(Boolean).join(" — "));
   var t=document.getElementById("malAdPreviewTitle"),p=document.getElementById("malAdPreviewBody"),c=document.getElementById("malAdPreviewCTA");
   if(t)t.textContent=generated.title;if(p)p.textContent=generated.subtitle+" "+generated.description;if(c)c.textContent=generated.cta.toUpperCase();var narration=document.getElementById("malCampaignNarration");if(narration)narration.value=[generated.title,generated.subtitle,generated.description,generated.cta].filter(Boolean).join(". ").slice(0,320);
   if(typeof window.toast==="function")window.toast("Texte publicitaire généré. Vérifie-le avant publication.");
  }catch(e){alert(e.message||"Génération impossible")}finally{working=false;if(b){b.disabled=false;b.textContent="✦ Générer ma publicité avec l’IA"}}
 };
 window.malCreateAdPoster=async function(){
  var title=val("malCampaignTitle"),desc=val("malCampaignDescription"),cta=generated&&generated.cta||"EN SAVOIR PLUS";
  if(!title||!desc){alert("Génère d’abord le texte ou remplis le titre et la description.");return}
  var canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;var ctx=canvas.getContext("2d");
  var g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,"#28132f");g.addColorStop(.55,"#a62b62");g.addColorStop(1,"#ef9a68");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
  var photo=document.getElementById("malCampaignSourceImage").files[0];
  if(photo){try{var img=await createImageBitmap(photo);var scale=Math.max(1080/img.width,1350/img.height);ctx.globalAlpha=.28;ctx.drawImage(img,(1080-img.width*scale)/2,(1350-img.height*scale)/2,img.width*scale,img.height*scale);ctx.globalAlpha=1}catch(_){}}
  ctx.fillStyle="rgba(255,255,255,.15)";ctx.beginPath();ctx.arc(920,170,260,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 30px Arial";ctx.fillText("MALACHITE  ·  SPONSORISÉ",80,110);
  function lines(text,max){var words=text.split(/\s+/),out=[],line="";ctx.font="bold 76px Arial";words.forEach(function(w){var test=line?line+" "+w:w;if(ctx.measureText(test).width>max&&line){out.push(line);line=w}else line=test});if(line)out.push(line);return out}
  ctx.font="bold 76px Arial";var ls=lines(title,900);var y=510;ls.slice(0,3).forEach(function(line){ctx.fillText(line,80,y);y+=94});
  ctx.font="36px Arial";var words=desc.split(/\s+/),line="",dy=y+35;words.forEach(function(w){var test=line?line+" "+w:w;if(ctx.measureText(test).width>900&&line){ctx.fillText(line,82,dy);dy+=52;line=w}else line=test});if(line)ctx.fillText(line,82,dy);
  ctx.fillStyle="#fff";ctx.beginPath();ctx.roundRect(80,1120,500,105,52);ctx.fill();ctx.fillStyle="#57203f";ctx.font="bold 34px Arial";ctx.fillText(cta.toUpperCase().slice(0,24),125,1185);
  var blob=await new Promise(function(resolve){canvas.toBlob(resolve,"image/jpeg",.9)});if(!blob){alert("Impossible de créer l’affiche sur cet appareil.");return}
  var file=new File([blob],"malachite-ad.jpg",{type:"image/jpeg"}),input=document.getElementById("malCampaignImage");
  try{var dt=new DataTransfer();dt.items.add(file);input.files=dt.files}catch(_){alert("Ton navigateur ne permet pas d’attacher automatiquement l’affiche. Réessaie avec Chrome récent.");return}
  var preview=document.getElementById("malAdPreview");if(preview){var url=URL.createObjectURL(blob);preview.style.backgroundImage="url("+url+")";preview.style.backgroundSize="cover";preview.style.backgroundPosition="center"}
  if(typeof window.toast==="function")window.toast("Affiche créée. Tu peux maintenant publier.");else alert("Affiche créée.");
 };
 window.malPublishAd=async function(){
  var image=document.getElementById("malCampaignImage");if(!image||!image.files.length){await window.malCreateAdPoster();if(!image.files.length)return}
  if(!val("malCampaignTitle")||!val("malCampaignDescription")){alert("Le titre et la description sont obligatoires.");return}
  if(val("malCampaignMediaType")==="video" && (!document.getElementById("malCampaignVideo").files.length)){await window.malCreateAdVideo();if(!document.getElementById("malCampaignVideo").files.length)return;} await window.malSaveCampaign();
 };
})();