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
import { FournisseurDetailPage } from './features/achat/fournisseur-detail.page';
import { FournisseurFormPage } from './features/achat/fournisseur-form.page';
import { DemandesAchatPage } from './features/achat/demandes-achat.page';
import { DemandeAchatFormPage } from './features/achat/demande-achat-form.page';
import { DemandeAchatDetailPage } from './features/achat/demande-achat-detail.page';
import { DemandesAchatAdminPage } from './features/achat/demandes-achat-admin.page';
import { DemandeAchatAdminDetailPage } from './features/achat/demande-achat-admin-detail.page';
import { BcAchatPage } from './features/achat/bc-achat.page';
import { PrepaAchatPage } from './features/achat/prepa-achat.page';
import { BlAchatPage } from './features/achat/bl-achat.page';
import { FacturesAchatPage } from './features/achat/factures-achat.page';
import { DocAchatDetailPage } from './features/achat/doc-achat-detail.page';
import { BonsRetourPage } from './features/depot/bons-retour.page';
import { BonRetourDetailPage } from './features/depot/bon-retour-detail.page';
import { BcReceptionPage } from './features/depot/bc-reception.page';
import { BcReceptionDetailPage } from './features/depot/bc-reception-detail.page';
import { InventairePage } from './features/depot/inventaire.page';
import { InventaireDetailPage } from './features/depot/inventaire-detail.page';
import { MouvementsStockPage } from './features/depot/mouvements-stock.page';
import { FacturesRetourPage } from './features/depot/factures-retour.page';
import { FactureRetourDetailPage } from './features/depot/facture-retour-detail.page';
import { RecouvrementPage } from './features/recouvrement/recouvrement.page';
import { UtilisateursPage } from './features/utilisateurs/utilisateurs.page';
import { EtatVentePage } from './features/etat/etat-vente.page';
import { JournalCaissePage } from './features/etat/journal-caisse.page';
import { RapportVenteMailPage } from './features/etat/rapport-vente-mail.page';
import { ObjectifsPage } from './features/etat/objectifs.page';

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
        path: 'achat/fournisseurs',
        component: FournisseursPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/fournisseurs/nouveau',
        component: FournisseurFormPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/fournisseurs/:numero',
        component: FournisseurDetailPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/demandes-achat',
        component: DemandesAchatPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
      },
      {
        path: 'achat/demandes-achat/nouvelle',
        component: DemandeAchatFormPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
      },
      {
        path: 'achat/demandes-achat/:id',
        component: DemandeAchatDetailPage,
        canActivate: [roleGuard('Admin', 'Commercial')],
      },
      {
        path: 'achat/demandes-achat-admin',
        component: DemandesAchatAdminPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/demandes-achat-admin/:id',
        component: DemandeAchatAdminDetailPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/prepa-achat',
        component: PrepaAchatPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/prepa-achat/:piece',
        component: DocAchatDetailPage,
        canActivate: [roleGuard('Admin')],
        data: { kind: 'preparations', listPath: '/achat/prepa-achat', titleLabel: 'Préparation' },
      },
      {
        path: 'achat/bc-achat',
        component: BcAchatPage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'achat/bc-achat/:piece',
        component: DocAchatDetailPage,
        canActivate: [roleGuard('Admin', 'Depot')],
        data: { kind: 'commandes', listPath: '/achat/bc-achat', titleLabel: 'BC' },
      },
      {
        path: 'achat/bl-achat',
        component: BlAchatPage,
        canActivate: [roleGuard('Admin', 'Depot')],
      },
      {
        path: 'achat/bl-achat/:piece',
        component: DocAchatDetailPage,
        canActivate: [roleGuard('Admin', 'Depot')],
        data: { kind: 'receptions', listPath: '/achat/bl-achat', titleLabel: 'BL' },
      },
      {
        path: 'achat/factures-achat',
        component: FacturesAchatPage,
        canActivate: [roleGuard('Admin')],
      },
      {
        path: 'achat/factures-achat/:piece',
        component: DocAchatDetailPage,
        canActivate: [roleGuard('Admin')],
        data: { kind: 'factures', listPath: '/achat/factures-achat', titleLabel: 'FA' },
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
