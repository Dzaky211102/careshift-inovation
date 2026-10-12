import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { FirebaseSyncService } from './services/firebase';
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
import { getWitaDateString, determineActiveShift } from './utils/witaTime';

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
    setEffectiveTheme(StorageService.getEffectiveTheme(newSettings, new Date()));
    setCurrentShift(determineActiveShift(newSettings.shiftConfigs, new Date()));

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('ward', clean);
      window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
    }
    showToast(`Beralih ke: ${newSettings.wardName}`, 'info');
  };

  const handleDuplicateWardSuccess = (newWard: WardInfo) => {
    const sourceId = duplicateSourceWard?.id || activeWardId;
    StorageService.duplicateWard(sourceId, newWard);
    const updatedWards = StorageService.getWards();
    setWards(updatedWards);
    setIsDuplicateModalOpen(false);
    setIsWardManagementOpen(false);
    handleSelectWard(newWard.id);
    showToast(`⚡ Ruangan berhasil diduplikat! Selamat datang di ${newWard.name}`, 'success');
  };

  const handleDeleteWard = (wardId: string) => {
    const success = StorageService.deleteWard(wardId);
    if (success) {
      const updatedWards = StorageService.getWards();
      setWards(updatedWards);
      const nextActive = StorageService.getActiveWardId();
      handleSelectWard(nextActive);
      showToast('Ruangan berhasil dihapus.', 'info');
    }
  };

  const handleImportWard = (imported: WardInfo) => {
    const updatedWards = StorageService.getWards();
    setWards(updatedWards);
    handleSelectWard(imported.id);
    showToast(`Ruangan ${imported.name} berhasil diimpor!`, 'success');
  };

  const handleUpdateWard = (wardId: string, updated: Partial<WardInfo>) => {
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
      setEffectiveTheme(StorageService.getEffectiveTheme(newSettings, new Date()));
    }
    showToast(`Nama ruangan berhasil diperbarui: ${updated.name || ''}`, 'success');
  };

  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setIsTvMode(params.get('mode') === 'tv');
        const urlWard = params.get('ward');
        if (urlWard && urlWard.trim() && urlWard.trim().toLowerCase() !== activeWardId) {
          handleSelectWard(urlWard.trim().toLowerCase());
        }
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [activeWardId]);

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

  // WITA Active Shift state (Requirement 1 & 3)
  const [currentShift, setCurrentShift] = useState<string>(() =>
    determineActiveShift(settings.shiftConfigs, new Date())
  );
  const [selectedShift, setSelectedShift] = useState<string>(() =>
    determineActiveShift(settings.shiftConfigs, new Date())
  );
  const [effectiveTheme, setEffectiveTheme] = useState<string>(() =>
    StorageService.getEffectiveTheme(settings, new Date())
  );

  // 1. Firebase Online Realtime Synchronization (Requirement 7)
  useEffect(() => {
    // Bootstrap initial data if cloud is empty
    FirebaseSyncService.bootstrapData(
      nurses,
      schedules,
      patients,
      settings,
      educationArticles,
      surveys
    );

    // Realtime listeners
    const unsubNurses = FirebaseSyncService.subscribeNurses((remoteNurses) => {
      setNurses(remoteNurses);
      StorageService.saveNurses(remoteNurses);
    });

    const unsubSchedules = FirebaseSyncService.subscribeSchedules((remoteSchedules) => {
      setSchedules(remoteSchedules);
      StorageService.saveSchedules(remoteSchedules);
    });

    const unsubPatients = FirebaseSyncService.subscribePatients((remotePatients) => {
      setPatients(remotePatients);
      StorageService.savePatients(remotePatients);
    });

    const unsubSettings = FirebaseSyncService.subscribeSettings((remoteSettings) => {
      setSettings(remoteSettings);
      StorageService.saveSettings(remoteSettings);
      setEffectiveTheme(StorageService.getEffectiveTheme(remoteSettings, new Date()));
      setCurrentShift(determineActiveShift(remoteSettings.shiftConfigs, new Date()));
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
      unsubNurses();
      unsubSchedules();
      unsubPatients();
      unsubSettings();
      unsubEdu();
      unsubSurveys();
      unsubSurveyMeta();
    };
  }, []);

  // 2. WITA Time Interval Timer (every 10 seconds checks active shift)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const active = determineActiveShift(settings.shiftConfigs, now);
      setCurrentShift(active);
      setEffectiveTheme(StorageService.getEffectiveTheme(settings, now));
    }, 10000);
    return () => clearInterval(timer);
  }, [settings]);

  // Current Date in WITA: YYYY-MM-DD
  const todayWitaDate = getWitaDateString(new Date());

  // Today's duty for selected shift
  const todayDuties = schedules.find(
    (s) => s.date === todayWitaDate && s.shift === selectedShift
  );

  // Active shift duty for TV slide show
  const currentLiveShiftDuty = schedules.find(
    (s) => s.date === todayWitaDate && s.shift === currentShift
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
    FirebaseSyncService.saveScheduleOnline(duty);
  };

  const handleImportSchedules = (mergedDuties: ShiftDuty[]) => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Admin yang dapat mengimpor roster sift.');
      return;
    }
    StorageService.saveSchedules(mergedDuties, activeWardId);
    setSchedules(mergedDuties);
    mergedDuties.forEach((duty) => {
      FirebaseSyncService.saveScheduleOnline(duty);
    });
  };

  const handleUpdateNurses = (updated: Nurse[]) => {
    nurses.forEach((oldNurse) => {
      if (!updated.some((n) => n.id === oldNurse.id)) {
        FirebaseSyncService.deleteNurseOnline(oldNurse.id);
      }
    });
    setNurses(updated);
    StorageService.saveNurses(updated, activeWardId);
    updated.forEach((nurse) => FirebaseSyncService.saveNurseOnline(nurse));
  };

  const handleUpdatePatients = (updated: Patient[]) => {
    patients.forEach((oldPat) => {
      if (!updated.some((p) => p.id === oldPat.id)) {
        FirebaseSyncService.deletePatientOnline(oldPat.id);
      }
    });
    setPatients(updated);
    StorageService.savePatients(updated, activeWardId);
    updated.forEach((pat) => FirebaseSyncService.savePatientOnline(pat));
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
          console.warn('[App] Cloud education sync notice (document might exceed 1MB limit for offline files):', err);
        });
      });
    } catch (err) {
      console.warn('[App] Firebase education sync notice:', err);
    }
  };

  const handleUpdateSettings = (updated: AppSettings) => {
    setSettings(updated);
    StorageService.saveSettings(updated, activeWardId);
    setEffectiveTheme(StorageService.getEffectiveTheme(updated, new Date()));
    setCurrentShift(determineActiveShift(updated.shiftConfigs, new Date()));
    FirebaseSyncService.saveSettingsOnline(updated);
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
                const cur = wards.find((w) => w.id === activeWardId) || wards[0];
                setDuplicateSourceWard(cur);
                setIsDuplicateModalOpen(true);
              }}
              onEditActiveWard={() => {
                const cur = wards.find((w) => w.id === activeWardId) || wards[0];
                setEditingWardModalTarget(cur);
              }}
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
          setDuplicateSourceWard(src);
          setIsDuplicateModalOpen(true);
        }}
        onDeleteWard={handleDeleteWard}
        onImportWard={handleImportWard}
        onUpdateWard={handleUpdateWard}
      />

      {/* Duplicate Ward Modal */}
      <DuplicateWardModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        sourceWard={duplicateSourceWard || wards.find((w) => w.id === activeWardId) || wards[0]}
        availableWards={wards}
        onDuplicateSuccess={handleDuplicateWardSuccess}
      />

      {/* Global Edit Ward Identity Modal (accessible from Header, Dashboard, etc.) */}
      <EditWardModal
        isOpen={Boolean(editingWardModalTarget)}
        onClose={() => setEditingWardModalTarget(null)}
        ward={editingWardModalTarget}
        onSaveWard={handleUpdateWard}
      />

      {/* Global In-App Notification Toasts */}
      <ToastContainer />
    </div>
  );
}
