import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings, SurveyFeedback, WardInfo, WardExportPackage } from '../types';
import {
  DEFAULT_NURSES,
  DEFAULT_PATIENTS,
  DEFAULT_EDUCATION_ARTICLES,
  DEFAULT_SETTINGS,
  DEFAULT_SURVEYS,
  DEFAULT_WARDS,
  DEFAULT_NURSES_MELATI,
  DEFAULT_PATIENTS_MELATI,
  generateInitialMonthlySchedules,
} from './defaultData';
import { determineActiveShift } from '../utils/witaTime';
import {
  saveEducationArticlesIDB,
  getEducationArticlesIDB,
} from './indexedDb';

export const STORAGE_KEYS = {
  WARDS: 'careshift_wards_v2',
  ACTIVE_WARD_ID: 'careshift_active_ward_id_v2',
  NURSES: 'careshift_nurses_v2',
  PATIENTS: 'careshift_patients_v2',
  SCHEDULES: 'careshift_schedules_v2',
  EDUCATION: 'careshift_education_v2',
  SETTINGS: 'careshift_settings_v2',
  IS_ADMIN: 'careshift_is_admin_v2',
  SURVEYS: 'careshift_surveys_v2',
  SURVEYS_DELETED_IDS: 'careshift_deleted_survey_ids_v2',
  SURVEYS_DEFAULT_CLEARED: 'careshift_default_surveys_cleared_v2',
  TV_SLIDE_DURATION: 'careshift_tv_slide_duration',
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
          return true;
        } catch (subErr) {
          console.warn('[StorageService] Fallback lightweight save also failed:', subErr);
        }
      }

      return false;
    }
  }

  // --- WARDS & ROOM MANAGEMENT ---
  static getWards(): WardInfo[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WARDS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    this.saveWards(DEFAULT_WARDS);
    return DEFAULT_WARDS;
  }

  static saveWards(wards: WardInfo[]): void {
    this.safeSetItem(STORAGE_KEYS.WARDS, JSON.stringify(wards));
  }

  static getActiveWardId(): string {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlWard = params.get('ward');
      if (urlWard && urlWard.trim()) {
        const clean = urlWard.trim().toLowerCase();
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_WARD_ID, clean);
        } catch {}
        return clean;
      }
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_WARD_ID);
        if (stored && stored.trim()) return stored.trim().toLowerCase();
      } catch {}
    }
    return 'teratai';
  }

  static setActiveWardId(wardId: string): void {
    const clean = (wardId || 'teratai').trim().toLowerCase();
    this.safeSetItem(STORAGE_KEYS.ACTIVE_WARD_ID, clean);
  }

  static getWardKey(wardId: string, baseKey: string): string {
    const clean = (wardId || 'teratai').trim().toLowerCase();
    return `careshift_ward_${clean}_${baseKey}`;
  }

  // --- NURSES (Per-Ward Isolation) ---
  static getNurses(wardId?: string): Nurse[] {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    const wardKey = this.getWardKey(targetWard, 'nurses');
    try {
      const data = localStorage.getItem(wardKey);
      if (data) return JSON.parse(data);

      // Backward-compat for default ward 'teratai'
      if (targetWard === 'teratai') {
        const legacy = localStorage.getItem(STORAGE_KEYS.NURSES);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          this.saveNurses(parsed, 'teratai');
          return parsed;
        }
      }
    } catch {}

    if (targetWard === 'melati') {
      this.saveNurses(DEFAULT_NURSES_MELATI, 'melati');
      return DEFAULT_NURSES_MELATI;
    }

    this.saveNurses(DEFAULT_NURSES, targetWard);
    return DEFAULT_NURSES;
  }

  static saveNurses(nurses: Nurse[], wardId?: string): void {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    this.safeSetItem(this.getWardKey(targetWard, 'nurses'), JSON.stringify(nurses));
    if (targetWard === 'teratai') {
      this.safeSetItem(STORAGE_KEYS.NURSES, JSON.stringify(nurses));
    }
  }

  // --- SCHEDULES (Per-Ward Isolation) ---
  static getSchedules(wardId?: string): ShiftDuty[] {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    const wardKey = this.getWardKey(targetWard, 'schedules');
    try {
      const data = localStorage.getItem(wardKey);
      if (data) return JSON.parse(data);

      if (targetWard === 'teratai') {
        const legacy = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          this.saveSchedules(parsed, 'teratai');
          return parsed;
        }
      }
    } catch {}

    const initial = generateInitialMonthlySchedules();
    this.saveSchedules(initial, targetWard);
    return initial;
  }

  static saveSchedules(schedules: ShiftDuty[], wardId?: string): void {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    this.safeSetItem(this.getWardKey(targetWard, 'schedules'), JSON.stringify(schedules));
    if (targetWard === 'teratai') {
      this.safeSetItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }
  }

  static setSchedule(duty: ShiftDuty, wardId?: string): void {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    const schedules = this.getSchedules(targetWard);
    const idx = schedules.findIndex(
      (s) => s.date === duty.date && s.shift === duty.shift
    );
    if (idx >= 0) {
      schedules[idx] = { ...duty, updatedAt: new Date().toISOString() };
    } else {
      schedules.push({ ...duty, updatedAt: new Date().toISOString() });
    }
    this.saveSchedules(schedules, targetWard);
  }

  // --- PATIENTS (Per-Ward Isolation) ---
  static getPatients(wardId?: string): Patient[] {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    const wardKey = this.getWardKey(targetWard, 'patients');
    try {
      const data = localStorage.getItem(wardKey);
      if (data) return JSON.parse(data);

      if (targetWard === 'teratai') {
        const legacy = localStorage.getItem(STORAGE_KEYS.PATIENTS);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          this.savePatients(parsed, 'teratai');
          return parsed;
        }
      }
    } catch {}

    if (targetWard === 'melati') {
      this.savePatients(DEFAULT_PATIENTS_MELATI, 'melati');
      return DEFAULT_PATIENTS_MELATI;
    }

    this.savePatients(DEFAULT_PATIENTS, targetWard);
    return DEFAULT_PATIENTS;
  }

  static savePatients(patients: Patient[], wardId?: string): void {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    this.safeSetItem(this.getWardKey(targetWard, 'patients'), JSON.stringify(patients));
    if (targetWard === 'teratai') {
      this.safeSetItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    }
  }

  // --- SETTINGS (Per-Ward Isolation) ---
  static getSettings(wardId?: string): AppSettings {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    const wardKey = this.getWardKey(targetWard, 'settings');
    try {
      const data = localStorage.getItem(wardKey);
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

      if (targetWard === 'teratai') {
        const legacy = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          const full = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            shiftConfigs: parsed.shiftConfigs || DEFAULT_SETTINGS.shiftConfigs,
            dashboardImages: parsed.dashboardImages || DEFAULT_SETTINGS.dashboardImages,
            dashboardColorTheme: parsed.dashboardColorTheme || DEFAULT_SETTINGS.dashboardColorTheme || 'purple',
          };
          this.saveSettings(full, 'teratai');
          return full;
        }
      }
    } catch {}

    if (targetWard === 'melati') {
      const melatiSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        wardName: 'Ruang Rawat Inap Melati - Lantai 2',
        dashboardColorTheme: 'teal',
        footerText: 'Sistem Informasi Jadwal Jaga & Edukasi Terpadu Ruang Melati RS Citra Sehat Care © 2026.',
      };
      this.saveSettings(melatiSettings, 'melati');
      return melatiSettings;
    }

    this.saveSettings(DEFAULT_SETTINGS, targetWard);
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings, wardId?: string): void {
    const targetWard = (wardId || this.getActiveWardId()).trim().toLowerCase();
    this.safeSetItem(this.getWardKey(targetWard, 'settings'), JSON.stringify(settings));
    if (targetWard === 'teratai') {
      this.safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }

  // --- DUPLICATE & CLONE WARD ---
  static duplicateWard(
    sourceWardId: string,
    newWard: WardInfo,
    options: {
      copyNurses?: boolean;
      copySchedules?: boolean;
      copySettings?: boolean;
      copyPatients?: boolean;
    } = { copyNurses: true, copySchedules: true, copySettings: true, copyPatients: false }
  ): WardInfo {
    const source = (sourceWardId || 'teratai').trim().toLowerCase();
    const target = newWard.id.trim().toLowerCase();

    // 1. Settings
    const sourceSettings = this.getSettings(source);
    const newSettings: AppSettings = {
      ...sourceSettings,
      wardName: newWard.name,
      dashboardColorTheme: newWard.colorTheme || 'teal',
      footerText: `Sistem Informasi Jadwal Jaga & Edukasi Terpadu ${newWard.name} © 2026.`,
    };
    this.saveSettings(newSettings, target);

    // 2. Nurses
    if (options.copyNurses !== false) {
      const sourceNurses = this.getNurses(source);
      const clonedNurses: Nurse[] = sourceNurses.map((n, idx) => ({
        ...n,
        id: `${target}-nurse-${idx + 1}`,
      }));
      this.saveNurses(clonedNurses, target);
    } else {
      this.saveNurses([], target);
    }

    // 3. Schedules
    if (options.copySchedules !== false) {
      const sourceSchedules = this.getSchedules(source);
      const clonedSchedules: ShiftDuty[] = sourceSchedules.map((s) => ({
        ...s,
        id: `duty-${target}-${s.date}-${s.shift}`,
        notes: `Tim Dinas Sif ${s.shift.toUpperCase()} - ${newWard.name}`,
      }));
      this.saveSchedules(clonedSchedules, target);
    } else {
      const initialSchedules = generateInitialMonthlySchedules();
      this.saveSchedules(initialSchedules, target);
    }

    // 4. Patients
    if (options.copyPatients) {
      const sourcePatients = this.getPatients(source);
      const floorDigit = newWard.floor ? newWard.floor.replace(/\D/g, '') || '2' : '2';
      const clonedPatients: Patient[] = sourcePatients.map((p, idx) => ({
        ...p,
        id: `pat-${target}-${idx + 1}`,
        roomBed: p.roomBed.replace(/Kamar \d+/, `Kamar ${floorDigit}0${idx + 1}`),
      }));
      this.savePatients(clonedPatients, target);
    } else {
      this.savePatients([], target);
    }

    // 5. Update wards list
    const currentWards = this.getWards();
    const filtered = currentWards.filter((w) => w.id !== target);
    const updatedWards = [...filtered, newWard];
    this.saveWards(updatedWards);

    // 6. Set as active ward
    this.setActiveWardId(target);
    return newWard;
  }

  // --- DELETE WARD ---
  static deleteWard(wardId: string): boolean {
    const clean = wardId.trim().toLowerCase();
    const currentWards = this.getWards();
    if (currentWards.length <= 1) return false;

    const filtered = currentWards.filter((w) => w.id !== clean);
    this.saveWards(filtered);

    if (this.getActiveWardId() === clean) {
      this.setActiveWardId(filtered[0].id);
    }
    return true;
  }

  // --- UPDATE WARD ---
  static updateWard(wardId: string, updatedInfo: Partial<WardInfo>): WardInfo | null {
    const clean = wardId.trim().toLowerCase();
    const wards = this.getWards();
    const idx = wards.findIndex((w) => w.id === clean);
    if (idx < 0) return null;

    const current = wards[idx];
    const updatedWard: WardInfo = {
      ...current,
      ...updatedInfo,
      id: current.id,
    };
    wards[idx] = updatedWard;
    this.saveWards(wards);

    // Sync wardName and colorTheme into settings for that ward
    if (updatedInfo.name || updatedInfo.colorTheme) {
      const currentSettings = this.getSettings(clean);
      const updatedSettings: AppSettings = {
        ...currentSettings,
        wardName: updatedInfo.name || currentSettings.wardName,
        dashboardColorTheme: updatedInfo.colorTheme || currentSettings.dashboardColorTheme || 'purple',
      };
      this.saveSettings(updatedSettings, clean);
    }

    return updatedWard;
  }

  // --- EXPORT & IMPORT WARD JSON ---
  static exportWardJson(wardId?: string): string {
    const target = (wardId || this.getActiveWardId()).trim().toLowerCase();
    const ward = this.getWards().find((w) => w.id === target) || {
      id: target,
      name: `Ruang ${target}`,
      code: target.toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    const pkg: WardExportPackage = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      ward,
      settings: this.getSettings(target),
      nurses: this.getNurses(target),
      schedules: this.getSchedules(target),
      patients: this.getPatients(target),
    };
    return JSON.stringify(pkg, null, 2);
  }

  static importWardJson(jsonStr: string): WardInfo {
    const parsed = JSON.parse(jsonStr) as Partial<WardExportPackage>;
    if (!parsed.ward || !parsed.ward.id || !parsed.ward.name) {
      throw new Error('Format file backup ruangan tidak valid.');
    }
    const ward: WardInfo = {
      id: parsed.ward.id.trim().toLowerCase(),
      name: parsed.ward.name,
      code: parsed.ward.code || parsed.ward.id.toUpperCase(),
      floor: parsed.ward.floor || '',
      building: parsed.ward.building || '',
      colorTheme: parsed.ward.colorTheme || 'teal',
      description: parsed.ward.description || '',
      createdAt: parsed.ward.createdAt || new Date().toISOString(),
    };

    if (parsed.settings) this.saveSettings(parsed.settings, ward.id);
    if (parsed.nurses) this.saveNurses(parsed.nurses, ward.id);
    if (parsed.schedules) this.saveSchedules(parsed.schedules, ward.id);
    if (parsed.patients) this.savePatients(parsed.patients, ward.id);

    const wards = this.getWards();
    const filtered = wards.filter((w) => w.id !== ward.id);
    this.saveWards([...filtered, ward]);
    this.setActiveWardId(ward.id);
    return ward;
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
  static getDeletedSurveyIds(): Set<string> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SURVEYS_DELETED_IDS);
      if (data) return new Set(JSON.parse(data));
    } catch {
      // Fallback
    }
    return new Set<string>();
  }

  static addDeletedSurveyId(id: string): void {
    try {
      const set = this.getDeletedSurveyIds();
      set.add(id);
      localStorage.setItem(
        STORAGE_KEYS.SURVEYS_DELETED_IDS,
        JSON.stringify(Array.from(set))
      );
    } catch {
      // Ignore
    }
  }

  static addDeletedSurveyIds(ids: string[]): void {
    try {
      const set = this.getDeletedSurveyIds();
      ids.forEach((id) => set.add(id));
      localStorage.setItem(
        STORAGE_KEYS.SURVEYS_DELETED_IDS,
        JSON.stringify(Array.from(set))
      );
    } catch {
      // Ignore
    }
  }

  static isDefaultSurveysCleared(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.SURVEYS_DEFAULT_CLEARED) === 'true';
    } catch {
      return false;
    }
  }

  static setDefaultSurveysCleared(cleared: boolean): void {
    try {
      if (cleared) {
        localStorage.setItem(STORAGE_KEYS.SURVEYS_DEFAULT_CLEARED, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEYS.SURVEYS_DEFAULT_CLEARED);
      }
    } catch {
      // Ignore
    }
  }

  static getSurveys(): SurveyFeedback[] {
    const deletedIds = this.getDeletedSurveyIds();
    const isDefaultCleared = this.isDefaultSurveysCleared();
    const defaultIds = ['survey-1', 'survey-2', 'survey-3', 'survey-4'];

    try {
      const data = localStorage.getItem(STORAGE_KEYS.SURVEYS);
      if (data !== null) {
        const parsed = JSON.parse(data) as SurveyFeedback[];
        return parsed.filter(
          (s) =>
            !deletedIds.has(s.id) &&
            (!isDefaultCleared || !defaultIds.includes(s.id))
        );
      }
    } catch {
      // Fallback
    }

    if (isDefaultCleared) {
      this.saveSurveys([]);
      return [];
    }

    const initial = DEFAULT_SURVEYS.filter((s) => !deletedIds.has(s.id));
    this.saveSurveys(initial);
    return initial;
  }

  static saveSurveys(surveys: SurveyFeedback[]): void {
    const deletedIds = this.getDeletedSurveyIds();
    const isDefaultCleared = this.isDefaultSurveysCleared();
    const defaultIds = ['survey-1', 'survey-2', 'survey-3', 'survey-4'];

    const filtered = surveys.filter(
      (s) =>
        !deletedIds.has(s.id) &&
        (!isDefaultCleared || !defaultIds.includes(s.id))
    );
    this.safeSetItem(STORAGE_KEYS.SURVEYS, JSON.stringify(filtered));
  }

  static addSurvey(survey: SurveyFeedback): SurveyFeedback[] {
    const list = this.getSurveys();
    const updated = [survey, ...list.filter((s) => s.id !== survey.id)];
    this.saveSurveys(updated);
    return updated;
  }

  static deleteSurvey(id: string): SurveyFeedback[] {
    this.addDeletedSurveyId(id);
    const list = this.getSurveys();
    const updated = list.filter((s) => s.id !== id);
    this.saveSurveys(updated);
    return updated;
  }

  static clearDefaultSurveys(): SurveyFeedback[] {
    const defaultIds = ['survey-1', 'survey-2', 'survey-3', 'survey-4'];
    this.setDefaultSurveysCleared(true);
    this.addDeletedSurveyIds(defaultIds);
    const list = this.getSurveys();
    const updated = list.filter((s) => !defaultIds.includes(s.id));
    this.saveSurveys(updated);
    return updated;
  }

  static clearAllSurveys(): SurveyFeedback[] {
    const list = this.getSurveys();
    this.setDefaultSurveysCleared(true);
    this.addDeletedSurveyIds(list.map((s) => s.id));
    this.saveSurveys([]);
    return [];
  }

  // --- TV DISPLAY SETTINGS ---
  static getTvSlideDuration(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.TV_SLIDE_DURATION);
      if (val) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 3 && num <= 60) {
          return num;
        }
      }
    } catch {
      // Ignore fallback
    }
    return 8;
  }

  static saveTvSlideDuration(durationSeconds: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TV_SLIDE_DURATION, durationSeconds.toString());
    } catch {
      // Ignore fallback
    }
  }
}

