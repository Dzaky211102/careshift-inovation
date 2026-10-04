import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings } from '../types';

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'swift-totem-0cbh2',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1075833500315:web:c6969ff8ba294020ca8c3e',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDf7skq07xqeiQasx0X_xYoQZ1S2z5vENs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'swift-totem-0cbh2.firebaseapp.com',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-careshiftjadwalp-f4ef0a13-d893-49b3-831a-e7266cff7b7e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'swift-totem-0cbh2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1075833500315',
  measurementId: '',
  oAuthClientId: '1075833500315-e23t434vmh0bl7u4ih2ac1v37bqisv4d.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

function cleanForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export class FirebaseSyncService {
  private static isBootstrapped = false;

  /**
   * Seed initial data to Firestore if collections are empty
   */
  static async bootstrapData(
    defaultNurses: Nurse[],
    defaultSchedules: ShiftDuty[],
    defaultPatients: Patient[],
    defaultSettings: AppSettings,
    defaultEducation: EducationArticle[]
  ) {
    if (this.isBootstrapped) return;
    this.isBootstrapped = true;

    try {
      // 1. Settings
      const sRef = doc(db, 'settings', 'global_settings');
      const settingsSnap = await getDocs(collection(db, 'settings'));
      if (settingsSnap.empty) {
        console.log('[Firebase] Bootstrapping global settings...');
        await setDoc(sRef, cleanForFirestore(defaultSettings));
      } else {
        // Ensure shiftConfigs and dashboardImages are populated in existing settings
        const existingDoc = settingsSnap.docs.find((d) => d.id === 'global_settings');
        if (existingDoc) {
          const data = existingDoc.data() as Partial<AppSettings>;
          if (!data.shiftConfigs || data.shiftConfigs.length === 0 || !data.dashboardImages) {
            console.log('[Firebase] Upgrading existing settings with shiftConfigs & dashboardImages...');
            const upgraded: AppSettings = {
              ...defaultSettings,
              ...data,
              shiftConfigs: data.shiftConfigs && data.shiftConfigs.length > 0
                ? data.shiftConfigs
                : defaultSettings.shiftConfigs,
              dashboardImages: data.dashboardImages && data.dashboardImages.length > 0
                ? data.dashboardImages
                : defaultSettings.dashboardImages,
            };
            await setDoc(sRef, cleanForFirestore(upgraded));
          }
        }
      }

      // 2. Nurses
      const nursesSnap = await getDocs(collection(db, 'nurses'));
      if (nursesSnap.empty && defaultNurses.length > 0) {
        console.log('[Firebase] Bootstrapping initial nurses...');
        const batch = writeBatch(db);
        defaultNurses.forEach((nurse) => {
          const nRef = doc(db, 'nurses', nurse.id);
          batch.set(nRef, cleanForFirestore(nurse));
        });
        await batch.commit();
      }

      // 3. Schedules
      const schedSnap = await getDocs(collection(db, 'schedules'));
      if (schedSnap.empty && defaultSchedules.length > 0) {
        console.log('[Firebase] Bootstrapping initial schedules...');
        const batch = writeBatch(db);
        defaultSchedules.slice(0, 90).forEach((sch) => {
          const sRef = doc(db, 'schedules', `${sch.date}_${sch.shift}`);
          batch.set(sRef, cleanForFirestore(sch));
        });
        await batch.commit();
      }

      // 4. Patients
      const patientsSnap = await getDocs(collection(db, 'patients'));
      if (patientsSnap.empty && defaultPatients.length > 0) {
        console.log('[Firebase] Bootstrapping initial patients...');
        const batch = writeBatch(db);
        defaultPatients.forEach((pat) => {
          const pRef = doc(db, 'patients', pat.id);
          batch.set(pRef, cleanForFirestore(pat));
        });
        await batch.commit();
      }

      // 5. Education
      const eduSnap = await getDocs(collection(db, 'education'));
      if (eduSnap.empty && defaultEducation.length > 0) {
        console.log('[Firebase] Bootstrapping initial education...');
        const batch = writeBatch(db);
        defaultEducation.forEach((edu) => {
          const eRef = doc(db, 'education', edu.id);
          batch.set(eRef, cleanForFirestore(edu));
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('[Firebase] Bootstrapping notice:', err);
    }
  }

  // --- Real-time Listeners ---

  static subscribeSettings(onUpdate: (settings: AppSettings) => void) {
    const sRef = doc(db, 'settings', 'global_settings');
    return onSnapshot(
      sRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data() as Partial<AppSettings>;
          const safe: AppSettings = {
            hospitalName: raw.hospitalName || 'RS Citra Sehat Care',
            wardName: raw.wardName || 'Ruang Rawat Inap Teratai - Lantai 3',
            hospitalLogoUrl: raw.hospitalLogoUrl || '',
            institutionLogoUrl: raw.institutionLogoUrl || '',
            greetingMorning: raw.greetingMorning || 'Selamat Pagi! Tim Perawat Siap Melayani dengan Hati',
            greetingAfternoon: raw.greetingAfternoon || 'Selamat Siang! Tetap Semangat Menjalani Pemulihan Hari Ini',
            greetingNight: raw.greetingNight || 'Selamat Beristirahat! Perawat Jaga Siap Memantau Kenyamanan Anda',
            bannerNotice: raw.bannerNotice || '',
            footerText: raw.footerText || 'Sistem Informasi Jadwal Jaga & Edukasi Terpadu Rawat Inap RS Citra Sehat Care © 2026.',
            emergencyPhone: raw.emergencyPhone || '(0411) 7890-1122 / IGD Ext. 118',
            visitingHours: raw.visitingHours || 'Siang: 11.00 - 13.00 WITA | Sore: 17.00 - 19.00 WITA',
            homecareWhatsappNumber: raw.homecareWhatsappNumber || '6281234567890',
            homecareWhatsappMessage: raw.homecareWhatsappMessage || 'Halo Tim Home Care RS Citra Sehat Care...',
            canvaPresentationUrl: raw.canvaPresentationUrl || '',
            canvaEmbedUrl: raw.canvaEmbedUrl || '',
            themeMode: raw.themeMode || 'auto',
            accentColor: raw.accentColor || '#9333EA',
            adminPin: raw.adminPin || '1234',
            shiftConfigs:
              raw.shiftConfigs && Array.isArray(raw.shiftConfigs) && raw.shiftConfigs.length > 0
                ? raw.shiftConfigs
                : [
                    {
                      id: 'pagi',
                      name: 'Sif Pagi',
                      startTime: '07:00',
                      endTime: '14:00',
                      colorTheme: 'amber',
                    },
                    {
                      id: 'siang',
                      name: 'Sif Siang',
                      startTime: '14:00',
                      endTime: '21:00',
                      colorTheme: 'orange',
                    },
                    {
                      id: 'malam',
                      name: 'Sif Malam',
                      startTime: '21:00',
                      endTime: '07:00',
                      colorTheme: 'indigo',
                    },
                  ],
            dashboardImages:
              raw.dashboardImages && Array.isArray(raw.dashboardImages) && raw.dashboardImages.length > 0
                ? raw.dashboardImages
                : [
                    {
                      id: 'dash-img-1',
                      title: 'Maskot Perawat CareShift 3D',
                      url: 'https://images.unsplash.com/photo-1594824813524-87be361b7fcf?auto=format&fit=crop&w=800&q=80',
                      caption: 'Maskot Utama Ruangan Rawat Inap',
                      isActive: true,
                      uploadedAt: '2026-10-01',
                    },
                  ],
            selectedDashboardImageId: raw.selectedDashboardImageId || 'dash-img-1',
            googleSheets: raw.googleSheets || {
              enabled: false,
              webAppUrl: '',
              sheetId: '',
            },
          };
          onUpdate(safe);
        }
      },
      (err) => console.warn('[Firebase] Settings listener notice:', err)
    );
  }

  static async saveSettingsOnline(settings: AppSettings): Promise<void> {
    try {
      const sRef = doc(db, 'settings', 'global_settings');
      await setDoc(sRef, cleanForFirestore(settings));
    } catch (err) {
      console.error('[Firebase] Error saving settings online:', err);
      throw err;
    }
  }

  static subscribeNurses(onUpdate: (nurses: Nurse[]) => void) {
    const nCol = collection(db, 'nurses');
    return onSnapshot(
      nCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const nurses: Nurse[] = [];
          snapshot.forEach((doc) => nurses.push(doc.data() as Nurse));
          onUpdate(nurses);
        }
      },
      (err) => console.warn('[Firebase] Nurses listener notice:', err)
    );
  }

  static async saveNurseOnline(nurse: Nurse): Promise<void> {
    try {
      const nRef = doc(db, 'nurses', nurse.id);
      await setDoc(nRef, cleanForFirestore(nurse));
    } catch (err) {
      console.error('[Firebase] Error saving nurse online:', err);
      throw err;
    }
  }

  static async deleteNurseOnline(nurseId: string): Promise<void> {
    try {
      const nRef = doc(db, 'nurses', nurseId);
      await deleteDoc(nRef);
    } catch (err) {
      console.error('[Firebase] Error deleting nurse online:', err);
      throw err;
    }
  }

  static subscribeSchedules(onUpdate: (schedules: ShiftDuty[]) => void) {
    const sCol = collection(db, 'schedules');
    return onSnapshot(
      sCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const schedules: ShiftDuty[] = [];
          snapshot.forEach((doc) => schedules.push(doc.data() as ShiftDuty));
          onUpdate(schedules);
        }
      },
      (err) => console.warn('[Firebase] Schedules listener notice:', err)
    );
  }

  static async saveScheduleOnline(schedule: ShiftDuty): Promise<void> {
    try {
      const sRef = doc(db, 'schedules', `${schedule.date}_${schedule.shift}`);
      await setDoc(sRef, cleanForFirestore(schedule));
    } catch (err) {
      console.error('[Firebase] Error saving schedule online:', err);
      throw err;
    }
  }

  static subscribePatients(onUpdate: (patients: Patient[]) => void) {
    const pCol = collection(db, 'patients');
    return onSnapshot(
      pCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const patients: Patient[] = [];
          snapshot.forEach((doc) => patients.push(doc.data() as Patient));
          onUpdate(patients);
        }
      },
      (err) => console.warn('[Firebase] Patients listener notice:', err)
    );
  }

  static async savePatientOnline(patient: Patient): Promise<void> {
    try {
      const pRef = doc(db, 'patients', patient.id);
      await setDoc(pRef, cleanForFirestore(patient));
    } catch (err) {
      console.error('[Firebase] Error saving patient online:', err);
      throw err;
    }
  }

  static async deletePatientOnline(patientId: string): Promise<void> {
    try {
      const pRef = doc(db, 'patients', patientId);
      await deleteDoc(pRef);
    } catch (err) {
      console.error('[Firebase] Error deleting patient online:', err);
      throw err;
    }
  }

  static subscribeEducation(onUpdate: (articles: EducationArticle[]) => void) {
    const eCol = collection(db, 'education');
    return onSnapshot(
      eCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const articles: EducationArticle[] = [];
          snapshot.forEach((doc) => articles.push(doc.data() as EducationArticle));
          onUpdate(articles);
        }
      },
      (err) => console.warn('[Firebase] Education listener notice:', err)
    );
  }

  static async saveEducationOnline(article: EducationArticle): Promise<void> {
    try {
      const eRef = doc(db, 'education', article.id);
      await setDoc(eRef, cleanForFirestore(article));
    } catch (err) {
      console.error('[Firebase] Error saving education online:', err);
      throw err;
    }
  }

  static async deleteEducationOnline(articleId: string): Promise<void> {
    try {
      const eRef = doc(db, 'education', articleId);
      await deleteDoc(eRef);
    } catch (err) {
      console.error('[Firebase] Error deleting education online:', err);
      throw err;
    }
  }
}
