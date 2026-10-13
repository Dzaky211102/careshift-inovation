import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { FirebaseSyncService, SyncStatusInfo } from './services/firebase';
import { WardSyncService } from './services/wardSync';
import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings, SurveyFeedback, WardInfo } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ShiftDisplayDashboard } from './components/ShiftDisplayDashboard';
import { MonthlyScheduleCalendar } from './components/MonthlyScheduleCalendar';
import { CanvaSlidePresenter } from './components/CanvaSlidePresenter';
import { PatientPortal } from './components/PatientPortal';
import { EducationPortal } from './components/EducationPortal';
import { SurveyFeedbackPortal } from './components/SurveyFeedbackPortal';
import { AdminSettings } from './components/AdminSettings';
import { AdminLoginModal } from './components/AdminLoginModal';
import { TvDisplayView } from './components/TvDisplayView';
import { ToastContainer } from './components/ToastContainer';
import { DuplicateWardModal } from './components/DuplicateWardModal';
import { WardManagementModal } from './components/WardManagementModal';
import { EditWardModal } from './components/EditWardModal';
import { showToast } from './utils/toast';
import {
  getWitaDateString,
  determineActiveShift,
  determineActiveShiftContext,
  getScheduleDateForShift,
} from './utils/witaTime';

export default function App() {
  // Multi-Ward Isolation State
  const [activeWardId, setActiveWardId] = useState<string>(() => StorageService.getActiveWardId());
  const [wards, setWards] = useState<WardInfo[]>(() => StorageService.getWards());
  const [isWardManagementOpen, setIsWardManagementOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateSourceWard, setDuplicateSourceWard] = useState<WardInfo | null>(null);
  const [editingWardModalTarget, setEditingWardModalTarget] = useState<WardInfo | null>(null);

  // Global Data State with Local Storage fallback
  const [nurses, setNurses] = useState<Nurse[]>(() => StorageService.getNurses(activeWardId));
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients(activeWardId));
  const [schedules, setSchedules] = useState<ShiftDuty[]>(() => StorageService.getSchedules(activeWardId));
  const [educationArticles, setEducationArticles] = useState<EducationArticle[]>(() =>
    StorageService.getEducationArticles()
  );
  const [surveys, setSurveys] = useState<SurveyFeedback[]>(() => StorageService.getSurveys());
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings(activeWardId));

  // Role Access Control (Requirement 2)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => StorageService.getIsAdmin());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Dedicated TV Mode state (?mode=tv)
  const [isTvMode, setIsTvMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'tv';
    }
    return false;
  });

  const handleSelectWard = (wardId: string) => {
    const clean = (wardId || 'teratai').trim().toLowerCase();
    StorageService.setActiveWardId(clean);
    setActiveWardId(clean);

    const newNurses = StorageService.getNurses(clean);
    const newPatients = StorageService.getPatients(clean);
    const newSchedules = StorageService.getSchedules(clean);
    const newSettings = StorageService.getSettings(clean);

    setNurses(newNurses);
    setPatients(newPatients);
    setSchedules(newSchedules);
    setSettings(newSettings);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('ward', clean);
      window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
    }
    showToast(`Beralih ke: ${newSettings.wardName}`, 'info');
  };

  const handleDuplicateWardSuccess = async (newWard: WardInfo) => {
    if (!isAdmin) {
      showToast('Akses Ditolak: Hanya Admin yang berhak menduplikat ruangan rawat inap.', 'error');
      setIsLoginModalOpen(true);
      return;
    }
    const sourceId = duplicateSourceWard?.id || activeWardId;
    StorageService.duplicateWard(sourceId, newWard);
    const updatedWards = StorageService.getWards();
    setWards(updatedWards);
    setIsDuplicateModalOpen(false);
    setIsWardManagementOpen(false);
    handleSelectWard(newWard.id);

    // Sync across all devices opening the link
    await WardSyncService.saveWard(newWard);
    try {
      const pkg = StorageService.exportWardJson(newWard.id);
      await WardSyncService.saveWardPackage(newWard.id, JSON.parse(pkg));
    } catch (err) {
      console.warn('[App] Ward package sync notice:', err);
    }

    showToast(`⚡ Ruangan berhasil diduplikat & disinkronkan ke seluruh perangkat: ${newWard.name}`, 'success');
  };

  const handleDeleteWard = async (wardId: string) => {
    if (!isAdmin) {
      showToast('Akses Ditolak: Hanya Admin yang berhak menghapus ruangan rawat inap.', 'error');
      setIsLoginModalOpen(true);
      return;
    }
    const success = StorageService.deleteWard(wardId);
    if (success) {
      const updatedWards = StorageService.getWards();
      setWards(updatedWards);
      const nextActive = StorageService.getActiveWardId();
      handleSelectWard(nextActive);
      await WardSyncService.deleteWard(wardId);
      showToast('Ruangan berhasil dihapus dan disinkronkan ke semua perangkat.', 'info');
    }
  };

  const handleImportWard = async (imported: WardInfo) => {
    if (!isAdmin) {
      showToast('Akses Ditolak: Hanya Admin yang berhak mengimpor data ruangan.', 'error');
      setIsLoginModalOpen(true);
      return;
    }
    const updatedWards = StorageService.getWards();
    setWards(updatedWards);
    handleSelectWard(imported.id);
    await WardSyncService.saveWard(imported);
    showToast(`Ruangan ${imported.name} berhasil diimpor & disinkronkan!`, 'success');
  };

  const handleUpdateWard = async (wardId: string, updated: Partial<WardInfo>) => {
    if (!isAdmin) {
      showToast('Akses Ditolak: Hanya Admin yang berhak mengedit ruangan rawat inap.', 'error');
      setIsLoginModalOpen(true);
      return;
    }
    const updatedWard = StorageService.updateWard(wardId, updated);
    const updatedWards = StorageService.getWards();
    setWards(updatedWards);

    // If updating the active ward, also update current settings and live UI
    if (wardId.trim().toLowerCase() === activeWardId.trim().toLowerCase() && updatedWard) {
      const curSettings = StorageService.getSettings(activeWardId);
      const newSettings: AppSettings = {
        ...curSettings,
        wardName: updatedWard.name || curSettings.wardName,
        dashboardColorTheme: updatedWard.colorTheme || curSettings.dashboardColorTheme || 'purple',
      };
      StorageService.saveSettings(newSettings, activeWardId);
      setSettings(newSettings);
    }

    // Broadcast and persist to server & Firebase for all devices
    if (updatedWard) {
      await WardSyncService.saveWard(updatedWard);
      try {
        const pkg = StorageService.exportWardJson(wardId);
        await WardSyncService.saveWardPackage(wardId, JSON.parse(pkg));
      } catch {}
    }

    showToast(`Nama ruangan berhasil diperbarui & disinkronkan: ${updated.name || ''}`, 'success');
  };

  useEffect(() => {
    const handleUrlChange = async () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setIsTvMode(params.get('mode') === 'tv');
        const urlWard = params.get('ward');
        if (urlWard && urlWard.trim()) {
          const clean = urlWard.trim().toLowerCase();
          // Check if this ward exists in current wards
          const exists = wards.some((w) => w.id.trim().toLowerCase() === clean);
          if (!exists) {
            // Attempt to fetch from server
            const pkg = await WardSyncService.fetchWardPackage(clean);
            if (pkg && pkg.ward) {
              StorageService.importWardJson(JSON.stringify(pkg));
              setWards(StorageService.getWards());
            }
          }
          if (clean !== activeWardId) {
            handleSelectWard(clean);
          }
        }
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [activeWardId, wards]);

  const handleExitTvMode = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
      setIsTvMode(false);
      setActiveTab('canva');
    }
  };

  const handleEnterTvMode = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'tv');
      url.searchParams.set('ward', activeWardId);
      window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
      setIsTvMode(true);
    }
  };

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'tv') {
        return 'canva';
      }
    }
    return 'dashboard';
  });
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');

  // WITA Clock & Live rollover state (10s ticker)
  const [currentWitaTime, setCurrentWitaTime] = useState<Date>(() => new Date());
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => FirebaseSyncService.getSyncStatus());

  // 10-second ticker for accurate WITA time and shift switching
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWitaTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // WITA Active Shift context (Unified single source of truth across dashboard, calendar, and TV)
  const activeShiftCtx = determineActiveShiftContext(settings.shiftConfigs, currentWitaTime);
  const currentShift = activeShiftCtx.shiftId;
  const [selectedShift, setSelectedShift] = useState<string>(activeShiftCtx.shiftId);
  const effectiveTheme = StorageService.getEffectiveTheme(settings, currentWitaTime);

  // Sync selectedShift with currentShift when active shift changes naturally
  useEffect(() => {
    setSelectedShift(activeShiftCtx.shiftId);
  }, [activeShiftCtx.shiftId]);

  // 1. Cross-Device Realtime Synchronization (Firebase Cloud Firestore as Single Source of Truth)
  useEffect(() => {
    // Connection & sync status listener
    const unsubStatus = FirebaseSyncService.subscribeSyncStatus(setSyncStatus);

    // Bootstrap initial global data if cloud is empty
    FirebaseSyncService.bootstrapData(
      nurses,
      schedules,
      patients,
      settings,
      educationArticles,
      surveys,
      wards
    );

    // Ensure active ward is bootstrapped in Cloud
    FirebaseSyncService.bootstrapWardData(
      activeWardId,
      nurses,
      schedules,
      patients,
      settings
    );

    // Cross-Device Ward Synchronization (syncs room names to all devices opening the link)
    const unsubWardSync = WardSyncService.subscribe((remoteWards, updatedWardId) => {
      if (Array.isArray(remoteWards) && remoteWards.length > 0) {
        setWards(remoteWards);

        // If the current active ward had its name or details changed by another device, live-sync it!
        const curActiveId = activeWardId.trim().toLowerCase();
        const activeWardMatch = remoteWards.find((w) => w.id.trim().toLowerCase() === curActiveId);
        if (activeWardMatch) {
          const curSettings = StorageService.getSettings(curActiveId);
          if (curSettings.wardName !== activeWardMatch.name) {
            const syncedSettings: AppSettings = {
              ...curSettings,
              wardName: activeWardMatch.name,
              dashboardColorTheme: activeWardMatch.colorTheme || curSettings.dashboardColorTheme || 'purple',
            };
            StorageService.saveSettings(syncedSettings, curActiveId);
            setSettings(syncedSettings);
            showToast(`⚡ Nama ruangan disinkronkan dari perangkat lain: ${activeWardMatch.name}`, 'info');
          }
        }
      }
    });

    const unsubFirebaseWards = FirebaseSyncService.subscribeWards((remoteWards) => {
      if (Array.isArray(remoteWards) && remoteWards.length > 0) {
        setWards(remoteWards);
        StorageService.saveWards(remoteWards);

        const curActiveId = activeWardId.trim().toLowerCase();
        const activeWardMatch = remoteWards.find((w) => w.id.trim().toLowerCase() === curActiveId);
        if (activeWardMatch) {
          const curSettings = StorageService.getSettings(curActiveId);
          if (curSettings.wardName !== activeWardMatch.name) {
            const syncedSettings: AppSettings = {
              ...curSettings,
              wardName: activeWardMatch.name,
              dashboardColorTheme: activeWardMatch.colorTheme || curSettings.dashboardColorTheme || 'purple',
            };
            StorageService.saveSettings(syncedSettings, curActiveId);
            setSettings(syncedSettings);
          }
        }
      }
    });

    // Realtime listeners strictly scoped to activeWardId (Per-Ward Isolation)
    const unsubNurses = FirebaseSyncService.subscribeWardNurses(activeWardId, (remoteNurses) => {
      setNurses(remoteNurses);
      StorageService.saveNurses(remoteNurses, activeWardId);
    });

    const unsubSchedules = FirebaseSyncService.subscribeWardSchedules(activeWardId, (remoteSchedules) => {
      setSchedules(remoteSchedules);
      StorageService.saveSchedules(remoteSchedules, activeWardId);
    });

    const unsubPatients = FirebaseSyncService.subscribeWardPatients(activeWardId, (remotePatients) => {
      setPatients(remotePatients);
      StorageService.savePatients(remotePatients, activeWardId);
    });

    const unsubSettings = FirebaseSyncService.subscribeWardSettings(activeWardId, (remoteSettings) => {
      setSettings(remoteSettings);
      StorageService.saveSettings(remoteSettings, activeWardId);
    });

    const unsubEdu = FirebaseSyncService.subscribeEducation((remoteEdu) => {
      setEducationArticles(remoteEdu);
      try {
        StorageService.saveEducationArticles(remoteEdu);
      } catch (err) {
        console.warn('[App] Error saving remote education:', err);
      }
    });

    const unsubSurveys = FirebaseSyncService.subscribeSurveys((remoteSurveys) => {
      const deletedIds = StorageService.getDeletedSurveyIds();
      const isDefaultCleared = StorageService.isDefaultSurveysCleared();
      const filtered = remoteSurveys.filter(
        (s) =>
          !deletedIds.has(s.id) &&
          (!isDefaultCleared || !['survey-1', 'survey-2', 'survey-3', 'survey-4'].includes(s.id))
      );
      setSurveys(filtered);
      StorageService.saveSurveys(filtered);
    });

    const unsubSurveyMeta = FirebaseSyncService.subscribeSurveyMeta((meta) => {
      if (!meta) return;
      if (meta.defaultSurveysCleared) {
        StorageService.setDefaultSurveysCleared(true);
      }
      if (meta.deletedSurveyIds && meta.deletedSurveyIds.length > 0) {
        StorageService.addDeletedSurveyIds(meta.deletedSurveyIds);
      }
      // Re-prune surveys state immediately across devices
      setSurveys((current) => {
        const deletedSet = new Set(meta.deletedSurveyIds || []);
        const cleared = Boolean(meta.defaultSurveysCleared);
        const pruned = current.filter(
          (s) =>
            !deletedSet.has(s.id) &&
            (!cleared || !['survey-1', 'survey-2', 'survey-3', 'survey-4'].includes(s.id))
        );
        StorageService.saveSurveys(pruned);
        return pruned;
      });
    });

    // Hydrate rich education articles from local IndexedDB if available
    StorageService.loadEducationArticlesAsync()
      .then((idbArticles) => {
        if (idbArticles && idbArticles.length > 0) {
          setEducationArticles(idbArticles);
        }
      })
      .catch((err) => console.warn('[App] IDB hydration notice:', err));

    return () => {
      unsubStatus();
      unsubWardSync();
      unsubFirebaseWards();
      unsubNurses();
      unsubSchedules();
      unsubPatients();
      unsubSettings();
      unsubEdu();
      unsubSurveys();
      unsubSurveyMeta();
    };
  }, [activeWardId]);

  // Current Date in WITA: YYYY-MM-DD
  const todayWitaDate = getWitaDateString(currentWitaTime);

  // Effective schedule roster date for selected shift (Requirement 2)
  const effectiveScheduleDate = getScheduleDateForShift(
    selectedShift,
    activeShiftCtx,
    settings.shiftConfigs,
    currentWitaTime
  );

  // Today's duty for selected shift
  const todayDuties = schedules.find(
    (s) => s.date === effectiveScheduleDate && s.shift === selectedShift
  );

  // Active live shift duty for TV slide show (always uses activeShiftCtx.shiftDate)
  const currentLiveShiftDuty = schedules.find(
    (s) => s.date === activeShiftCtx.shiftDate && s.shift === activeShiftCtx.shiftId
  );
  const liveAssignedIds = currentLiveShiftDuty?.nurseIds || [];

  // ==========================================
  // SYNC HANDLERS (SAVE LOCAL + SAVE ONLINE CLOUD)
  // ==========================================
  const handleSaveSchedule = (duty: ShiftDuty) => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang dapat mengubah roster sift.');
      return;
    }
    StorageService.setSchedule(duty, activeWardId);
    setSchedules(StorageService.getSchedules(activeWardId));
    FirebaseSyncService.saveWardScheduleOnline(activeWardId, duty);
  };

  const handleImportSchedules = (mergedDuties: ShiftDuty[]) => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang dapat mengimpor roster sift.');
      return;
    }
    StorageService.saveSchedules(mergedDuties, activeWardId);
    setSchedules(mergedDuties);
    FirebaseSyncService.saveWardSchedulesBulkOnline(activeWardId, mergedDuties);
  };

  const handleUpdateNurses = (updated: Nurse[]) => {
    nurses.forEach((oldNurse) => {
      if (!updated.some((n) => n.id === oldNurse.id)) {
        FirebaseSyncService.deleteWardNurseOnline(activeWardId, oldNurse.id);
      }
    });
    setNurses(updated);
    StorageService.saveNurses(updated, activeWardId);
    FirebaseSyncService.saveWardNursesBulkOnline(activeWardId, updated);
  };

  const handleUpdatePatients = (updated: Patient[]) => {
    patients.forEach((oldPat) => {
      if (!updated.some((p) => p.id === oldPat.id)) {
        FirebaseSyncService.deleteWardPatientOnline(activeWardId, oldPat.id);
      }
    });
    setPatients(updated);
    StorageService.savePatients(updated, activeWardId);
    updated.forEach((pat) => FirebaseSyncService.saveWardPatientOnline(activeWardId, pat));
  };

  const handleUpdateEducation = (updated: EducationArticle[]) => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang dapat mengedit materi edukasi.');
      return;
    }
    setEducationArticles(updated);
    try {
      StorageService.saveEducationArticles(updated);
    } catch (err) {
      console.warn('[App] Local education save notice:', err);
    }

    // Safely sync to Firebase without blocking UI or crashing
    try {
      educationArticles.forEach((oldEdu) => {
        if (!updated.some((e) => e.id === oldEdu.id)) {
          FirebaseSyncService.deleteEducationOnline(oldEdu.id).catch(() => {});
        }
      });
      updated.forEach((edu) => {
        FirebaseSyncService.saveEducationOnline(edu).catch((err) => {
          console.warn('[App] Cloud education sync notice:', err);
        });
      });
    } catch (err) {
      console.warn('[App] Firebase education sync notice:', err);
    }
  };

  const handleUpdateSettings = (updated: AppSettings) => {
    setSettings(updated);
    StorageService.saveSettings(updated, activeWardId);
    FirebaseSyncService.saveWardSettingsOnline(activeWardId, updated);
  };

  const handleCreateSurvey = (newSurvey: SurveyFeedback) => {
    const updated = StorageService.addSurvey(newSurvey);
    setSurveys(updated);
    FirebaseSyncService.saveSurveyOnline(newSurvey);
  };

  const handleDeleteSurvey = (id: string) => {
    const updated = StorageService.deleteSurvey(id);
    setSurveys(updated);
    FirebaseSyncService.deleteSurveyOnline(id);
  };

  const handleClearDefaultSurveys = () => {
    const defaultIds = ['survey-1', 'survey-2', 'survey-3', 'survey-4'];
    const updated = StorageService.clearDefaultSurveys();
    setSurveys(updated);
    FirebaseSyncService.clearDefaultSurveysOnline(defaultIds);
  };

  const handleClearAllSurveys = () => {
    const allIds = surveys.map((s) => s.id);
    const updated = StorageService.clearAllSurveys();
    setSurveys(updated);
    FirebaseSyncService.clearAllSurveysOnline(allIds);
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    StorageService.setIsAdmin(false);
  };

  const handleLoginAdminSuccess = () => {
    setIsAdmin(true);
    StorageService.setIsAdmin(true);
  };

  const getThemeBackground = () => {
    switch (effectiveTheme) {
      case 'pagi':
        return 'bg-gradient-to-br from-[#F5F2FC] via-[#F8F5FF] to-[#EFF7F6]';
      case 'siang':
        return 'bg-gradient-to-br from-[#FCF7F2] via-[#FAF4ED] to-[#F5F2FC]';
      default:
        return 'bg-gradient-to-br from-[#F1EFF9] via-[#EDEAF7] to-[#E9E4F5]';
    }
  };

  // =========================================================
  // DEDICATED TV KIOSK DISPLAY VIEW (Samsung TV Browser Compatible)
  // Completely hides sidebar, header, admin controls, and provides pure 16:9 kiosk display
  // =========================================================
  if (isTvMode) {
    return (
      <TvDisplayView
        currentShift={currentShift}
        settings={settings}
        nurses={nurses}
        schedules={schedules}
        onExitTvMode={handleExitTvMode}
      />
    );
  }

  return (
    <div
      className={`min-h-screen ${getThemeBackground()} transition-colors duration-700 font-sans text-slate-800`}
    >
      <div className="flex flex-col md:flex-row min-h-screen max-w-[1600px] mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'patient') setPatientSearchQuery('');
          }}
          hospitalName={settings.hospitalName}
          wardName={settings.wardName}
          isAdmin={isAdmin}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogoutAdmin={handleLogoutAdmin}
          onOpenWardManagement={() => setIsWardManagementOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6 flex flex-col justify-between overflow-x-hidden">
          <div>
            {/* Top Header with WITA 24h clock, logos & admin toggle */}
            <Header
              currentShift={currentShift}
              shiftConfigs={settings.shiftConfigs}
              effectiveTheme={effectiveTheme}
              hospitalName={settings.hospitalName}
              wardName={settings.wardName}
              hospitalLogoUrl={settings.hospitalLogoUrl}
              institutionLogoUrl={settings.institutionLogoUrl}
              emergencyPhone={settings.emergencyPhone}
              isAdmin={isAdmin}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              onLogoutAdmin={handleLogoutAdmin}
              onSearchPatient={(q) => {
                setPatientSearchQuery(q);
                setActiveTab('patient');
              }}
              onSelectShiftPreview={(shift) => setSelectedShift(shift)}
              wards={wards}
              activeWardId={activeWardId}
              onOpenWardManagement={() => setIsWardManagementOpen(true)}
              onOpenDuplicateWard={() => {
                if (!isAdmin) {
                  showToast('Akses Terbatas: Hanya Admin yang dapat menduplikat ruangan rawat inap.', 'error');
                  setIsLoginModalOpen(true);
                  return;
                }
                const cur = wards.find((w) => w.id === activeWardId) || wards[0];
                setDuplicateSourceWard(cur);
                setIsDuplicateModalOpen(true);
              }}
              onEditActiveWard={() => {
                if (!isAdmin) {
                  showToast('Akses Terbatas: Hanya Admin yang dapat mengedit nama ruangan rawat inap.', 'error');
                  setIsLoginModalOpen(true);
                  return;
                }
                const cur = wards.find((w) => w.id === activeWardId) || wards[0];
                setEditingWardModalTarget(cur);
              }}
              syncStatus={syncStatus}
            />

            {/* TAB: DASHBOARD (Shift Hari Ini) */}
            {activeTab === 'dashboard' && (
              <ShiftDisplayDashboard
                currentShift={currentShift}
                selectedShift={selectedShift}
                onSelectShift={(shift) => setSelectedShift(shift)}
                todayDuties={todayDuties}
                nurses={nurses}
                patients={patients}
                settings={settings}
                schedules={schedules}
                isAdmin={isAdmin}
                onOpenCanva={() => setActiveTab('canva')}
                onOpenPatientPortal={(rmOrName) => {
                  if (rmOrName) setPatientSearchQuery(rmOrName);
                  setActiveTab('patient');
                }}
                onOpenEducation={() => setActiveTab('education')}
                onOpenSurvey={() => setActiveTab('survey')}
                onOpenMonthlySchedule={() => setActiveTab('monthly')}
                onOpenImageSettings={() => setActiveTab('settings')}
                onEditWard={() => {
                  if (!isAdmin) {
                    showToast('Akses Terbatas: Hanya Admin yang dapat mengedit nama ruangan rawat inap.', 'error');
                    setIsLoginModalOpen(true);
                    return;
                  }
                  const cur = wards.find((w) => w.id === activeWardId) || wards[0];
                  setEditingWardModalTarget(cur);
                }}
              />
            )}

            {/* TAB: MONTHLY SCHEDULE (Jadwal Perawat) */}
            {activeTab === 'monthly' && (
              <MonthlyScheduleCalendar
                nurses={nurses}
                schedules={schedules}
                shiftConfigs={settings.shiftConfigs}
                isAdmin={isAdmin}
                onSaveSchedule={handleSaveSchedule}
                onImportSchedules={handleImportSchedules}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )}

            {/* TAB: CANVA SLIDESHOW TV */}
            {activeTab === 'canva' && (
              <CanvaSlidePresenter
                currentShift={currentShift}
                assignedNurseIds={liveAssignedIds}
                allNurses={nurses}
                settings={settings}
                schedules={schedules}
                onUpdateSettings={handleUpdateSettings}
                onUpdateAllNurses={handleUpdateNurses}
                onEnterTvMode={handleEnterTvMode}
                activeWardId={activeWardId}
                availableWards={wards}
              />
            )}

            {/* TAB: PATIENT PORTAL (Status Pasien & Checklist Bedah) */}
            {activeTab === 'patient' && (
              <PatientPortal
                patients={patients}
                educationArticles={educationArticles}
                settings={settings}
                initialSearchQuery={patientSearchQuery}
                isAdmin={isAdmin}
                onOpenEducationSettings={() => setActiveTab('settings')}
                onOpenEducationPortal={() => setActiveTab('education')}
                onOpenSurveyPortal={() => setActiveTab('survey')}
                onUpdatePatientChecklist={(patientId, checkId, completed) => {
                  const updated = patients.map((p) =>
                    p.id === patientId && p.checklist
                      ? {
                          ...p,
                          checklist: p.checklist.map((c) =>
                            c.id === checkId ? { ...c, completed } : c
                          ),
                        }
                      : p
                  );
                  setPatients(updated);
                  StorageService.savePatients(updated, activeWardId);
                  const pTarget = updated.find((p) => p.id === patientId);
                  if (pTarget) FirebaseSyncService.savePatientOnline(pTarget);
                }}
              />
            )}

            {/* TAB: DEDICATED EDUCATION PORTAL (Sub Halaman Khusus Edukasi Pasien) */}
            {activeTab === 'education' && (
              <EducationPortal
                educationArticles={educationArticles}
                settings={settings}
                isAdmin={isAdmin}
                onUpdateEducation={handleUpdateEducation}
                onOpenAdminSettings={() => setActiveTab('settings')}
                onOpenPatientPortal={() => setActiveTab('patient')}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            )}

            {/* TAB: SURVEI KEPUASAN & KRITIK SARAN */}
            {activeTab === 'survey' && (
              <SurveyFeedbackPortal
                surveys={surveys}
                settings={settings}
                isAdmin={isAdmin}
                onSubmitSurvey={handleCreateSurvey}
                onDeleteSurvey={handleDeleteSurvey}
                onClearDefaultSurveys={handleClearDefaultSurveys}
                onClearAllSurveys={handleClearAllSurveys}
                onOpenAdminSettings={() => setActiveTab('settings')}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {/* TAB: ADMIN SETTINGS */}
            {activeTab === 'settings' && (
              <AdminSettings
                nurses={nurses}
                patients={patients}
                educationArticles={educationArticles}
                surveys={surveys}
                settings={settings}
                isAdmin={isAdmin}
                onSetIsAdmin={(admin) => {
                  setIsAdmin(admin);
                  StorageService.setIsAdmin(admin);
                }}
                onUpdateNurses={handleUpdateNurses}
                onUpdatePatients={handleUpdatePatients}
                onUpdateEducation={handleUpdateEducation}
                onUpdateSettings={handleUpdateSettings}
                onDeleteSurvey={handleDeleteSurvey}
                onClearDefaultSurveys={handleClearDefaultSurveys}
                onClearAllSurveys={handleClearAllSurveys}
                wards={wards}
                activeWardId={activeWardId}
                onSelectWard={handleSelectWard}
                onOpenDuplicateWard={(src) => {
                  setDuplicateSourceWard(src);
                  setIsDuplicateModalOpen(true);
                }}
                onDeleteWard={handleDeleteWard}
                onImportWard={handleImportWard}
                onUpdateWard={handleUpdateWard}
              />
            )}
          </div>
        </main>
      </div>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginAdminSuccess}
        adminPin={settings.adminPin}
      />

      {/* Ward Management Hub Modal */}
      <WardManagementModal
        isOpen={isWardManagementOpen}
        onClose={() => setIsWardManagementOpen(false)}
        wards={wards}
        activeWardId={activeWardId}
        onSelectWard={handleSelectWard}
        onOpenDuplicateModal={(src) => {
          if (!isAdmin) {
            showToast('Akses Terbatas: Hanya Admin yang dapat menduplikat ruangan rawat inap.', 'error');
            setIsLoginModalOpen(true);
            return;
          }
          setDuplicateSourceWard(src);
          setIsDuplicateModalOpen(true);
        }}
        onDeleteWard={handleDeleteWard}
        onImportWard={handleImportWard}
        onUpdateWard={handleUpdateWard}
        isAdmin={isAdmin}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Duplicate Ward Modal */}
      <DuplicateWardModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        sourceWard={duplicateSourceWard || wards.find((w) => w.id === activeWardId) || wards[0]}
        availableWards={wards}
        onDuplicateSuccess={handleDuplicateWardSuccess}
        isAdmin={isAdmin}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Global Edit Ward Identity Modal (accessible from Header, Dashboard, etc.) */}
      <EditWardModal
        isOpen={Boolean(editingWardModalTarget)}
        onClose={() => setEditingWardModalTarget(null)}
        ward={editingWardModalTarget}
        onSaveWard={handleUpdateWard}
        isAdmin={isAdmin}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Global In-App Notification Toasts */}
      <ToastContainer />
    </div>
  );
}
