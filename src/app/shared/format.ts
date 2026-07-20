/* Formatação de datas e estado de inscrição (pt-BR). SSR-safe (Intl no Node). */

import { HackathonSummary } from '../core/models';
import { BadgeTone } from './ui/badge/badge';
import { REGISTRATION_LABEL, REGISTRATION_TONE } from './labels';

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const fullFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

function month(d: Date): string {
  return monthFmt.format(d).replace('.', '');
}

/** Ex.: "15–17 ago 2026" ou "28 ago – 2 set 2026". Null-safe (datas opcionais). */
export function dateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt || !endsAt) return 'Datas a definir';
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${month(s)} ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`;
}

export function fullDate(iso: string | null): string {
  return iso ? fullFmt.format(new Date(iso)) : '—';
}

export interface RegistrationState {
  open: boolean;
  label: string;
  tone: BadgeTone;
}

/** Estado de inscrição para o badge (docs §4.1). O catálogo só traz PUBLISHED. */
export function registrationState(h: Pick<HackathonSummary, 'registrationMode' | 'endsAt'>): RegistrationState {
  if (h.endsAt && new Date(h.endsAt).getTime() < Date.now()) {
    return { open: false, label: 'Encerrado', tone: 'neutral' };
  }
  return {
    open: h.registrationMode !== 'INVITE',
    label: REGISTRATION_LABEL[h.registrationMode],
    tone: REGISTRATION_TONE[h.registrationMode],
  };
}

/** Hue determinístico (0–359) a partir de uma string — capa em gradiente. */
export function hueFromString(s: string): number {
  let hash = 0;
  for (const ch of s) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** `null`/`0` = gratuito (preço é opcional no evento). */
export function formatPrice(price: number | null | undefined): string {
  return price == null || price === 0 ? 'Gratuito' : priceFmt.format(price);
}

/** ISO → valor de `<input type="datetime-local">` no fuso LOCAL (YYYY-MM-DDTHH:mm). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Valor do datetime-local (fuso local) → ISO 8601 UTC; `''` → null (limpa a data). */
export function localInputToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
