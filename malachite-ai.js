/* Malachite AI Manager UI — additive layer; existing app integrations remain untouched. */
(function () {
  "use strict";
  if (window.__malAiManagerUiLoaded) return;
  window.__malAiManagerUiLoaded = true;
  var history = [];
  var busy = false;
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function renderMessages() {
    var box = document.getElementById("malAiMessages");
    if (!box) return;
    box.innerHTML = history.length ? history.map(function (m) {
      return '<div class="mal-ai-msg '+(m.role === "user" ? "user" : "assistant")+'">'+esc(m.text)+'</div>';
    }).join("") : '<p class="note">Pose une question sur le fonctionnement du site, les tendances agrégées ou les priorités de gestion. L’IA ne peut pas suspendre un compte, valider un paiement ni modifier la base.</p>';
    box.scrollTop = box.scrollHeight;
  }
  window.aiManagerPreview = function () {
    return '<section class="box list mal-ai-manager" style="margin-bottom:16px;border:1px solid var(--pink)">'+
      '<div class="top"><div style="font-size:28px">🤖</div><div><b>Malachite AI Manager</b><div class="note">Assistant IA d’aide à la décision · accès administrateur uniquement</div></div></div>'+
      '<div class="wall"><b id="malAiState">Contrôle d’accès côté serveur actif</b><p class="note">Les réponses sont consultatives. Aucune action sur les comptes, paiements, messages ou paramètres n’est exécutée automatiquement.</p></div>'+
      '<div id="malAiMessages" class="mal-ai-messages" aria-live="polite"></div>'+
      '<label>Message à l’assistant<textarea id="malAiPrompt" rows="3" maxlength="2000" placeholder="Ex. Aide-moi à prioriser les contrôles de sécurité avant l’ouverture."></textarea></label>'+
      '<button id="malAiSend" class="b1" type="button" onclick="malAiSendMessage()">Envoyer à Malachite AI</button>'+
      '<p class="note">Ne saisis pas de mots de passe, codes OTP, coordonnées privées, contenu de conversations ou justificatifs de paiement. Le texte saisi est transmis au fournisseur IA configuré côté serveur.</p>'+
      '<div class="g2"><div class="plan"><b>🔒 Autorisation</b><p>Session valide et vérification administrateur côté serveur.</p></div><div class="plan"><b>🧾 Traçabilité</b><p>Journal technique minimal : modèle, état et tailles, sans conserver les prompts.</p></div></div>'+
      '</section>';
  };
  window.malAiSendMessage = async function () {
    var input = document.getElementById("malAiPrompt");
    var state = document.getElementById("malAiState");
    var button = document.getElementById("malAiSend");
    if (busy || !input || !state || !button) return;
    var message = input.value.trim();
    if (message.length < 2 || message.length > 2000) {
      state.textContent = "Écris un message de 2 à 2 000 caractères.";
      return;
    }
    if (!window.sb || !sb.functions || !sb.functions.invoke) {
      state.textContent = "Service IA indisponible : client serveur non initialisé.";
      return;
    }
    busy = true;
    button.disabled = true;
    state.textContent = "L’assistant prépare sa réponse…";
    history.push({role:"user",text:message});
    input.value = "";
    renderMessages();
    try {
      var result = await sb.functions.invoke("malachite-ai-manager", {body:{message:message}});
      if (result.error) {
        var detail = result.data && result.data.error;
        if (detail === "ai_provider_not_configured") throw new Error("Le fournisseur IA n’est pas encore configuré côté serveur (clé API manquante).");
        if (detail === "admin_only") throw new Error("Accès réservé au compte administrateur.");
        throw new Error("Réponse IA indisponible. Vérifie la connexion et la configuration serveur.");
      }
      var answer = result.data && result.data.reply;
      if (!answer) throw new Error("Le service n’a pas retourné de réponse exploitable.");
      history.push({role:"assistant",text:answer});
      state.textContent = "Réponse reçue.";
    } catch (e) {
      history.push({role:"assistant",text:"Erreur : "+(e && e.message ? e.message : "service indisponible")});
      state.textContent = "Le service IA n’a pas répondu.";
    } finally {
      busy = false;
      button.disabled = false;
      renderMessages();
    }
  };
  var originalDraw = window.draw;
  if (typeof originalDraw === "function") {
    window.draw = function () {
      var result = originalDraw.apply(this, arguments);
      var nav = document.getElementById("nav");
      if (nav) {
        var centre = nav.querySelector('button[data-k="centre"]');
        if (centre) {
          var label = centre.lastChild;
          if (label && label.nodeType === 3) label.nodeValue = "Personnalisation";
        }
      }
      if (document.getElementById("malAiMessages")) renderMessages();
      return result;
    };
  }
  var style = document.createElement("style");
  style.textContent = ".mal-ai-messages{display:grid;gap:8px;max-height:320px;overflow:auto;padding:10px;border:1px solid var(--line);border-radius:14px;background:#fff}.mal-ai-msg{white-space:pre-wrap;overflow-wrap:anywhere;padding:10px 12px;border-radius:13px;font-size:14px}.mal-ai-msg.user{background:var(--soft);justify-self:end;max-width:92%}.mal-ai-msg.assistant{background:#f6f6f6;justify-self:start;max-width:96%}.mal-ai-manager textarea{resize:vertical}";
  document.head.appendChild(style);
})();
