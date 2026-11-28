/* Lightweight performance guard for low-memory mobile devices. */
(function () {
  "use strict";
  if (window.__malPerformanceLoaded) return;
  window.__malPerformanceLoaded = true;

  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  var fewCores = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  var saveData = !!(connection && connection.saveData);
  if (lowMemory || fewCores || saveData) document.documentElement.classList.add("mal-low-power");

  // Avoid forced layout reads (getBoundingClientRect) for every image during tab
  // rendering. Images are lazy by default; explicit high-priority images stay eager.
  function optimizeImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.hasAttribute("decoding")) img.decoding = "async";
    if (!img.hasAttribute("loading")) {
      img.loading = img.getAttribute("fetchpriority") === "high" ? "eager" : "lazy";
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root instanceof HTMLImageElement) optimizeImage(root);
    if (root.querySelectorAll) {
      var images = root.querySelectorAll("img");
      for (var i = 0; i < images.length; i++) optimizeImage(images[i]);
    }
  }

  function start() {
    if (window.MutationObserver && document.body) {
      // Batch renderer mutations into one frame and avoid rescanning a descendant
      // when an ancestor was added in the same batch.
      var pending = new Set();
      var scheduled = false;
      function flush() {
        scheduled = false;
        var roots = Array.from(pending);
        pending.clear();
        var rootsSet = new Set(roots);
        roots = roots.filter(function (node) {
          if (!node || !node.isConnected) return false;
          for (var parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            if (rootsSet.has(parent)) return false;
          }
          return true;
        });
        for (var i = 0; i < roots.length; i++) scan(roots[i]);
      }
      var observer = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var nodes = records[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            if (node.nodeType === 1) pending.add(node);
          }
        }
        if (pending.size && !scheduled) {
          scheduled = true;
          if (window.requestAnimationFrame) requestAnimationFrame(flush);
          else setTimeout(flush, 16);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Initial document scan is deferred and performed once, after first paint.
    if (window.requestAnimationFrame) requestAnimationFrame(function () { scan(document.body); });
    else setTimeout(function () { scan(document.body); }, 16);

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("mal-reduced-motion");
    }
  }

  var style = document.createElement("style");
  style.textContent = "@media(prefers-reduced-motion:reduce){.mal-reduced-motion *,*{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}} html.mal-low-power #bgfx,html.mal-low-power .fxl,html.mal-low-power .cpf{display:none!important} html.mal-low-power .brand,html.mal-low-power .b1,html.mal-low-power .av,html.mal-low-power .dot,html.mal-low-power .beat,html.mal-low-power .cup,html.mal-low-power .card,html.mal-low-power .plan,html.mal-low-power .mal-own-cover:before,html.mal-low-power .mal-own-cover-caption,html.mal-low-power .mal-own-gallery img{animation:none!important;transition:none!important} html.mal-low-power nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important} html.mal-low-power *{animation:none!important;transition:none!important;scroll-behavior:auto!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}";
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();