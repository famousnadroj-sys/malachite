# MALACHITE — Conditions de déverrouillage du lancement

Ce document définit les contrôles humains obligatoires avant d'autoriser la publication publique. Les variables GitHub Actions suivantes doivent rester absentes ou à `false` tant que les preuves ci-dessous ne sont pas disponibles :

- `MALACHITE_DB_SECURITY_READY=true` : uniquement après application et vérification des migrations de sécurité de profil et de pause des paiements sur la base de production.
- `MALACHITE_LAUNCH_APPROVED=true` : uniquement après validation de tous les points produit, juridique, opérationnels et de récupération ci-dessous.

## 1. Base de données et sécurité

- [ ] Migrations de profil appliquées : `save_my_profile` en SECURITY DEFINER, `search_path` vide, écritures directes retirées, RPC avatar/préférences vérifiées.
- [ ] Paiements fermés tant que le numéro dédié et les tarifs ne sont pas confirmés ; la table `config` n'est pas lisible par les rôles clients.
- [ ] Tests RLS et tests de non-régression passés sur un environnement de test représentatif.
- [ ] Sauvegarde de production vérifiée et restauration réelle testée avant changement.
- [ ] Plan de suppression de compte finalisé, testé et cohérent avec la conservation des messages, reçus, médias et signalements.

## 2. Inscription et sécurité des membres

- [ ] Confirmer le mode d'inscription définitif. Le code actuel implémente e-mail/mot de passe. Un parcours e-mail/mot de passe + Google avait été proposé, mais l'acceptation finale de Google n'est pas établie. Aucune exigence Malachite confirmée de téléphone + SMS n'a été retrouvée ; ne pas la déduire du projet RArs.
- [ ] Si Google est choisi : configurer OAuth, URL de redirection, consentement et tests réels. Si un autre mode est choisi, le spécifier et le tester avant lancement.
- [ ] Confirmer la règle 18+ et décider si l'auto-déclaration d'âge est suffisante ou si un contrôle supplémentaire est nécessaire.
- [ ] Tester récupération de compte, changement de téléphone/e-mail, sessions, déconnexion et révocation.

## 3. Juridique, modération et confidentialité

- [ ] Conditions d'utilisation et politique de confidentialité relues et approuvées pour les pays réellement ciblés, avec conseil juridique compétent.
- [ ] Règles de conservation et suppression des données documentées.
- [ ] Signalement, blocage, suspension, recours et accès administrateur testés.
- [ ] Les administrateurs n'ont pas d'accès général aux messages privés sans procédure autorisée et auditée.
- [ ] Procédure d'incident et contact de support opérationnel.

## 4. Paiements et appels

- [ ] Nouvelle SIM Airtel Money dédiée reçue et titulaire/récupération vérifiés ; aucun ancien numéro ne doit être réutilisé sans confirmation explicite.
- [ ] Prix Premium et Boost approuvés par le propriétaire, durée et avantages alignés sur le code.
- [ ] Procédure de vérification des paiements et des reçus testée de bout en bout.
- [ ] Fournisseur d'appels sécurisé configuré et testé si les appels sont annoncés comme disponibles. Le code actuel garde `SECURE_JITSI_PROVIDER_READY=false`, charge l'API publique `meet.jit.si` uniquement derrière ce verrou et ne contient pas d'Edge Function de jeton JaaS vérifiée. Il faut implémenter et tester le backend de jetons avant toute activation. Sinon, conserver les appels désactivés et ne pas vendre le Pass Appels.

## 5. Publication et exploitation

- [ ] URL publique définitive approuvée : domaine personnalisé vérifié ou acceptation explicite de l'URL GitHub Pages.
- [ ] HTTPS, redirections, sitemap, robots.txt, page 404 et prévisualisation isolée vérifiés.
- [ ] Tests réels sur Android, navigateurs mobiles et ordinateur.
- [ ] Journalisation, alertes, quotas, coûts et procédure de retour arrière vérifiés.
- [ ] CI complète verte sur la branche destinée à `main`.
- [ ] Le smoke test de l'artefact de publication passe avant toute publication.

**Règle :** ne jamais définir les variables de déploiement pour faire passer un workflow. Elles attestent que les contrôles ont été effectués ; elles ne remplacent pas les contrôles.
