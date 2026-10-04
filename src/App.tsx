import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { FirebaseSyncService } from './services/firebase';
import { Nurse, Patient, ShiftDuty, EducationArticle, AppSettings } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ShiftDisplayDashboard } from './components/ShiftDisplayDashboard';
import { MonthlyScheduleCalendar } from './components/MonthlyScheduleCalendar';
import { CanvaSlidePresenter } from './components/CanvaSlidePresenter';
import { PatientPortal } from './components/PatientPortal';
import { AdminSettings } from './components/AdminSettings';
import { AdminLoginModal } from './components/AdminLoginModal';
import { getWitaDateString, determineActiveShift } from './utils/witaTime';

export default function App() {
  // Global Data State with Local Storage fallback
  const [nurses, setNurses] = useState<Nurse[]>(() => StorageService.getNurses());
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [schedules, setSchedules] = useState<ShiftDuty[]>(() => StorageService.getSchedules());
  const [educationArticles, setEducationArticles] = useState<EducationArticle[]>(() =>
    StorageService.getEducationArticles()
  );
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());

  // Role Access Control (Requirement 2)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => StorageService.getIsAdmin());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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
      educationArticles
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
      StorageService.saveEducationArticles(remoteEdu);
    });

    return () => {
      unsubNurses();
      unsubSchedules();
      unsubPatients();
      unsubSettings();
      unsubEdu();
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
    StorageService.setSchedule(duty);
    setSchedules(StorageService.getSchedules());
    FirebaseSyncService.saveScheduleOnline(duty);
  };

  const handleUpdateNurses = (updated: Nurse[]) => {
    nurses.forEach((oldNurse) => {
      if (!updated.some((n) => n.id === oldNurse.id)) {
        FirebaseSyncService.deleteNurseOnline(oldNurse.id);
      }
    });
    setNurses(updated);
    StorageService.saveNurses(updated);
    updated.forEach((nurse) => FirebaseSyncService.saveNurseOnline(nurse));
  };

  const handleUpdatePatients = (updated: Patient[]) => {
    patients.forEach((oldPat) => {
      if (!updated.some((p) => p.id === oldPat.id)) {
        FirebaseSyncService.deletePatientOnline(oldPat.id);
      }
    });
    setPatients(updated);
    StorageService.savePatients(updated);
    updated.forEach((pat) => FirebaseSyncService.savePatientOnline(pat));
  };

  const handleUpdateEducation = (updated: EducationArticle[]) => {
    educationArticles.forEach((oldEdu) => {
      if (!updated.some((e) => e.id === oldEdu.id)) {
        FirebaseSyncService.deleteEducationOnline(oldEdu.id);
      }
    });
    setEducationArticles(updated);
    StorageService.saveEducationArticles(updated);
    updated.forEach((edu) => FirebaseSyncService.saveEducationOnline(edu));
  };

  const handleUpdateSettings = (updated: AppSettings) => {
    setSettings(updated);
    StorageService.saveSettings(updated);
    setEffectiveTheme(StorageService.getEffectiveTheme(updated, new Date()));
    setCurrentShift(determineActiveShift(updated.shiftConfigs, new Date()));
    FirebaseSyncService.saveSettingsOnline(updated);
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
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 md:p-6 flex flex-col justify-between overflow-x-hidden">
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
                isAdmin={isAdmin}
                onOpenCanva={() => setActiveTab('canva')}
                onOpenPatientPortal={(rmOrName) => {
                  if (rmOrName) setPatientSearchQuery(rmOrName);
                  setActiveTab('patient');
                }}
                onOpenMonthlySchedule={() => setActiveTab('monthly')}
                onOpenImageSettings={() => setActiveTab('settings')}
              />
            )}

            {/* TAB: MONTHLY SCHEDULE (Jadwal 1 Bulan) */}
            {activeTab === 'monthly' && (
              <MonthlyScheduleCalendar
                nurses={nurses}
                schedules={schedules}
                shiftConfigs={settings.shiftConfigs}
                isAdmin={isAdmin}
                onSaveSchedule={handleSaveSchedule}
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
                onUpdateSettings={handleUpdateSettings}
                onUpdateAllNurses={handleUpdateNurses}
              />
            )}

            {/* TAB: PATIENT PORTAL */}
            {activeTab === 'patient' && (
              <PatientPortal
                patients={patients}
                educationArticles={educationArticles}
                settings={settings}
                initialSearchQuery={patientSearchQuery}
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
                  StorageService.savePatients(updated);
                  const pTarget = updated.find((p) => p.id === patientId);
                  if (pTarget) FirebaseSyncService.savePatientOnline(pTarget);
                }}
              />
            )}

            {/* TAB: ADMIN SETTINGS */}
            {activeTab === 'settings' && (
              <AdminSettings
                nurses={nurses}
                patients={patients}
                educationArticles={educationArticles}
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
    </div>
  );
}
