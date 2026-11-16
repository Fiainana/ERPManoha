import { Routes } from '@angular/router';
import { accueilGuard, authGuard, roleGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { ArticlesPage } from './features/articles/articles.page';
import { ArticleDetailPage } from './features/articles/article-detail.page';
import { ClientsPage } from './features/vente/clients.page';
import { ClientDetailPage } from './features/vente/client-detail.page';
import { ClientFormPage } from './features/vente/client-form.page';
import { DevisPage } from './features/vente/devis.page';
import { DevisDetailPage } from './features/vente/devis-detail.page';
import { DevisFormPage } from './features/vente/devis-form.page';
import { FacturesPage } from './features/vente/factures.page';
import { FactureDetailPage } from './features/vente/facture-detail.page';
import { FournisseursPage } from './features/fournisseurs/fournisseurs.page';
import { FournisseurDetailPage } from './features/fournisseurs/fournisseur-detail.page';
import { FournisseurFormPage } from './features/fournisseurs/fournisseur-form.page';
import { BonsRetourPage } from './features/depot/bons-retour.page';
import { BonRetourDetailPage } from './features/depot/bon-retour-detail.page';
import { BcReceptionPage } from './features/depot/bc-reception.page';
import { BcReceptionDetailPage } from './features/depot/bc-reception-detail.page';
import { InventairePage } from './features/depot/inventaire.page';
import { InventaireDetailPage } from './features/depot/inventaire-detail.page';
import { MouvementsStockPage } from './features/depot/mouvements-stock.page';
import { FacturesRetourPage } from './features/depot/factures-retour.page';
import { FactureRetourDetailPage } from './features/depot/facture-retour-detail.page';
import { UtilisateursPage } from './features/utilisateurs/utilisateurs.page';
import { EtatVentePage } from './features/etat/etat-vente.page';
import { JournalCaissePage } from './features/etat/journal-caisse.page';
import { RapportVenteMailPage } from './features/etat/rapport-vente-mail.page';
import { ObjectifsPage } from './features/etat/objectifs.page';
import { SuiviGpsPage } from './features/suivi-gps/suivi-gps.page';
import { ParametresPage } from './features/parametres/parametres.page';

const ARTICLES_ROLES = [
  'Admin',
  'Commercial',
  'Vendeur',
  'Rayon',
  'Caisse',
  'Depot',
  'Recouvrement',
] as const;

const CLIENTS_ROLES = ['Admin', 'Commercial', 'Recouvrement'] as const;
/** Création / modification de client : mêmes rôles que l'API (POST / PUT b2b/clients). */
const CLIENTS_ECRITURE_ROLES = ['Admin', 'Commercial'] as const;

const DEVIS_ROLES = ['Admin', 'Commercial'] as const;

const FACTURES_ROLES = ['Admin', 'Commercial'] as const;

const DEPOT_ROLES = ['Admin', 'Depot'] as const;

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardPage, pathMatch: 'full', canActivate: [accueilGuard] },

      {
        path: 'articles',
        component: ArticlesPage,
        canActivate: [roleGuard(...ARTICLES_ROLES)],
      },
      {
        path: 'articles/:reference',
        component: ArticleDetailPage,
        canActivate: [roleGuard(...ARTICLES_ROLES)],
      },

      {
        path: 'vente/clients',
        component: ClientsPage,
        canActivate: [roleGuard(...CLIENTS_ROLES)],
      },
      {
        // Avant « :numero », sinon « nouveau » serait lu comme un numéro de client.
        path: 'vente/clients/nouveau',
        component: ClientFormPage,
        canActivate: [roleGuard(...CLIENTS_ECRITURE_ROLES)],
      },
      {
        path: 'vente/clients/:numero/modifier',
        component: ClientFormPage,
        canActivate: [roleGuard(...CLIENTS_ECRITURE_ROLES)],
      },
      {
        path: 'vente/clients/:numero',
        component: ClientDetailPage,
        canActivate: [roleGuard(...CLIENTS_ROLES)],
      },
      {
        path: 'vente/devis',
        component: DevisPage,
        canActivate: [roleGuard(...DEVIS_ROLES)],
      },
      {
        path: 'vente/devis/nouveau',
        component: DevisFormPage,
        canActivate: [roleGuard(...DEVIS_ROLES)],
      },
      {
        // Même formulaire que la création, prérempli avec le devis.
        path: 'vente/devis/:numeroPiece/modifier',
        component: DevisFormPage,
        canActivate: [roleGuard(...DEVIS_ROLES)],
      },
      {
        path: 'vente/devis/:numeroPiece',
        component: DevisDetailPage,
        canActivate: [roleGuard(...DEVIS_ROLES)],
      },
      {
        path: 'vente/factures',
        component: FacturesPage,
        canActivate: [roleGuard(...FACTURES_ROLES)],
      },
      {
        path: 'vente/factures/:numeroPiece',
        component: FactureDetailPage,
        canActivate: [roleGuard(...FACTURES_ROLES)],
      },
      {
        path: 'vente/objectifs',
        component: ObjectifsPage,
        canActivate: [roleGuard('Admin')],
      },

      {
        path: 'etat/comptoir',
        component: EtatVentePage,
        canActivate: [roleGuard('Admin')],
        data: { scope: 'comptoir' },
      },
      {
        path: 'etat/b2b',
        component: EtatVentePage,
        canActivate: [roleGuard('Admin')],
        data: { scope: 'b2b' },
      },
      {
        path: 'etat/tous',
        component: EtatVentePage,
        canActivate: [roleGuard('Admin')],
        data: { scope: 'tous' },
      },
      {
        path: 'etat/journal-caisse',
        component: JournalCaissePage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'etat/rapport-mail',
        component: RapportVenteMailPage,
        canActivate: [roleGuard('Admin')],
      },

      {
        path: 'fournisseurs',
        component: FournisseursPage,
        canActivate: [roleGuard('Admin', 'Achat')],
      },
      {
        path: 'fournisseurs/nouveau',
        component: FournisseurFormPage,
        canActivate: [roleGuard('Admin', 'Achat')],
      },
      {
        path: 'fournisseurs/:numero',
        component: FournisseurDetailPage,
        canActivate: [roleGuard('Admin', 'Achat')],
      },

      {
        path: 'depot/bons-retour',
        component: BonsRetourPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/bons-retour/:numeroPiece',
        component: BonRetourDetailPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/bc-reception',
        component: BcReceptionPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/bc-reception/:numeroPiece',
        component: BcReceptionDetailPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/inventaire',
        component: InventairePage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/inventaire/:id',
        component: InventaireDetailPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/mouvements-stock',
        component: MouvementsStockPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/factures-retour',
        component: FacturesRetourPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },
      {
        path: 'depot/factures-retour/:numeroPiece',
        component: FactureRetourDetailPage,
        canActivate: [roleGuard(...DEPOT_ROLES)],
      },


      {
        path: 'utilisateurs',
        component: UtilisateursPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'suivi-gps',
        component: SuiviGpsPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'parametres',
        component: ParametresPage,
        canActivate: [roleGuard('Admin')],
      },

      {
        path: 'achats',
        canActivate: [roleGuard('Admin', 'Achat')],
        loadChildren: () => import('./features/achats/achats.routes').then((m) => m.ACHATS_ROUTES),
      },
      {
        path: 'caisse/cloture',
        canActivate: [roleGuard('Admin', 'Caisse')],
        loadComponent: () => import('./features/caisse/caisse-cloture.page').then((m) => m.CaisseCloturePage),
      },
      {
        path: 'caisse/clotures',
        canActivate: [roleGuard('Admin', 'Caisse')],
        loadComponent: () => import('./features/caisse/caisse-clotures.page').then((m) => m.CaisseCloturesPage),
      },
      {
        path: 'analyse',
        canActivate: [roleGuard('Admin')],
        loadChildren: () => import('./features/analyse/analyse.routes').then((m) => m.ANALYSE_ROUTES),
      },

      {
        path: 'immo',
        canActivate: [roleGuard('Admin', 'Compta')],
        loadChildren: () => import('./features/immo/immo.routes').then((m) => m.IMMO_ROUTES),
      },

      {
        path: 'rh',
        // Gardes posées écran par écran : le planning des repos est ouvert à tous les comptes.
        loadChildren: () => import('./features/rh/rh.routes').then((m) => m.RH_ROUTES),
      },

      { path: '**', redirectTo: '' },
    ],
  },
];
