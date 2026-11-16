import { Observable } from 'rxjs';

/** Date locale du jour en yyyy-MM-dd. */
export function aujourdhuiIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Ajoute n jours à une date yyyy-MM-dd. */
export function ajouterJours(iso: string, n: number): string {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Ouvre un PDF reçu en blob dans un nouvel onglet. */
export function ouvrirPdf(obs: Observable<Blob>, erreur: (message: string) => void): void {
  // Onglet ouvert tout de suite (dans le geste de l'utilisateur), sinon le navigateur le bloque.
  const onglet = window.open('', '_blank');
  obs.subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (onglet) onglet.location.href = url;
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    },
    error: (e: Error) => {
      onglet?.close();
      erreur(e.message);
    },
  });
}
