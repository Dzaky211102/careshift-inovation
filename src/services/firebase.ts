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
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings, SurveyFeedback, WardInfo } from '../types';
import appletConfig from '../../firebase-applet-config.json';

export interface SurveysMeta {
  bootstrapped?: boolean;
  defaultSurveysCleared?: boolean;
  deletedSurveyIds?: string[];
}

export type SyncStatusState = 'loading' | 'synced' | 'saving' | 'offline' | 'error';

export interface SyncStatusInfo {
  state: SyncStatusState;
  label: string;
  detail?: string;
  lastSyncAt: Date;
}

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '',
  measurementId: '',
  oAuthClientId: appletConfig.oAuthClientId || '',
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
    console.log('[Firebase] Cloud Firestore initialized successfully for database:', firebaseConfig.firestoreDatabaseId || 'default');
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

// Global sync status listeners
type SyncStatusListener = (status: SyncStatusInfo) => void;
const syncStatusListeners = new Set<SyncStatusListener>();

let currentSyncStatus: SyncStatusInfo = {
  state: isFirebaseConfigured ? 'loading' : 'offline',
  label: isFirebaseConfigured ? 'Memuat data Cloud...' : 'Mode Offline (Lokal)',
  lastSyncAt: new Date(),
};

function updateSyncStatus(state: SyncStatusState, label: string, detail?: string) {
  currentSyncStatus = {
    state,
    label,
    detail,
    lastSyncAt: new Date(),
  };
  syncStatusListeners.forEach((listener) => {
    try {
      listener(currentSyncStatus);
    } catch (err) {
      console.warn('[Firebase] Status listener error:', err);
    }
  });
}

// Online / Offline window listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (db) {
      enableNetwork(db).catch(() => {});
    }
    updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
  });

  window.addEventListener('offline', () => {
    updateSyncStatus('offline', 'Mode Offline (Tersimpan Lokal)');
  });
}

export class FirebaseSyncService {
  private static bootstrappedWards = new Set<string>();

  public static getSyncStatus(): SyncStatusInfo {
    return currentSyncStatus;
  }

  public static subscribeSyncStatus(listener: SyncStatusListener): () => void {
    syncStatusListeners.add(listener);
    listener(currentSyncStatus);
    return () => {
      syncStatusListeners.delete(listener);
    };
  }

  // --- 0. WARD MANAGEMENT & DISCOVERY ---

  /**
   * Listen to all wards in real-time across devices
   */
  static subscribeWards(onUpdate: (wards: WardInfo[]) => void): () => void {
    if (!db) {
      updateSyncStatus('offline', 'Mode Offline (Lokal)');
      return () => {};
    }

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
            updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
            onUpdate(list);
          }
        } else {
          updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
        }
      },
      (err) => {
        console.warn('[Firebase] Wards listener notice:', err);
        updateSyncStatus('error', 'Gagal memuat ruangan online', err.message);
      }
    );
  }

  static async saveWardOnline(ward: WardInfo): Promise<void> {
    if (!db || !ward || !ward.id) return;
    updateSyncStatus('saving', 'Menyimpan nama ruangan...');
    try {
      const cleanId = ward.id.trim().toLowerCase();
      const wRef = doc(db, 'wards', cleanId);
      await setDoc(wRef, cleanForFirestore({ ...ward, id: cleanId }), { merge: true });
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving ward online:', err);
      updateSyncStatus('error', 'Gagal menyimpan ruangan ke Cloud', err?.message);
    }
  }

  static async saveWardsOnline(wards: WardInfo[]): Promise<void> {
    if (!db || !Array.isArray(wards) || wards.length === 0) return;
    updateSyncStatus('saving', 'Menyimpan daftar ruangan...');
    try {
      const batch = writeBatch(db);
      wards.forEach((ward) => {
        if (!db || !ward || !ward.id) return;
        const cleanId = ward.id.trim().toLowerCase();
        const wRef = doc(db, 'wards', cleanId);
        batch.set(wRef, cleanForFirestore({ ...ward, id: cleanId }), { merge: true });
      });
      await batch.commit();
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving all wards online:', err);
      updateSyncStatus('error', 'Gagal menyimpan daftar ruangan ke Cloud', err?.message);
    }
  }

  static async deleteWardOnline(wardId: string): Promise<void> {
    if (!db || !wardId) return;
    updateSyncStatus('saving', 'Menghapus ruangan di Cloud...');
    try {
      const cleanId = wardId.trim().toLowerCase();
      const wRef = doc(db, 'wards', cleanId);
      await deleteDoc(wRef);
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice deleting ward online:', err);
      updateSyncStatus('error', 'Gagal menghapus ruangan di Cloud', err?.message);
    }
  }

  // --- 1. PER-WARD SETTINGS & CONFIGURATION ---

  static subscribeWardSettings(wardId: string, onUpdate: (settings: AppSettings) => void): () => void {
    if (!db) return () => {};
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    const sRef = doc(db, 'wards', cleanWardId, 'meta', 'settings');

    return onSnapshot(
      sRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data() as Partial<AppSettings>;
          onUpdate(cleanForFirestore(raw as AppSettings));
          updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
        }
      },
      (err) => {
        console.warn(`[Firebase] Settings listener notice for ${cleanWardId}:`, err);
      }
    );
  }

  static async saveWardSettingsOnline(wardId: string, settings: AppSettings): Promise<void> {
    if (!db) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    updateSyncStatus('saving', 'Menyimpan pengaturan & jam sift...');
    try {
      const sRef = doc(db, 'wards', cleanWardId, 'meta', 'settings');
      await setDoc(sRef, cleanForFirestore(settings), { merge: true });

      // Also mirror to global_settings for backward compatibility if default ward
      if (cleanWardId === 'teratai') {
        const legacyRef = doc(db, 'settings', 'global_settings');
        await setDoc(legacyRef, cleanForFirestore(settings), { merge: true });
      }

      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving settings online:', err);
      updateSyncStatus('error', 'Gagal menyimpan pengaturan ke Cloud', err?.message);
    }
  }

  // Backward compatibility alias
  static async saveSettingsOnline(settings: AppSettings): Promise<void> {
    await this.saveWardSettingsOnline('teratai', settings);
  }

  // --- 2. PER-WARD NURSES ---

  static subscribeWardNurses(wardId: string, onUpdate: (nurses: Nurse[]) => void): () => void {
    if (!db) return () => {};
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    const nCol = collection(db, 'wards', cleanWardId, 'nurses');

    return onSnapshot(
      nCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const nurses: Nurse[] = [];
          snapshot.forEach((d) => nurses.push(d.data() as Nurse));
          onUpdate(nurses);
          updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
        }
      },
      (err) => console.warn(`[Firebase] Nurses listener notice for ${cleanWardId}:`, err)
    );
  }

  static async saveWardNurseOnline(wardId: string, nurse: Nurse): Promise<void> {
    if (!db || !nurse || !nurse.id) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    updateSyncStatus('saving', 'Menyimpan data perawat...');
    try {
      const nRef = doc(db, 'wards', cleanWardId, 'nurses', nurse.id);
      await setDoc(nRef, cleanForFirestore(nurse), { merge: true });
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving nurse online:', err);
      updateSyncStatus('error', 'Gagal menyimpan perawat ke Cloud', err?.message);
    }
  }

  static async deleteWardNurseOnline(wardId: string, nurseId: string): Promise<void> {
    if (!db || !nurseId) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    updateSyncStatus('saving', 'Menghapus perawat di Cloud...');
    try {
      const nRef = doc(db, 'wards', cleanWardId, 'nurses', nurseId);
      await deleteDoc(nRef);
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice deleting nurse online:', err);
      updateSyncStatus('error', 'Gagal menghapus perawat di Cloud', err?.message);
    }
  }

  static async saveWardNursesBulkOnline(wardId: string, nurses: Nurse[]): Promise<void> {
    if (!db || !Array.isArray(nurses)) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    updateSyncStatus('saving', 'Menyinkronkan daftar perawat...');
    try {
      const batch = writeBatch(db);
      nurses.forEach((nurse) => {
        if (!db || !nurse.id) return;
        const nRef = doc(db, 'wards', cleanWardId, 'nurses', nurse.id);
        batch.set(nRef, cleanForFirestore(nurse), { merge: true });
      });
      await batch.commit();
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving nurses bulk online:', err);
      updateSyncStatus('error', 'Gagal menyinkronkan perawat ke Cloud', err?.message);
    }
  }

  // Backward compatibility alias
  static async saveNurseOnline(nurse: Nurse): Promise<void> {
    await this.saveWardNurseOnline('teratai', nurse);
  }

  static async deleteNurseOnline(nurseId: string): Promise<void> {
    await this.deleteWardNurseOnline('teratai', nurseId);
  }

  // --- 3. PER-WARD SCHEDULES (ROSTER SIFT) ---

  static subscribeWardSchedules(wardId: string, onUpdate: (schedules: ShiftDuty[]) => void): () => void {
    if (!db) return () => {};
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    const sCol = collection(db, 'wards', cleanWardId, 'schedules');

    return onSnapshot(
      sCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const schedules: ShiftDuty[] = [];
          snapshot.forEach((d) => schedules.push(d.data() as ShiftDuty));
          onUpdate(schedules);
          updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
        }
      },
      (err) => console.warn(`[Firebase] Schedules listener notice for ${cleanWardId}:`, err)
    );
  }

  static async saveWardScheduleOnline(wardId: string, schedule: ShiftDuty): Promise<void> {
    if (!db || !schedule || !schedule.date || !schedule.shift) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    updateSyncStatus('saving', 'Menyimpan jadwal sift...');
    try {
      const docId = `${schedule.date}_${schedule.shift}`;
      const sRef = doc(db, 'wards', cleanWardId, 'schedules', docId);
      await setDoc(sRef, cleanForFirestore(schedule), { merge: true });
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving schedule online:', err);
      updateSyncStatus('error', 'Gagal menyimpan jadwal ke Cloud', err?.message);
    }
  }

  static async saveWardSchedulesBulkOnline(wardId: string, schedules: ShiftDuty[]): Promise<void> {
    if (!db || !Array.isArray(schedules) || schedules.length === 0) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    updateSyncStatus('saving', 'Menyimpan jadwal sift...');
    try {
      const batch = writeBatch(db);
      schedules.slice(0, 150).forEach((sch) => {
        if (!db || !sch.date || !sch.shift) return;
        const docId = `${sch.date}_${sch.shift}`;
        const sRef = doc(db, 'wards', cleanWardId, 'schedules', docId);
        batch.set(sRef, cleanForFirestore(sch), { merge: true });
      });
      await batch.commit();
      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Notice saving schedules bulk online:', err);
      updateSyncStatus('error', 'Gagal menyimpan jadwal ke Cloud', err?.message);
    }
  }

  // Backward compatibility alias
  static async saveScheduleOnline(schedule: ShiftDuty): Promise<void> {
    await this.saveWardScheduleOnline('teratai', schedule);
  }

  // --- 4. PER-WARD PATIENTS ---

  static subscribeWardPatients(wardId: string, onUpdate: (patients: Patient[]) => void): () => void {
    if (!db) return () => {};
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    const pCol = collection(db, 'wards', cleanWardId, 'patients');

    return onSnapshot(
      pCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const patients: Patient[] = [];
          snapshot.forEach((d) => patients.push(d.data() as Patient));
          onUpdate(patients);
        }
      },
      (err) => console.warn(`[Firebase] Patients listener notice for ${cleanWardId}:`, err)
    );
  }

  static async saveWardPatientOnline(wardId: string, patient: Patient): Promise<void> {
    if (!db || !patient || !patient.id) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    try {
      const pRef = doc(db, 'wards', cleanWardId, 'patients', patient.id);
      await setDoc(pRef, cleanForFirestore(patient), { merge: true });
    } catch (err) {
      console.warn('[Firebase] Notice saving patient online:', err);
    }
  }

  static async deleteWardPatientOnline(wardId: string, patientId: string): Promise<void> {
    if (!db || !patientId) return;
    const cleanWardId = (wardId || 'teratai').trim().toLowerCase();
    try {
      const pRef = doc(db, 'wards', cleanWardId, 'patients', patientId);
      await deleteDoc(pRef);
    } catch (err) {
      console.warn('[Firebase] Notice deleting patient online:', err);
    }
  }

  // Backward compatibility alias
  static async savePatientOnline(patient: Patient): Promise<void> {
    await this.saveWardPatientOnline('teratai', patient);
  }

  static async deletePatientOnline(patientId: string): Promise<void> {
    await this.deleteWardPatientOnline('teratai', patientId);
  }

  // --- 5. EDUCATION CONTENT (HOSPITAL WIDE) ---

  static subscribeEducation(onUpdate: (articles: EducationArticle[]) => void): () => void {
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
    if (!db || !article || !article.id) return;
    try {
      const eRef = doc(db, 'education', article.id);
      await setDoc(eRef, cleanForFirestore(article), { merge: true });
    } catch (err) {
      console.warn('[Firebase] Notice saving education online:', err);
    }
  }

  static async deleteEducationOnline(articleId: string): Promise<void> {
    if (!db || !articleId) return;
    try {
      const eRef = doc(db, 'education', articleId);
      await deleteDoc(eRef);
    } catch (err) {
      console.warn('[Firebase] Notice deleting education online:', err);
    }
  }

  // --- 6. SURVEYS & FEEDBACK ---

  static subscribeSurveys(onUpdate: (surveys: SurveyFeedback[]) => void): () => void {
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

  static subscribeSurveyMeta(onUpdate: (meta: SurveysMeta) => void): () => void {
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
    if (!db || !survey || !survey.id) return;
    try {
      const sRef = doc(db, 'surveys', survey.id);
      await setDoc(sRef, cleanForFirestore(survey), { merge: true });
    } catch (err) {
      console.warn('[Firebase] Notice saving survey online:', err);
    }
  }

  static async deleteSurveyOnline(surveyId: string): Promise<void> {
    if (!db || !surveyId) return;
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

  // --- 7. COMPLETE INITIAL BOOTSTRAP & SYNC ---

  /**
   * Bootstraps initial data to Firestore if cloud collections are empty
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
    if (!db) return;

    try {
      // 0. Wards collection
      if (defaultWards.length > 0) {
        const wardsSnap = await getDocs(collection(db, 'wards'));
        if (wardsSnap.empty) {
          console.log('[Firebase] Bootstrapping initial wards...');
          const batch = writeBatch(db);
          defaultWards.forEach((ward) => {
            if (!db) return;
            const cleanId = ward.id.trim().toLowerCase();
            const wRef = doc(db, 'wards', cleanId);
            batch.set(wRef, cleanForFirestore({ ...ward, id: cleanId }));
          });
          await batch.commit();
        }
      }

      // 1. Initial ward data for Teratai
      await this.bootstrapWardData(
        'teratai',
        defaultNurses,
        defaultSchedules,
        defaultPatients,
        defaultSettings
      );

      // 2. Education collection
      if (defaultEducation.length > 0) {
        const eduSnap = await getDocs(collection(db, 'education'));
        if (eduSnap.empty) {
          console.log('[Firebase] Bootstrapping initial education...');
          const batch = writeBatch(db);
          defaultEducation.forEach((edu) => {
            if (!db) return;
            const eRef = doc(db, 'education', edu.id);
            batch.set(eRef, cleanForFirestore(edu));
          });
          await batch.commit();
        }
      }

      // 3. Surveys
      const metaRef = doc(db, 'settings', 'surveys_meta');
      const metaSnap = await getDoc(metaRef);
      if (!metaSnap.exists()) {
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
        }
      }

      updateSyncStatus('synced', 'Tersinkronisasi Cloud (Live)');
    } catch (err: any) {
      console.warn('[Firebase] Bootstrapping notice:', err);
    }
  }

  /**
   * Bootstraps a specific ward's data if empty in Cloud
   */
  static async bootstrapWardData(
    wardId: string,
    defaultNurses: Nurse[],
    defaultSchedules: ShiftDuty[],
    defaultPatients: Patient[],
    defaultSettings: AppSettings
  ) {
    if (!db || this.bootstrappedWards.has(wardId)) return;
    this.bootstrappedWards.add(wardId);

    const cleanWardId = wardId.trim().toLowerCase();
    try {
      // Check ward settings
      const sRef = doc(db, 'wards', cleanWardId, 'meta', 'settings');
      const sSnap = await getDoc(sRef);
      if (!sSnap.exists()) {
        console.log(`[Firebase] Bootstrapping settings for ward ${cleanWardId}...`);
        await setDoc(sRef, cleanForFirestore(defaultSettings));
      }

      // Check ward nurses
      const nCol = collection(db, 'wards', cleanWardId, 'nurses');
      const nSnap = await getDocs(nCol);
      if (nSnap.empty && defaultNurses.length > 0) {
        console.log(`[Firebase] Bootstrapping ${defaultNurses.length} nurses for ward ${cleanWardId}...`);
        const batch = writeBatch(db);
        defaultNurses.forEach((nurse) => {
          if (!db) return;
          const nRef = doc(db, 'wards', cleanWardId, 'nurses', nurse.id);
          batch.set(nRef, cleanForFirestore(nurse));
        });
        await batch.commit();
      }

      // Check ward schedules
      const scCol = collection(db, 'wards', cleanWardId, 'schedules');
      const scSnap = await getDocs(scCol);
      if (scSnap.empty && defaultSchedules.length > 0) {
        console.log(`[Firebase] Bootstrapping schedules for ward ${cleanWardId}...`);
        const batch = writeBatch(db);
        defaultSchedules.slice(0, 90).forEach((sch) => {
          if (!db) return;
          const sRef = doc(db, 'wards', cleanWardId, 'schedules', `${sch.date}_${sch.shift}`);
          batch.set(sRef, cleanForFirestore(sch));
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn(`[Firebase] Bootstrap notice for ${cleanWardId}:`, err);
    }
  }
}
