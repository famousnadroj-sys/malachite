
(function(){
 if(window.__mlLivingStarted)return;window.__mlLivingStarted=true;
 var phrases=[
  "Bienvenue dans Malachite 💗 Ici, les belles rencontres commencent par une vraie conversation.",
  "Prends ton temps. Une rencontre sincère vaut mieux que mille likes ✨",
  "Un profil complet donne plus envie de faire connaissance 🌸",
  "Petit conseil : reste respectueux, authentique et toi-même.",
  "Tu peux découvrir, discuter et organiser tes rendez-vous en toute tranquillité."
 ];
 var faces=["🥰","🐻","🐰","🦊","🐼","🐱","🦋","💗"],phrase=0,face=0;
 function el(tag,attrs,html){var n=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k])});if(html!==undefined)n.innerHTML=html;return n}
 function setup(){
  if(!document.getElementById("ml-progress"))document.body.appendChild(el("div",{id:"ml-progress","aria-hidden":"true"}));
  if(!document.getElementById("ml-sparkles")){
   var layer=el("div",{id:"ml-sparkles","aria-hidden":"true"});
   ["✦","♡","✧","·","🌸","✦","♡","✧"].forEach(function(v,i){var n=el("i",{class:"ml-spark"});n.textContent=v;n.style.left=(6+i*12)+"%";n.style.setProperty("--dur",(12+(i%4)*3)+"s");n.style.setProperty("--delay",(-i*2)+"s");n.style.fontSize=(12+(i%3)*6)+"px";layer.appendChild(n)});
   document.body.appendChild(layer);
  }
  if(!document.getElementById("ml-mascot")){
   var m=el("button",{id:"ml-mascot","type":"button","aria-label":"Parler avec le compagnon Malachite"},'<span class="ml-face">🥰</span><span class="ml-count">✦</span><span class="ml-speech"><small>Ton compagnon Malachite</small><span class="ml-words"></span></span>');
   m.addEventListener("click",function(){
    phrase=(phrase+1)%phrases.length;face=(face+1)%faces.length;
    m.querySelector(".ml-face").textContent=faces[face];m.querySelector(".ml-words").textContent=phrases[phrase];
    m.classList.add("speaking");popHearts(m);
    clearTimeout(m._hide);m._hide=setTimeout(function(){m.classList.remove("speaking")},4200);
   });
   document.body.appendChild(m);
   setTimeout(function(){m.querySelector(".ml-words").textContent=phrases[0];m.classList.add("speaking");setTimeout(function(){m.classList.remove("speaking")},4200)},1800);
  }
  reveal();
 }
 function popHearts(target){
  var r=target.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  for(var i=0;i<8;i++){var h=el("i",{class:"ml-heart-pop"});h.textContent=["💗","✨","🌸","💕"][i%4];h.style.left=cx+"px";h.style.top=cy+"px";h.style.setProperty("--dx",(Math.random()*110-55)+"px");h.style.setProperty("--rot",(Math.random()*80-40)+"deg");document.body.appendChild(h);setTimeout(function(n){n.remove()},1200,h)}
 }
 function reveal(){
  var root=document.getElementById("v");if(!root)return;
  var nodes=root.querySelectorAll(".card,.plan,.box,.row,.hero,.dcard,.wall");
  if(!("IntersectionObserver" in window)){nodes.forEach(function(n){n.classList.add("ml-visible")});return}
  if(!window.__mlRevealObserver)window.__mlRevealObserver=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("ml-visible");window.__mlRevealObserver.unobserve(e.target)}})},{threshold:.08,rootMargin:"0px 0px -25px 0px"});
  nodes.forEach(function(n){if(!n.classList.contains("ml-reveal")){n.classList.add("ml-reveal");window.__mlRevealObserver.observe(n)}});
 }
 var scrollPending=false;
 window.addEventListener("scroll",function(){
  if(scrollPending)return;scrollPending=true;
  requestAnimationFrame(function(){var d=document.documentElement,range=d.scrollHeight-d.clientHeight,p=range>0?d.scrollTop/range*100:0;var bar=document.getElementById("ml-progress");if(bar)bar.style.width=p+"%";scrollPending=false});
 },{passive:true});
 document.addEventListener("click",function(e){
  var b=e.target.closest("button,.btn");if(!b||b.id==="ml-mascot"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  var rect=b.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*.65,r=el("span",{class:"ml-ripple"});r.style.width=r.style.height=size+"px";r.style.left=(e.clientX-rect.left-size/2)+"px";r.style.top=(e.clientY-rect.top-size/2)+"px";b.appendChild(r);setTimeout(function(){r.remove()},600);
 },true);
 var observer=new MutationObserver(function(){reveal()});
 document.addEventListener("DOMContentLoaded",function(){setup();var v=document.getElementById("v");if(v)observer.observe(v,{childList:true,subtree:true});});
 if(document.readyState!=="loading"){setup();var v=document.getElementById("v");if(v)observer.observe(v,{childList:true,subtree:true})}
})();
