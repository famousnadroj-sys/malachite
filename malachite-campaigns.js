/* Malachite sponsored campaigns — first-party ads only, no paid ad network. */
(function () {
  "use strict";
  if (window.__malCampaignsLoaded) return;
  window.__malCampaignsLoaded = true;

  function el(id) { return document.getElementById(id); }
  function escCampaign(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function imageUrl(path) {
    if (!path || !window.sb) return "";
    return window.sb.storage.from("malachite-campaigns").getPublicUrl(path).data.publicUrl;
  }
  function campaignRows() { return Array.isArray(window.malCampaignRows) ? window.malCampaignRows : []; }

  window.campaignsAdmin = function () {
    var rows = campaignRows();
    return '<h2>📢 Publicité Malachite</h2>' +
      '<p class="note">Crée des annonces sponsorisées avec image. Elles apparaissent dans Découvrir lorsqu’elles sont actives. Aucun réseau publicitaire payant n’est connecté.</p>' +
      '<div class="card"><input type="hidden" id="malCampaignEditId">' +
      '<label>Titre<input id="malCampaignTitle" maxlength="90" placeholder="Ex. Offre partenaire de la semaine"></label>' +
      '<label>Description<textarea id="malCampaignDescription" maxlength="500" rows="3" placeholder="Présente clairement l’annonce."></textarea></label>' +
      '<label>Lien de destination (facultatif)<input id="malCampaignLink" type="url" maxlength="500" placeholder="https://..."></label>' +
      '<label>Image (JPEG, PNG ou WebP · 1,5 Mo maximum)<input id="malCampaignImage" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
      '<label>Publication<select id="malCampaignStatus"><option value="brouillon">Enregistrer en brouillon</option><option value="active">Publier maintenant</option><option value="pause">En pause</option></select></label>' +
      '<div class="acts"><button class="b1" onclick="malSaveCampaign()">Enregistrer l’annonce</button><button onclick="malResetCampaignForm()">Effacer</button></div>' +
      '<small class="note">Les annonces portent la mention « Sponsorisé ». Utilise uniquement des images et contenus dont tu possèdes les droits.</small></div>' +
      '<h3>Annonces enregistrées (' + rows.length + ')</h3><div class="list">' +
      (rows.length ? rows.map(function (x) {
        return '<article class="card"><img src="' + escCampaign(imageUrl(x.image_path)) + '" alt="" loading="lazy" decoding="async" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px">' +
          '<b>' + escCampaign(x.titre) + '</b><p class="note">' + escCampaign(x.description) + '</p><span class="chip">' + escCampaign(x.statut) + '</span>' +
          '<div class="acts"><button onclick="malEditCampaign(\'' + x.id + '\')">Modifier</button>' +
          (x.statut === "active" ? '<button onclick="malSetCampaignStatus(\'' + x.id + '\',\'pause\')">Mettre en pause</button>' : '<button class="b1" onclick="malSetCampaignStatus(\'' + x.id + '\',\'active\')">Publier</button>') +
          '<button class="err" onclick="malDeleteCampaign(\'' + x.id + '\')">Supprimer</button></div></article>';
      }).join("") : '<p class="note">Aucune annonce enregistrée.</p>') + '</div>';
  };

  window.malResetCampaignForm = function () {
    ["malCampaignEditId", "malCampaignTitle", "malCampaignDescription", "malCampaignLink"].forEach(function (id) {
      var node = el(id); if (node) node.value = "";
    });
    if (el("malCampaignImage")) el("malCampaignImage").value = "";
    if (el("malCampaignStatus")) el("malCampaignStatus").value = "brouillon";
  };

  window.malEditCampaign = function (id) {
    var row = campaignRows().find(function (x) { return x.id === id; });
    if (!row) return;
    el("malCampaignEditId").value = row.id;
    el("malCampaignTitle").value = row.titre;
    el("malCampaignDescription").value = row.description;
    el("malCampaignLink").value = row.lien || "";
    el("malCampaignStatus").value = row.statut;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.malSaveCampaign = async function () {
    if (!window.me || window.me.email !== window.ADM || !window.sb) return;
    var id = el("malCampaignEditId").value;
    var title = el("malCampaignTitle").value.trim();
    var description = el("malCampaignDescription").value.trim();
    var link = el("malCampaignLink").value.trim();
    var file = el("malCampaignImage").files[0];
    var videoFile = el("malCampaignVideo") && el("malCampaignVideo").files[0];
    var mediaType = el("malCampaignMediaType") ? el("malCampaignMediaType").value : "image";
    var duration = el("malCampaignDuration") ? Number(el("malCampaignDuration").value) : null;
    var status = el("malCampaignStatus").value;
    if (title.length < 3 || description.length < 5) { alert("Ajoute un titre (3 caractères minimum) et une description (5 minimum)."); return; }
    if (link && !/^https?:\/\//i.test(link)) { alert("Le lien doit commencer par https:// ou http://"); return; }
    if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 1572864)) {
      alert("Image refusée : JPEG, PNG ou WebP de 1,5 Mo maximum."); return;
    }
    var old = campaignRows().find(function (x) { return x.id === id; });
    var path = old ? old.image_path : null;
    var videoPath = old ? old.video_path : null;
    var uploaded = null, uploadedVideo = null;
    if (!old && !file) { alert("Crée d’abord une affiche qui servira de couverture."); return; }
    if (mediaType === "video" && !videoFile && !(old && old.video_path)) { alert("Crée la vidéo avant de publier."); return; }
    if (videoFile && (videoFile.type !== "video/webm" || videoFile.size > 20971520)) { alert("Vidéo refusée : WebM de 20 Mo maximum."); return; }
    var saveButton = document.querySelector("#malCampaignTitle") && document.querySelector("#malCampaignTitle").closest(".card").querySelector(".b1");
    if (saveButton) saveButton.disabled = true;
    try {
      if (file) {
        var ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        path = window.me.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
        var upload = await window.sb.storage.from("malachite-campaigns").upload(path, file, {
          contentType: file.type, cacheControl: "3600", upsert: false
        });
        if (upload.error) throw upload.error;
        uploaded = path;
      }
      if (videoFile) {
        videoPath = window.me.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".webm";
        var videoUpload = await window.sb.storage.from("malachite-campaign-media").upload(videoPath, videoFile, { contentType: "video/webm", cacheControl: "3600", upsert: false });
        if (videoUpload.error) throw videoUpload.error;
        uploadedVideo = videoPath;
      }
      var payload = { titre: title, description: description, lien: link || null, image_path: path, video_path: videoPath, media_type: mediaType, duration_seconds: mediaType === "video" ? duration : null, audio_enabled: mediaType === "video", placement: "discover_top", statut: status, updated_at: new Date().toISOString() };
      var result = id
        ? await window.sb.from("campagnes").update(payload).eq("id", id).select("id").maybeSingle()
        : await window.sb.from("campagnes").insert(Object.assign({ cree_par: window.me.id }, payload)).select("id").single();
      if (result.error) throw result.error;
      if (old && uploaded && old.image_path) await window.sb.storage.from("malachite-campaigns").remove([old.image_path]);
      if (old && uploadedVideo && old.video_path) await window.sb.storage.from("malachite-campaign-media").remove([old.video_path]);
      window.malResetCampaignForm();
      await window.loadAdm();
      if (typeof window.toast === "function") window.toast("Annonce enregistrée.");
      else alert("Annonce enregistrée.");
    } catch (error) {
      if (uploaded) await window.sb.storage.from("malachite-campaigns").remove([uploaded]);
      if (uploadedVideo) await window.sb.storage.from("malachite-campaign-media").remove([uploadedVideo]);
      alert("Enregistrement impossible : " + (error.message || "erreur inconnue"));
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  };

  window.malSetCampaignStatus = async function (id, status) {
    if (!window.me || window.me.email !== window.ADM) return;
    var result = await window.sb.from("campagnes").update({ statut: status, updated_at: new Date().toISOString() }).eq("id", id);
    if (result.error) { alert("Modification impossible : " + result.error.message); return; }
    await window.loadAdm();
  };

  window.malDeleteCampaign = async function (id) {
    if (!window.me || window.me.email !== window.ADM || !confirm("Supprimer cette annonce et son image ?")) return;
    var row = campaignRows().find(function (x) { return x.id === id; });
    var result = await window.sb.from("campagnes").delete().eq("id", id);
    if (result.error) { alert("Suppression impossible : " + result.error.message); return; }
    if (row && row.image_path) {
      var removed = await window.sb.storage.from("malachite-campaigns").remove([row.image_path]);
      if (removed.error) console.warn("Image de campagne non supprimée", removed.error);
    }
    if (row && row.video_path) {
      var videoRemoved = await window.sb.storage.from("malachite-campaign-media").remove([row.video_path]);
      if (videoRemoved.error) console.warn("Vidéo de campagne non supprimée", videoRemoved.error);
    }
    await window.loadAdm();
  };

  window.malActiveCampaigns = [];
  window.loadPublicCampaigns = async function () {
    if (!window.me || !window.sb) return;
    var now = new Date().toISOString();
    var result = await window.sb.from("campagnes")
      .select("id,titre,description,image_path,video_path,media_type,duration_seconds,audio_enabled,lien")
      .eq("statut", "active").lte("debut", now)
      .or("fin.is.null,fin.gt." + now)
      .order("created_at", { ascending: false }).limit(1);
    if (result.error) { console.warn("Annonces sponsorisées indisponibles", result.error); return; }
    window.malActiveCampaigns = (result.data || []).map(function (x) {
      return Object.assign({}, x, { image_url: imageUrl(x.image_path), video_url: x.video_path ? window.sb.storage.from("malachite-campaign-media").getPublicUrl(x.video_path).data.publicUrl : "" });
    });
    if (window.tab === "home" && typeof window.draw === "function") window.draw(true);
  };

  var campaignStyle = document.createElement("style");
  campaignStyle.textContent = ".mal-sponsored-section{margin:16px 0 25px}.mal-sponsored-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.mal-sponsored-card{position:relative;overflow:hidden;border:1px solid #f0d8e2;border-radius:18px;background:#fff;box-shadow:0 8px 22px rgba(70,20,42,.06)}.mal-sponsored-card>img{display:block;width:100%;height:155px;object-fit:cover}.mal-sponsored-label{position:absolute;z-index:1;top:10px;left:10px;padding:5px 8px;border-radius:99px;background:#fff;color:#873451;font-size:9px;font-weight:900;letter-spacing:.08em}.mal-sponsored-copy{padding:13px}.mal-sponsored-copy b{font-size:15px}.mal-sponsored-copy p{font-size:12px;color:#806775;line-height:1.5}.mal-sponsored-copy a{font-size:12px;font-weight:800;color:#b62c60}.mal-sponsored-card>img{transform-origin:center;animation:malCampaignMotion 16s ease-in-out infinite alternate}.mal-sponsored-card:after{content:'';position:absolute;inset:0 0 auto;height:155px;pointer-events:none;background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.22) 48%,transparent 70%);background-size:220% 100%;animation:malCampaignShine 7s ease-in-out infinite}.mal-sponsored-label{box-shadow:0 3px 12px rgba(0,0,0,.12)}@keyframes malCampaignMotion{from{transform:scale(1)}to{transform:scale(1.09)}}@keyframes malCampaignShine{0%,35%{background-position:150% 0}75%,100%{background-position:-150% 0}}@media(prefers-reduced-motion:reduce){.mal-sponsored-card,.mal-sponsored-card>img,.mal-sponsored-card:after{animation:none!important;scroll-behavior:auto}}";
  document.head.appendChild(campaignStyle);

  window.malPublicCampaignMarkup = function () {
    var rows = window.malActiveCampaigns || [];
    if (!rows.length) return "";
    return '<section class="mal-sponsored-section"><div class="mal-discover-section-head"><div><span class="ml-auth-kicker">À DÉCOUVRIR</span><h2>Partenaires</h2></div></div><div class="mal-sponsored-list">' +
      rows.map(function (x) {
        return '<article class="mal-sponsored-card"><div class="mal-sponsored-label">SPONSORISÉ</div>' + (x.media_type === 'video' && x.video_url ? '<video src="' + escCampaign(x.video_url) + '" poster="' + escCampaign(x.image_url) + '" muted autoplay playsinline controls preload="none" aria-label="Vidéo publicitaire, active le son si tu le souhaites" style="display:block;width:100%;max-height:360px;object-fit:cover;background:#171d45"></video>' : '<img src="' + escCampaign(x.image_url) + '" alt="" loading="lazy" decoding="async">') + '<div class="mal-sponsored-copy"><b>' +
          escCampaign(x.titre) + '</b><p>' + escCampaign(x.description) + '</p>' +
          (x.lien ? '<a href="' + escCampaign(x.lien) + '" target="_blank" rel="noopener noreferrer">En savoir plus ↗</a>' : "") +
          '</div></article>';
      }).join("") + '</div></section>';
  };
})();