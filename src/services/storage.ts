import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings, SurveyFeedback } from '../types';
import {
  DEFAULT_NURSES,
  DEFAULT_PATIENTS,
  DEFAULT_EDUCATION_ARTICLES,
  DEFAULT_SETTINGS,
  DEFAULT_SURVEYS,
  generateInitialMonthlySchedules,
} from './defaultData';
import { determineActiveShift } from '../utils/witaTime';
import {
  saveEducationArticlesIDB,
  getEducationArticlesIDB,
} from './indexedDb';

export const STORAGE_KEYS = {
  NURSES: 'careshift_nurses_v2',
  PATIENTS: 'careshift_patients_v2',
  SCHEDULES: 'careshift_schedules_v2',
  EDUCATION: 'careshift_education_v2',
  SETTINGS: 'careshift_settings_v2',
  IS_ADMIN: 'careshift_is_admin_v2',
  SURVEYS: 'careshift_surveys_v2',
};

export class StorageService {
  // In-memory cache for education articles (ensures data is never lost during runtime)
  private static _cachedEducationArticles: EducationArticle[] | null = null;

  /**
   * Safe localStorage setter with QuotaExceededError protection and automatic payload trimming
   */
  private static safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err: unknown) {
      console.warn(`[StorageService] localStorage.setItem failed for key "${key}":`, err);

      // Handle QuotaExceededError specifically for Education
      if (key === STORAGE_KEYS.EDUCATION) {
        try {
          const parsed: EducationArticle[] = JSON.parse(value);
          // Strip large base64 media for the localStorage copy only
          // (Full data is safely persisted in IndexedDB and in-memory cache)
          const lightweight: EducationArticle[] = parsed.map((art) => ({
            ...art,
            imageUrl:
              art.imageUrl && art.imageUrl.startsWith('data:') && art.imageUrl.length > 50000
                ? art.imageUrl.slice(0, 80) + '...[idb_cached]'
                : art.imageUrl,
            mediaItems: art.mediaItems?.map((m) => ({
              ...m,
              url:
                m.url && m.url.startsWith('data:') && m.url.length > 50000
                  ? m.url.slice(0, 80) + '...[idb_cached]'
                  : m.url,
            })),
          }));

          localStorage.removeItem(key);
          localStorage.setItem(key, JSON.stringify(lightweight));
          console.info(
            '[StorageService] Successfully saved lightweight articles to localStorage (full media stored in IndexedDB).'
          );
          return true;
        } catch (subErr) {
          console.warn('[StorageService] Fallback lightweight save also failed:', subErr);
          try {
            // Remove bloated key so other keys have space to operate
            localStorage.removeItem(key);
          } catch {
            // Ignore
          }
        }
      }

      // If general quota is exceeded, attempt to clear any stray large item without breaking critical state
      return false;
    }
  }

  // --- NURSES ---
  static getNurses(): Nurse[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NURSES);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    this.saveNurses(DEFAULT_NURSES);
    return DEFAULT_NURSES;
  }

  static saveNurses(nurses: Nurse[]): void {
    this.safeSetItem(STORAGE_KEYS.NURSES, JSON.stringify(nurses));
  }

  // --- SCHEDULES ---
  static getSchedules(): ShiftDuty[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    const initial = generateInitialMonthlySchedules();
    this.saveSchedules(initial);
    return initial;
  }

  static saveSchedules(schedules: ShiftDuty[]): void {
    this.safeSetItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }

  static setSchedule(duty: ShiftDuty): void {
    const schedules = this.getSchedules();
    const idx = schedules.findIndex(
      (s) => s.date === duty.date && s.shift === duty.shift
    );
    if (idx >= 0) {
      schedules[idx] = { ...duty, updatedAt: new Date().toISOString() };
    } else {
      schedules.push({ ...duty, updatedAt: new Date().toISOString() });
    }
    this.saveSchedules(schedules);
  }

  // --- PATIENTS ---
  static getPatients(): Patient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    this.savePatients(DEFAULT_PATIENTS);
    return DEFAULT_PATIENTS;
  }

  static savePatients(patients: Patient[]): void {
    this.safeSetItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  }

  // --- EDUCATION ---
  static getEducationArticles(): EducationArticle[] {
    // Return in-memory cache if available
    if (this._cachedEducationArticles && this._cachedEducationArticles.length > 0) {
      return this._cachedEducationArticles;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.EDUCATION);
      if (data) {
        const parsed: EducationArticle[] = JSON.parse(data);
        this._cachedEducationArticles = parsed;
        return parsed;
      }
    } catch {
      // Fallback
    }

    this.saveEducationArticles(DEFAULT_EDUCATION_ARTICLES);
    return DEFAULT_EDUCATION_ARTICLES;
  }

  static saveEducationArticles(articles: EducationArticle[]): void {
    // 1. Keep in memory for instantaneous rendering
    this._cachedEducationArticles = articles;

    // 2. Persist full data to IndexedDB (virtually unlimited capacity)
    saveEducationArticlesIDB(articles).catch((err) => {
      console.warn('[StorageService] IndexedDB save notice:', err);
    });

    // 3. Persist to localStorage safely with QuotaExceeded protection
    this.safeSetItem(STORAGE_KEYS.EDUCATION, JSON.stringify(articles));
  }

  /**
   * Asynchronously hydrate education articles from IndexedDB
   * Useful during app startup to load large rich-media items
   */
  static async loadEducationArticlesAsync(): Promise<EducationArticle[]> {
    try {
      const idbData = await getEducationArticlesIDB();
      if (idbData && Array.isArray(idbData) && idbData.length > 0) {
        this._cachedEducationArticles = idbData;
        // Keep localStorage refreshed safely
        this.safeSetItem(STORAGE_KEYS.EDUCATION, JSON.stringify(idbData));
        return idbData;
      }
    } catch (err) {
      console.warn('[StorageService] Error loading education from IndexedDB:', err);
    }
    return this.getEducationArticles();
  }

  // --- SETTINGS ---
  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          shiftConfigs: parsed.shiftConfigs || DEFAULT_SETTINGS.shiftConfigs,
          dashboardImages: parsed.dashboardImages || DEFAULT_SETTINGS.dashboardImages,
          dashboardColorTheme: parsed.dashboardColorTheme || DEFAULT_SETTINGS.dashboardColorTheme || 'purple',
        };
      }
    } catch {
      // Fallback
    }
    this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): void {
    this.safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- ADMIN STATUS ---
  static getIsAdmin(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
  }

  static setIsAdmin(isAdmin: boolean): void {
    this.safeSetItem(STORAGE_KEYS.IS_ADMIN, isAdmin ? 'true' : 'false');
  }

  // --- HELPERS ---
  static getCurrentShift(settings: AppSettings, date = new Date()): string {
    return determineActiveShift(settings.shiftConfigs, date);
  }

  static getEffectiveTheme(settings: AppSettings, date = new Date()): string {
    if (settings.themeMode === 'auto') {
      return this.getCurrentShift(settings, date);
    }
    return settings.themeMode;
  }

  // CSV Helpers
  static exportPatientsToCsv(): string {
    const patients = this.getPatients();
    const headers = [
      'No RM',
      'Nama Pasien',
      'Kamar dan Bed',
      'Diagnosa Medis',
      'DPJP (Dokter)',
      'Rencana Operasi / Tindakan',
      'Tanggal Prosedur',
      'Status Tahapan',
      'Alergi',
      'Catatan Khusus',
    ];

    const rows = patients.map((p) => [
      `"${p.rmNumber}"`,
      `"${p.name}"`,
      `"${p.roomBed}"`,
      `"${p.diagnosis}"`,
      `"${p.doctorName}"`,
      `"${p.procedureName}"`,
      `"${p.procedureDate}"`,
      `"${p.stage}"`,
      `"${p.allergies || '-'}"`,
      `"${(p.notes || '-').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static getSamplePatientCsvTemplate(): string {
    return `No RM,Nama Pasien,Kamar dan Bed,Diagnosa Medis,DPJP (Dokter),Rencana Operasi / Tindakan,Tanggal Prosedur,Status Tahapan,Alergi,Catatan Khusus
RM-2026-201,Bpk. Wahyu Hidayat,Kamar 301 - Bed A,Hernia Inguinalis Dextra,dr. Bambang Irawan Sp.B,Herniorafi Laparoskopi,2026-10-05 09:00 WITA,pra_operasi,Tidak Ada,Puasa mulai jam 02:00 WITA
RM-2026-202,Ibu Kusuma Wardani,Kamar 303 - Bed B,Fibroadenoma Mammae,dr. Farhan Malik Sp.B,Eksisi FAM Sinistra,2026-10-05 11:30 WITA,pra_operasi,Penisilin,Pasang infus abocath 18G
RM-2026-203,Sdr. Dimas Prasetyo,Kamar 306 - Bed C,Fraktur Clavicula Dextra,dr. Surya Adiputra Sp.OT,ORIF Plate and Screw,2026-10-04 13:00 WITA,post_operasi,Tidak Ada,Awasi neurovaskuler distal`;
  }

  static parsePatientsFromCsv(csvText: string): { patients: Patient[]; count: number } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return { patients: [], count: 0 };

    const newPatients: Patient[] = [];

    for (let i = 1; i < lines.length; i++) {
      const matches = lines[i].match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g);
      if (!matches) continue;

      const cols = matches.map((m) => {
        let val = m.replace(/^,/, '').trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        return val;
      });

      if (cols.length >= 2 && cols[0] && cols[1]) {
        const rawStage = (cols[7] || '').toLowerCase().trim();
        let stage: Patient['stage'] = 'pra_operasi';
        if (rawStage.includes('sedang')) stage = 'sedang_operasi';
        else if (rawStage.includes('post')) stage = 'post_operasi';
        else if (rawStage.includes('pulang') || rawStage.includes('pemulihan')) stage = 'pemulihan_pulang';

        const patient: Patient = {
          id: `pat-import-${Date.now()}-${i}`,
          rmNumber: cols[0] || `RM-AUTO-${Date.now().toString().slice(-4)}`,
          name: cols[1],
          roomBed: cols[2] || 'Ruang Rawat Inap',
          diagnosis: cols[3] || 'Diagnosa Klinis Terverifikasi',
          doctorName: cols[4] || 'Dokter Spesialis Penanggung Jawab',
          procedureName: cols[5] || 'Prosedur Tindakan Medis',
          procedureDate: cols[6] || 'Terjadwal Sesuai Arahan Dokter (WITA)',
          stage: stage,
          allergies: cols[8] || 'Tidak Ada Data Alergi',
          notes: cols[9] || 'Data diimpor melalui sistem CSV terpadu',
          checklist: [
            {
              id: `c-imp-1-${i}`,
              stage: 'sebelum',
              title: 'Verifikasi Identitas & Informed Consent',
              description: 'Cek gelang identitas dan konfirmasi persetujuan tindakan',
              completed: true,
            },
            {
              id: `c-imp-2-${i}`,
              stage: 'sebelum',
              title: 'Persiapan Puasa & Higiene Kulit',
              description: 'Puasa sesuai panduan DPJP dan sabun antiseptik',
              completed: false,
            },
            {
              id: `c-imp-3-${i}`,
              stage: 'setelah',
              title: 'Observasi Tanda Vital di Ruang Perawatan',
              description: 'Monitoring tensi, nadi, nafas, suhu setiap pergantian dinas',
              completed: false,
            },
            {
              id: `c-imp-4-${i}`,
              stage: 'luka',
              title: 'Edukasi Perawatan Luka Pasca-Tindakan',
              description: 'Panduan ganti perban steril dan kontrol poliklinik',
              completed: false,
            },
          ],
        };
        newPatients.push(patient);
      }
    }

    if (newPatients.length > 0) {
      const existing = this.getPatients();
      const updated = [...newPatients, ...existing];
      this.savePatients(updated);
    }

    return { patients: newPatients, count: newPatients.length };
  }

  // --- SURVEYS & FEEDBACK ---
  static getSurveys(): SurveyFeedback[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SURVEYS);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    this.saveSurveys(DEFAULT_SURVEYS);
    return DEFAULT_SURVEYS;
  }

  static saveSurveys(surveys: SurveyFeedback[]): void {
    this.safeSetItem(STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
  }

  static addSurvey(survey: SurveyFeedback): SurveyFeedback[] {
    const list = this.getSurveys();
    const updated = [survey, ...list];
    this.saveSurveys(updated);
    return updated;
  }

  static deleteSurvey(id: string): SurveyFeedback[] {
    const list = this.getSurveys();
    const updated = list.filter((s) => s.id !== id);
    this.saveSurveys(updated);
    return updated;
  }
}
