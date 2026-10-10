import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RhService } from '../../core/services/rh.service';
import { RhTableauBord, rhLibelleTypeAbsence } from '../../core/models/rh.model';
import { libellePresence, libelleRepos, libelleStatutAbsence, tonAbsence, tonPresence, utc } from './rh-ui';

@Component({
  selector: 'app-rh-tableau-bord-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './rh-tableau-bord.page.html',
  styleUrl: './rh.scss',
})
export class RhTableauBordPage implements OnInit {
  private readonly api = inject(RhService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<RhTableauBord | null>(null);

  readonly libellePresence = libellePresence;
  readonly libelleRepos = libelleRepos;
  readonly tonPresence = tonPresence;
  readonly tonAbsence = tonAbsence;
  readonly libelleStatutAbsence = libelleStatutAbsence;
  readonly typeAbsence = rhLibelleTypeAbsence;
  readonly utc = utc;

  readonly champs: Record<string, string> = {
    cin: 'CIN',
    cnaps: 'CNaPS',
    telephone: 'téléphone',
    dateNaissance: 'date de naissance',
    pointeuseNo: 'n° pointeuse',
    poste: 'poste',
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.tableauDeBord().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  manquants(liste: string[]): string {
    return liste.map((c) => this.champs[c] ?? c).join(', ');
  }
}
