import React from 'react';
import {
  House,
  CalendarDays,
  Presentation,
  HeartHandshake,
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
    { id: 'dashboard', label: 'Sif Hari Ini', icon: House, badge: 'Live' },
    { id: 'monthly', label: 'Jadwal Perawat', icon: CalendarDays, badge: 'Roster' },
    { id: 'canva', label: 'Tampilan TV', icon: Presentation, badge: 'Otomatis' },
    { id: 'patient', label: 'Panduan Pasien', icon: HeartHandshake, badge: 'Edukasi' },
    { id: 'settings', label: 'Pengaturan Admin', icon: Settings, badge: 'Admin' },
  ];

  return (
    <aside className="w-20 md:w-64 shrink-0 flex flex-col justify-between bg-gradient-to-b from-[#BAA6E3] via-[#A68EDB] to-[#9579D6] p-3 md:p-5 text-white shadow-xl md:rounded-3xl my-0 md:my-3 md:ml-3 transition-all duration-300">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-md p-1.5 flex items-center justify-center shadow-inner border border-white/40 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#8D6DCF] shadow-sm">
              <Stethoscope className="w-5 h-5 text-[#8D6DCF]" />
            </div>
          </div>
          <div className="hidden md:block truncate">
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
                <div className="hidden md:block truncate">
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
                className="hidden md:inline-flex p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white transition-colors text-[10px] font-bold"
                title="Keluar dari Akun Admin"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="p-2.5 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-purple-200 shrink-0" />
                <div className="hidden md:block truncate">
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
                className="hidden md:inline-flex px-2 py-0.5 bg-white text-purple-800 rounded-lg text-[10px] font-bold shadow-xs hover:bg-purple-50 transition-colors"
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
                className={`w-full flex items-center gap-3.5 px-3 md:px-4 py-3 rounded-2xl text-left font-medium transition-all duration-200 group relative ${
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
                <span className="hidden md:inline-block text-sm flex-1 truncate">
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className={`hidden lg:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
      <div className="hidden md:block mt-6">
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
  );
};
