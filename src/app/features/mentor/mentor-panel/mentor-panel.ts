import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MentorService } from '../../../core/services/mentor.service';
import { Team } from '../../../core/models';
import { Avatar, Badge, Card, EmptyState, Icon, Skeleton } from '../../../shared/ui';

@Component({
  selector: 'app-mentor-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Badge, Card, EmptyState, Icon, Skeleton],
  templateUrl: './mentor-panel.html',
  styleUrl: './mentor-panel.scss',
})
export class MentorPanel {
  readonly hackathonId = input.required<string>();

  private readonly mentor = inject(MentorService);

  protected readonly loading = signal(true);
  protected readonly teams = signal<Team[]>([]);

  constructor() {
    effect(() => {
      const id = this.hackathonId();
      if (id) this.load(id);
    });
  }

  private load(hid: string): void {
    this.loading.set(true);
    this.mentor.mentoredTeams(hid).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
