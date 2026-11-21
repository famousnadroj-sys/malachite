(function(){
"use strict";
var MAL_VAPID_PUBLIC_KEY="BGrzSJVFp8ZHIBud7THK0M-B6rwifY0kbB6nJFR2uTfPHvx4OSqfVJLFyee9jgg7_Wwff3SWQq4w-_cQOjnKfcc";
function b64ToBytes(value){
 var pad="=".repeat((4-value.length%4)%4),raw=atob((value+pad).replace(/-/g,"+").replace(/_/g,"/"));
 var out=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
}
function setStatus(message){var el=document.getElementById("malPushStatus");if(el)el.textContent=message;}
window.malEnableAdminPush=async function(){
 if(!window.me||!window.ADM||window.me.email!==window.ADM){alert("Connexion administrateur requise.");return;}
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){alert("Ce navigateur ne prend pas en charge les notifications push. Utilise Chrome et installe Malachite sur l’écran d’accueil.");return;}
 try{
  var permission=Notification.permission;
  if(permission!=="granted")permission=await Notification.requestPermission();
  if(permission!=="granted"){setStatus("Notifications non autorisées. Autorise-les dans les paramètres du navigateur.");return;}
  var registration=await navigator.serviceWorker.register("./sw.js");
  await navigator.serviceWorker.ready;
  var subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(MAL_VAPID_PUBLIC_KEY)});
  var result=await window.sb.functions.invoke("malachite-admin-push",{body:{action:"subscribe",subscription:subscription.toJSON(),device_label:(navigator.userAgent||"Appareil").slice(0,80)}});
  if(result.error||!result.data||!result.data.ok)throw new Error((result.data&&result.data.error)||result.error&&result.error.message||"Enregistrement impossible");
  setStatus("Alertes activées sur cet appareil. Connecte-toi au même compte administrateur sur tes autres appareils et active-les aussi.");
  alert("Alertes Malachite activées sur cet appareil.");
 }catch(error){console.error("Activation push Malachite",error);setStatus("Activation impossible : "+(error.message||"erreur temporaire")+". Réessaie après avoir vérifié la connexion.");}
};
window.malRefreshAdminPushStatus=async function(){
 if(!window.me||!window.ADM||window.me.email!==window.ADM)return;
 try{
  var result=await window.sb.functions.invoke("malachite-admin-push",{body:{action:"status"}});
  if(!result.error&&result.data&&result.data.ok){
   var count=result.data.registered_devices||0;
   setStatus(count+" appareil(s) connecté(s) aux alertes push. Pour ajouter cet appareil, appuie sur « Activer les alertes ici ».");
  }
 }catch(error){console.warn("État des alertes push indisponible",error);}
};
window.malDisableAdminPush=async function(){
 if(!window.me||!window.ADM||window.me.email!==window.ADM){alert("Connexion administrateur requise.");return;}
 try{
  var registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();
  if(!subscription){setStatus("Aucun abonnement push actif sur cet appareil.");return;}
  var result=await window.sb.functions.invoke("malachite-admin-push",{body:{action:"unsubscribe",endpoint:subscription.endpoint}});
  if(result.error||!result.data||!result.data.ok)throw new Error((result.data&&result.data.error)||"Désactivation impossible");
  await subscription.unsubscribe();
  setStatus("Alertes désactivées sur cet appareil uniquement.");
 }catch(error){console.error("Désactivation push Malachite",error);setStatus("Impossible de désactiver : "+(error.message||"erreur temporaire"));}
};
})();