/* Lightweight performance guard for low-memory mobile devices. */
(function () {
  "use strict";
  if (window.__malPerformanceLoaded) return;
  window.__malPerformanceLoaded = true;

  // Reduce decorative work on low-memory devices and when data saving is enabled.
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  var fewCores = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  var saveData = !!(connection && connection.saveData);
  if (lowMemory || fewCores || saveData) {
    document.documentElement.classList.add("mal-low-power");
  }

  function optimizeImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.hasAttribute("decoding")) img.decoding = "async";
    if (!img.hasAttribute("loading")) {
      var rect = img.getBoundingClientRect();
      img.loading = rect.top > window.innerHeight * 1.25 ? "lazy" : "eager";
    }
  }

  function scan(root) {
    if (!root) return;
    if (root instanceof HTMLImageElement) optimizeImage(root);
    if (root.querySelectorAll) root.querySelectorAll("img").forEach(optimizeImage);
  }

  function start() {
    scan(document);
    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) scan(node);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("mal-reduced-motion");
    }
  }

  var style = document.createElement("style");
  style.textContent = "@media(prefers-reduced-motion:reduce){.mal-reduced-motion *,*{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}} html.mal-low-power #bgfx,html.mal-low-power .fxl,html.mal-low-power .cpf{display:none!important} html.mal-low-power .brand,html.mal-low-power .b1,html.mal-low-power .av,html.mal-low-power .dot,html.mal-low-power .beat,html.mal-low-power .cup,html.mal-low-power .card,html.mal-low-power .plan,html.mal-low-power .mal-own-cover:before,html.mal-low-power .mal-own-cover-caption,html.mal-low-power .mal-own-gallery img{animation:none!important;transition:none!important} html.mal-low-power nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}";
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();