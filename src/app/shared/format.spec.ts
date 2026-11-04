import {
  compact,
  coverHue,
  coverImage,
  dateBlock,
  dateRange,
  digitsOnly,
  formatCpf,
  formatPhone,
  formatPrice,
  fullDate,
  hueFromString,
  isoToLocalInput,
  localInputToIso,
  registrationState,
  slugify,
  timeAgo,
} from './format';

const DAY = 86_400_000;
/** Normaliza espaços não separáveis do Intl (ex.: "R$ 49,90"). */
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('format', () => {
  describe('dateRange', () => {
    it('retorna "Datas a definir" quando alguma data é nula', () => {
      expect(dateRange(null, null)).toBe('Datas a definir');
      expect(dateRange('2026-08-15T12:00:00', null)).toBe('Datas a definir');
      expect(dateRange(null, '2026-08-17T12:00:00')).toBe('Datas a definir');
    });

    it('compacta o intervalo dentro do mesmo mês', () => {
      expect(dateRange('2026-08-15T12:00:00', '2026-08-17T12:00:00')).toBe('15–17 ago 2026');
    });

    it('mostra os dois meses quando o intervalo cruza o mês', () => {
      expect(dateRange('2026-08-28T12:00:00', '2026-09-02T12:00:00')).toBe('28 ago – 2 set 2026');
    });

    it('trata mesmo mês em anos diferentes como intervalo longo', () => {
      expect(dateRange('2026-12-30T12:00:00', '2027-01-02T12:00:00')).toBe('30 dez – 2 jan 2027');
      expect(dateRange('2026-08-15T12:00:00', '2027-08-17T12:00:00')).toBe('15 ago – 17 ago 2027');
    });
  });

  describe('fullDate', () => {
    it('formata por extenso em pt-BR', () => {
      expect(fullDate('2026-08-05T12:00:00')).toBe('05 de agosto de 2026');
    });

    it('usa travessão quando a data é nula', () => {
      expect(fullDate(null)).toBe('—');
    });
  });

  describe('registrationState', () => {
    it('evento já encerrado fica fechado e neutro, independente do modo', () => {
      const endsAt = new Date(Date.now() - DAY).toISOString();
      for (const registrationMode of ['OPEN', 'APPROVAL', 'CODE'] as const) {
        expect(registrationState({ registrationMode, endsAt })).toEqual({
          open: false,
          label: 'Encerrado',
          tone: 'neutral',
        });
      }
    });

    it('evento futuro usa rótulo e tom do modo de inscrição', () => {
      const endsAt = new Date(Date.now() + DAY).toISOString();
      expect(registrationState({ registrationMode: 'OPEN', endsAt })).toEqual({
        open: true,
        label: 'Inscrição aberta',
        tone: 'success',
      });
      expect(registrationState({ registrationMode: 'APPROVAL', endsAt })).toEqual({
        open: true,
        label: 'Sujeito a aprovação',
        tone: 'info',
      });
      expect(registrationState({ registrationMode: 'CODE', endsAt })).toEqual({
        open: true,
        label: 'Por código',
        tone: 'warning',
      });
    });

    it('sem data de término é considerado aberto', () => {
      expect(registrationState({ registrationMode: 'OPEN', endsAt: null }).open).toBe(true);
    });
  });

  describe('hueFromString / coverHue', () => {
    const samples = ['', 'a', 'hackathon-2026', 'cidades-inteligentes', 'açaí', 'x'.repeat(200), 'Z9-z9'];

    it('hueFromString é determinístico e fica entre 0 e 359', () => {
      for (const s of samples) {
        const h = hueFromString(s);
        expect(h).toBe(hueFromString(s));
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(359);
      }
    });

    it('coverHue fica na faixa fria da marca (190–250)', () => {
      for (let i = 0; i < 500; i++) {
        const h = coverHue(`evento-${i}`);
        expect(h).toBeGreaterThanOrEqual(190);
        expect(h).toBeLessThanOrEqual(250);
      }
      for (const s of samples) {
        expect(coverHue(s)).toBe(190 + (hueFromString(s) % 61));
      }
    });

    it('strings diferentes geram matizes variados', () => {
      const hues = new Set(Array.from({ length: 50 }, (_, i) => coverHue(`slug-${i}`)));
      expect(hues.size).toBeGreaterThan(10);
    });
  });

  describe('coverImage', () => {
    it('retorna null sem URL', () => {
      expect(coverImage(null)).toBeNull();
      expect(coverImage(undefined)).toBeNull();
      expect(coverImage('')).toBeNull();
      expect(coverImage(null, true)).toBeNull();
    });

    it('gera url() sem véu', () => {
      expect(coverImage('http://cdn/capa.png')).toBe('url("http://cdn/capa.png")');
    });

    it('escapa aspas duplas da URL', () => {
      expect(coverImage('http://cdn/a"b".png')).toBe('url("http://cdn/a%22b%22.png")');
    });

    it('com véu, sobrepõe um gradiente escuro à imagem', () => {
      const v = coverImage('http://cdn/capa.png', true)!;
      expect(v.startsWith('linear-gradient(')).toBe(true);
      expect(v.endsWith(', url("http://cdn/capa.png")')).toBe(true);
    });
  });

  describe('dateBlock', () => {
    it('devolve dia com 2 dígitos e mês abreviado em maiúsculas', () => {
      expect(dateBlock('2026-11-04T12:00:00')).toEqual({ day: '04', month: 'NOV' });
      expect(dateBlock('2026-08-14T12:00:00')).toEqual({ day: '14', month: 'AGO' });
    });

    it('retorna null sem data', () => {
      expect(dateBlock(null)).toBeNull();
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('usa a maior unidade adequada', () => {
      expect(timeAgo('2026-10-19T11:59:30Z')).toBe('há 30 segundos');
      expect(timeAgo('2026-10-19T11:55:00Z')).toBe('há 5 minutos');
      expect(timeAgo('2026-10-19T09:00:00Z')).toBe('há 3 horas');
      expect(timeAgo('2026-10-14T12:00:00Z')).toBe('há 5 dias');
    });

    it('usa formas naturais (agora, ontem)', () => {
      expect(timeAgo('2026-10-19T12:00:00Z')).toBe('agora');
      expect(timeAgo('2026-10-18T12:00:00Z')).toBe('ontem');
    });

    it('chega a anos para datas antigas', () => {
      expect(timeAgo('2023-10-19T12:00:00Z')).toBe('há 3 anos');
    });
  });

  describe('compact', () => {
    it('abaixo de 10 mil usa separador de milhar pt-BR', () => {
      expect(compact(0)).toBe('0');
      expect(compact(1284)).toBe('1.284');
      expect(compact(9999)).toBe('9.999');
    });

    it('a partir de 10 mil usa notação compacta', () => {
      expect(plain(compact(12_345))).toBe('12,3 mil');
      expect(plain(compact(1_500_000))).toBe('1,5 mi');
    });
  });

  describe('formatPrice', () => {
    it('null, undefined e 0 são "Gratuito"', () => {
      expect(formatPrice(null)).toBe('Gratuito');
      expect(formatPrice(undefined)).toBe('Gratuito');
      expect(formatPrice(0)).toBe('Gratuito');
    });

    it('formata em reais', () => {
      expect(plain(formatPrice(49.9))).toBe('R$ 49,90');
      expect(plain(formatPrice(1250))).toBe('R$ 1.250,00');
    });
  });

  describe('isoToLocalInput / localInputToIso', () => {
    it('isoToLocalInput usa o fuso local no formato do datetime-local', () => {
      const iso = new Date(2026, 7, 5, 9, 7).toISOString();
      expect(isoToLocalInput(iso)).toBe('2026-08-05T09:07');
    });

    it('isoToLocalInput com null devolve string vazia', () => {
      expect(isoToLocalInput(null)).toBe('');
    });

    it('localInputToIso converte para ISO UTC e vazio vira null', () => {
      expect(localInputToIso('')).toBeNull();
      expect(localInputToIso('2026-08-05T09:07')).toBe(new Date(2026, 7, 5, 9, 7).toISOString());
    });

    it('ida e volta preserva o valor do input', () => {
      for (const v of ['2026-01-01T00:00', '2026-08-05T09:07', '2026-12-31T23:59']) {
        expect(isoToLocalInput(localInputToIso(v))).toBe(v);
      }
    });
  });

  describe('slugify', () => {
    it('gera slug minúsculo separado por hífen', () => {
      expect(slugify('Hackathon Cidades Inteligentes 2026')).toBe('hackathon-cidades-inteligentes-2026');
    });

    it('remove acentos e símbolos', () => {
      expect(slugify('Ação & Inovação — São Paulo!')).toBe('acao-inovacao-sao-paulo');
      expect(slugify('Çedilha Über Ñandú')).toBe('cedilha-uber-nandu');
    });

    it('colapsa separadores e remove hífens das pontas', () => {
      expect(slugify('  --Olá,   Mundo--  ')).toBe('ola-mundo');
      expect(slugify('a___b...c')).toBe('a-b-c');
    });

    it('o resultado casa o padrão aceito pela API', () => {
      const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      for (const v of ['Comunidade DevBR', '  Évora 2026 ', 'X/Y\\Z', 'já-é-slug']) {
        expect(slugify(v)).toMatch(pattern);
      }
    });

    it('string sem alfanuméricos vira vazia', () => {
      expect(slugify('')).toBe('');
      expect(slugify('—!!!—')).toBe('');
    });
  });

  describe('digitsOnly', () => {
    it('remove máscara, espaços e letras; null/undefined → vazio', () => {
      expect(digitsOnly('(11) 98765-4321')).toBe('11987654321');
      expect(digitsOnly('529.982.247-25')).toBe('52998224725');
      expect(digitsOnly('abc 1 x 2')).toBe('12');
      expect(digitsOnly(null)).toBe('');
      expect(digitsOnly(undefined)).toBe('');
    });
  });

  describe('formatCpf', () => {
    it('formata progressivamente enquanto digita', () => {
      expect(formatCpf('')).toBe('');
      expect(formatCpf('529')).toBe('529');
      expect(formatCpf('5299')).toBe('529.9');
      expect(formatCpf('5299822')).toBe('529.982.2');
      expect(formatCpf('5299822472')).toBe('529.982.247-2');
      expect(formatCpf('52998224725')).toBe('529.982.247-25');
    });

    it('ignora caracteres não numéricos e corta no 11º dígito', () => {
      expect(formatCpf('529.982.247-25')).toBe('529.982.247-25');
      expect(formatCpf('52998224725999')).toBe('529.982.247-25');
    });
  });

  describe('formatPhone', () => {
    it('formata DDD e número progressivamente', () => {
      expect(formatPhone('')).toBe('');
      expect(formatPhone('1')).toBe('(1');
      expect(formatPhone('11')).toBe('(11');
      expect(formatPhone('113')).toBe('(11) 3');
      expect(formatPhone('113456')).toBe('(11) 3456');
      expect(formatPhone('1134567')).toBe('(11) 3456-7');
    });

    it('fixo (10 dígitos) usa 4+4; celular (11 dígitos) usa 5+4', () => {
      expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('ignora caracteres não numéricos e corta no 11º dígito', () => {
      expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
      expect(formatPhone('119876543210000')).toBe('(11) 98765-4321');
    });
  });
});
