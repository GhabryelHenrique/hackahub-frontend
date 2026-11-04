import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HackathonService } from '../../../core/services/hackathon.service';
import { Challenge } from '../../../core/models';
import { Badge, Button, EmptyState, Icon, Skeleton } from '../../../shared/ui';

/** Página de leitura de um desafio (participante) — docs §8. */
@Component({
  selector: 'app-challenge-detail',
  imports: [RouterLink, Badge, Button, EmptyState, Icon, Skeleton],
  templateUrl: './challenge-detail.html',
  styleUrl: './challenge-detail.scss',
})
export class ChallengeDetail {
  readonly hackathonId = input.required<string>();
  readonly challengeId = input.required<string>();

  private readonly hackathons = inject(HackathonService);

  protected readonly loading = signal(true);
  protected readonly challenge = signal<Challenge | null>(null);

  constructor() {
    effect(() => {
      const hid = this.hackathonId();
      const cid = this.challengeId();
      this.loading.set(true);
      this.hackathons.challenge(hid, cid).subscribe({
        next: (c) => {
          this.challenge.set(c);
          this.loading.set(false);
        },
        error: () => {
          this.challenge.set(null);
          this.loading.set(false);
        },
      });
    });
  }
}
