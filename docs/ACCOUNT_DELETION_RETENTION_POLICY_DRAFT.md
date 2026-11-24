# Politique de conservation lors de la suppression d'un compte — projet à valider

**Statut :** document de conception interne, non publié comme engagement juridique et non validé par un avocat.  
**Périmètre :** demandes de suppression de compte MALACHITE.  
**Aucune suppression de données n'est autorisée par ce document.**

## 1. Principe retenu

Lorsqu'un compte est supprimé, MALACHITE doit supprimer ou anonymiser les données personnelles qui ne sont plus nécessaires. Une donnée ne peut être conservée après la suppression du compte que si une finalité précise et une base juridique valable justifient cette conservation, notamment une obligation comptable, fiscale, réglementaire ou la gestion d'un litige.

La conservation d'une pièce de paiement ne justifie pas de conserver automatiquement le profil, les messages, les photos, les identifiants de connexion ou l'ensemble du dossier utilisateur.

## 2. Règles par catégorie

| Catégorie | Traitement prévu après suppression | Condition / point à valider |
|---|---|---|
| Profil, bio, préférences, photos et médias personnels | Suppression, sous réserve des copies techniquement nécessaires à la sécurité de l'opération | Vérifier l'appartenance de chaque objet Storage avant suppression |
| Identifiants, sessions et jetons | Révocation puis suppression selon la procédure technique | Réauthentification récente et révocation avant suppression Auth |
| Messages et rendez-vous | Politique distincte à définir : suppression, anonymisation ou conservation limitée | Examiner les droits des autres participants, les signalements et les litiges ; ne pas effacer les données d'un autre utilisateur |
| Avis, likes et signalements | Supprimer ou anonymiser les identifiants de l'ancien compte lorsque possible | Préserver uniquement les éléments nécessaires à un dossier de sécurité ou de litige, avec accès restreint et durée définie |
| Paiements, remboursements, commissions et reçus | Conserver uniquement les enregistrements et justificatifs réellement nécessaires ; séparer ces archives du compte actif | Identifier le responsable comptable, la nature de chaque pièce, la base juridique, le délai et le point de départ |
| Journaux de sécurité et audit | Conserver un minimum d'informations non sensibles si nécessaire à la preuve et à la sécurité | Durée courte et documentée ; éviter les copies de contenu privé |
| Sauvegardes | Laisser expirer les sauvegardes selon un calendrier documenté ; empêcher la restauration de réintroduire un compte supprimé | Procédure de propagation des suppressions et registre des demandes |

## 3. Référence juridique à confirmer

- Le Code du numérique de la RDC, ordonnance-loi n° 23/010 du 13 mars 2023, prévoit à l'article 193 que les données personnelles identifiantes ne sont conservées que pendant la durée nécessaire aux finalités, sous réserve des exceptions légales prévues.
- L'article 194 impose des données adéquates, pertinentes et non excessives.
- L'article 205 précise que, lorsque les finalités du traitement n'exigent plus l'identification, le responsable n'est pas tenu de conserver, d'obtenir ou de traiter des informations supplémentaires permettant d'identifier la personne uniquement pour appliquer les dispositions du titre. Ce n'est pas, à lui seul, un article général imposant ou organisant l'effacement des données.
- L'Acte uniforme OHADA relatif au droit comptable et à l'information financière (AUDCIF), article 24, prévoit une conservation de dix ans pour les livres comptables et pièces justificatives. Cette durée ne doit pas être étendue automatiquement à tout document ou à tout fichier de paiement : il faut déterminer si la pièce concernée constitue effectivement une pièce justificative comptable et si MALACHITE/l'entité exploitante entre dans le champ applicable.

## 4. Mesures techniques obligatoires avant mise en production

1. Créer un inventaire des données par table, bucket, fournisseur et finalité.
2. Définir pour chaque catégorie : responsable, base juridique, durée, point de départ, accès autorisés et méthode de fin de conservation.
3. Isoler les archives comptables des données de compte ; chiffrer les pièces et limiter l'accès au personnel autorisé.
4. Remplacer les identifiants directs par un identifiant d'archive ou une référence comptable lorsque cela suffit ; conserver une table de correspondance uniquement si elle est indispensable et autorisée.
5. Rendre la procédure idempotente et journaliser l'opération sans recopier de données sensibles.
6. Tester avec des comptes et fichiers synthétiques ; prouver qu'aucune donnée d'un autre utilisateur n'est supprimée.
7. Ne supprimer l'utilisateur Auth qu'après traitement des dépendances, des fichiers vérifiés et des archives nécessaires.
8. Prévoir les sauvegardes, les restaurations, les demandes de réexamen et les obligations légales de conservation.

## 5. Points bloquants à faire valider avant toute activation

- Statut juridique et comptable de l'exploitant de MALACHITE.
- Qualification des reçus, preuves Airtel Money, relevés de prestataires, remboursements et historiques de commissions.
- Durées applicables aux données de paiement, à la lutte contre la fraude, aux litiges et aux journaux de sécurité.
- Obligations de déclaration/autorisation et transferts internationaux de données.
- Sort des messages et contenus partagés avec d'autres utilisateurs.
- Durée et comportement des sauvegardes.

## 6. Interdictions explicites

- Ne pas conserver toutes les données « au cas où ».
- Ne pas supprimer aveuglément les tables de paiement ou les justificatifs comptables.
- Ne pas conserver un profil complet au seul motif qu'une transaction existe.
- Ne pas supprimer des fichiers Storage sans vérifier leur propriétaire.
- Ne pas exécuter de suppression de compte en production tant que les règles ci-dessus ne sont pas validées et que les tests de non-régression ne sont pas réussis.

## Sources de travail

- Code du numérique RDC, ordonnance-loi n° 23/010 du 13 mars 2023, notamment articles 193, 194 et 205 : https://res.cloudinary.com/dnrljxeuv/image/upload/v1794726522/Code_du_Numerique_RDC_MEN_vjtquy.pdf
- OHADA, Acte uniforme relatif au droit comptable et à l'information financière (AUDCIF), adopté le 26 janvier 2017 : https://www.ohada.org/actes-uniformes/
- Article 24 AUDCIF (texte consultable) : https://www.droit-afrique.com/uploads/OHADA-Acte-uniforme-2017-droit-comptable-information-financiere.pdf

**À faire relire par un juriste et un professionnel comptable en RDC avant publication de la politique utilisateur ou activation de la suppression de compte.**
