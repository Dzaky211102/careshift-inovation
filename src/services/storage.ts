import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings } from '../types';
import {
  DEFAULT_NURSES,
  DEFAULT_PATIENTS,
  DEFAULT_EDUCATION_ARTICLES,
  DEFAULT_SETTINGS,
  generateInitialMonthlySchedules,
} from './defaultData';
import { determineActiveShift } from '../utils/witaTime';

export const STORAGE_KEYS = {
  NURSES: 'careshift_nurses_v2',
  PATIENTS: 'careshift_patients_v2',
  SCHEDULES: 'careshift_schedules_v2',
  EDUCATION: 'careshift_education_v2',
  SETTINGS: 'careshift_settings_v2',
  IS_ADMIN: 'careshift_is_admin_v2',
};

export class StorageService {
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
    localStorage.setItem(STORAGE_KEYS.NURSES, JSON.stringify(nurses));
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
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
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
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  }

  // --- EDUCATION ---
  static getEducationArticles(): EducationArticle[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EDUCATION);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    this.saveEducationArticles(DEFAULT_EDUCATION_ARTICLES);
    return DEFAULT_EDUCATION_ARTICLES;
  }

  static saveEducationArticles(articles: EducationArticle[]): void {
    localStorage.setItem(STORAGE_KEYS.EDUCATION, JSON.stringify(articles));
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
        };
      }
    } catch {
      // Fallback
    }
    this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- ADMIN STATUS ---
  static getIsAdmin(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
  }

  static setIsAdmin(isAdmin: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN, isAdmin ? 'true' : 'false');
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
}
