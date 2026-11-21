/* Malachite Copilots + Pulse + AutoCare.
   These are transparent prompt presets and local diagnostics over the existing AI Manager.
   No new provider, external telemetry, payment authority, or privileged browser credential. */
(function () {
  "use strict";
  if (window.__malCopilotsLoaded) return;
  window.__malCopilotsLoaded = true;

  var prompts = {
    manager: "Agis comme Malachite Manager. Prépare un briefing opérationnel à partir des seuls indicateurs disponibles. Coordonne les sujets paiements, sécurité, support et croissance. Distingue les faits, les hypothèses et les recommandations. N'exécute aucune action sensible.",
    finance: "Agis comme Malachite Finance. Analyse uniquement les statistiques et dossiers de paiement auxquels le tableau administrateur donne accès. Prépare les vérifications, signale les doublons éventuels et rappelle qu'une capture ou une référence ne prouve pas l'encaissement opérateur. Ne valide aucun paiement.",
    guardian: "Agis comme Malachite Guardian. Aide à prioriser les signalements et les risques de sécurité à partir des données disponibles. Propose des vérifications proportionnées. Ne suspends, ne bloques et ne supprime aucun compte.",
    creative: "Agis comme Malachite Creative. Propose cinq améliorations concrètes de l'expérience, du design, des textes et de la présentation de Malachite, en conservant son identité actuelle rose et blanche et en privilégiant les appareils Android modestes.",
    support: "Agis comme Malachite Support. Aide à classer les demandes et à rédiger des réponses empathiques et courtes. Prépare des brouillons seulement ; n'envoie aucun message à un membre.",
    intelligence: "Agis comme Malachite Intelligence. Analyse les indicateurs agrégés disponibles, précise les limites des données et propose trois expériences mesurables pour améliorer l'activation et la fidélisation. N'invente aucun chiffre."
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function copilotMarkup() {
    var items = [
      ["manager", "✦", "Manager", "Coordination et briefing"],
      ["finance", "◈", "Finance", "Paiements et recettes"],
      ["guardian", "⬡", "Guardian", "Sécurité et signalements"],
      ["creative", "✧", "Creative", "Design et expérience"],
      ["support", "♡", "Support", "Réclamations et réponses"],
      ["intelligence", "⌁", "Intelligence", "Statistiques et croissance"]
    ];
    return '<section class="mal-copilot-suite" aria-label="Copilotes Malachite">' +
      '<div class="mal-copilot-title"><div><b>Équipe de copilotes</b><small>6 spécialisations · un moteur IA existant · validation humaine</small></div><span>✦</span></div>' +
      '<div class="mal-copilot-grid">' + items.map(function (item) {
        return '<button type="button" class="mal-copilot-card" data-copilot="' + item[0] + '">' +
          '<span>' + item[1] + '</span><b>' + item[2] + '</b><small>' + item[3] + '</small></button>';
      }).join("") + '</div>' +
      '<div class="mal-command"><label for="malCommandInput">Malachite Command · Mission autonome</label><div><input id="malCommandInput" maxlength="300" placeholder="Ex. Prépare mon briefing de la journée…" autocomplete="off"><button id="malCommandRun" type="button">Lancer ↗</button></div><small>Le Manager décompose la mission en volets Finance, Guardian, Support, Intelligence et Creative. Raccourci : Ctrl + K.</small></div>' +
      '<div class="mal-pulse" id="malPulse"><div class="mal-pulse-head"><b>Malachite Pulse</b><span>Surveillance des indicateurs affichés</span></div><div class="mal-pulse-body" id="malPulseBody">Lecture des indicateurs…</div></div>' +
      '<div class="mal-autocare" id="malAutoCare"><div class="mal-pulse-head"><b>AutoCare</b><span>Diagnostic local de cet appareil</span></div><div class="mal-autocare-body" id="malAutoCareBody">Mesure des performances…</div></div>' +
      '<p class="mal-copilot-note">Transparence : ces copilotes sont des profils de consignes utilisant le même service IA Malachite, pas six modèles autonomes. Pulse lit les chiffres déjà affichés. AutoCare mesure localement le navigateur ; aucune télémétrie n’est envoyée.</p>' +
      '</section>';
  }

  function sendPrompt(prompt) {
    if (typeof window.malAiQuickPrompt === "function") {
      window.malAiQuickPrompt(prompt);
      var chat = document.getElementById("malAiMessages");
      if (chat) chat.scrollIntoView({behavior:"smooth", block:"nearest"});
      return;
    }
    var input = document.getElementById("malAiPrompt");
    if (input) {
      input.value = prompt;
      var send = document.getElementById("malAiSend");
      if (send) send.click();
    }
  }

  function runCommand() {
    var input = document.getElementById("malCommandInput");
    if (!input) return;
    var value = input.value.trim();
    if (!value) return;
    sendPrompt("Agis comme Malachite Manager en mode simulation. Décompose cette mission en cinq volets : Finance, Guardian, Support, Intelligence et Creative. Pour chaque volet, distingue les faits disponibles, les informations manquantes, les risques et les recommandations. Consolide ensuite un plan d’action priorisé. N’invente aucun résultat, ne prétends pas avoir exécuté une action, et demande une validation humaine avant toute opération sensible. Mission : " + value);
    input.value = "";
  }

  function pulse() {
    var root = document.getElementById("malPulseBody");
    var metrics = document.getElementById("malAiMetrics");
    if (!root || !metrics) return;
    var cards = Array.prototype.slice.call(metrics.querySelectorAll(".mal-ai-metric"));
    if (!cards.length) {
      root.textContent = "Les indicateurs ne sont pas encore chargés. Actualise le tableau IA.";
      return;
    }
    var alerts = [];
    cards.forEach(function (card) {
      var label = (card.querySelector("small") || {}).textContent || "";
      var value = (card.querySelector("b") || {}).textContent || "";
      var n = Number(String(value).replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) return;
      if (/paiement/i.test(label) && n > 0) alerts.push({level:"attention", text:n + " paiement(s) attend(ent) une vérification humaine."});
      if (/signalement/i.test(label) && n > 0) alerts.push({level:"urgent", text:n + " signalement(s) demandent un examen humain."});
      if (/support/i.test(label) && n > 0) alerts.push({level:"info", text:n + " demande(s) de support sont ouvertes."});
    });
    root.innerHTML = alerts.length ? alerts.map(function (a) {
      return '<div class="mal-pulse-alert ' + a.level + '"><i></i><span>' + esc(a.text) + '</span></div>';
    }).join("") : '<div class="mal-pulse-ok">Aucune alerte dérivée des indicateurs actuellement affichés. Cela ne constitue pas une certification de sécurité.</div>';
    root.insertAdjacentHTML("beforeend", '<small class="mal-pulse-foot">Dernière lecture : ' + new Date().toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"}) + ' · données du tableau administrateur</small>');
  }

  function autoCare() {
    var root = document.getElementById("malAutoCareBody");
    if (!root) return;
    var nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    var dom = nav && nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : null;
    var load = nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null;
    var resources = performance.getEntriesByType ? performance.getEntriesByType("resource").length : null;
    var longTasks = window.__malLongTaskCount || 0;
    function metric(label, value) {
      return '<div class="mal-autocare-metric"><small>' + label + '</small><b>' + value + '</b></div>';
    }
    root.innerHTML = '<div class="mal-autocare-grid">' +
      metric("DOM prêt", dom == null ? "—" : dom + " ms") +
      metric("Chargement", load == null ? "—" : load + " ms") +
      metric("Ressources", resources == null ? "—" : resources) +
      metric("Tâches longues observées", longTasks) + '</div>' +
      '<small class="mal-pulse-foot">Mesures navigateur indicatives, influencées par le réseau, le cache et l’appareil. Elles ne remplacent pas un test Lighthouse ni un test réel sur plusieurs téléphones.</small>';
  }

  function install() {
    if (typeof window.aiManagerPreview === "function" && !window.aiManagerPreview.__malWrapped) {
      var original = window.aiManagerPreview;
      var wrapped = function () {
        var html = original.apply(this, arguments);
        var at = html.lastIndexOf("</section>");
        return at >= 0 ? html.slice(0, at) + copilotMarkup() + html.slice(at) : html + copilotMarkup();
      };
      wrapped.__malWrapped = true;
      window.aiManagerPreview = wrapped;
    }
    if (window.__malCopilotDelegation) return;
    window.__malCopilotDelegation = true;
    document.addEventListener("click", function (event) {
      var card = event.target.closest && event.target.closest("[data-copilot]");
      if (card) {
        var key = card.getAttribute("data-copilot");
        if (prompts[key]) sendPrompt(prompts[key]);
      }
      if (event.target.closest && event.target.closest("#malCommandRun")) runCommand();
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        var input = document.getElementById("malCommandInput");
        if (input) { event.preventDefault(); input.focus(); }
      }
      if (event.key === "Enter" && event.target && event.target.id === "malCommandInput") runCommand();
    });
    if (window.MutationObserver && document.body) {
      var observedMetrics = null;
      new MutationObserver(function () {
        var target = document.getElementById("malAiMetrics");
        if (target && target !== observedMetrics) {
          observedMetrics = target;
          new MutationObserver(pulse).observe(target, {childList:true, subtree:true, characterData:true});
          pulse();
          autoCare();
        }
      }).observe(document.body, {childList:true, subtree:true});
    }
    if (window.PerformanceObserver) {
      try {
        new PerformanceObserver(function (list) {
          window.__malLongTaskCount = (window.__malLongTaskCount || 0) + list.getEntries().length;
          autoCare();
        }).observe({entryTypes:["longtask"]});
      } catch (_) {}
    }
    window.addEventListener("error", function () {
      window.__malRuntimeErrorCount = (window.__malRuntimeErrorCount || 0) + 1;
    }, true);
    pulse();
    autoCare();
  }

  var style = document.createElement("style");
  style.textContent = ".mal-copilot-suite{display:grid;gap:12px;padding:14px;border:1px solid #efd4df;border-radius:18px;background:linear-gradient(145deg,#fff,#fff8fb)}.mal-copilot-title,.mal-pulse-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.mal-copilot-title>div{display:grid;gap:3px}.mal-copilot-title b,.mal-pulse-head b{font-size:14px;color:#542b3e}.mal-copilot-title small,.mal-pulse-head span{font-size:10px;color:#987486}.mal-copilot-title>span{width:34px;height:34px;display:grid;place-items:center;border-radius:12px;background:#f8e7ef;color:#b33d70}.mal-copilot-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mal-copilot-card{display:grid;gap:4px;text-align:left;padding:11px;border:1px solid #eed8e1;border-radius:13px;background:#fff;color:#65354a;min-height:82px}.mal-copilot-card>span{font-size:18px;color:#c04477}.mal-copilot-card b{font-size:12px}.mal-copilot-card small{font-size:10px;color:#987486}.mal-copilot-card:active{transform:scale(.985)}.mal-command{display:grid;gap:7px}.mal-command label{font-size:12px;font-weight:800;color:#62364a}.mal-command>div{display:flex;gap:6px}.mal-command input{flex:1;min-width:0;border:1px solid #e9cfda;border-radius:10px;padding:10px;background:#fff;font-size:12px}.mal-command button{border:0;border-radius:10px;padding:0 12px;background:#d81b60;color:#fff;font-size:11px;font-weight:800}.mal-command>small,.mal-copilot-note{font-size:10px;line-height:1.45;color:#927585;margin:0}.mal-pulse,.mal-autocare{display:grid;gap:9px;padding:11px;border:1px solid #eedde4;border-radius:13px;background:#fff}.mal-pulse-alert{display:flex;align-items:center;gap:8px;padding:8px;border-radius:9px;background:#fff8ed;color:#80551f;font-size:11px}.mal-pulse-alert.urgent{background:#fff0f1;color:#963d4c}.mal-pulse-alert.info{background:#f5f4ff;color:#62518b}.mal-pulse-alert i{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}.mal-pulse-ok{font-size:11px;color:#38775d;background:#f1faf5;padding:9px;border-radius:9px}.mal-pulse-foot{font-size:9px;color:#a18492;line-height:1.4}.mal-autocare-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.mal-autocare-metric{display:grid;gap:3px;padding:8px;background:#fff8fb;border-radius:9px}.mal-autocare-metric small{font-size:9px;color:#987486}.mal-autocare-metric b{font-size:13px;color:#542b3e}@media(prefers-reduced-motion:reduce){.mal-copilot-card:active{transform:none}}";
  document.head.appendChild(style);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, {once:true});
  else install();
  var tries = 0;
  var retry = window.setInterval(function () {
    tries += 1;
    if (typeof window.aiManagerPreview === "function") install();
    if (tries >= 12 || window.__malCopilotWrapped) window.clearInterval(retry);
    if (window.aiManagerPreview && window.aiManagerPreview.__malWrapped) window.__malCopilotWrapped = true;
  }, 250);
})();