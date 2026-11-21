/* Malachite member experience: compact offers, durable notification inbox and mobile chat viewport. */
(function () {
  'use strict';
  if (window.__malachiteMemberExperienceV1) return;
  window.__malachiteMemberExperienceV1 = true;

  var inbox = { rows: [], unread: 0, tab: 'notifications', filter: 'all', drawer: null, loading: false, loadedUserId: null, loadedAt: 0 };
  var offerPage = 1;
  var toastSeen = Object.create(null);
  var soundEnabled = localStorage.getItem('mal-notif-sound') !== 'off';
  var vibrationEnabled = localStorage.getItem('mal-notif-vibration') !== 'off';

  function currentUser() { return window.me && window.me.id ? window.me : null; }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function isAdmin() {
    var user = currentUser();
    return !!(user && (user.email === window.ADM || user.email === 'famousnadroj@gmail.com'));
  }
  function dateLabel(value) {
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function updateBell() {
    var button = document.getElementById('malUserMenuTrigger');
    if (!button) return;
    var badge = button.querySelector('.mal-notif-badge');
    if (!badge) return;
    badge.textContent = String(inbox.unread);
    badge.hidden = inbox.unread < 1;
    button.setAttribute('aria-label', inbox.unread ? 'Ouvrir le menu, ' + inbox.unread + ' notification(s) non lue(s)' : 'Ouvrir le menu utilisateur');
  }

  function ensureBell() {
    var header = document.querySelector('body > header');
    var user = currentUser();
    if (!header || !user) {
      var old = document.getElementById('malUserMenuTrigger');
      if (old) old.remove();
      return;
    }
    var button = document.getElementById('malUserMenuTrigger');
    if (!button) {
      button = document.createElement('button');
      button.id = 'malUserMenuTrigger';
      button.type = 'button';
      button.className = 'mal-user-menu-trigger';
      button.innerHTML = '<span class="mal-user-menu-icon" aria-hidden="true">🔔</span><span class="mal-user-menu-label">Menu</span><span class="mal-notif-badge" hidden>0</span>';
      button.addEventListener('click', function () { openInbox('notifications'); });
      header.appendChild(button);
    }
    updateBell();
  }

  async function refreshInbox(force) {
    var user = currentUser();
    if (!user || !window.sb || inbox.loading) return;
    if (!force && inbox.loadedUserId === user.id && Date.now() - inbox.loadedAt < 45000) return;
    inbox.loading = true;
    try {
      var results = await Promise.all([
        window.sb.from('user_notifications')
          .select('id,kind,category,title,body,created_at,read_at,related_message_id,related_user_id,action_type,action_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        window.sb.from('user_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null)
      ]);
      if (!currentUser() || currentUser().id !== user.id) return;
      if (results[0].error) throw results[0].error;
      inbox.rows = results[0].data || [];
      inbox.loadedUserId = user.id;
      inbox.loadedAt = Date.now();
      if (!results[1].error && typeof results[1].count === 'number') {
        inbox.unread = results[1].count;
      } else {
        inbox.unread = inbox.rows.filter(function (row) { return !row.read_at; }).length;
      }
      updateBell();
      if (inbox.drawer) renderInbox();
    } catch (error) {
      console.warn('Chargement des notifications Malachite', error);
    } finally {
      inbox.loading = false;
    }
  }

  function playNotice() {
    if (vibrationEnabled && navigator.vibrate) {
      try { navigator.vibrate([90, 45, 90]); } catch (_) {}
    }
    if (soundEnabled && typeof window.beep === 'function') {
      try { window.beep(); } catch (_) {}
    }
  }

  function showNoticeToast(row) {
    var old = document.getElementById('malUserNoticeToast');
    if (old) old.remove();
    var toast = document.createElement('button');
    toast.type = 'button';
    toast.id = 'malUserNoticeToast';
    toast.className = 'mal-user-notice-toast';
    toast.innerHTML = '<span class="mal-user-notice-icon">●</span><span class="mal-user-notice-copy"><b>' +
      esc(row.title || 'Nouvelle notification') + '</b><small>' + esc(row.body || 'Ouvre ton menu pour consulter.') +
      '</small></span><span class="mal-user-notice-action">Voir</span>';
    toast.addEventListener('click', function () { openNotification(row.id); });
    document.body.appendChild(toast);
    window.setTimeout(function () { if (toast.isConnected) toast.remove(); }, 6500);
  }

  function announceNotification(row) {
    if (!row || !row.id) return;
    var key = String(row.id);
    var exists = inbox.rows.some(function (item) { return String(item.id) === key; });
    if (!exists) inbox.rows.unshift(row);
    if (!row.read_at && !exists) inbox.unread += 1;
    updateBell();
    if (!row.read_at && !toastSeen[key]) {
      toastSeen[key] = true;
      playNotice();
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(function (registration) {
          return registration.showNotification(row.title || 'Malachite', {
            body: row.body || 'Tu as une nouvelle notification.',
            icon: './icons/malachite.svg',
            badge: './icons/malachite.svg',
            tag: 'malachite-user-' + key,
            renotify: false,
            data: { url: './?openNotification=' + encodeURIComponent(key) }
          });
        }).catch(function () {});
      } else {
        showNoticeToast(row);
      }
    }
    if (inbox.drawer) renderInbox();
  }

  function notificationDedupeKey(title, body, destination, id) {
    var source = String(destination || 'system') + '|' + String(id || '') + '|' + String(title || '') + '|' + String(body || '').replace(/[0-9]+/g, '#');
    var a = 2166136261, b = 2246822519;
    for (var i = 0; i < source.length; i++) {
      var code = source.charCodeAt(i);
      a = Math.imul(a ^ code, 16777619);
      b = Math.imul(b + code, 3266489917);
    }
    return 'toast:' + (a >>> 0).toString(36) + (b >>> 0).toString(36);
  }

  var originalNotify = window.notify;
  if (typeof originalNotify === 'function') {
    window.notify = function (title, body, destination, id) {
      var user = currentUser();
      if (!user || !window.sb) return originalNotify.apply(this, arguments);
      var textTitle = String(title || 'Information Malachite').slice(0, 90);
      var textBody = String(body || 'Ouvre ton menu pour consulter cette information.').slice(0, 500);
      var lower = textTitle.toLowerCase();
      var category = lower.indexOf('publicit') >= 0 || lower.indexOf('promotion') >= 0 ? 'promotion' :
        (lower.indexOf('alerte') >= 0 || lower.indexOf('rappel') >= 0 ? 'alert' :
        (lower.indexOf('actualité') >= 0 ? 'news' : 'system'));
      var key = notificationDedupeKey(textTitle, textBody, destination, id);
      var actionType = ['chat','rdv','adm','offres'].indexOf(String(destination || '')) >= 0 ? String(destination) : null;
      var relatedUserId = null;
      if (destination === 'chat' && lower.indexOf('match') >= 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''))) {
        actionType = 'match';
        relatedUserId = String(id);
      }
      window.sb.rpc('create_my_action_notification', {
        p_category: category,
        p_title: textTitle,
        p_body: textBody,
        p_dedupe_key: key,
        p_action_type: actionType,
        p_action_id: id == null ? null : String(id),
        p_related_user_id: relatedUserId
      }).then(async function (result) {
        if (result.error) {
          originalNotify.call(window, title, body, destination, id);
          return;
        }
        if (result.data) {
          var row = await window.sb.from('user_notifications')
            .select('id,kind,category,title,body,created_at,read_at,related_message_id,related_user_id,action_type,action_id')
            .eq('id', result.data).maybeSingle();
          if (!row.error && row.data) announceNotification(row.data);
        }
      }).catch(function () {
        originalNotify.call(window, title, body, destination, id);
      });
    };
  }

  window.malAnnounceUserNotification = announceNotification;
  window.malRefreshNotificationState = refreshInbox;
  window.malOpenNotifications = function () { openInbox('notifications'); };

  async function markRead(id) {
    var user = currentUser();
    if (!user) return;
    var row = inbox.rows.find(function (item) { return String(item.id) === String(id); });
    if (!row || row.read_at) return;
    var stamp = new Date().toISOString();
    row.read_at = stamp;
    inbox.unread = Math.max(0, inbox.unread - 1);
    updateBell();
    if (inbox.drawer) renderInbox();
    var result = await window.sb.from('user_notifications')
      .update({ read_at: stamp })
      .eq('id', row.id)
      .eq('user_id', user.id)
      .is('read_at', null);
    if (result.error) {
      row.read_at = null;
      inbox.unread += 1;
      updateBell();
      if (inbox.drawer) renderInbox();
      console.warn('Marquage notification non confirmé', result.error);
    }
  }

  async function openNotification(id) {
    var row = inbox.rows.find(function (item) { return String(item.id) === String(id); });
    if (!row && currentUser() && window.sb) {
      var fetched = await window.sb.from('user_notifications')
        .select('id,kind,category,title,body,created_at,read_at,related_message_id,related_user_id,action_type,action_id')
        .eq('id', id).eq('user_id', currentUser().id).maybeSingle();
      if (!fetched.error && fetched.data) {
        row = fetched.data;
        inbox.rows.unshift(row);
      }
    }
    if (!row) return;
    markRead(id);
    closeInbox();
    if (row.category === 'payment') {
      openInbox('payments');
      return;
    }
    if (row.category === 'message' && row.related_user_id && row.related_message_id && typeof window.openLinkedMessage === 'function') {
      window.openLinkedMessage(row.related_user_id, row.related_message_id);
      return;
    }
    if (row.category === 'message' && row.related_user_id && typeof window.openConv === 'function') {
      window.openConv(row.related_user_id);
      return;
    }
    if (row.action_type === 'match' && row.related_user_id && typeof window.openConv === 'function') {
      window.openConv(row.related_user_id);
      return;
    }
    if (row.action_type === 'chat' && row.related_user_id && typeof window.openConv === 'function') {
      window.openConv(row.related_user_id);
      return;
    }
    if (row.action_type === 'rdv' && typeof window.go === 'function') {
      window.go('rdv');
      return;
    }
    if (row.action_type === 'offres' && typeof window.go === 'function') {
      window.go('offres');
      return;
    }
    if (row.action_type === 'adm' && isAdmin() && typeof window.go === 'function') {
      window.go('adm');
      return;
    }
    openInbox('notifications');
  }

  function notificationCard(row) {
    var unread = !row.read_at;
    var icon = row.category === 'message' ? '✉' : row.category === 'news' ? '✦' :
      row.category === 'alert' ? '!' : row.category === 'promotion' ? '◈' : '•';
    return '<button type="button" class="mal-notification-item' + (unread ? ' unread' : '') +
      '" data-notification-id="' + esc(row.id) + '"><span class="mal-notification-symbol">' + icon +
      '</span><span class="mal-notification-text"><b>' + esc(row.title) + '</b><span>' +
      esc(row.body) + '</span><small>' + esc(dateLabel(row.created_at)) + '</small></span>' +
      (unread ? '<i class="mal-notification-unread-dot" aria-label="Non lu"></i>' : '') + '</button>';
  }

  function renderNotificationList() {
    var rows = inbox.rows.filter(function (row) {
      if (row.category === 'payment') return false;
      return inbox.filter === 'all' || row.category === inbox.filter;
    });
    if (!rows.length) return '<div class="mal-notification-empty"><span>♧</span><b>Aucune notification ici</b><small>Les nouveaux messages, actualités et alertes apparaîtront ici.</small></div>';
    return '<div class="mal-notification-list">' + rows.map(notificationCard).join('') + '</div>';
  }

  function renderPaymentList() {
    var rows = inbox.rows.filter(function (row) { return row.category === 'payment'; });
    return '<div class="mal-notification-list">' +
      (rows.length ? rows.map(notificationCard).join('') : '<div class="mal-notification-empty"><span>◇</span><b>Aucune alerte de paiement</b><small>Les validations et refus apparaîtront ici.</small></div>') +
      '</div><section class="mal-payment-history-wrap"><h3>Mes demandes</h3><div id="malPaymentHistory"><p class="note">Chargement du suivi…</p></div></section>';
  }

  function renderSettings() {
    var html = '<section class="mal-notification-settings"><h3>Préférences</h3>' +
      '<label><input id="malNotifSound" type="checkbox"' + (soundEnabled ? ' checked' : '') + '> Son des notifications</label>' +
      '<label><input id="malNotifVibration" type="checkbox"' + (vibrationEnabled ? ' checked' : '') + '> Vibration sur cet appareil</label>' +
      '<p class="note">Les notifications restent dans ton historique jusqu’à ce que tu les consultes.</p></section>';
    if (isAdmin()) {
      html += '<section class="mal-announcement-composer"><h3>Publier une annonce</h3>' +
        '<label>Type<select id="malAnnouncementCategory"><option value="news">Actualité</option><option value="alert">Alerte importante</option><option value="promotion">Publicité / promotion</option><option value="system">Information générale</option></select></label>' +
        '<label>Titre<input id="malAnnouncementTitle" maxlength="90" placeholder="Titre court"></label>' +
        '<label>Message<textarea id="malAnnouncementBody" maxlength="500" rows="3" placeholder="Un message clair et utile pour les membres…"></textarea></label>' +
        '<button type="button" class="mal-announcement-publish" data-action="publish">Publier aux membres</button><p id="malAnnouncementStatus" class="note" aria-live="polite"></p></section>';
    }
    return html;
  }

  function renderInbox() {
    if (!inbox.drawer) return;
    var tabs = '<div class="mal-notif-tabs">' +
      '<button type="button" data-tab="notifications" class="' + (inbox.tab === 'notifications' ? 'active' : '') + '">Notifications</button>' +
      '<button type="button" data-tab="payments" class="' + (inbox.tab === 'payments' ? 'active' : '') + '">Paiements</button>' +
      '<button type="button" data-tab="settings" class="' + (inbox.tab === 'settings' ? 'active' : '') + '">Préférences</button></div>';
    var body = '';
    if (inbox.tab === 'notifications') {
      body = '<div class="mal-notif-filters">' +
        [['all','Toutes'],['message','Messages'],['news','Actualités'],['alert','Alertes'],['promotion','Publicités'],['system','Infos']].map(function (item) {
          return '<button type="button" data-filter="' + item[0] + '" class="' + (inbox.filter === item[0] ? 'active' : '') + '">' + item[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="mal-notif-toolbar"><span>' + inbox.unread + ' non lue(s)</span><button type="button" data-action="mark-all" ' + (inbox.unread ? '' : 'disabled') + '>Tout marquer comme lu</button></div>' +
        renderNotificationList();
    } else if (inbox.tab === 'payments') {
      body = renderPaymentList();
    } else {
      body = renderSettings();
    }
    inbox.drawer.innerHTML = '<section class="mal-notif-panel" role="dialog" aria-modal="true" aria-label="Menu utilisateur">' +
      '<header class="mal-notif-panel-head"><div><small>MALACHITE · ESPACE MEMBRE</small><h2>' +
      (inbox.tab === 'notifications' ? 'Notifications' : inbox.tab === 'payments' ? 'Paiements' : 'Préférences et aide') +
      '</h2></div><button type="button" data-action="close" aria-label="Fermer">×</button></header>' +
      tabs + '<div class="mal-notif-panel-body">' + body + '</div>' +
      '<footer class="mal-notif-panel-foot"><button type="button" data-action="back-to-site">← Retour au site</button></footer></section>';
    if (inbox.tab === 'payments' && typeof window.loadMyPayments === 'function') {
      window.setTimeout(function () {
        if (inbox.drawer && inbox.tab === 'payments') window.loadMyPayments();
      }, 0);
    }
  }

  function openInbox(tab) {
    if (!currentUser()) return;
    inbox.tab = tab || 'notifications';
    if (!inbox.drawer) {
      var backdrop = document.createElement('div');
      backdrop.className = 'mal-notif-backdrop';
      backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) closeInbox();
      });
      backdrop.addEventListener('click', function (event) {
        var tabButton = event.target.closest('[data-tab]');
        if (tabButton) {
          inbox.tab = tabButton.dataset.tab;
          renderInbox();
          return;
        }
        var filterButton = event.target.closest('[data-filter]');
        if (filterButton) {
          inbox.filter = filterButton.dataset.filter;
          renderInbox();
          return;
        }
        var action = event.target.closest('[data-action]');
        if (action) {
          if (action.dataset.action === 'close') closeInbox();
          if (action.dataset.action === 'back-to-site') { closeInbox(); if (typeof window.go === 'function') window.go('home'); }
          if (action.dataset.action === 'mark-all') markAllRead();
          if (action.dataset.action === 'publish') publishAnnouncement();
          return;
        }
        var item = event.target.closest('[data-notification-id]');
        if (item) openNotification(item.dataset.notificationId);
      });
      backdrop.addEventListener('change', function (event) {
        if (event.target.id === 'malNotifSound') {
          soundEnabled = !!event.target.checked;
          localStorage.setItem('mal-notif-sound', soundEnabled ? 'on' : 'off');
        }
        if (event.target.id === 'malNotifVibration') {
          vibrationEnabled = !!event.target.checked;
          localStorage.setItem('mal-notif-vibration', vibrationEnabled ? 'on' : 'off');
        }
      });
      document.body.appendChild(backdrop);
      inbox.drawer = backdrop;
    }
    renderInbox();
    refreshInbox(false);
  }

  function closeInbox() {
    if (inbox.drawer) inbox.drawer.remove();
    inbox.drawer = null;
  }

  async function markAllRead() {
    var user = currentUser();
    if (!user || !inbox.unread) return;
    var stamp = new Date().toISOString();
    var result = await window.sb.from('user_notifications')
      .update({ read_at: stamp })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (result.error) {
      alert('Impossible de mettre à jour les notifications : ' + result.error.message);
      return;
    }
    inbox.rows.forEach(function (row) { if (!row.read_at) row.read_at = stamp; });
    inbox.unread = 0;
    updateBell();
    renderInbox();
  }

  async function publishAnnouncement() {
    var category = document.getElementById('malAnnouncementCategory');
    var title = document.getElementById('malAnnouncementTitle');
    var body = document.getElementById('malAnnouncementBody');
    var status = document.getElementById('malAnnouncementStatus');
    if (!category || !title || !body || !status) return;
    var t = title.value.trim(), b = body.value.trim();
    if (t.length < 3 || b.length < 5) {
      status.textContent = 'Ajoute un titre et un message un peu plus précis.';
      return;
    }
    var button = inbox.drawer.querySelector('[data-action="publish"]');
    if (button) { button.disabled = true; button.textContent = 'Publication…'; }
    try {
      var key = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'notice-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
      var result = await window.sb.rpc('publish_user_announcement', {
        p_category: category.value,
        p_title: t,
        p_body: b,
        p_dedupe_key: key
      });
      if (result.error) throw result.error;
      status.textContent = (Number(result.data) || 0) + ' membre(s) notifié(s).';
      title.value = '';
      body.value = '';
    } catch (error) {
      status.textContent = 'Publication impossible : ' + (error && error.message ? error.message : 'erreur inconnue');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Publier aux membres'; }
    }
  }

  function syncChatViewport() {
    var root = document.querySelector('body.mal-chat-mode main#v');
    if (!root) return;
    var viewport = window.visualViewport;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    root.style.height = Math.max(260, Math.round(height)) + 'px';
    root.style.maxHeight = Math.max(260, Math.round(height)) + 'px';
    root.style.paddingBottom = '0px';
  }

  function enhancePortraits() {
    var urls = [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=360&h=440&fit=crop&crop=faces',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=360&h=440&fit=crop&crop=faces',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=360&h=440&fit=crop&crop=faces',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=360&h=440&fit=crop&crop=faces'
    ];
    var strip = document.querySelector('.mal-discover-photo-strip');
    if (strip && !strip.dataset.malUxExpanded) {
      strip.dataset.malUxExpanded = '1';
      urls.forEach(function (url, index) {
        var img = document.createElement('img');
        img.src = url;
        img.alt = 'Portrait de membre, photo d’illustration';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'mal-portrait-motion';
        img.style.animationDelay = (index * 0.7) + 's';
        strip.appendChild(img);
      });
      strip.querySelectorAll('img').forEach(function (img, index) {
        img.classList.add('mal-portrait-motion');
        img.style.animationDelay = (index * 0.7) + 's';
      });
    }
    var signup = document.querySelector('.mal-signup-photos');
    if (signup && !signup.dataset.malUxExpanded) {
      signup.dataset.malUxExpanded = '1';
      urls.slice(0, 2).forEach(function (url, index) {
        var img = document.createElement('img');
        img.src = url;
        img.alt = 'Portrait de personne, photo d’illustration';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'mal-portrait-motion';
        img.style.animationDelay = (index * 0.8) + 's';
        signup.appendChild(img);
      });
      signup.classList.add('mal-signup-photos-expanded');
      signup.querySelectorAll('img').forEach(function (img, index) {
        img.classList.add('mal-portrait-motion');
        img.style.animationDelay = (index * 0.8) + 's';
      });
    }
  }

  function injectStyles() {
    if (document.getElementById('mal-member-experience-style')) return;
    var style = document.createElement('style');
    style.id = 'mal-member-experience-style';
    style.textContent = [
      'header{position:relative}.mal-user-menu-trigger{position:absolute;right:16px;top:14px;z-index:30;display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #ffffff75;border-radius:999px;background:#ffffff20;color:#fff;font-size:12px;font-weight:750;backdrop-filter:blur(10px)}',
      '.mal-user-menu-icon{font-size:16px;line-height:1}.mal-notif-badge{min-width:19px;height:19px;padding:0 5px;border-radius:99px;background:#fff;color:#d81b60;font-size:11px;font-weight:850;display:inline-flex;align-items:center;justify-content:center}.mal-notif-badge[hidden]{display:none}',
      '.mal-notif-backdrop{position:fixed;inset:0;z-index:100000;background:#17091480;display:flex;justify-content:flex-end;align-items:stretch;padding:0}',
      '.mal-notif-panel{width:min(100%,470px);height:100%;background:#fff;color:#3a1224;display:flex;flex-direction:column;box-shadow:-12px 0 40px #260b1830;animation:malPanelIn .22s ease-out}',
      '@keyframes malPanelIn{from{transform:translateX(22px);opacity:.65}to{transform:none;opacity:1}}',
      '.mal-notif-panel-head{display:flex;align-items:center;justify-content:space-between;padding:calc(18px + env(safe-area-inset-top,0px)) 18px 13px;background:linear-gradient(135deg,#e6195e,#ff4f8b);color:#fff}',
      '.mal-notif-panel-head small{font-size:9px;letter-spacing:.15em;font-weight:800;opacity:.85}.mal-notif-panel-head h2{font:600 25px Fraunces,Georgia,serif;margin:4px 0 0}.mal-notif-panel-head button{width:38px;height:38px;border-radius:50%;background:#ffffff25;color:#fff;font-size:25px;padding:0}',
      '.mal-notif-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:10px 12px;border-bottom:1px solid #f2d9e2}.mal-notif-tabs button{padding:10px 5px;border-radius:12px;background:#fff5f8;color:#80566a;font-size:12px;font-weight:750}.mal-notif-tabs button.active{background:#e6195e;color:#fff}',
      '.mal-notif-panel-body{flex:1;min-height:0;overflow:auto;padding:12px 14px calc(24px + env(safe-area-inset-bottom,0px));overscroll-behavior:contain}',
      '.mal-notif-panel-foot{padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #f2d9e2;background:#fff}.mal-notif-panel-foot button{width:100%;padding:12px 14px;border-radius:12px;background:#fff3f7;color:#9b315e;font-weight:800;border:1px solid #f2c8d8}',
      '.mal-notification-target-message{outline:3px solid #e6195e!important;box-shadow:0 0 0 6px #e6195e22!important;transition:outline .2s ease}',
      '.mal-notif-filters{display:flex;gap:6px;overflow:auto;padding:2px 0 9px;scrollbar-width:none}.mal-notif-filters button{white-space:nowrap;border:1px solid #f1d4df;border-radius:99px;padding:7px 10px;background:#fff;color:#765265;font-size:11px}.mal-notif-filters button.active{background:#ffe3ee;border-color:#e6195e;color:#a51349;font-weight:800}',
      '.mal-notif-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0 10px;color:#806574;font-size:12px}.mal-notif-toolbar button{background:none;color:#c2185b;font-size:11px;padding:5px}',
      '.mal-notification-list{display:grid;gap:8px}.mal-notification-item{width:100%;display:flex;align-items:flex-start;gap:10px;text-align:left;padding:12px;border:1px solid #f0d9e2;border-radius:15px;background:#fff;color:#3a1224}.mal-notification-item.unread{background:#fff7fa;border-color:#eeb9cc}.mal-notification-symbol{width:31px;height:31px;flex:none;border-radius:11px;background:#ffe3ee;color:#d81b60;display:grid;place-items:center;font-weight:850}.mal-notification-text{min-width:0;flex:1;display:grid;gap:4px}.mal-notification-text b{font-size:13px}.mal-notification-text span{font-size:12px;line-height:1.4;color:#725263}.mal-notification-text small{font-size:10px;color:#9b7c8a}.mal-notification-unread-dot{width:8px;height:8px;flex:none;margin-top:5px;border-radius:50%;background:#e6195e}',
      '.mal-notification-empty{min-height:190px;display:grid;align-content:center;justify-items:center;gap:7px;text-align:center;color:#79576a}.mal-notification-empty>span{font-size:32px;color:#e6195e}.mal-notification-empty b{font-size:14px}.mal-notification-empty small{font-size:12px;max-width:250px}',
      '.mal-payment-history-wrap{margin-top:18px;padding-top:12px;border-top:1px solid #f0d9e2}.mal-payment-history-wrap h3{font-size:15px;margin:0 0 8px}',
      '.mal-notification-settings,.mal-announcement-composer{display:grid;gap:12px;padding:14px;border:1px solid #f0d9e2;border-radius:16px;margin-bottom:12px}.mal-notification-settings h3,.mal-announcement-composer h3{font-size:15px;margin:0}.mal-notification-settings label{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600}.mal-notification-settings input{width:18px;height:18px;accent-color:#e6195e}.mal-announcement-composer label{display:grid;gap:5px;font-size:12px;font-weight:700}.mal-announcement-composer input,.mal-announcement-composer textarea,.mal-announcement-composer select{width:100%;border:1px solid #ecd2dc;border-radius:11px;padding:11px;background:#fff;color:#3a1224}.mal-announcement-publish{background:#e6195e;color:#fff;border-radius:12px;padding:12px;font-weight:800}',
      '.mal-user-notice-toast{position:fixed;z-index:100001;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:10px;text-align:left;padding:13px;border:1px solid #edbfd0;border-radius:16px;background:#fff;color:#3a1224;box-shadow:0 12px 35px #3b0d2025;animation:malPanelIn .2s ease-out}.mal-user-notice-icon{color:#e6195e}.mal-user-notice-copy{flex:1;min-width:0;display:grid;gap:3px}.mal-user-notice-copy b{font-size:13px}.mal-user-notice-copy small{font-size:11px;color:#79576a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.mal-user-notice-action{color:#c2185b;font-size:12px;font-weight:800}',
      '.mal-offer-wizard{display:grid;gap:12px}.mal-offer-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.mal-offer-intro h2{margin:4px 0;font-size:21px}.mal-offer-intro p{font-size:12px;color:#805f70;margin:0}.mal-offer-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.mal-offer-steps button{border-radius:10px;padding:9px 5px;background:#fff3f7;color:#82566b;font-size:11px;font-weight:750}.mal-offer-steps button.active{background:#e6195e;color:#fff}.mal-offer-grid{display:grid;gap:9px}.mal-offer-card{border:1px solid #f0d4df;border-radius:16px;padding:13px;background:#fff}.mal-offer-card.featured{border:2px solid #e6195e;background:linear-gradient(140deg,#fff,#fff5f8)}.mal-offer-card h3{display:flex;justify-content:space-between;gap:8px;margin:0;font-size:15px}.mal-offer-card p{margin:5px 0 0;font-size:12px;color:#78586a;line-height:1.4}.mal-offer-card .price{white-space:nowrap;color:#c2185b;font-weight:850}.mal-offer-next{width:100%;background:#e6195e;color:#fff;padding:13px;border-radius:13px;font-weight:800}.mal-offer-back{background:#fff0f5;color:#9f2453;padding:10px 14px;border-radius:12px}.mal-offer-table{width:100%;border-collapse:collapse;font-size:12px}.mal-offer-table th,.mal-offer-table td{padding:9px 6px;border-bottom:1px solid #f2dce4;text-align:left}.mal-offer-table th{color:#87596f;font-size:11px}.mal-offer-table td:last-child{text-align:center;font-weight:800}.mal-offer-table .yes{color:#15945d}.mal-offer-table .no{color:#b7a4ad}.mal-offer-pay{display:grid;gap:11px}.mal-offer-pay h3{margin:0;font-size:15px}.mal-offer-pay .note{font-size:11px}.mal-offer-pay .wall{margin:0}',
      '.mal-discover-photo-strip img.mal-portrait-motion,.mal-signup-photos img.mal-portrait-motion{animation:malPortraitDrift 13s ease-in-out infinite alternate;will-change:transform}.mal-discover-photo-strip img.mal-portrait-motion:nth-child(2n){animation-duration:16s}.mal-discover-photo-strip img.mal-portrait-motion:nth-child(3n){animation-delay:-4s}@keyframes malPortraitDrift{from{transform:scale(1) translateY(0)}to{transform:scale(1.08) translateY(-3px)}}.mal-signup-photos-expanded{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.mal-signup-photos-expanded img{width:100%;height:82px;object-fit:cover;border-radius:12px}',
      'body.mal-chat-mode main#v{height:var(--mal-chat-vh,100dvh)!important;max-height:var(--mal-chat-vh,100dvh)!important;padding-bottom:0!important;min-height:0!important}',
      'body.mal-chat-mode .chat{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important}',
      'body.mal-chat-mode .sendbar{position:relative!important;bottom:auto!important;left:auto!important;right:auto!important;flex:0 0 auto!important;margin-top:0!important;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px))!important;z-index:20!important}',
      '@media(max-width:420px){.mal-user-menu-trigger{right:10px;top:10px;padding:8px 10px}.mal-user-menu-label{display:none}.mal-notif-panel-head h2{font-size:22px}.mal-signup-photos-expanded img{height:68px}}',
      '@media(prefers-reduced-motion:reduce){.mal-portrait-motion,.mal-notif-panel,.mal-user-notice-toast{animation:none!important;transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  window.malSetPaymentNumber = function () {
    var selector = document.getElementById('malOperator');
    var target = document.getElementById('malPayNumber');
    if (!selector || !target) return;
    var orange = selector.value === 'orange';
    var number = orange ? (window.ORANGE || '') : (window.NUM || '');
    target.textContent = (orange ? 'Orange Money : ' : 'Airtel Money : ') + (number || 'Numéro non configuré');
  };

  window.malSetOfferPage = function (page) {
    offerPage = Math.max(1, Math.min(3, Number(page) || 1));
    if (typeof window.draw === 'function') window.draw(true);
    if (offerPage === 3 && typeof window.loadMyPayments === 'function') window.setTimeout(window.loadMyPayments, 0);
  };

  function renderOffers() {
    if (typeof window.refreshOfferPremiumStatus === 'function') window.refreshOfferPremiumStatus();
    var user = currentUser();
    var status = window.st && user && window.st[user.id] ? window.st[user.id] : {};
    var premiumActive = !!(status.premium_until && new Date(status.premium_until).getTime() > Date.now());
    var airtel = window.NUM || '';
    var orange = window.ORANGE || '';
    var steps = '<div class="mal-offer-steps">' +
      [1, 2, 3].map(function (page) {
        var label = page === 1 ? 'Découvrir' : page === 2 ? 'Comparer' : 'Souscrire';
        return '<button type="button" class="' + (offerPage === page ? 'active' : '') + '" onclick="malSetOfferPage(' + page + ')">' + page + '. ' + label + '</button>';
      }).join('') + '</div>';
    var intro = '<div class="mal-offer-intro"><div><span class="ml-auth-kicker">MALACHITE · OFFRES</span><h2>' +
      (offerPage === 1 ? 'Choisis ton expérience.' : offerPage === 2 ? 'Compare en un coup d’œil.' : 'Finalise ton paiement.') +
      '</h2><p>' + (offerPage === 1 ? 'Des avantages simples, sans texte inutile.' : offerPage === 2 ? 'Les différences essentielles entre les offres.' : 'Envoie ton paiement et conserve ta référence.') + '</p></div></div>';
    var body = '';
    if (offerPage === 1) {
      body = '<div class="mal-offer-grid">' +
        '<article class="mal-offer-card"><h3>Gratuit <span class="price">0 USD</span></h3><p>Découvrir, aimer et discuter avec tes matchs.</p></article>' +
        '<article class="mal-offer-card featured"><h3>Premium <span class="price">2 USD / 30 jours</span></h3><p>Messages sans quota, rendez-vous illimités et appels audio/vidéo inclus.</p></article>' +
        '<article class="mal-offer-card"><h3>Boost <span class="price">0,50 USD / 24 h</span></h3><p>Ton profil remonte en priorité dans Découvrir.</p></article>' +
        '<article class="mal-offer-card"><h3>Déblocage contact <span class="price">1 USD</span></h3><p>Accès aux coordonnées après un match réciproque. Inclus avec Premium.</p></article>' +
        (premiumActive ? '<article class="mal-offer-card"><h3>Appels audio et vidéo</h3><p>Déjà inclus dans ton Premium actif.</p></article>' : '<article class="mal-offer-card"><h3>Pass Appels <span class="price">1 USD / 7 jours</span></h3><p>Appels audio et vidéo avec tes matchs pendant 7 jours.</p></article>') +
        '</div><button type="button" class="mal-offer-next" onclick="malSetOfferPage(2)">Comparer les avantages →</button>';
    } else if (offerPage === 2) {
      body = '<div class="mal-offer-card"><table class="mal-offer-table"><thead><tr><th>Avantage</th><th>Gratuit</th><th>Premium</th></tr></thead><tbody>' +
        '<tr><td>Découvrir et aimer</td><td class="yes">✓</td><td class="yes">✓</td></tr>' +
        '<tr><td>Nouvelles conversations</td><td>15 / jour</td><td class="yes">Illimitées</td></tr>' +
        '<tr><td>Rendez-vous</td><td>1 / semaine</td><td class="yes">Illimités</td></tr>' +
        '<tr><td>Appels audio et vidéo</td><td class="no">Pass séparé</td><td class="yes">Inclus</td></tr>' +
        '<tr><td>Boost de visibilité</td><td>Option payante</td><td>Option payante</td></tr>' +
        '</tbody></table></div><div class="mal-offer-card"><h3>Options à la carte</h3><p>Boost : 0,50 USD / 24 h · Contact : 1 USD / personne · Pass Appels : 1 USD / 7 jours (inutile avec Premium actif).</p></div>' +
        '<button type="button" class="mal-offer-next" onclick="malSetOfferPage(3)">Choisir et payer →</button>';
    } else {
      var callOption = premiumActive ? '' : '<option value="Appels">Pass Appels — 1 USD / 7 jours</option>';
      body = '<div class="mal-offer-pay"><div class="mal-offer-card"><h3>Numéro destinataire</h3>' +
        '<p id="malPayNumber">Airtel Money : ' + (airtel ? esc(airtel) : 'Numéro non configuré') + '</p>' +
        '<p class="note">Le numéro change selon le réseau choisi.</p>' +
        '</div><div class="box list"><label>Offre<select id="of"><option value="Premium">Premium — 2 USD / 30 jours</option>' + callOption +
        '<option value="Boost">Boost — 0,50 USD / 24 h</option></select></label>' +
        '<label>Moyen de paiement<select id="malOperator" onchange="malSetPaymentNumber()"><option value="airtel">Airtel Money</option><option value="orange">Orange Money</option></select></label>' +
        '<p class="note">Effectue le transfert au numéro affiché, puis saisis la référence exacte du SMS et joins le reçu.</p>' +
        '<label>Référence du transfert<input id="cd" maxlength="100" autocomplete="off" placeholder="Référence exacte du SMS"></label>' +
        '<label>Preuve de paiement — photo ou capture du message de confirmation<input id="malReceipt" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="note">Après avoir effectué le paiement, envoyez-nous une photo du message de confirmation reçu par SMS ou une capture d’écran de ce message. Veillez à ce que le message et les informations du paiement soient bien lisibles. C’est tout : envoyez simplement cette image (JPEG, PNG ou WebP · 5 Mo maximum).</p>' +
        '<button class="b1 big" id="malSubmitPayment" type="button" onclick="pay()">Soumettre ma demande</button>' +
        '<div class="note" id="pm" aria-live="polite">Activation après vérification du paiement.</div></div>' +
        '<section id="malPaymentHistory"><h3>Suivi de mes demandes</h3><p class="note">Chargement…</p></section></div>';
    }
    return '<section class="mal-offer-wizard">' + intro + steps + body +
      (offerPage > 1 ? '<button type="button" class="mal-offer-back" onclick="malSetOfferPage(' + (offerPage - 1) + ')">← Retour</button>' : '') +
      '</section>';
  }
  window.offres = renderOffers;

  var oldDraw = window.draw;
  if (typeof oldDraw === 'function') {
    window.draw = function () {
      var result = oldDraw.apply(this, arguments);
      ensureBell();
      injectStyles();
      enhancePortraits();
      if (document.body.classList.contains('mal-chat-mode')) syncChatViewport();
      else {
        var root = document.querySelector('main#v');
        if (root) { root.style.removeProperty('height'); root.style.removeProperty('max-height'); root.style.removeProperty('padding-bottom'); }
      }
      return result;
    };
  }

  var oldGo = window.go;
  if (typeof oldGo === 'function') {
    window.go = function (tab) {
      if (tab === 'offres') offerPage = 1;
      return oldGo.apply(this, arguments);
    };
  }

  var oldSub = window.sub;
  if (typeof oldSub === 'function') {
    window.sub = function () {
      var result = oldSub.apply(this, arguments);
      window.setTimeout(function () { refreshInbox(false); if (pendingNotificationId || pendingNotificationsPanel) processNotificationDeepLink(); }, 0);
      return result;
    };
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncChatViewport);
    window.visualViewport.addEventListener('scroll', syncChatViewport);
  }
  window.addEventListener('resize', syncChatViewport);
  document.addEventListener('focusin', function (event) {
    if (event.target && event.target.id === 'mi') window.setTimeout(syncChatViewport, 80);
  });
  document.addEventListener('focusout', function (event) {
    if (event.target && event.target.id === 'mi') window.setTimeout(syncChatViewport, 120);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeInbox();
  });

  injectStyles();
  ensureBell();
  enhancePortraits();
  if (currentUser()) refreshInbox();
  var pendingNotificationId = new URLSearchParams(window.location.search).get('openNotification');
  var pendingNotificationsPanel = new URLSearchParams(window.location.search).has('openNotifications');
  async function processNotificationDeepLink() {
    if (!currentUser()) return;
    if (pendingNotificationId) {
      await refreshInbox(true);
      await openNotification(pendingNotificationId);
      pendingNotificationId = null;
      try { var clean = new URL(window.location.href); clean.searchParams.delete('openNotification'); window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash); } catch (_) {}
    } else if (pendingNotificationsPanel) {
      openInbox('notifications');
      pendingNotificationsPanel = false;
    }
  }
  window.malProcessNotificationDeepLink = processNotificationDeepLink;
  if (currentUser()) window.setTimeout(processNotificationDeepLink, 250);
})();