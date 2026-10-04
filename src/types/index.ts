export type ShiftType = 'pagi' | 'siang' | 'malam' | string;

export interface ShiftConfig {
  id: string; // 'pagi', 'siang', 'malam'
  name: string; // e.g. "Sif Pagi"
  startTime: string; // "07:00" in 24h
  endTime: string; // "14:00" in 24h
  colorTheme: string; // e.g. "amber" | "orange" | "indigo"
  description?: string;
}

export interface DashboardImage {
  id: string;
  title: string;
  url: string; // base64 or URL
  caption?: string;
  isActive: boolean;
  uploadedAt: string;
}

export interface Nurse {
  id: string;
  name: string;
  nip: string;
  role: 'Kepala Ruangan' | 'Katim / Perawat Primer' | 'Penanggung Jawab Shift' | 'Perawat Pelaksana' | string;
  photoUrl: string;
  isActive: boolean;
  canvaSlideNumbers?: {
    pagi?: number;
    siang?: number;
    malam?: number;
  };
}

export interface ShiftDuty {
  id: string;
  date: string; // YYYY-MM-DD (WITA)
  shift: ShiftType;
  nurseIds: string[]; // No limit! Can be 0, 1, 2, 7, 10, etc.
  notes?: string;
  updatedAt: string;
}

export interface PatientChecklistItem {
  id: string;
  stage: 'sebelum' | 'setelah' | 'luka';
  title: string;
  description: string;
  completed: boolean;
}

export interface Patient {
  id: string;
  rmNumber: string;
  name: string;
  dateOfBirth?: string;
  gender?: 'L' | 'P';
  roomBed: string;
  diagnosis: string;
  doctorName: string;
  procedureName: string;
  procedureDate: string;
  stage: 'pra_operasi' | 'sedang_operasi' | 'post_operasi' | 'pemulihan_pulang';
  allergies?: string;
  notes?: string;
  checklist?: PatientChecklistItem[];
}

export interface EducationArticle {
  id: string;
  category: 'sebelum_operasi' | 'setelah_operasi' | 'perawatan_luka' | 'umum';
  title: string;
  summary: string;
  content: string[];
  imageUrl?: string;
  videoUrl?: string;
  externalLink?: {
    title: string;
    url: string;
  };
  tags: string[];
}

export interface AppSettings {
  hospitalName: string;
  wardName: string;
  hospitalLogoUrl: string;
  institutionLogoUrl: string;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingNight: string;
  bannerNotice: string;
  footerText: string;
  emergencyPhone: string;
  visitingHours: string;
  homecareWhatsappNumber: string;
  homecareWhatsappMessage: string;
  canvaPresentationUrl: string;
  canvaEmbedUrl: string;
  themeMode: 'auto' | 'pagi' | 'siang' | 'malam';
  accentColor: string;
  dashboardColorTheme?: 'purple' | 'teal' | 'blue' | 'emerald' | 'rose' | 'indigo' | string;
  adminPin: string;
  shiftConfigs: ShiftConfig[];
  dashboardImages: DashboardImage[];
  selectedDashboardImageId?: string;
  googleSheets: {
    enabled: boolean;
    webAppUrl: string;
    sheetId: string;
    lastSyncedAt?: string;
  };
}
