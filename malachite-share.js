(function(){
  "use strict";
  // URL publique canonique : partage le site aux visiteurs, jamais un espace de compte.
  function getShareUrl(){return window.location.origin+window.location.pathname}
  var TITLE="MALACHITE";
  var DESCRIPTION="Découvre MALACHITE : fais de belles rencontres et échange avec de nouvelles personnes.";
  function init(){
    if(document.getElementById("mal-share-launcher")) return;
    var style=document.createElement("style");
    style.id="mal-share-styles";
    style.textContent=`
      #mal-share-launcher{display:none!important;position:fixed;right:16px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:35;display:flex;align-items:center;gap:8px;padding:11px 15px;border:0;border-radius:999px;background:linear-gradient(135deg,#D81B60,#F0457F);color:#fff;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(216,27,96,.28);cursor:pointer}
      #mal-share-launcher svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      #mal-share-overlay{position:fixed;inset:0;z-index:200;background:rgba(31,18,24,.42);display:none;align-items:flex-end;justify-content:center;padding:14px}
      #mal-share-overlay.open{display:flex}
      #mal-share-panel{width:min(100%,440px);background:#fff;border:1px solid #f0d6e0;border-radius:24px;padding:20px;box-shadow:0 20px 60px rgba(40,10,25,.24);font-family:Inter,system-ui,sans-serif;animation:malShareIn .18s ease}
      #mal-share-panel h2{margin:0 0 5px;color:#29151f;font-size:21px}
      #mal-share-panel p{margin:0 0 16px;color:#806a75;font-size:13px}
      .mal-share-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .mal-share-option{display:flex;align-items:center;justify-content:center;gap:9px;min-height:48px;border:1px solid #f0d6e0;border-radius:13px;background:#fff6f9;color:#54243a;font:600 14px Inter,system-ui,sans-serif;cursor:pointer}
      .mal-share-option.primary{background:#D81B60;color:#fff;border-color:#D81B60}
      .mal-share-option svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #mal-share-close{width:100%;margin-top:12px;min-height:44px;border:0;border-radius:12px;background:#f5f0f2;color:#5e4a54;font:600 14px Inter,system-ui,sans-serif}
      #mal-share-feedback{min-height:18px;margin-top:10px;text-align:center;color:#177a4b;font-size:12px}
      body.mal-chat-mode #mal-share-launcher{display:none}
      @keyframes malShareIn{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}
      @media(prefers-reduced-motion:reduce){#mal-share-panel{animation:none}}
    `;
    document.head.appendChild(style);
    var btn=document.createElement("button");
    btn.id="mal-share-launcher";btn.type="button";btn.setAttribute("aria-haspopup","dialog");btn.setAttribute("aria-controls","mal-share-overlay");
    btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg><span>Partager</span>';
    var overlay=document.createElement("div");overlay.id="mal-share-overlay";overlay.setAttribute("role","presentation");
    overlay.innerHTML='<section id="mal-share-panel" role="dialog" aria-modal="true" aria-labelledby="mal-share-title"><h2 id="mal-share-title">Faire découvrir MALACHITE</h2><p>Partage le site avec tes amis en quelques secondes.</p><div class="mal-share-grid"><button class="mal-share-option primary" type="button" data-share="native">Partager…</button><button class="mal-share-option" type="button" data-share="whatsapp">WhatsApp</button><button class="mal-share-option" type="button" data-share="facebook">Facebook</button><button class="mal-share-option" type="button" data-share="copy">Copier le lien</button></div><div id="mal-share-feedback" aria-live="polite"></div><button id="mal-share-close" type="button">Fermer</button></section>';
    document.body.appendChild(btn);document.body.appendChild(overlay);
    function close(){overlay.classList.remove("open");btn.focus()}
    function open(){overlay.classList.add("open");var first=overlay.querySelector('[data-share="native"]');if(first)first.focus()}
    window.malShareOpen=open;
    btn.addEventListener("click",open);
    overlay.addEventListener("click",function(e){if(e.target===overlay)close()});
    overlay.querySelector("#mal-share-close").addEventListener("click",close);
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&overlay.classList.contains("open"))close()});
    function feedback(message){var el=document.getElementById("mal-share-feedback");if(el)el.textContent=message}
    function copyLink(){
      var link=getShareUrl();if(!link){feedback("Lien du site MALACHITE indisponible pour le moment.");return}if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(link).then(function(){feedback("Lien du site MALACHITE copié. Tu peux le partager.")})}
      var field=document.createElement("textarea");field.value=link;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.select();
      var ok=false;try{ok=document.execCommand("copy")}catch(e){}document.body.removeChild(field);
      feedback(ok?"Lien du site MALACHITE copié. Tu peux le coller où tu veux.":"Copie automatique indisponible : "+link);
    }
    overlay.querySelector(".mal-share-grid").addEventListener("click",function(e){
      var action=e.target.closest("[data-share]");if(!action)return;
      var link=getShareUrl();if(!link){feedback(window.location.hostname.endsWith("github.io")?"Le lien officiel MALACHITE est en cours de configuration.":"Connecte-toi pour obtenir ton lien personnel.");return}var url=encodeURIComponent(link),text=encodeURIComponent(DESCRIPTION+" "+link);
      if(action.dataset.share==="copy"){copyLink();return}
      if(action.dataset.share==="whatsapp"){window.open("https://wa.me/?text="+text,"_blank","noopener,noreferrer");return}
      if(action.dataset.share==="facebook"){window.open("https://www.facebook.com/sharer/sharer.php?u="+url,"_blank","noopener,noreferrer");return}
      if(action.dataset.share==="native"){
        if(navigator.share){navigator.share({title:TITLE,text:DESCRIPTION,url:link}).then(function(){feedback("Merci d'avoir partagé MALACHITE.")}).catch(function(err){if(err&&err.name!=="AbortError")feedback("Le partage n'a pas abouti. Essaie une autre option.")})}
        else{copyLink()}
      }
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.addEventListener("pageshow",init);
})();