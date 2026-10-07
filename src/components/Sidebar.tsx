import React from 'react';
import {
  House,
  CalendarDays,
  Presentation,
  HeartHandshake,
  BookOpen,
  Settings,
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  LockOpen,
} from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hospitalName: string;
  wardName: string;
  isAdmin: boolean;
  onOpenLoginModal: () => void;
  onLogoutAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  hospitalName,
  wardName,
  isAdmin,
  onOpenLoginModal,
  onLogoutAdmin,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Sif Hari Ini', shortLabel: 'Sif', icon: House, badge: 'Live' },
    { id: 'monthly', label: 'Jadwal Perawat', shortLabel: 'Jadwal', icon: CalendarDays, badge: 'Roster' },
    { id: 'canva', label: 'Tampilan TV', shortLabel: 'TV', icon: Presentation, badge: 'Otomatis' },
    { id: 'patient', label: 'Status Pasien', shortLabel: 'Pasien', icon: HeartHandshake, badge: 'RM' },
    { id: 'education', label: 'Edukasi Pasien', shortLabel: 'Edukasi', icon: BookOpen, badge: 'Materi' },
    { id: 'settings', label: 'Pengaturan Admin', shortLabel: 'Admin', icon: Settings, badge: 'Admin' },
  ];

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP STICKY SIDEBAR (Hidden on Mobile, Visible md:)  */}
      {/* Stays pinned to the side when scrolling through long pages */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between bg-gradient-to-b from-[#BAA6E3] via-[#A68EDB] to-[#9579D6] p-5 text-white shadow-xl rounded-3xl my-3 ml-3 sticky top-3 h-[calc(100vh-1.5rem)] overflow-y-auto transition-all duration-300">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-md p-1.5 flex items-center justify-center shadow-inner border border-white/40 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#8D6DCF] shadow-sm">
                <Stethoscope className="w-5 h-5 text-[#8D6DCF]" />
              </div>
            </div>
            <div className="truncate">
              <h1 className="font-display font-extrabold text-lg leading-tight tracking-tight text-white drop-shadow-sm truncate">
                CareShift
              </h1>
              <p className="text-[11px] font-medium text-purple-100/90 truncate">
                {hospitalName}
              </p>
            </div>
          </div>

          {/* Role Status Banner */}
          <div className="mb-4">
            {isAdmin ? (
              <div className="p-2.5 bg-emerald-500/25 border border-emerald-300/40 rounded-2xl flex items-center justify-between text-xs backdrop-blur-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-200 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                      Hak Akses
                    </span>
                    <span className="font-extrabold text-white text-xs truncate block">
                      Mode Admin Aktif
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogoutAdmin}
                  className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white transition-colors text-[10px] font-bold shrink-0 ml-1"
                  title="Keluar dari Akun Admin"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldAlert className="w-4 h-4 text-purple-200 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] font-medium text-purple-200 block">
                      Hak Akses
                    </span>
                    <span className="font-bold text-white text-xs truncate block">
                      Pengguna Biasa
                    </span>
                  </div>
                </div>
                <button
                  onClick={onOpenLoginModal}
                  className="px-2.5 py-1 bg-white text-purple-800 rounded-lg text-[10px] font-bold shadow-xs hover:bg-purple-50 transition-colors shrink-0 ml-1"
                  title="Masuk sebagai Admin"
                >
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left font-medium transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-white text-[#7A5CBF] shadow-md shadow-purple-900/15 translate-x-1 font-bold'
                      : 'text-white/85 hover:text-white hover:bg-white/15'
                  }`}
                  title={item.label}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${
                      isActive
                        ? 'bg-purple-100 text-[#7A5CBF]'
                        : 'bg-white/15 text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm flex-1 truncate">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-white/20 text-white/90'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Ward Info Bottom Card */}
        <div className="mt-6">
          <div className="relative rounded-2xl bg-white/20 backdrop-blur-md p-3 border border-white/30 shadow-lg text-center overflow-hidden">
            <div className="flex items-center justify-center -mt-1 mb-1">
              <div className="w-14 h-14 rounded-full overflow-hidden shadow-inner border-2 border-white/60 bg-purple-100/50">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=200&q=80"
                  alt="Hospital Ward"
                  className="w-full h-full object-cover"
                  fallbackIcon={<Sparkles className="w-5 h-5 text-purple-200" />}
                />
              </div>
            </div>
            <p className="text-xs font-bold text-white leading-tight truncate">
              {wardName}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-purple-100">
              <ShieldCheck className="w-3 h-3" />
              <span>Waktu Standar Ruangan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP COMPACT BAR (Visible md:hidden)             */}
      {/* Compact header for brand, hospital info & admin login    */}
      {/* ======================================================== */}
      <div className="md:hidden p-3 bg-gradient-to-r from-[#BAA6E3] via-[#A68EDB] to-[#9579D6] text-white shadow-md flex items-center justify-between gap-2 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#8D6DCF] shadow-sm shrink-0">
            <Stethoscope className="w-5 h-5 text-[#8D6DCF]" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-sm leading-tight text-white truncate">
              CareShift
            </h1>
            <p className="text-[10px] text-purple-100 truncate">
              {wardName}
            </p>
          </div>
        </div>

        {/* Mobile Admin Pill */}
        <div className="shrink-0">
          {isAdmin ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/30 border border-emerald-300/50 rounded-xl text-[10px] font-bold text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>Admin</span>
              <button
                onClick={onLogoutAdmin}
                className="ml-1 text-[9px] underline text-emerald-200 hover:text-white"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="px-2.5 py-1 bg-white text-purple-900 rounded-xl text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
            >
              Login Admin
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE FIXED BOTTOM NAVIGATION DOCK (Visible md:hidden)*/}
      {/* STAYS PINNED AT THE BOTTOM AS THE USER SCROLLS ON PHONE! */}
      {/* No need to scroll back up to switch pages!               */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-purple-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 min-w-[50px] relative ${
                isActive
                  ? 'text-purple-700 font-black'
                  : 'text-slate-500 hover:text-purple-600 font-medium'
              }`}
            >
              {/* Active Indicator Background Pill */}
              <div
                className={`w-9 h-7 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-400 scale-105'
                    : 'bg-transparent text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Compact Label */}
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'text-purple-700 font-extrabold' : 'text-slate-500'
                }`}
              >
                {item.shortLabel}
              </span>

              {/* Active Dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-purple-600 mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
