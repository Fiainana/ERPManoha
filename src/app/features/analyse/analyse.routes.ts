import { Routes } from '@angular/router';

/** Menu Analytique (chargé à la demande, réservé à l'Admin : garde posée sur /analyse). */
export const ANALYSE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./analyse-synthese.page').then((m) => m.AnalyseSynthesePage),
  },
  {
    path: 'magasin',
    loadComponent: () => import('./analyse-magasin.page').then((m) => m.AnalyseMagasinPage),
  },
  {
    path: 'marketing',
    loadComponent: () => import('./analyse-marketing.page').then((m) => m.AnalyseMarketingPage),
  },
  {
    path: 'articles',
    loadComponent: () => import('./analyse-articles.page').then((m) => m.AnalyseArticlesPage),
  },
  {
    path: 'articles/:reference',
    loadComponent: () => import('./analyse-article-detail.page').then((m) => m.AnalyseArticleDetailPage),
  },
  {
    path: 'ventes-journalieres',
    loadComponent: () =>
      import('./analyse-ventes-journalieres.page').then((m) => m.AnalyseVentesJournalieresPage),
  },
  {
    path: 'familles',
    loadComponent: () => import('./analyse-familles.page').then((m) => m.AnalyseFamillesPage),
  },
  {
    path: 'clients',
    loadComponent: () => import('./analyse-clients.page').then((m) => m.AnalyseClientsPage),
  },
  {
    path: 'clients/:numero',
    loadComponent: () => import('./analyse-client-detail.page').then((m) => m.AnalyseClientDetailPage),
  },
  {
    path: 'fournisseurs',
    loadComponent: () => import('./analyse-fournisseurs.page').then((m) => m.AnalyseFournisseursPage),
  },
  {
    path: 'fournisseurs/:numero',
    loadComponent: () => import('./analyse-fournisseur-detail.page').then((m) => m.AnalyseFournisseurDetailPage),
  },
  {
    path: 'commerciaux',
    loadComponent: () => import('./analyse-commerciaux.page').then((m) => m.AnalyseCommerciauxPage),
  },
];
