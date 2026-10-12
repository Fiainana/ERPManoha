import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import { PaieBareme, PaieParametre, PaieParametres } from '../../core/models/rh.model';

type Modal = 'parametre' | 'bareme' | null;

/**
 * Paramètres de paie datés : taux de cotisations, plafond, barème IRSA… Une nouvelle valeur s'applique à partir
 * du mois choisi, sans modifier les bulletins déjà validés ni l'historique.
 */
@Component({
  selector: 'app-rh-paie-parametres-page',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './rh-paie-parametres.page.html',
  styleUrl: './rh.scss',
})
export class RhPaieParametresPage implements OnInit {
  private readonly api = inject(RhService);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly modal = signal<Modal>(null);
  readonly modalError = signal<string | null>(null);
  readonly donnees = signal<PaieParametres | null>(null);

  param = { cle: '', libelle: '', unite: '', mois: '', valeur: 0 };
  bareme = { mois: '', tranches: [] as { seuil: number; taux: number }[] };

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.paieParametres().subscribe({
      next: (d) => {
        this.donnees.set(d);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  // —— Paramètres ——

  modifier(p: PaieParametre): void {
    this.param = {
      cle: p.cle,
      libelle: p.libelle,
      unite: p.unite,
      mois: moisCourant(),
      valeur: p.valeur ?? 0,
    };
    this.ouvrir('parametre');
  }

  enregistrerParametre(): void {
    if (!/^\d{4}-\d{2}$/.test(this.param.mois)) return this.modalError.set('Choisissez le mois à partir duquel la valeur s’applique.');
    const valeur = Number(this.param.valeur);
    if (!Number.isFinite(valeur)) return this.modalError.set('Valeur invalide.');
    this.envoyer(
      this.api.paieEnregistrerParametre({ cle: this.param.cle, dateEffet: `${this.param.mois}-01`, valeur }),
      'Paramètre enregistré.'
    );
  }

  // —— Barème IRSA ——

  modifierBareme(b: PaieBareme | null): void {
    const modele = b ?? this.donnees()?.irsa[0] ?? null;
    this.bareme = {
      mois: b ? b.dateEffet.slice(0, 7) : moisCourant(),
      tranches: (modele?.tranches ?? [{ seuil: 0, taux: 0 }]).map((t) => ({ ...t })),
    };
    this.ouvrir('bareme');
  }

  ajouterTranche(): void {
    const derniere = this.bareme.tranches[this.bareme.tranches.length - 1];
    this.bareme.tranches.push({ seuil: (derniere?.seuil ?? 0) + 100000, taux: derniere?.taux ?? 0 });
  }

  retirerTranche(i: number): void {
    if (this.bareme.tranches.length > 1) this.bareme.tranches.splice(i, 1);
  }

  enregistrerBareme(): void {
    if (!/^\d{4}-\d{2}$/.test(this.bareme.mois)) return this.modalError.set('Choisissez le mois à partir duquel le barème s’applique.');
    this.envoyer(
      this.api.paieEnregistrerBareme({
        dateEffet: `${this.bareme.mois}-01`,
        tranches: this.bareme.tranches.map((t) => ({ seuil: Number(t.seuil) || 0, taux: Number(t.taux) || 0 })),
      }),
      'Barème IRSA enregistré.'
    );
  }

  // —— Outils ——

  ouvrir(m: Modal): void {
    this.modalError.set(null);
    this.modal.set(m);
  }

  /** « 2026-03-01 » → « mars 2026 ». */
  libelleDate(iso: string): string {
    const [y, m] = iso.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  affiche(p: PaieParametre, valeur: number | null): string {
    if (valeur === null) return '—';
    if (p.unite === '0/1') return valeur ? 'Oui' : 'Non';
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(valeur)} ${p.unite}`;
  }

  private envoyer(obs: ReturnType<RhService['paieEnregistrerParametre']>, ok: string): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.modalError.set(null);
    obs.subscribe({
      next: (res) => {
        this.acting.set(false);
        this.donnees.set(res.data);
        this.modal.set(null);
        this.toast.set(res.message || ok);
      },
      error: (err: Error) => {
        this.acting.set(false);
        this.modalError.set(err.message);
      },
    });
  }
}

function moisCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
