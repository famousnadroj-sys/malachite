# Audit de sécurité Malachite — 18 novembre 2026

## Périmètre examiné
- Dépôt GitHub : `famousnadroj-sys/malachite`
- Branche de production observée : `main`
- Projet Supabase : `tscsmemsvgacqioncash`
- Fichiers examinés : `index.html`, `sw.js`
- Schéma examiné : tables publiques, colonnes, contraintes, politiques RLS, fonctions SECURITY DEFINER, déclencheurs, bucket Storage, Security Advisor et Performance Advisor.

## État de référence
- Commit de production observé au début de l'audit : `0491156daf13f6e7caa6d1e3411f1792981b8b7e`
- SHA initial de `index.html` : `349929b298a92f01daf96ee93fc46d0ebb22398b`
- SHA initial de `sw.js` : `c42f0b9e96f80c61306694cfb75a963d120ca89f`
- Une branche de sauvegarde a été créée : `backup/pre-audit-2026-11-18`.
- Les modifications préparées sont isolées dans `fix/security-hardening`; aucune mise à jour de `main` ni déploiement n'a été effectué.

## Constats confirmés

### Sécurité / RLS
- RLS est activé sur les 11 tables publiques examinées.
- Les rôles `anon` et `authenticated` possèdent des privilèges SQL de table trop larges (notamment des privilèges DML et TRUNCATE au niveau des ACL). L'absence de policy RLS bloque de nombreuses opérations via PostgREST, mais les privilèges SQL doivent tout de même être réduits.
- Sept fonctions SECURITY DEFINER sont exécutables par `anon` et `authenticated` selon le Security Advisor : `contact_de`, `est_match`, `est_premium`, `limite_messages`, `limite_rdv`, `rls_auto_enable`, `traiter_paiement`.
- Les fonctions utilisent un search_path fixé, mais les droits EXECUTE doivent être limités selon leur usage.
- Le Security Advisor signale aussi la protection contre les mots de passe compromis désactivée.

### Signalements
- La table `signalements` existe et accepte l'insertion par un utilisateur connecté si `de = auth.uid()`.
- Aucune policy de lecture ni de traitement par l'administrateur n'était présente.
- Le frontend utilisait un motif fixe `signalé` et affichait un succès sans vérifier le résultat de l'insertion.

### Blocage
- La table `deblocages` est utilisée par l'achat de déblocage de contact ; elle ne doit pas être réutilisée comme liste de blocage.
- Aucun système de blocage mutuel n'était présent dans le frontend ou le schéma.

### Fichiers et médias
- Le bucket `photos` est public, sans limite de taille ni liste MIME autorisée.
- Le même bucket sert aux photos de profil, aux images de chat et aux messages vocaux. Le rendre privé ou limiter son MIME aux seules images casserait des fonctions existantes. Une migration séparée des médias privés est nécessaire avant tout changement de visibilité.

### Autres risques à traiter
- L'administration frontend est affichée selon une comparaison d'e-mail ; les contrôles serveur doivent rester l'autorité.
- La fonction `traiter_paiement` contrôle l'e-mail administrateur, mais ne rejette pas explicitement une valeur `offre` inconnue avant de marquer le paiement comme validé. À corriger après vérification des offres et des données existantes.
- Le code annonce 15 messages gratuits par jour, tandis que le trigger SQL observé applique une limite de 5.
- Les appels vidéo utilisent des salons Jitsi construits de manière prévisible, sans jeton d'accès observé dans le code. Ce n'est pas une preuve qu'un tiers a rejoint un appel, mais l'accès doit être repensé avant un lancement public.
- Le frontend charge `profiles.select('*')`, qui expose aussi `prefs` et `prompts` aux utilisateurs autorisés à lire les profils. Il faut décider si les préférences de recherche doivent être privées.

## Corrections préparées sur la branche isolée
- Demande de motif de signalement et vérification des erreurs d'insertion.
- Vue Admin pour consulter les signalements et les marquer examinés / classés sans suite.
- Table séparée `blocages`, policies RLS, fonction de liste personnelle des blocages et vérification mutuelle.
- Filtrage des profils et conversations bloqués dans le frontend.
- Réduction des privilèges anonymes, retrait des privilèges TRUNCATE/REFERENCES/TRIGGER des utilisateurs connectés et limitation de l'exécution des fonctions SECURITY DEFINER.

## Ce qui n'a PAS été fait
- Aucune migration SQL appliquée à Supabase.
- Aucun changement dans la branche `main`.
- Aucun déploiement GitHub Pages.
- Aucun paiement, profil ou message modifié.
- Aucun test de bout en bout exécuté sur des comptes réels.

## Validation obligatoire avant production
1. Créer une copie de staging de la base Supabase et y restaurer un jeu de données non sensible.
2. Appliquer les migrations sur staging uniquement.
3. Tester deux comptes ordinaires, un compte bloqué dans chaque sens et le compte administrateur.
4. Vérifier inscription, connexion, découverte, likes, messages, médias, rendez-vous, paiements de test et signalements.
5. Corriger les risques restants (paiements, médias privés, appels, confidentialité des préférences).
6. Refaire Security Advisor et Performance Advisor.
7. N'envisager le merge vers `main` qu'après réussite des tests et validation explicite du propriétaire.

