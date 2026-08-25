/**
 * Horário de funcionamento do açougue.
 *
 * Regra compartilhada entre servidor e frontend de propósito: o servidor
 * recusa pedidos fora do horário (é ele quem vale), e o frontend usa a mesma
 * função para avisar o cliente antes de ele perder tempo montando o carrinho.
 */

/**
 * O Worker roda em UTC, mas "está aberto agora?" só faz sentido no horário
 * local da loja. Se o açougue mudar de fuso, é esta constante que muda.
 */
export const STORE_TIMEZONE = "America/Sao_Paulo";

export type DayHours = {
  /** false = fechado o dia inteiro */
  open: boolean;
  /** "HH:MM" 24h */
  from: string;
  to: string;
};

/** Índices batem com Date.getDay(): 0 = domingo … 6 = sábado */
export type BusinessHours = [
  DayHours,
  DayHours,
  DayHours,
  DayHours,
  DayHours,
  DayHours,
  DayHours,
];

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

/** Padrão de açougue de bairro: fecha domingo, sábado até mais cedo. */
export const DEFAULT_BUSINESS_HOURS: BusinessHours = [
  { open: false, from: "08:00", to: "12:00" }, // domingo
  { open: true, from: "08:00", to: "18:00" },
  { open: true, from: "08:00", to: "18:00" },
  { open: true, from: "08:00", to: "18:00" },
  { open: true, from: "08:00", to: "18:00" },
  { open: true, from: "08:00", to: "18:00" },
  { open: true, from: "08:00", to: "13:00" }, // sábado
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** "08:30" -> 510 (minutos desde a meia-noite) */
export function timeToMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Dia da semana e minutos do dia no fuso da loja.
 *
 * Usa Intl porque `new Date().getDay()` devolveria o dia no fuso do servidor
 * (UTC no Cloudflare), o que erraria a virada do dia em quase 1/6 das horas.
 */
export function getStoreLocalTime(
  date: Date,
  timeZone: string = STORE_TIMEZONE
): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";

  return {
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Uma faixa é válida quando o fechamento vem depois da abertura.
 * Faixas que viram a madrugada não são suportadas — um açougue não abre
 * das 22h às 02h, e aceitar isso complicaria a checagem sem ganho real.
 */
export function isValidDayHours(day: DayHours): boolean {
  if (!day.open) return true;
  if (!isValidTime(day.from) || !isValidTime(day.to)) return false;
  return timeToMinutes(day.to) > timeToMinutes(day.from);
}

export function normalizeBusinessHours(value: unknown): BusinessHours {
  if (!Array.isArray(value) || value.length !== 7) {
    return DEFAULT_BUSINESS_HOURS;
  }

  return value.map((day, index) => {
    const fallback = DEFAULT_BUSINESS_HOURS[index];
    if (!day || typeof day !== "object") return fallback;

    const candidate: DayHours = {
      open: Boolean((day as DayHours).open),
      from: isValidTime((day as DayHours).from) ? (day as DayHours).from : fallback.from,
      to: isValidTime((day as DayHours).to) ? (day as DayHours).to : fallback.to,
    };

    return isValidDayHours(candidate) ? candidate : { ...candidate, open: false };
  }) as BusinessHours;
}

export type StoreStatus = {
  isOpen: boolean;
  /** Horário de hoje, mesmo quando fechado (para exibir "abre às ...") */
  today: DayHours;
  weekday: number;
  /** Preenchido quando fechado: quando a loja volta a abrir */
  nextOpening?: { weekday: number; time: string };
};

export function getStoreStatus(
  hours: BusinessHours,
  now: Date = new Date(),
  timeZone: string = STORE_TIMEZONE
): StoreStatus {
  const { weekday, minutes } = getStoreLocalTime(now, timeZone);
  const today = hours[weekday];

  const isOpen =
    today.open &&
    isValidDayHours(today) &&
    minutes >= timeToMinutes(today.from) &&
    minutes < timeToMinutes(today.to);

  if (isOpen) {
    return { isOpen: true, today, weekday };
  }

  return { isOpen: false, today, weekday, nextOpening: findNextOpening(hours, weekday, minutes) };
}

/** Procura a próxima abertura na semana, começando por hoje. */
function findNextOpening(
  hours: BusinessHours,
  weekday: number,
  minutes: number
): { weekday: number; time: string } | undefined {
  for (let offset = 0; offset < 7; offset++) {
    const day = (weekday + offset) % 7;
    const dayHours = hours[day];

    if (!dayHours.open || !isValidDayHours(dayHours)) continue;

    // hoje só conta se o horário de abertura ainda não passou
    if (offset === 0 && minutes >= timeToMinutes(dayHours.from)) continue;

    return { weekday: day, time: dayHours.from };
  }

  return undefined;
}
