# MALACHITE — dossier préalable de confidentialité et conditions

**Statut : BROUILLON INTERNE — NE PAS PUBLIER COMME TEXTE JURIDIQUE FINAL**  
**Version de travail : 24 novembre 2026**  
**Périmètre : site de rencontres MALACHITE, RDC / Lubumbashi**

Ce document prépare la rédaction des pages publiques. Il ne constitue ni un avis juridique ni une déclaration de conformité. Les champs non vérifiés doivent être confirmés avant publication et avant l'ouverture générale.

## 1. Faits techniques déjà établis dans l'audit du projet

- Le site public est hébergé via GitHub Pages.
- Le projet utilise Supabase pour l'authentification, la base de données et des fonctions serveur.
- Les appels audio/vidéo utilisent actuellement Jitsi Meet public (`meet.jit.si`).
- Les paiements ne sont pas automatisés par un prestataire de paiement : les preuves sont examinées manuellement par l'administration.
- Le stockage des justificatifs de paiement utilise un bucket privé avec accès contrôlé.
- Les seules offres payantes prévues au lancement sont Premium, Boost et Pass Appels. L'utilisateur a confirmé le Pass Appels à 1 USD par semaine et le principe selon lequel Premium inclut les appels (sans achat séparé du Pass Appels).
- Les montants et durées exacts de Premium et Boost ne sont pas explicitement approuvés ; les valeurs 2 USD / 30 jours et 0,50 USD / 24 h présentes dans le code ne doivent pas être présentées comme définitives.
- Aucun déverrouillage payant de contact, publicité ou sponsoring n'est prévu au lancement.

Ces faits doivent être revalidés à chaque changement technique.

## 2. Informations à confirmer avant la politique de confidentialité

Ne pas publier de promesses sur les durées, les lieux d'hébergement, les transferts ou les suppressions avant vérification.

- [ ] Identité juridique exacte de l'éditeur/responsable du traitement : nom légal, adresse de contact professionnelle et pays d'établissement.
- [ ] Adresse e-mail dédiée aux demandes de confidentialité et à l'assistance.
- [ ] Données effectivement collectées à l'inscription : numéro de téléphone, nom de compte, identifiants, âge/date de naissance, etc.
- [ ] Données de profil : photos, biographie, préférences, localisation et champs facultatifs réellement présents.
- [ ] Données générées : likes, matchs, messages, appels, signalements, blocages, journaux techniques et données anti-fraude.
- [ ] Données de paiement : preuve, montant, référence, numéro ou identifiant de transaction, personne chargée de la vérification.
- [ ] Finalités et base juridique de chaque catégorie de données.
- [ ] Durée de conservation de chaque catégorie et procédure de suppression des sauvegardes.
- [ ] Localisation des projets Supabase, sauvegardes et sous-traitants ; transferts éventuels hors RDC.
- [ ] Données transmises à Jitsi pendant les appels et métadonnées conservées par Jitsi.
- [ ] Fonctionnement réel des cookies, analytics, journaux et service workers.
- [ ] Procédure de demande d'accès, rectification, opposition, effacement et réclamation.
- [ ] Procédure de réponse à une violation de données.
- [ ] Vérification des formalités applicables auprès de l'autorité compétente en RDC.
- Le code d'inscription bloque actuellement les moins de 18 ans et la base possède une contrainte `profiles.age >= 18`. Toutefois, `profiles.age` accepte `NULL`, la fonction `save_my_profile` ne vérifie `profile_age` que lorsqu'il est fourni et la projection d'un profil privé met l'âge public à `NULL`. Le contrôle serveur n'est donc pas robuste contre l'omission de l'âge ; corriger et tester tous les chemins d'écriture avant lancement.
- [ ] Faire confirmer juridiquement l'âge minimum de 18 ans et vérifier les mesures de prévention adaptées.

## 3. Plan de rédaction de la politique de confidentialité

La version publique devra expliquer en langage clair :

1. Qui exploite MALACHITE et comment le contacter.
2. Quelles données sont collectées, lesquelles sont facultatives et lesquelles sont nécessaires.
3. Pourquoi chaque donnée est utilisée : compte, profils, mise en relation, messagerie, appels, sécurité, assistance et gestion des offres.
4. Avec quels prestataires les données sont partagées et dans quels pays, après vérification.
5. Comment sont protégés les messages, photos, profils, appels et justificatifs ; ne jamais promettre le chiffrement de bout en bout si ce n'est pas implémenté et audité.
6. Combien de temps les données sont conservées.
7. Comment exercer ses droits et fermer son compte.
8. Comment les signalements, blocages et demandes légales sont traités.
9. Comment les changements de politique sont annoncés.

## 4. Plan des conditions d'utilisation

La version publique devra couvrir :

- Éligibilité et âge minimum, à déterminer après revue juridique et vérification du produit.
- Exactitude des informations de compte et responsabilité de l'utilisateur.
- Respect, consentement, interdiction du harcèlement, menaces, fraude, usurpation et contenus illégaux.
- Règles sur les photos, profils, messages et contenus publiés.
- Fonctionnement des likes, matchs, messages, appels, blocages et signalements, sans garantir une rencontre ou la conduite d'un autre membre.
- Modération : motifs possibles, mesures graduées, suspension, fermeture et mécanisme de contestation.
- Offres commerciales exactes : Premium, Boost et Pass Appels, tarifs, durée, renouvellement ou absence de renouvellement automatique, conditions de remboursement et procédure de contestation. Ces derniers éléments restent à confirmer.
- Limites et dépendances techniques des appels via Jitsi.
- Disponibilité du service, maintenance, suspension et résiliation.
- Propriété intellectuelle et licence limitée nécessaire au fonctionnement du service.
- Limitation de responsabilité rédigée conformément au droit applicable, sans exclure les droits impératifs des consommateurs.
- Droit applicable, règlement des litiges et date d'entrée en vigueur.

## 5. Points bloquants avant publication des pages juridiques

- [ ] Revue par un juriste connaissant le Code du numérique congolais, Ordonnance-loi n° 23/010 du 13 mars 2023.
- [ ] Vérifier le texte officiel et les décisions réglementaires les plus récentes au Journal officiel.
- [ ] Confirmer l'identité de l'éditeur et une adresse de contact réelle.
- [ ] Vérifier les données et flux réels dans Supabase, Jitsi et les autres services.
- [ ] Décider et implémenter la règle d'âge ; ne pas laisser des mineurs accéder à une plateforme de rencontres par simple déclaration non vérifiée sans analyse de risque.
- [ ] Fixer les règles de conservation/suppression et tester la suppression de compte.
- [ ] Vérifier les procédures de signalement, blocage et modération.
- [ ] Confirmer les règles de renouvellement, remboursement et activation des trois offres.
- [ ] Publier les pages seulement après validation et ajouter leur date/version.

## 6. Sources juridiques de départ — à faire vérifier

- Ordonnance-loi n° 23/010 du 13 mars 2023 portant Code du numérique, publiée au Journal officiel (numéro spécial du 10 avril 2023).
- Le texte prévoit notamment un cadre de protection des données personnelles et des obligations applicables aux fournisseurs de services en ligne.
- Les formalités et décisions d'application doivent être vérifiées dans leur version en vigueur à la date de lancement.

Références de travail :
- Journal officiel de la RDC : https://journalofficiel.cd/publication/019ee246-3f63-7028-93fc-377fae3275a5/apercu
- Ministère de l'Économie numérique : https://economienumerique.gouv.cd/mediatheque/documents

---
**Décision opérationnelle :** conserver ce dossier en interne. Ne pas créer de faux contact, ne pas inventer de délais de conservation, ne pas annoncer le chiffrement de bout en bout, et ne pas présenter MALACHITE comme juridiquement conforme avant les vérifications.
