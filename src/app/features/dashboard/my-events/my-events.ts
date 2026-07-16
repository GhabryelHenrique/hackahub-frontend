import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { MyMembership } from '../../../core/models';
import { Badge, Button, EmptyState, Icon, Tabs, TabItem } from '../../../shared/ui';
import { ROLE_LABEL, STATUS_LABEL, STATUS_TONE } from '../../../shared/labels';
import { dateRange, hueFromString } from '../../../shared/format';

@Component({
  selector: 'app-my-events',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Button, EmptyState, Icon, Tabs],
  templateUrl: './my-events.html',
  styleUrl: './my-events.scss',
})
export class MyEvents {
  private readonly auth = inject(AuthService);

  protected readonly ROLE_LABEL = ROLE_LABEL;
  protected readonly STATUS_LABEL = STATUS_LABEL;
  protected readonly STATUS_TONE = STATUS_TONE;
  protected readonly dateRange = dateRange;
  protected readonly hueFromString = hueFromString;

  protected readonly filter = signal<'ALL' | 'PARTICIPANT' | 'MENTOR'>('ALL');
  protected readonly tabs: TabItem[] = [
    { id: 'ALL', label: 'Todos' },
    { id: 'PARTICIPANT', label: 'Como participante' },
    { id: 'MENTOR', label: 'Como mentor' },
  ];

  protected readonly memberships = computed(() =>
    [...this.auth.memberships()].sort((a, b) => a.hackathon.name.localeCompare(b.hackathon.name)),
  );

  protected readonly filtered = computed<MyMembership[]>(() => {
    const f = this.filter();
    return f === 'ALL' ? this.memberships() : this.memberships().filter((m) => m.role === f);
  });
}
