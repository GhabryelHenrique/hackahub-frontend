import {
  HackathonStatus,
  HackathonVisibility,
  MembershipRole,
  MembershipStatus,
  MentorshipStatus,
  RegistrationMode,
} from '../core/models';
import { BadgeTone } from './ui/badge/badge';
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUS_OPTIONS,
  EVENT_STATUS_TONE,
  MENTORSHIP_LABEL,
  MENTORSHIP_TONE,
  REGISTRATION_LABEL,
  REGISTRATION_OPTIONS,
  REGISTRATION_TONE,
  ROLE_LABEL,
  SENIORITY_OPTIONS,
  STATUS_LABEL,
  STATUS_TONE,
  VISIBILITY_OPTIONS,
} from './labels';

const TONES: BadgeTone[] = ['neutral', 'success', 'warning', 'danger', 'info', 'brand'];

const REGISTRATION_MODES: RegistrationMode[] = ['OPEN', 'APPROVAL', 'CODE'];
const ROLES: MembershipRole[] = ['PARTICIPANT', 'MENTOR', 'ORGANIZER'];
const MEMBERSHIP_STATUSES: MembershipStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const EVENT_STATUSES: HackathonStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];
const VISIBILITIES: HackathonVisibility[] = ['PUBLIC', 'UNLISTED', 'PRIVATE'];
const MENTORSHIP_STATUSES: MentorshipStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function expectLabels(map: Record<string, string>, keys: string[]): void {
  expect(Object.keys(map).sort()).toEqual([...keys].sort());
  for (const k of keys) expect(map[k]?.trim()).toBeTruthy();
}

function expectTones(map: Record<string, BadgeTone>, keys: string[]): void {
  expect(Object.keys(map).sort()).toEqual([...keys].sort());
  for (const k of keys) expect(TONES).toContain(map[k]);
}

describe('labels', () => {
  it('modo de inscrição: apenas OPEN/APPROVAL/CODE, todos com rótulo e tom', () => {
    expectLabels(REGISTRATION_LABEL, REGISTRATION_MODES);
    expectTones(REGISTRATION_TONE, REGISTRATION_MODES);
  });

  it('opções do select de inscrição seguem os rótulos, na ordem do enum', () => {
    expect(REGISTRATION_OPTIONS.map((o) => o.value)).toEqual(REGISTRATION_MODES);
    for (const o of REGISTRATION_OPTIONS) expect(o.label).toBe(REGISTRATION_LABEL[o.value]);
  });

  it('papéis por evento têm rótulo', () => {
    expectLabels(ROLE_LABEL, ROLES);
    expect(ROLE_LABEL.ORGANIZER).toBe('Organizador');
  });

  it('status de membership têm rótulo e tom (recusado = danger)', () => {
    expectLabels(STATUS_LABEL, MEMBERSHIP_STATUSES);
    expectTones(STATUS_TONE, MEMBERSHIP_STATUSES);
    expect(STATUS_TONE.REJECTED).toBe('danger');
    expect(STATUS_TONE.APPROVED).toBe('success');
  });

  it('status do evento têm rótulo, tom e opção de select', () => {
    expectLabels(EVENT_STATUS_LABEL, EVENT_STATUSES);
    expectTones(EVENT_STATUS_TONE, EVENT_STATUSES);
    expect(EVENT_STATUS_OPTIONS.map((o) => o.value)).toEqual(EVENT_STATUSES);
    for (const o of EVENT_STATUS_OPTIONS) expect(o.label).toBe(EVENT_STATUS_LABEL[o.value]);
  });

  it('visibilidades têm opção de select', () => {
    expect(VISIBILITY_OPTIONS.map((o) => o.value)).toEqual(VISIBILITIES);
    for (const o of VISIBILITY_OPTIONS) expect(o.label.trim()).toBeTruthy();
  });

  it('status de ticket de mentoria têm rótulo e tom', () => {
    expectLabels(MENTORSHIP_LABEL, MENTORSHIP_STATUSES);
    expectTones(MENTORSHIP_TONE, MENTORSHIP_STATUSES);
  });

  it('senioridades sem duplicatas', () => {
    expect(SENIORITY_OPTIONS.length).toBeGreaterThan(0);
    expect(new Set(SENIORITY_OPTIONS).size).toBe(SENIORITY_OPTIONS.length);
  });
});
