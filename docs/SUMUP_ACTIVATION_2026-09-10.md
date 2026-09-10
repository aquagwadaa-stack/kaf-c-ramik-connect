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

Le commit cartes cadeaux a8137b1 a ete synchronise dans Lovable avant le second bloc. Fonction sumup-checkout redeployee et giftCardPaymentsEnabled active cote serveur. Sur le site public, le bouton Payer 35 EUR est actif apres saisie des champs requis, sans soumission. Le serveur rejette correctement un montant de 19 EUR.

## Acomptes et reservation le jour meme

- Duree minimale avant reservation configurable en heures, par defaut 0. L'ancien blocage la veille a 18h est remplace dans le formulaire, les reglages et la base. Les horaires passes restent interdits.
- Test interface locale : a 0h les prochains creneaux du jour sont proposes ; a 3h les horaires trop proches sont retires. Reglage remis a 0 apres test.
- Cadence de 30 minutes, occupation de 180 minutes, seuil de 8 personnes et acompte de 100 EUR preserves.
- Acompte API seulement apres acceptation admin, via un checkout individuel. Reference stable contre les doubles clics. Le retour client reverifie SumUp.
- Paiement verifie : montant, devise, marchand, reference et association a la reservation. Confirmation atomique et email final automatiques. Une annulation n'est jamais reactivee par un paiement : alerte de remboursement a verifier.
- L'enregistrement manuel reste disponible pour les anciens liens generiques et paiements sur place.
- Ancienne expiration des groupes impayes 35 minutes apres creation trouvee dans private.expire_kafe_unpaid_reservations : retiree. Elle ne correspond pas au parcours acceptation puis paiement. La liberation pour absence apres l'heure d'arrivee reste intacte.
- SQL teste dans une transaction annulee : creation a moins de 24h, delai de 3h, paiement avant validation bloque, activation portail apres acceptation, confirmation apres paiement, rejeu, paiement apres annulation et suppression du timeout de 35 minutes.
- 23 tests metier, 4 auth/import, 18 emails, 5 etats de paiement plus controles du checkout et des cartes cadeaux. Aucun message reel ni debit.

La publication frontend reste reservee a Louis. Le premier paiement reel et la reception effective de son PDF/email restent a constater avec une transaction autorisee.
