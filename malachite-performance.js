/* Lightweight performance guard for low-memory mobile devices. */
(function () {
  "use strict";
  if (window.__malPerformanceLoaded) return;
  window.__malPerformanceLoaded = true;

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
  style.textContent = "@media(prefers-reduced-motion:reduce){.mal-reduced-motion *,*{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}";
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();