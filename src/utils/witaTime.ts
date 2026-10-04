import { ShiftConfig } from '../types';

/**
 * WITA (Waktu Indonesia Tengah) is UTC+8 / Asia/Makassar
 */
export const WITA_TIMEZONE = 'Asia/Makassar';

/**
 * Returns the current date/time parts in WITA (UTC+8)
 */
export function getWitaDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: WITA_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  let year = 2026;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
    if (part.type === 'second') second = parseInt(part.value, 10);
  }

  // Handle midnight 24 edge case in some browsers
  if (hour === 24) hour = 0;

  return { year, month, day, hour, minute, second };
}

/**
 * Returns WITA ISO date string: YYYY-MM-DD
 */
export function getWitaDateString(date: Date = new Date()): string {
  const { year, month, day } = getWitaDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns WITA 24-hour time string with seconds, e.g. "14.30.25"
 */
export function getWitaTimeString(date: Date = new Date(), withSeconds = true): string {
  const { hour, minute, second } = getWitaDateParts(date);
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  const s = String(second).padStart(2, '0');
  return withSeconds ? `${h}.${m}.${s}` : `${h}.${m}`;
}

/**
 * Returns full Indonesian formatted date in WITA, e.g. "Sabtu, 3 Oktober 2026"
 */
export function formatWitaFullDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Parses time string like "07:00", "07.00", "7:0", "14:00" to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace('.', ':');
  const [hStr, mStr] = cleaned.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  return (h % 24) * 60 + (m % 60);
}

/**
 * Formats time from minutes to 24h format "07.00"
 */
export function formatMinutesTo24h(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

/**
 * Standardize time string to 24h format "HH:MM" (for input type="time") or "HH.MM"
 */
export function normalizeTimeToColon(timeStr: string): string {
  if (!timeStr) return '07:00';
  const cleaned = timeStr.trim().replace('.', ':');
  const [hStr, mStr] = cleaned.split(':');
  const h = String(parseInt(hStr || '0', 10)).padStart(2, '0');
  const m = String(parseInt(mStr || '0', 10)).padStart(2, '0');
  return `${h}:${m}`;
}

export function normalizeTimeToDot(timeStr: string): string {
  if (!timeStr) return '07.00';
  return normalizeTimeToColon(timeStr).replace(':', '.');
}

/**
 * Determines which shift is currently active based on current WITA time and ShiftConfig[]
 * Accurately supports overnight shifts (e.g. 21:00 - 07:00)!
 */
export function determineActiveShift(
  shiftConfigs: ShiftConfig[],
  date: Date = new Date()
): string {
  if (!shiftConfigs || shiftConfigs.length === 0) return 'pagi';

  const { hour, minute } = getWitaDateParts(date);
  const currentMinutes = hour * 60 + minute;

  for (const config of shiftConfigs) {
    const startMin = parseTimeToMinutes(config.startTime);
    const endMin = parseTimeToMinutes(config.endTime);

    if (startMin < endMin) {
      // Normal shift within same day (e.g. 07:00 to 14:00, or 14:00 to 21:00)
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return config.id;
      }
    } else if (startMin > endMin) {
      // Overnight shift passing midnight (e.g. 21:00 to 07:00)
      if (currentMinutes >= startMin || currentMinutes < endMin) {
        return config.id;
      }
    } else {
      // Start and end are equal, 24h fallback
      return config.id;
    }
  }

  // Fallback to first shift or 'pagi'
  return shiftConfigs[0]?.id || 'pagi';
}

/**
 * Default shift configurations in 24h WITA format
 */
export const DEFAULT_SHIFT_CONFIGS: ShiftConfig[] = [
  {
    id: 'pagi',
    name: 'Sif Pagi',
    startTime: '07:00',
    endTime: '14:00',
    colorTheme: 'amber',
    description: 'Dinas Pagi: Visit dokter spesialis, terapi pagi & persiapan operasi',
  },
  {
    id: 'siang',
    name: 'Sif Siang',
    startTime: '14:00',
    endTime: '21:00',
    colorTheme: 'orange',
    description: 'Dinas Siang: Pemulihan post-op, rawat luka & edukasi jam kunjungan',
  },
  {
    id: 'malam',
    name: 'Sif Malam',
    startTime: '21:00',
    endTime: '07:00',
    colorTheme: 'indigo',
    description: 'Dinas Malam: Pemantauan istirahat pasien, ronda malam & siaga nurse call',
  },
];
