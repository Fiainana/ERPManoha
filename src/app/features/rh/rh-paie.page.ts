import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RhService } from '../../core/services/rh.service';
import { PaieBulletinLigne, PaiePeriode } from '../../core/models/rh.model';

/** Paie du mois : calcul des bulletins, validation, journal de paie et montants à déclarer. */
@Component({
  selector: 'app-rh-paie-page',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './rh-paie.page.html',
  styleUrl: './rh.scss',
})
export class RhPaiePage implements OnInit {
  private readonly api = inject(RhService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  readonly periode = signal<PaiePeriode | null>(null);

  /** Mois affiché, « yyyy-MM ». */
  mois = moisIso(new Date());

  readonly brouillons = computed(() => this.periode()?.bulletins.filter((b) => b.statut === 'Brouillon').length ?? 0);
  /** IRSA retenu sur les salariés / payé par la société (selon le réglage de chaque bulletin). */
  readonly irsaSalarie = computed(() => this.somme((b) => !b.irsaPrisEnCharge));
  readonly irsaSociete = computed(() => this.somme((b) => b.irsaPrisEnCharge));
  readonly avecAvertissement = computed(() => this.periode()?.bulletins.filter((b) => b.avertissements).length ?? 0);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    if (!/^\d{4}-\d{2}$/.test(this.mois)) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.paiePeriode(this.mois).subscribe({
      next: (p) => {
        this.periode.set(p);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.periode.set(null);
        this.error.set(err.message);
      },
    });
  }

  decaler(n: number): void {
    const [y, m] = this.mois.split('-').map(Number);
    this.mois = moisIso(new Date(y, m - 1 + n, 1));
    this.toast.set(null);
    this.charger();
  }

  calculer(): void {
    if (this.acting()) return;
    const p = this.periode();
    const existants = p?.bulletins.filter((b) => b.statut === 'Brouillon').length ?? 0;
    if (existants > 0 && !confirm(`Recalculer ${existants} bulletin(s) en brouillon à partir de la présence actuelle ?`)) return;
    this.agir(this.api.paieCalculer(this.mois), 'Paie calculée.');
  }

  valider(): void {
    const n = this.brouillons();
    if (this.acting() || n === 0) return;
    if (!confirm(`Valider ${n} bulletin(s) de ${this.libelleMois(this.mois)} ? Ils ne seront plus recalculés.`)) return;
    this.agir(this.api.paieValiderPeriode(this.mois), 'Paie du mois validée.');
  }

  ouvrir(b: PaieBulletinLigne): void {
    void this.router.navigate(['/rh/paie/bulletins', b.id]);
  }

  /** Journal de paie en CSV (séparateur « ; », ouvert directement par Excel). */
  exporter(): void {
    const p = this.periode();
    if (!p || p.bulletins.length === 0) return;
    const entetes = [
      'Matricule', 'Nom', 'Département', 'Salaire de base', 'Retenues', 'Brut',
      'CNaPS salarié', 'OSTIE salarié', 'IRSA', 'Net à payer',
      'CNaPS employeur', 'OSTIE employeur', 'FMFP employeur', 'Coût employeur', 'IRSA payé par', 'Statut',
    ];
    const lignes = p.bulletins.map((b) => [
      b.matricule, b.nom, b.departement ?? '', b.salaireBase, b.retenues, b.brut,
      b.cnapsSalarie, b.ostieSalarie, b.irsa, b.net,
      b.cnapsEmployeur, b.ostieEmployeur, b.fmfpEmployeur, b.coutEmployeur,
      b.irsaPrisEnCharge ? 'Société' : 'Salarié', b.statut,
    ]);
    const t = p.totaux;
    lignes.push([
      '', 'TOTAL', '', t.salaireBase, t.retenues, t.brut, t.cnapsSalarie, t.ostieSalarie, t.irsa, t.net,
      t.cnapsEmployeur, t.ostieEmployeur, t.fmfpEmployeur, t.coutEmployeur, '', '',
    ]);
    const cellule = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [entetes, ...lignes].map((l) => l.map(cellule).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-paie-${p.mois}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  libelleMois(mois: string): string {
    const [y, m] = mois.split('-').map(Number);
    const texte = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  }

  private somme(filtre: (b: PaieBulletinLigne) => boolean): number {
    return this.periode()?.bulletins.filter(filtre).reduce((total, b) => total + b.irsa, 0) ?? 0;
  }

  private agir(obs: ReturnType<RhService['paieCalculer']>, ok: string): void {
    this.acting.set(true);
    this.error.set(null);
    this.toast.set(null);
    obs.subscribe({
      next: (res) => {
        this.acting.set(false);
        this.periode.set(res.data);
        this.toast.set(res.message || ok);
      },
      error: (err: Error) => {
        this.acting.set(false);
        this.error.set(err.message);
      },
    });
  }
}

function moisIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
