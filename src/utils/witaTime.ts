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
 * Returns previous calendar day ISO date string in WITA: YYYY-MM-DD
 */
export function getPreviousWitaDateString(date: Date = new Date()): string {
  const { year, month, day } = getWitaDateParts(date);
  // Subtract one day safely using UTC date arithmetic
  const prevDate = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0));
  return getWitaDateString(prevDate);
}

/**
 * Returns next calendar day ISO date string in WITA: YYYY-MM-DD
 */
export function getNextWitaDateString(date: Date = new Date()): string {
  const { year, month, day } = getWitaDateParts(date);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  return getWitaDateString(nextDate);
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
 * Context object describing active shift, including its schedule reference date
 */
export interface ActiveShiftContext {
  /** Identifier of active shift (e.g. 'pagi', 'siang', 'malam') */
  shiftId: string;
  /** Full shift configuration */
  shiftConfig: ShiftConfig;
  /** The effective schedule roster date this shift references (YYYY-MM-DD in WITA).
   * For overnight shifts (21.00 - 07.00) running past midnight (00.00 - 06.59),
   * this is ALWAYS the date when the shift started (i.e. yesterday)!
   */
  shiftDate: string;
  /** Current calendar date in WITA (YYYY-MM-DD) */
  calendarDate: string;
  /** True if the shift started yesterday evening and is now in its second day (past 00:00) */
  isOvernightSecondDay: boolean;
  /** Start and end time formatted for display */
  displayHours: string;
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

/**
 * Single source of truth for determining active shift and its schedule reference date
 * Strict compliance with WITA (UTC+8) and overnight shifts crossing midnight!
 *
 * Rules:
 * - Night shift starts at 21:00 on start date and ends at 07:00 on the following day.
 * - Calendar date change at 00:00 DOES NOT end or restart the night shift.
 * - If night shift starts on Oct 12 at 21:00, it stays active from 00:00 to 06:59 on Oct 13,
 *   with shiftDate referencing '2026-10-12'.
 * - At 07:00 on Oct 13, night shift ends and morning shift ('pagi') of Oct 13 begins.
 * - At 21:00 on Oct 13, night shift of Oct 13 begins.
 */
export function determineActiveShiftContext(
  shiftConfigs: ShiftConfig[] = DEFAULT_SHIFT_CONFIGS,
  date: Date = new Date()
): ActiveShiftContext {
  const configs = shiftConfigs && shiftConfigs.length > 0 ? shiftConfigs : DEFAULT_SHIFT_CONFIGS;

  const { hour, minute } = getWitaDateParts(date);
  const currentMinutes = hour * 60 + minute;
  const calendarDate = getWitaDateString(date);
  const previousCalendarDate = getPreviousWitaDateString(date);

  // Check each configured shift
  for (const config of configs) {
    const startMin = parseTimeToMinutes(config.startTime);
    const endMin = parseTimeToMinutes(config.endTime);

    if (startMin < endMin) {
      // Normal daytime shift within same calendar day (e.g. 07:00 to 14:00, or 14:00 to 21:00)
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return {
          shiftId: config.id,
          shiftConfig: config,
          shiftDate: calendarDate,
          calendarDate,
          isOvernightSecondDay: false,
          displayHours: `${normalizeTimeToDot(config.startTime)} - ${normalizeTimeToDot(config.endTime)} WITA`,
        };
      }
    } else if (startMin > endMin) {
      // Overnight shift crossing midnight (e.g. 21:00 to 07:00)
      // Part 1: Evening portion of start date (21:00 to 23:59)
      if (currentMinutes >= startMin) {
        return {
          shiftId: config.id,
          shiftConfig: config,
          shiftDate: calendarDate, // Started today
          calendarDate,
          isOvernightSecondDay: false,
          displayHours: `${normalizeTimeToDot(config.startTime)} - ${normalizeTimeToDot(config.endTime)} WITA`,
        };
      }

      // Part 2: Morning portion of following date (00:00 to 06:59:59)
      if (currentMinutes < endMin) {
        return {
          shiftId: config.id,
          shiftConfig: config,
          shiftDate: previousCalendarDate, // Started yesterday evening!
          calendarDate,
          isOvernightSecondDay: true,
          displayHours: `${normalizeTimeToDot(config.startTime)} - ${normalizeTimeToDot(config.endTime)} WITA`,
        };
      }
    } else {
      // 24-hour shift edge case (start === end)
      return {
        shiftId: config.id,
        shiftConfig: config,
        shiftDate: calendarDate,
        calendarDate,
        isOvernightSecondDay: false,
        displayHours: `${normalizeTimeToDot(config.startTime)} - ${normalizeTimeToDot(config.endTime)} WITA`,
      };
    }
  }

  // Fallback to first shift
  const fallback = configs[0] || DEFAULT_SHIFT_CONFIGS[0];
  return {
    shiftId: fallback.id,
    shiftConfig: fallback,
    shiftDate: calendarDate,
    calendarDate,
    isOvernightSecondDay: false,
    displayHours: `${normalizeTimeToDot(fallback.startTime)} - ${normalizeTimeToDot(fallback.endTime)} WITA`,
  };
}

/**
 * Resolves which schedule roster date should be queried for a requested shift
 * e.g., if viewing the active shift during 00:00 - 06:59, queries yesterday's date.
 */
export function getScheduleDateForShift(
  targetShiftId: string,
  activeContext: ActiveShiftContext,
  shiftConfigs: ShiftConfig[] = DEFAULT_SHIFT_CONFIGS,
  now: Date = new Date()
): string {
  // If viewing the currently active live shift, ALWAYS query its shiftDate
  if (targetShiftId === activeContext.shiftId) {
    return activeContext.shiftDate;
  }

  // If in the overnight shift past midnight (e.g. 03:00 on Oct 13):
  // User clicking 'pagi' wants to see morning shift of Oct 13 (today)
  // User clicking 'siang' wants to see afternoon shift of Oct 13 (today)
  return activeContext.calendarDate;
}

/**
 * Determines which shift ID is currently active (backward compatible helper)
 */
export function determineActiveShift(
  shiftConfigs: ShiftConfig[] = DEFAULT_SHIFT_CONFIGS,
  date: Date = new Date()
): string {
  return determineActiveShiftContext(shiftConfigs, date).shiftId;
}

/**
 * Helper to construct a specific WITA date & time for testing
 * e.g. createWitaDate(2026, 10, 12, 21, 0) -> Date corresponding to 12 Oct 2026 21:00 WITA
 */
export function createWitaDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date {
  // WITA is UTC+8, so UTC time is WITA time - 8 hours
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  return utcDate;
}

/**
 * Mandatory Verification Test Suite for Night Shift Calculation (Requirement 2)
 * Tests all 8 scenarios specified in the user request:
 *
 * 1. 12 Oktober, 20.59 WITA -> Belum memasuki sift malam tanggal 12 Oktober (siang)
 * 2. 12 Oktober, 21.00 WITA -> Sift malam tanggal 12 Oktober mulai aktif
 * 3. 12 Oktober, 23.59 WITA -> Sift malam tanggal 12 Oktober tetap aktif
 * 4. 13 Oktober, 00.00 WITA -> Sift malam tanggal 12 Oktober tetap aktif (shiftDate: 2026-10-12)
 * 5. 13 Oktober, 03.00 WITA -> Sift malam tanggal 12 Oktober tetap aktif (shiftDate: 2026-10-12)
 * 6. 13 Oktober, 06.59 WITA -> Sift malam tanggal 12 Oktober masih aktif (shiftDate: 2026-10-12)
 * 7. 13 Oktober, 07.00 WITA -> Sift malam tanggal 12 Oktober berakhir & berganti ke pagi 13 Oktober
 * 8. 13 Oktober, 21.00 WITA -> Sift malam tanggal 13 Oktober mulai aktif (shiftDate: 2026-10-13)
 */
export interface ShiftTestCaseResult {
  scenarioName: string;
  witaTimeLabel: string;
  expectedShift: string;
  actualShift: string;
  expectedShiftDate: string;
  actualShiftDate: string;
  passed: boolean;
}

export function runShiftScenarioTests(
  customConfigs: ShiftConfig[] = DEFAULT_SHIFT_CONFIGS
): ShiftTestCaseResult[] {
  const tests = [
    {
      name: '12 Oktober, 20.59 WITA',
      date: createWitaDate(2026, 10, 12, 20, 59),
      expectedShift: 'siang',
      expectedShiftDate: '2026-10-12',
    },
    {
      name: '12 Oktober, 21.00 WITA',
      date: createWitaDate(2026, 10, 12, 21, 0),
      expectedShift: 'malam',
      expectedShiftDate: '2026-10-12',
    },
    {
      name: '12 Oktober, 23.59 WITA',
      date: createWitaDate(2026, 10, 12, 23, 59),
      expectedShift: 'malam',
      expectedShiftDate: '2026-10-12',
    },
    {
      name: '13 Oktober, 00.00 WITA',
      date: createWitaDate(2026, 10, 13, 0, 0),
      expectedShift: 'malam',
      expectedShiftDate: '2026-10-12', // Critical: stays 12 Oktober!
    },
    {
      name: '13 Oktober, 03.00 WITA',
      date: createWitaDate(2026, 10, 13, 3, 0),
      expectedShift: 'malam',
      expectedShiftDate: '2026-10-12', // Critical: stays 12 Oktober!
    },
    {
      name: '13 Oktober, 06.59 WITA',
      date: createWitaDate(2026, 10, 13, 6, 59),
      expectedShift: 'malam',
      expectedShiftDate: '2026-10-12', // Critical: stays 12 Oktober!
    },
    {
      name: '13 Oktober, 07.00 WITA',
      date: createWitaDate(2026, 10, 13, 7, 0),
      expectedShift: 'pagi',
      expectedShiftDate: '2026-10-13', // Ends night shift, transitions to morning 13 Oktober!
    },
    {
      name: '13 Oktober, 21.00 WITA',
      date: createWitaDate(2026, 10, 13, 21, 0),
      expectedShift: 'malam',
      expectedShiftDate: '2026-10-13', // Starts night shift of 13 Oktober!
    },
  ];

  return tests.map((t) => {
    const ctx = determineActiveShiftContext(customConfigs, t.date);
    const passed = ctx.shiftId === t.expectedShift && ctx.shiftDate === t.expectedShiftDate;
    return {
      scenarioName: t.name,
      witaTimeLabel: t.name,
      expectedShift: t.expectedShift,
      actualShift: ctx.shiftId,
      expectedShiftDate: t.expectedShiftDate,
      actualShiftDate: ctx.shiftDate,
      passed,
    };
  });
}
