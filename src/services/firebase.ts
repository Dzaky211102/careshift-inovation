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
  getDoc,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings, SurveyFeedback, WardInfo } from '../types';

export interface SurveysMeta {
  bootstrapped?: boolean;
  defaultSurveysCleared?: boolean;
  deletedSurveyIds?: string[];
}

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: '',
  oAuthClientId: '',
  recaptchaSiteKey: '',
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (err) {
    console.warn('[Firebase] Initialization notice:', err);
    app = null;
    db = null;
  }
}

export { app, db };

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
    defaultEducation: EducationArticle[],
    defaultSurveys: SurveyFeedback[] = [],
    defaultWards: WardInfo[] = []
  ) {
    if (!db || this.isBootstrapped) return;
    this.isBootstrapped = true;

    try {
      // 0. Wards collection
      if (defaultWards.length > 0) {
        const wardsSnap = await getDocs(collection(db, 'wards'));
        if (wardsSnap.empty) {
          console.log('[Firebase] Bootstrapping initial wards...');
          const batch = writeBatch(db);
          defaultWards.forEach((ward) => {
            if (!db) return;
            const wRef = doc(db, 'wards', ward.id.trim().toLowerCase());
            batch.set(wRef, cleanForFirestore(ward));
          });
          await batch.commit();
        }
      }

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
              shiftConfigs:
                data.shiftConfigs && data.shiftConfigs.length > 0
                  ? data.shiftConfigs
                  : defaultSettings.shiftConfigs,
              dashboardImages:
                data.dashboardImages && data.dashboardImages.length > 0
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
          if (!db) return;
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
          if (!db) return;
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
          if (!db) return;
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
          if (!db) return;
          const eRef = doc(db, 'education', edu.id);
          batch.set(eRef, cleanForFirestore(edu));
        });
        await batch.commit();
      }

      // 6. Surveys: check cloud metadata first so no device resurrects deleted surveys
      const metaRef = doc(db, 'settings', 'surveys_meta');
      let isCloudBootstrapped = false;
      let isCloudMetaCleared = false;
      try {
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) {
          const m = metaSnap.data() as SurveysMeta;
          isCloudBootstrapped = Boolean(m.bootstrapped);
          isCloudMetaCleared = Boolean(m.defaultSurveysCleared);
        }
      } catch (mErr) {
        console.warn('[Firebase] Survey meta check notice:', mErr);
      }

      // If cloud already recorded bootstrap or that default surveys were cleared, NEVER re-seed!
      if (!isCloudBootstrapped && !isCloudMetaCleared) {
        const surSnap = await getDocs(collection(db, 'surveys'));
        if (surSnap.empty && defaultSurveys.length > 0) {
          console.log('[Firebase] Bootstrapping initial surveys...');
          const batch = writeBatch(db);
          defaultSurveys.forEach((sur) => {
            if (!db) return;
            const sRef = doc(db, 'surveys', sur.id);
            batch.set(sRef, cleanForFirestore(sur));
          });
          batch.set(metaRef, {
            bootstrapped: true,
            defaultSurveysCleared: false,
            deletedSurveyIds: [],
          });
          await batch.commit();
        } else {
          await setDoc(
            metaRef,
            { bootstrapped: true, defaultSurveysCleared: false, deletedSurveyIds: [] },
            { merge: true }
          );
        }
      }
    } catch (err) {
      console.warn('[Firebase] Bootstrapping notice:', err);
    }
  }

  // --- Real-time Listeners ---

  static subscribeSettings(onUpdate: (settings: AppSettings) => void) {
    if (!db) return () => {};
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
            satisfactionSurveyGoogleFormUrl:
              raw.satisfactionSurveyGoogleFormUrl !== undefined
                ? raw.satisfactionSurveyGoogleFormUrl
                : 'https://docs.google.com/forms/d/e/1FAIpQLSc_ExampleGoogleFormSurvey/viewform',
            satisfactionSurveyEnabled:
              raw.satisfactionSurveyEnabled !== undefined ? raw.satisfactionSurveyEnabled : true,
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
    if (!db) return;
    try {
      const sRef = doc(db, 'settings', 'global_settings');
      await setDoc(sRef, cleanForFirestore(settings));
    } catch (err) {
      console.warn('[Firebase] Notice saving settings online:', err);
    }
  }

  static subscribeNurses(onUpdate: (nurses: Nurse[]) => void) {
    if (!db) return () => {};
    const nCol = collection(db, 'nurses');
    return onSnapshot(
      nCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const nurses: Nurse[] = [];
          snapshot.forEach((d) => nurses.push(d.data() as Nurse));
          onUpdate(nurses);
        }
      },
      (err) => console.warn('[Firebase] Nurses listener notice:', err)
    );
  }

  static async saveNurseOnline(nurse: Nurse): Promise<void> {
    if (!db) return;
    try {
      const nRef = doc(db, 'nurses', nurse.id);
      await setDoc(nRef, cleanForFirestore(nurse));
    } catch (err) {
      console.warn('[Firebase] Notice saving nurse online:', err);
    }
  }

  static async deleteNurseOnline(nurseId: string): Promise<void> {
    if (!db) return;
    try {
      const nRef = doc(db, 'nurses', nurseId);
      await deleteDoc(nRef);
    } catch (err) {
      console.warn('[Firebase] Notice deleting nurse online:', err);
    }
  }

  static subscribeSchedules(onUpdate: (schedules: ShiftDuty[]) => void) {
    if (!db) return () => {};
    const sCol = collection(db, 'schedules');
    return onSnapshot(
      sCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const schedules: ShiftDuty[] = [];
          snapshot.forEach((d) => schedules.push(d.data() as ShiftDuty));
          onUpdate(schedules);
        }
      },
      (err) => console.warn('[Firebase] Schedules listener notice:', err)
    );
  }

  static async saveScheduleOnline(schedule: ShiftDuty): Promise<void> {
    if (!db) return;
    try {
      const sRef = doc(db, 'schedules', `${schedule.date}_${schedule.shift}`);
      await setDoc(sRef, cleanForFirestore(schedule));
    } catch (err) {
      console.warn('[Firebase] Notice saving schedule online:', err);
    }
  }

  static subscribePatients(onUpdate: (patients: Patient[]) => void) {
    if (!db) return () => {};
    const pCol = collection(db, 'patients');
    return onSnapshot(
      pCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const patients: Patient[] = [];
          snapshot.forEach((d) => patients.push(d.data() as Patient));
          onUpdate(patients);
        }
      },
      (err) => console.warn('[Firebase] Patients listener notice:', err)
    );
  }

  static async savePatientOnline(patient: Patient): Promise<void> {
    if (!db) return;
    try {
      const pRef = doc(db, 'patients', patient.id);
      await setDoc(pRef, cleanForFirestore(patient));
    } catch (err) {
      console.warn('[Firebase] Notice saving patient online:', err);
    }
  }

  static async deletePatientOnline(patientId: string): Promise<void> {
    if (!db) return;
    try {
      const pRef = doc(db, 'patients', patientId);
      await deleteDoc(pRef);
    } catch (err) {
      console.warn('[Firebase] Notice deleting patient online:', err);
    }
  }

  static subscribeEducation(onUpdate: (articles: EducationArticle[]) => void) {
    if (!db) return () => {};
    const eCol = collection(db, 'education');
    return onSnapshot(
      eCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const articles: EducationArticle[] = [];
          snapshot.forEach((d) => articles.push(d.data() as EducationArticle));
          onUpdate(articles);
        }
      },
      (err) => console.warn('[Firebase] Education listener notice:', err)
    );
  }

  static async saveEducationOnline(article: EducationArticle): Promise<void> {
    if (!db) return;
    try {
      const eRef = doc(db, 'education', article.id);
      await setDoc(eRef, cleanForFirestore(article));
    } catch (err) {
      console.warn('[Firebase] Notice saving education online:', err);
    }
  }

  static async deleteEducationOnline(articleId: string): Promise<void> {
    if (!db) return;
    try {
      const eRef = doc(db, 'education', articleId);
      await deleteDoc(eRef);
    } catch (err) {
      console.warn('[Firebase] Notice deleting education online:', err);
    }
  }

  // --- Surveys & Feedback ---
  static subscribeSurveys(onUpdate: (surveys: SurveyFeedback[]) => void) {
    if (!db) return () => {};
    const sCol = collection(db, 'surveys');
    return onSnapshot(
      sCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: SurveyFeedback[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as SurveyFeedback;
            if (data && data.id) {
              list.push(data);
            }
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onUpdate(list);
        } else {
          onUpdate([]);
        }
      },
      (err) => console.warn('[Firebase] Surveys listener notice:', err)
    );
  }

  static subscribeSurveyMeta(onUpdate: (meta: SurveysMeta) => void) {
    if (!db) return () => {};
    const metaRef = doc(db, 'settings', 'surveys_meta');
    return onSnapshot(
      metaRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as SurveysMeta);
        }
      },
      (err) => console.warn('[Firebase] Survey meta listener notice:', err)
    );
  }

  static async saveSurveyOnline(survey: SurveyFeedback): Promise<void> {
    if (!db) return;
    try {
      const sRef = doc(db, 'surveys', survey.id);
      await setDoc(sRef, cleanForFirestore(survey));
    } catch (err) {
      console.warn('[Firebase] Notice saving survey online:', err);
    }
  }

  static async deleteSurveyOnline(surveyId: string): Promise<void> {
    if (!db) return;
    try {
      const sRef = doc(db, 'surveys', surveyId);
      await deleteDoc(sRef);
      const metaRef = doc(db, 'settings', 'surveys_meta');
      await setDoc(
        metaRef,
        {
          bootstrapped: true,
          deletedSurveyIds: arrayUnion(surveyId),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Firebase] Notice deleting survey online:', err);
    }
  }

  static async clearDefaultSurveysOnline(defaultIds: string[]): Promise<void> {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      defaultIds.forEach((id) => {
        if (!db) return;
        batch.delete(doc(db, 'surveys', id));
      });
      const metaRef = doc(db, 'settings', 'surveys_meta');
      batch.set(
        metaRef,
        {
          bootstrapped: true,
          defaultSurveysCleared: true,
          deletedSurveyIds: arrayUnion(...defaultIds),
        },
        { merge: true }
      );
      await batch.commit();
    } catch (err) {
      console.warn('[Firebase] Notice clearing default surveys online:', err);
    }
  }

  static async clearAllSurveysOnline(surveyIds: string[]): Promise<void> {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      surveyIds.forEach((id) => {
        if (!db) return;
        batch.delete(doc(db, 'surveys', id));
      });
      const metaRef = doc(db, 'settings', 'surveys_meta');
      batch.set(
        metaRef,
        {
          bootstrapped: true,
          defaultSurveysCleared: true,
          deletedSurveyIds: arrayUnion(...surveyIds),
        },
        { merge: true }
      );
      await batch.commit();
    } catch (err) {
      console.warn('[Firebase] Notice clearing all surveys online:', err);
    }
  }

  // --- Wards & Room Management ---
  static subscribeWards(onUpdate: (wards: WardInfo[]) => void) {
    if (!db) return () => {};
    const wCol = collection(db, 'wards');
    return onSnapshot(
      wCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: WardInfo[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as WardInfo;
            if (data && data.id && data.name) {
              list.push(data);
            }
          });
          if (list.length > 0) {
            onUpdate(list);
          }
        }
      },
      (err) => console.warn('[Firebase] Wards listener notice:', err)
    );
  }

  static async saveWardOnline(ward: WardInfo): Promise<void> {
    if (!db || !ward || !ward.id) return;
    try {
      const cleanId = ward.id.trim().toLowerCase();
      const wRef = doc(db, 'wards', cleanId);
      await setDoc(wRef, cleanForFirestore({ ...ward, id: cleanId }), { merge: true });
    } catch (err) {
      console.warn('[Firebase] Notice saving ward online:', err);
    }
  }

  static async saveWardsOnline(wards: WardInfo[]): Promise<void> {
    if (!db || !Array.isArray(wards) || wards.length === 0) return;
    try {
      const batch = writeBatch(db);
      wards.forEach((ward) => {
        if (!db || !ward || !ward.id) return;
        const cleanId = ward.id.trim().toLowerCase();
        const wRef = doc(db, 'wards', cleanId);
        batch.set(wRef, cleanForFirestore({ ...ward, id: cleanId }), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      console.warn('[Firebase] Notice saving all wards online:', err);
    }
  }

  static async deleteWardOnline(wardId: string): Promise<void> {
    if (!db || !wardId) return;
    try {
      const cleanId = wardId.trim().toLowerCase();
      const wRef = doc(db, 'wards', cleanId);
      await deleteDoc(wRef);
    } catch (err) {
      console.warn('[Firebase] Notice deleting ward online:', err);
    }
  }
}
