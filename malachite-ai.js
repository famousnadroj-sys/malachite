/* Malachite AI Manager — secure admin copilot and live operational overview. */
(function () {
  "use strict";
  if (window.__malAiManagerUiLoaded) return;
  window.__malAiManagerUiLoaded = true;
  var history = [], busy = false, dashboardBusy = false, lastDashboard = null, lastDashboardAt = 0;
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function metric(label, value, hint, icon) {
    return '<div class="mal-ai-metric"><span>'+icon+'</span><div><small>'+label+'</small><b>'+esc(value == null ? "—" : value)+'</b><em>'+hint+'</em></div></div>';
  }
  function renderMessages() {
    var box = document.getElementById("malAiMessages");
    if (!box) return;
    box.innerHTML = history.length ? history.map(function (m) {
      return '<div class="mal-ai-msg '+(m.role === "user" ? "user" : "assistant")+'"><small>'+(m.role === "user" ? "VOUS" : "MALACHITE AI")+'</small><div>'+esc(m.text)+'</div></div>';
    }).join("") : '<div class="mal-ai-empty"><b>Bonjour, je suis ton copilote Malachite.</b><p>Je peux analyser les indicateurs agrégés, préparer un briefing, prioriser les paiements et signalements, et proposer des améliorations. Les décisions sensibles restent sous ton contrôle.</p></div>';
    box.scrollTop = box.scrollHeight;
  }
  window.aiManagerPreview = function () {
    return '<section class="mal-ai-shell">'+
      '<div class="mal-ai-head"><div class="mal-ai-orb">✦</div><div class="mal-ai-heading"><b>Malachite AI Manager</b><small>TON COPILOTE DE GESTION · ADMINISTRATEUR</small></div><button class="mal-ai-refresh" type="button" onclick="malAiLoadDashboard(true)" title="Actualiser les indicateurs">↻</button></div>'+
      '<div class="mal-ai-status" id="malAiState"><i></i><span>Connexion sécurisée · chargement des indicateurs…</span></div>'+
      '<div class="mal-ai-section-title"><b>Vue d’ensemble</b><small id="malAiUpdated">Indicateurs agrégés</small></div>'+
      '<div class="mal-ai-metrics" id="malAiMetrics"><div class="mal-ai-skeleton"></div><div class="mal-ai-skeleton"></div><div class="mal-ai-skeleton"></div><div class="mal-ai-skeleton"></div></div>'+
      '<div class="mal-ai-section-title"><b>Conseils automatiques</b><small>Basés sur les chiffres réels</small></div><div id="malAiInsights" class="mal-ai-insights">Chargement des priorités…</div><div class="mal-ai-section-title"><b>Actions rapides</b><small>Conseils, aucune action automatique</small></div>'+
      '<div class="mal-ai-quick">'+
      '<button type="button" onclick="malAiQuickPrompt(\'Prépare mon briefing quotidien à partir des indicateurs actuels. Donne-moi les trois priorités et les risques à surveiller.\')">☀️ Briefing du jour</button>'+
      '<button type="button" onclick="malAiQuickPrompt(\'Analyse les paiements en attente à partir des chiffres agrégés et propose une procédure de vérification fiable.\')">💳 Paiements</button>'+
      '<button type="button" onclick="malAiQuickPrompt(\'Aide-moi à prioriser les signalements et les demandes de support sans prendre de décision à ma place.\')">🛡️ Sécurité & support</button>'+
      '<button type="button" onclick="malAiQuickPrompt(\'Propose cinq améliorations concrètes pour augmenter la qualité des profils, la confiance et la rétention des membres.\')">📈 Croissance</button>'+
      '</div>'+
      '<div class="mal-ai-section-title"><b>Assistant intelligent</b><small>Réponses en français</small></div>'+
      '<div id="malAiMessages" class="mal-ai-messages" aria-live="polite"></div>'+
      '<label class="mal-ai-input-label">Ton message<textarea id="malAiPrompt" rows="3" maxlength="2000" placeholder="Ex. Fais le point sur les risques et les priorités de Malachite…"></textarea></label>'+
      '<button id="malAiSend" class="mal-ai-send" type="button" onclick="malAiSendMessage()"><span>Envoyer à Malachite AI</span><b>↗</b></button>'+
      '<p class="mal-ai-footnote">🔒 Accès réservé à l’administrateur. L’assistant reçoit uniquement ton message et des chiffres agrégés. Il ne lit jamais les messages privés et ne peut pas valider un paiement, suspendre un compte ou modifier le site sans validation humaine.</p>'+
      '</section>';
  };
  window.malAiLoadDashboard = async function (force) {
    var root = document.getElementById("malAiMetrics");
    var state = document.getElementById("malAiState");
    var updated = document.getElementById("malAiUpdated");
    if (dashboardBusy || !root) return;
    if (!force && lastDashboard && Date.now() - lastDashboardAt < 20000) return;
    if (!window.sb || !sb.functions || !sb.functions.invoke) {
      if (state) state.innerHTML = '<i class="bad"></i><span>Connexion Supabase indisponible.</span>';
      return;
    }
    dashboardBusy = true;
    try {
      var result = await sb.functions.invoke("malachite-ai-manager", {body:{action:"dashboard"}});
      if (result.error) {
        var detail = result.data && result.data.error;
        if (state) state.innerHTML = '<i class="bad"></i><span>'+esc(detail === "admin_only" ? "Accès réservé à l’administrateur." : "Indicateurs indisponibles. Vérifie la connexion.")+'</span>';
        root.innerHTML = '<p class="mal-ai-error">Impossible de charger les indicateurs.</p>';
        return;
      }
      var d = result.data && result.data.metrics;
      if (!d) throw new Error("Indicateurs non reçus.");
      lastDashboard = d;
      root.innerHTML =
        metric("Membres",d.members,"Total des profils","👥")+
        metric("Nouveaux · 7 jours",d.new_members_7d,"Inscriptions récentes","✨")+
        metric("Premium actifs",d.premium_active,"Abonnements en cours","⭐")+
        metric("Paiements à vérifier",d.pending_payments,"À traiter manuellement","💳")+
        metric("Signalements nouveaux",d.new_reports,"À examiner","🛡️")+
        metric("Support ouvert",d.open_support,"Demandes en cours","💬")+
        metric("Comptes suspendus",d.suspended_members,"État actuel","⛔");
      if (state) state.innerHTML = '<i class="'+(d.ai_ready ? "good" : "warn")+'"></i><span>'+(d.ai_ready ? "Tableau connecté · moteur IA prêt" : "Tableau connecté · clé du moteur IA à configurer")+'</span>';
      var insightBox=document.getElementById("malAiInsights");
      if(insightBox){
        var tips=[];
        if(d.pending_payments>0)tips.push(["À vérifier",d.pending_payments+" paiement(s) attendent un contrôle manuel.","💳"]);
        if(d.new_reports>0)tips.push(["Priorité sécurité",d.new_reports+" signalement(s) sont nouveaux. Examine les cas avant toute sanction.","🛡️"]);
        if(d.open_support>0)tips.push(["Service membres",d.open_support+" demande(s) de support sont ouvertes.","💬"]);
        if(d.new_members_7d>0)tips.push(["Acquisition",d.new_members_7d+" nouveau(x) profil(s) sur les 7 derniers jours. Surveille la qualité des profils et l’accueil.","✨"]);
        if(!tips.length)tips.push(["Tout est calme","Aucun paiement en attente, signalement nouveau ou ticket de support ouvert n’a été détecté dans les indicateurs disponibles.","✓"]);
        insightBox.innerHTML=tips.map(function(t){return '<div class="mal-ai-insight"><span>'+t[2]+'</span><div><b>'+esc(t[0])+'</b><p>'+esc(t[1])+'</p></div></div>'}).join("");
      }
      if (updated) updated.textContent = "Actualisé à "+new Date(d.generated_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    } catch (e) {
      if (state) state.innerHTML = '<i class="bad"></i><span>Erreur de chargement des indicateurs.</span>';
      root.innerHTML = '<p class="mal-ai-error">'+esc(e.message || "Erreur inconnue")+'</p>';
    } finally { dashboardBusy = false; }
  };
  window.malAiQuickPrompt = function (value) {
    var input = document.getElementById("malAiPrompt");
    if (!input) return;
    input.value = value;
    window.malAiSendMessage();
  };
  window.malAiSendMessage = async function () {
    var input = document.getElementById("malAiPrompt");
    var state = document.getElementById("malAiState");
    var button = document.getElementById("malAiSend");
    if (busy || !input || !button) return;
    var message = input.value.trim();
    if (message.length < 2 || message.length > 2000) {
      if (state) state.innerHTML = '<i class="warn"></i><span>Écris un message de 2 à 2 000 caractères.</span>';
      return;
    }
    if (!window.sb || !sb.functions || !sb.functions.invoke) {
      if (state) state.innerHTML = '<i class="bad"></i><span>Connexion au serveur indisponible.</span>';
      return;
    }
    busy = true; button.disabled = true; button.innerHTML = '<span>Analyse en cours…</span><b>•••</b>';
    history.push({role:"user",text:message}); input.value = ""; renderMessages();
    try {
      var conversation = history.slice(-9,-1).map(function(m){return {role:m.role==="assistant"?"model":"user",text:m.text}});
      var result = await sb.functions.invoke("malachite-ai-manager", {body:{action:"chat",message:message,history:conversation}});
      var detail = result.data && result.data.error;
      if (result.error && !detail && result.error.context && typeof result.error.context.clone === "function") {
        try { var errorPayload = await result.error.context.clone().json(); detail = errorPayload && errorPayload.error; } catch (_) {}
      }
      if (result.error) {
        if (detail === "ai_provider_not_configured") throw new Error("Le tableau de gestion fonctionne, mais le moteur de réponse nécessite encore la clé GEMINI_API_KEY dans les secrets Supabase.");
        if (detail === "admin_only") throw new Error("Accès réservé au compte administrateur.");
        if (detail === "rate_limited") throw new Error("Limite temporaire atteinte. Attends une minute avant de réessayer.");
        throw new Error("Le moteur IA n’a pas répondu. Vérifie la configuration et réessaie.");
      }
      var answer = result.data && result.data.reply;
      if (!answer) throw new Error("Le service n’a pas retourné de réponse exploitable.");
      history.push({role:"assistant",text:answer});
      if (state) state.innerHTML = '<i class="good"></i><span>Analyse terminée · aucune action automatique exécutée</span>';
    } catch (e) {
      history.push({role:"assistant",text:"Je ne peux pas encore répondre : "+(e && e.message ? e.message : "service indisponible")});
      if (state) state.innerHTML = '<i class="warn"></i><span>Moteur IA à vérifier</span>';
    } finally {
      busy = false; button.disabled = false; button.innerHTML = '<span>Envoyer à Malachite AI</span><b>↗</b>'; renderMessages();
    }
  };
  var originalDraw = window.draw;
  if (typeof originalDraw === "function") {
    window.draw = function () {
      var result = originalDraw.apply(this, arguments);
      if (typeof tab !== "undefined" && tab === "adm" && document.getElementById("malAiMetrics")) {
        window.malAiLoadDashboard();
      }
      return result;
    };
  }
  var style = document.createElement("style");
  style.textContent = `
  .mal-ai-shell{margin:0 0 18px;padding:16px;border:1px solid #f0c4d5;border-radius:23px;background:linear-gradient(145deg,#fff 0%,#fff7fa 55%,#f8f3ff 100%);box-shadow:0 14px 38px rgba(105,34,63,.08);display:grid;gap:14px}
  .mal-ai-head{display:flex;align-items:center;gap:11px}.mal-ai-orb{width:46px;height:46px;display:grid;place-items:center;border-radius:16px;color:white;font-size:24px;background:linear-gradient(145deg,#d81b60,#8f55bd);box-shadow:0 7px 18px #d81b6030}.mal-ai-heading{display:grid;gap:2px;flex:1}.mal-ai-heading b{font-size:17px}.mal-ai-heading small{font-size:10px;letter-spacing:.09em;color:#916578;font-weight:800}.mal-ai-refresh{width:39px;height:39px;border-radius:13px;background:#fff;border:1px solid #f0d3df;color:#9b3b65;font-size:22px;padding:0}
  .mal-ai-status{display:flex;align-items:center;gap:8px;font-size:12px;color:#785467;background:#fff;border:1px solid #f3dce5;border-radius:12px;padding:10px}.mal-ai-status i{width:8px;height:8px;border-radius:50%;background:#d6a13c;flex:none}.mal-ai-status i.good{background:#1eaa70}.mal-ai-status i.bad{background:#d34c62}.mal-ai-status i.warn{background:#d6a13c}
  .mal-ai-section-title{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.mal-ai-section-title b{font-size:14px}.mal-ai-section-title small{font-size:10px;color:#987486;text-align:right}
  .mal-ai-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mal-ai-metric{min-width:0;display:flex;gap:9px;align-items:center;background:rgba(255,255,255,.9);border:1px solid #f1dce4;border-radius:14px;padding:10px}.mal-ai-metric>span{font-size:21px}.mal-ai-metric>div{display:grid;min-width:0}.mal-ai-metric small{font-size:10px;color:#8b6a79}.mal-ai-metric b{font-size:20px;line-height:1.2;color:#3d1b2b}.mal-ai-metric em{font-size:9px;font-style:normal;color:#a18793}.mal-ai-skeleton{height:66px;border-radius:14px;background:linear-gradient(90deg,#f8eaf0,#fff,#f8eaf0);background-size:200% 100%;animation:malAiShimmer 1.2s linear infinite}@keyframes malAiShimmer{to{background-position:-200% 0}}
  .mal-ai-insights{display:grid;gap:7px}.mal-ai-insight{display:flex;gap:9px;align-items:flex-start;padding:10px;border:1px solid #f0dce4;background:#fff;border-radius:12px}.mal-ai-insight>span{font-size:18px}.mal-ai-insight b{font-size:11px;color:#643349}.mal-ai-insight p{font-size:11px;color:#866b78;margin:2px 0 0;line-height:1.4}.mal-ai-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mal-ai-quick button{font-size:11px;padding:10px 8px;background:#fff;border:1px solid #ecd4df;color:#70374f;line-height:1.35;text-align:left;min-height:44px}.mal-ai-messages{display:grid;gap:9px;max-height:330px;overflow:auto;padding:11px;background:#fff;border:1px solid #efd9e3;border-radius:15px;min-height:96px}.mal-ai-empty{color:#6d4a5a;font-size:13px;line-height:1.5}.mal-ai-empty p{margin:5px 0 0}.mal-ai-msg{max-width:96%;padding:10px 12px;border-radius:14px;background:#f7f1f5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.mal-ai-msg.user{justify-self:end;background:#fce5ef}.mal-ai-msg small{display:block;font-size:9px;letter-spacing:.08em;color:#a16b83;font-weight:800;margin-bottom:4px}.mal-ai-input-label{font-size:12px!important;color:#70475a}.mal-ai-input-label textarea{width:100%;min-height:74px;border:1px solid #e9cbd8;border-radius:13px;background:#fff;padding:11px;resize:vertical}.mal-ai-send{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;background:linear-gradient(100deg,#d81b60,#9652b5);color:#fff;border-radius:13px;min-height:47px}.mal-ai-send:disabled{opacity:.65}.mal-ai-footnote{font-size:10px;line-height:1.45;color:#8b6d7a;margin:0}.mal-ai-error{grid-column:1/-1;color:#9d3651;font-size:12px}
  @media(max-width:350px){.mal-ai-metric{padding:8px 6px;gap:5px}.mal-ai-metric>span{font-size:18px}.mal-ai-metric b{font-size:18px}.mal-ai-quick button{font-size:10px}}
  `;
  document.head.appendChild(style);
})();