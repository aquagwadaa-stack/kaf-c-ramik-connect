# Activation SumUp, 10 septembre 2026

## Cartes cadeaux (priorite)

- Decision Louis : paiements par API pour les montants libres et formules, envoi PDF au beneficiaire seulement apres paiement verifie.
- Cle publique refusee (401). Cle secrete validee en lecture sur le compte marchand, puis configuree uniquement dans les secrets Cloud avec le code marchand. Aucune cle dans Git.
- Creation d'un checkout technique de 20 EUR chez SumUp reussie, puis desactivation immediate. Aucun paiement, email ou commande client produit par ce controle.
- Verification du montant, de la devise, du marchand et de la reference avant activation d'une carte.
- Confirmation atomique reservee au serveur : pas de retour de paid vers pending, validite conservee lors d'un rejeu, donnees admin preservees.
- Le retour de paiement interroge SumUp si le webhook a du retard. Un echec d'envoi du PDF demande une nouvelle tentative au lieu de donner un faux succes au webhook.
- Etats retour non finalise / verification et bouton d'actualisation disponibles.
- Tests fournisseur/base/email simules, SQL sous rollback, TypeScript, build et 17 tests des emails reussis.
- Aucun paiement reel execute : le debit et la reception effective du PDF restent a constater sur une transaction autorisee.

La publication frontend reste reservee a Louis. Les acomptes et le delai de reservation feront l'objet du bloc suivant, apres synchronisation des cartes cadeaux.
