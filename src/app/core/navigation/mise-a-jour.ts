import { NavigationError } from '@angular/router';

const CLE = 'erpmanoha.rechargement-mise-a-jour';

/**
 * Après une mise à jour de l'ERP, un onglet resté ouvert garde l'ancien code : quand on ouvre un écran chargé à la
 * demande (Analytique, Achats, RH…), il demande un fichier qui n'existe plus et la navigation échoue sans rien
 * afficher. On recharge alors la page sur l'écran demandé, une seule fois par minute pour ne pas boucler.
 */
export function rechargerSiNouvelleVersion(e: NavigationError): void {
  if (!estFichierManquant(e.error)) return;
  try {
    const dernier = Number(sessionStorage.getItem(CLE) ?? 0);
    if (Date.now() - dernier < 60_000) return;
    sessionStorage.setItem(CLE, String(Date.now()));
  } catch {
    // Stockage indisponible : on recharge quand même.
  }
  window.location.assign(e.url);
}

function estFichierManquant(err: unknown): boolean {
  const texte = `${(err as Error)?.name ?? ''} ${(err as Error)?.message ?? err ?? ''}`;
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(
    texte
  );
}
