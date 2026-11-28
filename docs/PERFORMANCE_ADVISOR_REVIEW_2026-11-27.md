# Malachite — revue performance et santé Supabase (27 novembre 2026)

## Résultat

- Production : **18 index signalés inutilisés** par l'Advisor.
- Staging : **22 index signalés inutilisés**.
- Advisor santé : **aucun finding** sur les deux projets.
- Aucun index supprimé, aucune table modifiée et aucun réglage de performance changé.

## Pourquoi aucun index n'a été supprimé

Les projets sont récents et le trafic observé reste insuffisant pour conclure qu'un index est inutile. Les index sur les paiements, messages, notifications, rendez-vous, signalements, suspensions, actions admin, Match et ledger financier peuvent être nécessaires lors de requêtes métier ou de volumes futurs. Un compteur d'utilisation à zéro ne prouve pas une absence d'utilité, notamment après redémarrage/reset des statistiques ou avant l'exécution du parcours correspondant.

Toute suppression exigerait :
1. confirmer que l'index n'est pas requis par une contrainte, une FK, une politique RLS ou un parcours métier;
2. analyser les requêtes réelles et `EXPLAIN (ANALYZE, BUFFERS)` sur une copie représentative;
3. vérifier les performances après suppression en staging avec données représentatives;
4. conserver un script de recréation et appliquer uniquement après approbation.

## Production — 18 index signalés

- Notifications : `user_notifications_related_payment_idx`, `user_notifications_unread_user_idx`, `user_notifications_related_message_idx`, `user_notifications_related_user_idx`
- Support : `demandes_support_user_id_idx`, `demandes_support_traite_par_idx`
- Signalements : `signalements_statut_created_idx`, `signalements_traite_par_idx`
- Paiements : `paiements_operator_code_normalized_idx`
- Suspensions / administration : `suspensions_par_idx`, `admin_actions_created_idx`, `admin_actions_admin_idx`
- Rendez-vous : `rendez_vous_a_idx`, `rendez_vous_de_idx`
- Campagnes : `campagnes_cree_par_idx`
- Finance / Match / parrainage : `founder_finance_ledger_event_currency_idx`, `match_daily_like_events_target_id_idx`, `malachite_referrals_referrer_created_idx`

## Staging — 22 index signalés

`admin_actions_created_idx`, `ai_ops_runs_started_at_idx`, `ai_ops_runs_status_started_at_idx`, `campagnes_publication_idx`, `messages_a_created_idx`, `messages_created_at_desc_idx`, `paiements_operator_code_normalized_idx`, `paiements_user_entitlement_idx`, `signalements_statut_created_idx`, `user_notifications_related_message_idx`, `user_notifications_related_payment_idx`, `user_notifications_unread_user_idx`, `match_daily_like_events_target_day_idx`, `founder_finance_ledger_occurred_at_idx`, `founder_finance_ledger_status_currency_idx`, `founder_finance_ledger_event_type_idx`, `founder_finance_ledger_occurred_status_idx`, `founder_finance_ledger_event_currency_idx`, `admin_actions_cible_idx`, `conversation_pair_index_member_high_idx`, `messages_sender_id_idx`, `conversation_pair_index_conversation_idx`.

## Décision

Aucune optimisation destructive n'est justifiée par ces seuls Advisor findings. Garder les index, collecter du trafic représentatif, puis réexaminer avec des plans de requête réels. Le projet reste sans finding Advisor santé au snapshot du 27 novembre 2026.


## Recontrôle production en lecture seule — 28 novembre 2026, 13:01 UTC

- Advisor performance : toujours 18 index non utilisés signalés. Le constat est cohérent avec le snapshot précédent; aucune suppression n'a été faite, car le site n'a pas encore un trafic représentatif et ces index peuvent servir aux parcours admin, paiement, support et Match.
- Advisor santé : aucun finding santé signalé lors du contrôle.
- Les index de campagnes restent à traiter avec prudence : les campagnes sont retirées du périmètre de lancement, mais aucune suppression d'index n'est nécessaire pour sécuriser le lancement.
- Action retenue : conserver les index, mesurer les requêtes après lancement contrôlé et n'envisager une suppression qu'après analyse de plans `EXPLAIN (ANALYZE, BUFFERS)` et sauvegarde restaurable.
- Contrôle strictement en lecture seule; aucune modification de production.
