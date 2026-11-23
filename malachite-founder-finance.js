(function () {
  "use strict";

  var attempts = 0;
  var timer = window.setInterval(function () {
    attempts += 1;
    if (typeof window.founderDashboard !== "function" || !window.sb || typeof window.sb.rpc !== "function") {
      if (attempts >= 240) window.clearInterval(timer);
      return;
    }
    window.clearInterval(timer);
    installFinanceDashboard();
  }, 250);

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function formatAmount(value, currency) {
    var amount = Number(value || 0);
    if (!Number.isFinite(amount)) amount = 0;
    return amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + escapeHtml(currency || "");
  }

  function dateToIsoStart(value) {
    if (!value) return null;
    var date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function dateToIsoExclusiveEnd(value) {
    if (!value) return null;
    var date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + 1);
    return date.toISOString();
  }

  function installFinanceDashboard() {
    window.founderDashboard = function () {
      if (!window.me || !window.me.id) {
        return '<section class="card"><h2>Accès réservé</h2><p class="note">Cet espace est privé.</p></section>';
      }

      var today = new Date();
      var start = new Date(today);
      start.setDate(start.getDate() - 29);
      var startValue = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0");
      var endValue = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

      window.setTimeout(function () {
        if (document.getElementById("malFounderFinancePanel")) window.malFounderFinanceRefresh();
      }, 0);

      return '<section class="ml-search-intro"><span class="ml-auth-kicker">ESPACE FONDATEUR · PRIVÉ</span><h2>Pilotage MALACHITE</h2><p>Suivi du site et vue interne des déclarations de paiement et des recettes confirmées.</p></section>' +
        '<section class="card" style="margin:12px 0"><b>État de la production</b><p class="note">Le tableau financier est intégré à la version principale et sa structure serveur est installée. Aucun fournisseur de paiement ni webhook n’est connecté : les encaissements réels ne sont pas encore importés automatiquement.</p><p><a href="https://famousnadroj-sys.github.io/malachite/" target="_blank" rel="noopener">Ouvrir le site public</a> · <a href="https://github.com/famousnadroj-sys/malachite/pull/58" target="_blank" rel="noopener">Voir la revue technique n°58</a></p></section>' +
        '<section class="card" style="margin:12px 0"><b>Accès protégé</b><p class="note">Les chiffres sont demandés au serveur. Seul un compte administrateur autorisé peut les consulter. Aucune donnée financière n’est écrite depuis cet écran.</p></section>' +
        '<section class="card" id="malFounderFinancePanel">' +
          '<h3 style="margin:0">Période d’analyse</h3>' +
          '<div class="g2" style="margin-top:10px">' +
            '<label>Du <input type="date" id="malFinanceFrom" value="' + startValue + '"></label>' +
            '<label>Au <input type="date" id="malFinanceTo" value="' + endValue + '"></label>' +
          '</div>' +
          '<button class="b1 big" style="width:100%;margin-top:12px" onclick="malFounderFinanceRefresh()">Actualiser les chiffres</button>' +
          '<div id="malFounderFinanceResults" aria-live="polite" style="margin-top:14px"><p class="note">Chargement des données sécurisées…</p></div>' +
        '</section>' +
        '<p class="note" style="text-align:center;margin:14px 0">Registre financier sécurisé · aucun paiement ni transfert réel n’est activé depuis cet écran.</p>';
    };

    window.malFounderFinanceRefresh = async function () {
      var panel = document.getElementById("malFounderFinancePanel");
      var target = document.getElementById("malFounderFinanceResults");
      if (!panel || !target) return;
      if (!window.me || !window.me.id) {
        target.innerHTML = '<p class="err">Accès refusé.</p>';
        return;
      }

      var fromInput = document.getElementById("malFinanceFrom");
      var toInput = document.getElementById("malFinanceTo");
      var from = dateToIsoStart(fromInput && fromInput.value);
      var to = dateToIsoExclusiveEnd(toInput && toInput.value);
      if ((fromInput && fromInput.value && !from) || (toInput && toInput.value && !to) || (from && to && from >= to)) {
        target.innerHTML = '<p class="err">Vérifie les dates sélectionnées.</p>';
        return;
      }

      target.innerHTML = '<p class="note">Récupération des données…</p>';
      try {
        var response = await window.sb.rpc("founder_business_overview", { p_from: from, p_to: to });
        if (response.error || !response.data || typeof response.data !== "object") {
          target.innerHTML = '<p class="err">Accès refusé ou données indisponibles. Aucun chiffre n’a été affiché.</p>';
          return;
        }

        var data = response.data;
        var finance = Array.isArray(data.confirmed_finance) ? data.confirmed_finance : [];
        var declarations = data.payment_declarations || {};
        var statuses = Array.isArray(declarations.by_status) ? declarations.by_status : [];
        var offers = Array.isArray(declarations.by_offer) ? declarations.by_offer : [];
        var financeHtml = finance.length ? finance.map(function (row) {
          return '<article class="card" style="margin-top:8px"><b>' + escapeHtml(row.currency || "Devise inconnue") + '</b>' +
            '<div class="g2" style="margin-top:8px">' +
              '<div><span class="note">Encaissements bruts</span><br><b>' + formatAmount(row.gross_inflow, row.currency) + '</b></div>' +
              '<div><span class="note">Sorties confirmées</span><br><b>' + formatAmount(row.gross_outflow, row.currency) + '</b></div>' +
              '<div><span class="note">Frais</span><br><b>' + formatAmount(row.fees, row.currency) + '</b></div>' +
              '<div><span class="note">Commissions</span><br><b>' + formatAmount(row.commissions, row.currency) + '</b></div>' +
              '<div><span class="note">Flux net confirmé</span><br><b>' + formatAmount(row.net, row.currency) + '</b></div>' +
            '</div><p class="note">' + escapeHtml(row.events || 0) + ' événement(s) confirmé(s)</p></article>';
        }).join("") : '<p class="note">Aucune recette confirmée n’est encore inscrite dans le registre financier de cet environnement.</p>';

        var statusHtml = statuses.length ? '<ul>' + statuses.map(function (item) {
          return '<li>' + escapeHtml(item.status || "Sans statut") + ' : <b>' + escapeHtml(item.count || 0) + '</b></li>';
        }).join("") + '</ul>' : '<p class="note">Aucune déclaration de paiement sur cette période.</p>';

        var offerHtml = offers.length ? '<ul>' + offers.map(function (item) {
          return '<li>' + escapeHtml(item.offer || "Offre non précisée") + ' : <b>' + escapeHtml(item.count || 0) + '</b></li>';
        }).join("") + '</ul>' : '<p class="note">Aucune offre déclarée sur cette période.</p>';

        target.innerHTML =
          '<div class="g2">' +
            '<article class="card"><span class="note">Membres créés pendant la période</span><h2 style="margin:4px 0">' + escapeHtml(data.members && data.members.total || 0) + '</h2></article>' +
            '<article class="card"><span class="note">Déclarations de paiement</span><h2 style="margin:4px 0">' + escapeHtml(declarations.total || 0) + '</h2></article>' +
          '</div>' +
          '<h3>Recettes réellement confirmées</h3>' + financeHtml +
          '<h3>Déclarations par statut</h3><section class="card">' + statusHtml + '</section>' +
          '<h3>Déclarations par offre</h3><section class="card">' + offerHtml + '</section>' +
          '<p class="note" style="margin-top:12px">Important : une déclaration de paiement n’est pas une preuve d’argent reçu. Seules les écritures marquées « confirmed » dans le registre financier sont comptées comme recettes. ' + escapeHtml(data.revenue_note || "") + '</p>';
      } catch (error) {
        target.innerHTML = '<p class="err">Impossible de charger les données financières. Réessaie plus tard.</p>';
      }
    };

    if (window.me && window.me.id && window.tab === "founder" && typeof window.draw === "function") {
      window.draw(true);
    }
  }
})();
