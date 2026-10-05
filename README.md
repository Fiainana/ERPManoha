# ERPManoha

ERP Angular 22 pour Manoha Énergie — authentification + shell (sidebar / topbar) branchés sur **ManohaEnergieAPI**.

## Palette

Rouge `#DC2626` / `#991B1B` et blanc — UI pro Manoha Énergie.

## Démarrage

```bash
git clone https://github.com/Fiainana/ERPManoha.git
cd ERPManoha
npm install
ng serve
```

http://localhost:4200 → `/login` puis shell protégé.

## Menu & rôles

| Menu | Sous-menus | Rôles |
|------|------------|-------|
| Tableau de bord | — | Tous authentifiés |
| Articles | — | Admin, Commercial, Vendeur, Rayon, Caisse, Depot, Recouvrement |
| **Vente** | Clients | Admin, Commercial, Recouvrement |
| | Devis | Admin, Commercial |
| | Factures | Admin, Commercial |
| | Demandes devis import | Admin, Commercial |
| **Achat** | Fournisseurs | Admin |
| | Demandes d'achat | Admin, Commercial |
| | BC Achat | Admin, Depot |
| | BL / Réceptions | Admin, Depot |
| | Factures achat | Admin |
| **Dépôt** | Bons de retour | Admin, Depot |
| | BC Achat (réception) | Admin, Depot |
| | Inventaire | Admin, Depot |
| | Mouvements de stock | Admin, Depot |
| | Factures retour | Admin, Depot |
| Recouvrement | — | Admin, Recouvrement |
| Utilisateurs | — | Admin |

Hors scope volontaire : **comptoir** et **borne impression** (RFID).

Les menus / sous-menus non autorisés **ne s'affichent pas**. Les routes sont aussi protégées par `roleGuard`.

## Structure

```
src/app/
  core/
    navigation/nav.config.ts   # source de vérité menu + rôles
    services/navigation.service.ts
    services/auth.service.ts
    guards/auth.guard.ts
    interceptors/auth.interceptor.ts
  layout/                      # sidebar + topbar
  features/                    # pages placeholder (titres seulement)
  shared/components/
```

## API

Base : `https://api.manoha-energie.online/api`  
Auth : `POST /api/auth/login` `{ login, password }`
