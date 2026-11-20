# Malachite AI Manager

## Fonctionnalités en place

- Interface d'administration responsive, avec conversation et raccourcis de tâches.
- Tableau d'indicateurs agrégés alimenté directement depuis Supabase : membres, nouvelles inscriptions sur 7 jours, Premium actifs, paiements en attente, signalements nouveaux, support ouvert et suspensions.
- Conseils automatiques transparents fondés sur ces indicateurs, même lorsque le fournisseur IA n'est pas encore configuré.
- L'assistant peut recevoir les 8 derniers messages de la conversation active pour conserver le contexte pendant la session. Ces prompts ne sont pas enregistrés en base.
- L'Edge Function vérifie le JWT puis l'autorisation administrateur côté serveur. Le modèle ne reçoit que le texte saisi et des indicateurs agrégés.
- Aucune lecture de conversations privées, justificatifs, profils individuels ou secrets. Aucune action de paiement, suspension ou modification n'est exécutée par le modèle.
- Journal d'audit minimal : modèle, date, longueur de l'entrée et de la réponse. Pas de contenu de conversation.
- Limite : 10 réponses IA par minute et par administrateur.

## Activation du moteur de réponse

Le fournisseur câblé est Google Gemini, modèle par défaut `gemini-2.5-flash`.

Dans Supabase Dashboard → Edge Functions → Secrets, définir :

- `GEMINI_API_KEY` : clé Gemini créée dans Google AI Studio.
- `MALACHITE_AI_MODEL` : facultatif ; identifiant du modèle Gemini disponible dans le compte.

Ne jamais placer la clé dans le navigateur, GitHub ou une conversation. Vérifier les quotas et tarifs Google avant d'utiliser une offre payante. Tant que `GEMINI_API_KEY` est absent, le tableau d'indicateurs et les conseils automatiques fonctionnent, mais les réponses génératives restent désactivées et l'interface l'indique explicitement.

## Vérifications

1. Se connecter avec le compte administrateur autorisé.
2. Ouvrir Admin → Malachite AI Manager.
3. Vérifier le tableau d'indicateurs et son heure d'actualisation.
4. Configurer le secret, puis envoyer une question non sensible.
5. Tester un compte non administrateur : réponse 403.
6. Tester sans session : JWT refusé.
7. Vérifier que `public.ai_manager_audit` ne contient que les métadonnées attendues.

Ne jamais saisir de mots de passe, OTP, coordonnées privées, conversations ou justificatifs de paiement dans les prompts.
