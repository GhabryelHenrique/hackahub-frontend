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
    open: true,
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

/**
 * Matiz da capa gerada (`.cover-art`), restrito à faixa fria da marca
 * (190 ciano → 250 índigo) para não destoar do navy/laranja.
 */
export function coverHue(s: string): number {
  return 190 + (hueFromString(s) % 61);
}

/** `background-image` para capa com foto; `veil` escurece para texto por cima. */
export function coverImage(url: string | null | undefined, veil = false): string | null {
  if (!url) return null;
  const safe = `url("${url.replace(/"/g, '%22')}")`;
  return veil ? `linear-gradient(180deg, rgba(11, 27, 48, 0.35), rgba(11, 27, 48, 0.82)), ${safe}` : safe;
}

const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });

/** Bloco de data da capa: { day: '14', month: 'NOV' } — null se sem data. */
export function dateBlock(iso: string | null): { day: string; month: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  return { day: dayFmt.format(d), month: month(d).toUpperCase() };
}

const relFmt = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "há 3 horas", "ontem"… — para filas (tickets, inscrições). */
export function timeAgo(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
    ['year', Infinity],
  ];
  let value = diff;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return relFmt.format(Math.round(value), unit);
    value /= size;
  }
  return relFmt.format(Math.round(value), 'year');
}

const compactFmt = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** 1.284 → "1,3 mil" (stat tiles). */
export function compact(n: number): string {
  return n < 10000 ? n.toLocaleString('pt-BR') : compactFmt.format(n);
}

const priceFmt =new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

/**
 * Gera um slug no formato aceito pela API (`^[a-z0-9]+(?:-[a-z0-9]+)*$`):
 * minúsculas, sem acentos, separado por hífen. Usado ao criar organização/evento.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // não-alfanumérico → hífen
    .replace(/^-+|-+$/g, ''); // sem hífen nas pontas
}

// ---- Documentos BR (CPF/telefone) -------------------------------------------
// A API guarda só os dígitos; a máscara existe apenas na exibição/digitação.

/** Remove tudo que não for dígito: "(11) 98765-4321" → "11987654321". */
export function digitsOnly(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Formata progressivamente (serve para digitação parcial): "12345678909" → "123.456.789-09". */
export function formatCpf(value: string | null | undefined): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Formata progressivamente com DDD: fixo (10 dígitos) "(11) 3456-7890" ou
 * celular (11 dígitos) "(11) 98765-4321".
 */
export function formatPhone(value: string | null | undefined): string {
  const d = digitsOnly(value).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = `(${d.slice(0, 2)}) `;
  const rest = d.slice(2);
  // Até 8 dígitos após o DDD divide 4+4; com 9 (celular) divide 5+4.
  const split = rest.length > 8 ? 5 : 4;
  return rest.length <= split ? ddd + rest : `${ddd}${rest.slice(0, split)}-${rest.slice(split)}`;
}
