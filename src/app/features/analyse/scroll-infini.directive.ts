import { Directive, ElementRef, OnDestroy, afterNextRender, effect, inject, input, output } from '@angular/core';

/**
 * Sentinelle du défilement infini : émet `visible` quand l'élément approche de l'écran
 * (300 px d'avance), pour charger le lot suivant avant que l'utilisateur n'arrive en bas.
 * La valeur liée (nombre de lignes chargées) relance l'observation après chaque lot : si la
 * sentinelle est encore visible (écran haut, lot court), le lot suivant est demandé aussitôt.
 */
@Directive({ selector: '[appScrollInfini]' })
export class ScrollInfiniDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observateur?: IntersectionObserver;
  readonly appScrollInfini = input<number>(0);
  readonly visible = output<void>();

  constructor() {
    afterNextRender(() => {
      this.observateur = new IntersectionObserver(
        (entrees) => {
          if (entrees.some((e) => e.isIntersecting)) this.visible.emit();
        },
        { rootMargin: '300px 0px' }
      );
      this.observateur.observe(this.el.nativeElement);
    });

    effect(() => {
      this.appScrollInfini();
      const o = this.observateur;
      if (!o) return;
      // Ré-observer provoque un nouvel appel avec l'état courant de visibilité.
      queueMicrotask(() => {
        o.unobserve(this.el.nativeElement);
        o.observe(this.el.nativeElement);
      });
    });
  }

  ngOnDestroy(): void {
    this.observateur?.disconnect();
  }
}
