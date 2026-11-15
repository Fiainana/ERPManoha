import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysePeriodeService, AnalyseService } from '../../core/services/analyse.service';
import { AnalyseMagasin } from '../../core/models/analyse.model';
import { AnalyseEnteteComponent } from './analyse-entete.component';
import { CompactPipe, JoursPipe, PctPipe, NbPipe } from './analyse-format';

/** Marketing : fidélisation, segmentation RFM des clients et articles achetés ensemble (ventes croisées). */
@Component({
  selector: 'app-analyse-marketing-page',
  imports: [NbPipe, RouterLink, AnalyseEnteteComponent, CompactPipe, PctPipe, JoursPipe],
  templateUrl: './analyse-marketing.page.html',
  styleUrl: './analyse.shared.scss',
})
export class AnalyseMarketingPage {
  private readonly api = inject(AnalyseService);
  private readonly periode = inject(AnalysePeriodeService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<AnalyseMagasin | null>(null);

  constructor() {
    effect(() => {
      this.periode.version();
      untracked(() => this.load());
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.magasin().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }
}
