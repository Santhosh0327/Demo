import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  PlusCircle,
  BarChart3,
  Sparkles,
  Grid,
  History,
  TrendingUp,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Disc,
} from 'lucide-react';
import { useRouletteStore } from '../../store/useRouletteStore';

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useRouletteStore();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Enter Results', path: '/enter', icon: PlusCircle },
    { label: 'Theory Performance', path: '/theory-performance', icon: Target },
    { label: 'Strategy Lab', path: '/strategy-lab', icon: FlaskConical },
    { label: 'Wheel Motion Analysis', path: '/motion-analysis', icon: Activity },
    { label: 'Pattern Analysis', path: '/patterns', icon: BarChart3 },
    { label: 'Prediction Center', path: '/predictions', icon: Sparkles },
    { label: 'Roulette Table', path: '/table', icon: Grid },
    { label: 'Spin History', path: '/history', icon: History },
    { label: 'Performance Analytics', path: '/performance', icon: TrendingUp },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#10151F] border-r border-[#232D3F] flex flex-col justify-between ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div>
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#232D3F]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Disc className="h-6 w-6 animate-spin-slow" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-extrabold text-sm tracking-wide text-slate-100 flex items-center gap-1">
                  ROULETTE <span className="text-[#D4AF37]">INTEL</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">VERSION 1.0 (PRO)</span>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_12px_rgba(212,175,55,0.15)] font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / System Status */}
      {sidebarOpen && (
        <div className="p-4 border-t border-[#232D3F] bg-[#080B12]/40">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Engine Online
            </span>
            <span className="text-[10px] font-mono text-[#D4AF37]">DEXIE DB</span>
          </div>
        </div>
      )}
    </aside>
  );
};
