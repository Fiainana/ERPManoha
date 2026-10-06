import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { ArticlesPage } from './features/articles/articles.page';
import { ArticleDetailPage } from './features/articles/article-detail.page';
import { ClientsPage } from './features/vente/clients.page';
import { ClientDetailPage } from './features/vente/client-detail.page';
import { DevisPage } from './features/vente/devis.page';
import { DevisDetailPage } from './features/vente/devis-detail.page';
import { DevisFormPage } from './features/vente/devis-form.page';
import { FacturesPage } from './features/vente/factures.page';
import { FactureDetailPage } from './features/vente/facture-detail.page';
import { DemandesDevisImportPage } from './features/vente/demandes-devis-import.page';
import { FournisseursPage } from './features/achat/fournisseurs.page';
import { DemandesAchatPage } from './features/achat/demandes-achat.page';
import { DemandesAchatAdminPage } from './features/achat/demandes-achat-admin.page';
import { BcAchatPage } from './features/achat/bc-achat.page';
import { BlAchatPage } from './features/achat/bl-achat.page';
import { FacturesAchatPage } from './features/achat/factures-achat.page';
import { BonsRetourPage } from './features/depot/bons-retour.page';
import { BonRetourDetailPage } from './features/depot/bon-retour-detail.page';
import { BcReceptionPage } from './features/depot/bc-reception.page';
import { InventairePage } from './features/depot/inventaire.page';
import { MouvementsStockPage } from './features/depot/mouvements-stock.page';
import { FacturesRetourPage } from './features/depot/factures-retour.page';
import { RecouvrementPage } from './features/recouvrement/recouvrement.page';
import { UtilisateursPage } from './features/utilisateurs/utilisateurs.page';

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
      { path: '', component: DashboardPage, pathMatch: 'full' },

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
        path: 'vente/demandes-devis-import',
        component: DemandesDevisImportPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
      },

      {
        path: 'achat/fournisseurs',
        component: FournisseursPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/demandes-achat',
        component: DemandesAchatPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
      },
      {
        path: 'achat/demandes-achat-admin',
        component: DemandesAchatAdminPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/bc-achat',
        component: BcAchatPage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'achat/bl-achat',
        component: BlAchatPage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'achat/factures-achat',
        component: FacturesAchatPage,
        canActivate: [roleGuard('Admin')],
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
        path: 'depot/inventaire',
        component: InventairePage,
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
        path: 'recouvrement',
        component: RecouvrementPage,
        canActivate: [roleGuard('Admin', 'Recouvrement')],
      },

      {
        path: 'utilisateurs',
        component: UtilisateursPage,
        canActivate: [roleGuard('Admin')],
      },

      { path: '**', redirectTo: '' },
    ],
  },
];
