# Malachite AI Manager

## État technique

- Interface présente dans le panneau administrateur.
- Edge Function Supabase `malachite-ai-manager` déployée avec vérification JWT activée.
- L'accès est validé côté serveur par `private.is_admin()`, via un RPC public en `SECURITY INVOKER`.
- Le modèle ne reçoit que le texte explicitement saisi par l'administrateur.
- Aucun accès aux profils, messages privés, paiements ou actions de modération n'est accordé au modèle.
- Les réponses sont consultatives ; les actions sensibles restent manuelles.
- La table `public.ai_manager_audit` conserve les tailles des entrées/sorties, le modèle et l'heure, pas le contenu des prompts ou réponses.
- Limite côté fonction : 10 appels par minute et par administrateur (sur la base des appels réussis).

## Activation du fournisseur

Le fournisseur actuellement câblé est Google Gemini. La fonction utilise le modèle `gemini-2.5-flash` par défaut.

Dans Supabase Dashboard → Edge Functions → Secrets, définir :

- `GEMINI_API_KEY` : clé API Gemini créée dans Google AI Studio.
- `MALACHITE_AI_MODEL` : facultatif ; modèle Gemini compatible choisi et vérifié.

Ne jamais placer la clé dans `index.html`, dans un fichier JavaScript public, dans GitHub ou dans une conversation. Ne pas activer une offre payante sans vérifier les quotas, tarifs et conditions du compte Google. Tant que `GEMINI_API_KEY` n'est pas défini, la fonction répond volontairement `ai_provider_not_configured` et ne simule aucune réponse.

## Test de validation après configuration

1. Se connecter avec le compte administrateur autorisé.
2. Ouvrir Admin → Malachite AI Manager.
3. Envoyer une demande non sensible (ex. « Résume les contrôles à faire avant une ouverture »).
4. Vérifier qu'une réponse réelle est reçue.
5. Vérifier que `public.ai_manager_audit` reçoit uniquement une ligne de métadonnées.
6. Tester un compte non administrateur : il doit recevoir 403.
7. Tester sans session : la vérification JWT doit refuser la requête.

Ne pas utiliser de vraies données personnelles, messages privés, codes OTP ou justificatifs dans les prompts.
