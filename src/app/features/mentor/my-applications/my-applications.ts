import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Badge, Button, EmptyState, Icon } from '../../../shared/ui';
import { STATUS_LABEL, STATUS_TONE } from '../../../shared/labels';
import { dateRange } from '../../../shared/format';

@Component({
  selector: 'app-my-applications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Button, EmptyState, Icon],
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss',
})
export class MyApplications {
  private readonly auth = inject(AuthService);

  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly dateRange = dateRange;

  /** Candidaturas de mentor = memberships com role MENTOR (docs §4.8). */
  protected readonly applications = computed(() => this.auth.memberships().filter((m) => m.role === 'MENTOR'));
}
