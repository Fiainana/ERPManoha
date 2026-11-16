# ERPManoha

ERP Angular 22 de Manoha Énergie, branché sur **ManohaEnergieAPI** (Sage 100).
Production : https://erp.manoha-energie.online — API : https://api.manoha-energie.online/api

## Palette

Rouge `#DC2626` / `#991B1B` et blanc — UI pro Manoha Énergie.

## Démarrage

```bash
git clone https://github.com/Fiainana/ERPManoha.git
cd ERPManoha
npm install
ng serve
```

http://localhost:4200 → `/login` puis shell protégé. L'URL de l'API est dans `src/environments/environment.ts`
(laisser l'adresse de production dans les commits).

## Menu & rôles

Source de vérité : `src/app/core/navigation/nav.config.ts`. Un menu ou un sous-menu non autorisé ne s'affiche
pas, et les routes sont aussi protégées par `roleGuard`.

| Section | Menu | Sous-menus | Rôles |
|---------|------|------------|-------|
| Pilotage | Tableau de bord | — | Tous |
| | Rapports | États de vente (comptoir, B2B, consolidé), journal de caisse, rapport par e-mail | Admin |
| | Analytique | Synthèse, magasin, marketing, articles, familles, clients, fournisseurs, commerciaux | Admin |
| Commercial | Caisse | Clôture du jour, historique des clôtures | Admin, Caisse |
| | Ventes | Clients | Admin, Commercial, Recouvrement |
| | | Devis, factures | Admin, Commercial |
| | | Objectifs CA | Admin |
| | Achats | Demandes d'achat, préparations, bons de commande, bons de livraison, factures fournisseurs, fournisseurs | Admin, Achat |
| Stock & dépôt | Articles | — | Admin, Commercial, Vendeur, Rayon, Caisse, Depot, Recouvrement |
| | Dépôt | Réception des commandes, bons de retour, factures de retour, inventaire, mouvements de stock | Admin, Depot |
| Comptabilité | Immobilisations | Fiches, dotations, écritures, état annuel, contrôles, catégories, historique | Admin, Compta |
| Ressources humaines | Ressources humaines | Tableau de bord, employés, congés & absences, pointeuse, référentiels | Admin, HR |
| | | Mes congés, planning des repos | Tous (planning en lecture seule hors HR / Planning) |
| | | Présence | Admin, HR, Planning |
| | | Paie, paramètres de paie | Admin |
| Administration | Utilisateurs, Suivi GPS, Paramètres | — | Admin |

Accueil d'un compte qui n'a qu'un de ces rôles : `HR` → `/rh`, `Compta` → `/immo`, `Achat` → `/achats`,
`Planning` → `/rh/planning`.

Hors de cette application : **comptoir** (prise de commande et caisse) et **borne d'impression** (RFID).
L'application de comptage de l'inventaire complet est servie par l'API (`/inventaire/`).

## Structure

```
src/app/
  core/
    navigation/nav.config.ts     # menu + rôles
    navigation/mise-a-jour.ts    # recharge la page si un écran manque après une mise à jour
    services/                    # un service par module (achats, analyse, caisse, rh…)
    models/                      # types des réponses de l'API
    guards/auth.guard.ts         # authGuard, roleGuard, accueilGuard
    interceptors/auth.interceptor.ts
  layout/                        # sidebar, topbar, barre de chargement de navigation
  features/                      # un dossier par module, écrans chargés à la demande
  shared/components/
```

## Conventions d'interface

- Pas de phrase d'explication sous le titre d'un écran ; un sous-titre n'affiche qu'une donnée (date, client, période).
- Aucun terme technique à l'écran (API, serveur, base, noms de tables ou colonnes Sage, clés de paramètres).
- Montants en ariary, dates `dd/MM/yyyy`, signaux Angular et composants autonomes.

## Déploiement

`deploy/deploy-erp.ps1` : build de production, envoi sur le serveur nginx (192.168.0.236) et bascule.
Le script garde les fichiers JS/CSS des versions des 30 derniers jours, pour qu'un onglet ouvert avant la
mise à jour puisse encore ouvrir les écrans ; le front recharge de lui-même la page si un fichier manque.
