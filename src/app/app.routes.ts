import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { ArticlesPage } from './features/articles/articles.page';
import { ArticleDetailPage } from './features/articles/article-detail.page';
import { ClientsPage } from './features/vente/clients.page';
import { DevisPage } from './features/vente/devis.page';
import { FacturesPage } from './features/vente/factures.page';
import { DemandesDevisImportPage } from './features/vente/demandes-devis-import.page';
import { FournisseursPage } from './features/achat/fournisseurs.page';
import { DemandesAchatPage } from './features/achat/demandes-achat.page';
import { DemandesAchatAdminPage } from './features/achat/demandes-achat-admin.page';
import { BcAchatPage } from './features/achat/bc-achat.page';
import { BlAchatPage } from './features/achat/bl-achat.page';
import { FacturesAchatPage } from './features/achat/factures-achat.page';
import { BonsRetourPage } from './features/depot/bons-retour.page';
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
        canActivate: [roleGuard('Admin', 'Commercial', 'Recouvrement')],
      },
      {
        path: 'vente/devis',
        component: DevisPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
      },
      {
        path: 'vente/factures',
        component: FacturesPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
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
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'depot/bc-reception',
        component: BcReceptionPage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'depot/inventaire',
        component: InventairePage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'depot/mouvements-stock',
        component: MouvementsStockPage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'depot/factures-retour',
        component: FacturesRetourPage,
        canActivate: [roleGuard('Admin', 'Depot')],
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
