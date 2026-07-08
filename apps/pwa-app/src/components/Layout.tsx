import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { ESupportedLanguages, languagesDisplayNames } from '../languages/language.enums.ts';
import { useBackendConnection } from '../hooks/useBackendConnection.ts';
import { usePouchSyncStatus } from '../hooks/usePouchSyncStatus.ts';
import { 
  Activity, 
  Users, 
  Wifi, 
  WifiOff, 
  Globe, 
  Database,
  BarChart3,
  CheckCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isOnline = useBackendConnection();
  const { syncStatus, toast, handleSyncClick } = usePouchSyncStatus();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const target = import.meta.env.VITE_APP_TARGET;
  const isTablet = target === 'tablet';

  const handleLanguageChange = (lang: ESupportedLanguages) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('afiyet_lang', lang);
    
    // Apply document RTL layout direction
    const rtlLanguages = [ESupportedLanguages.ARABIC];
    const isRtl = rtlLanguages.includes(lang);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    setIsLangMenuOpen(false);
  };

  // Helper to render sync status badge as a button
  const renderSyncBadge = () => {
    const baseClasses = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 outline-none";
    
    switch (syncStatus) {
      case 'syncing':
        return (
          <button
            disabled
            className={`${baseClasses} bg-sky-500/10 border-sky-500/20 text-sky-400 cursor-not-allowed`}
            title="Synchronization in progress..."
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Syncing...</span>
          </button>
        );
      case 'error':
        return (
          <button
            onClick={handleSyncClick}
            className={`${baseClasses} bg-red-500/10 border-red-500/20 hover:border-red-500/40 text-red-400 cursor-pointer active:scale-95`}
            title="Sync error! Click to force manual resync."
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Sync Error (Retry)</span>
          </button>
        );
      case 'offline':
        return (
          <button
            onClick={handleSyncClick}
            className={`${baseClasses} bg-slate-800 border-slate-700/50 hover:border-slate-600 text-slate-400 cursor-pointer active:scale-95`}
            title="Offline mode. Click to attempt sync reconnect."
          >
            <WifiOff className="h-3.5 w-3.5" />
            <span>Offline (Retry)</span>
          </button>
        );
      case 'synced':
      default:
        return (
          <button
            onClick={handleSyncClick}
            className={`${baseClasses} bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 cursor-pointer active:scale-95`}
            title="Database synced. Click to force manual resync."
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Synced</span>
          </button>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Sidebar navigation */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-6 px-4 shrink-0 transition-all ${
        isTablet ? 'w-20 md:w-24' : 'w-64'
      }`}>
        <div className="flex flex-col gap-8">
          {/* Logo / App Name */}
          <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => navigate({ to: '/' })}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20 shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            {!isTablet && (
              <div className="flex flex-col">
                <span className="font-semibold leading-tight text-slate-100">Afiyet Portal</span>
                <span className="text-[10px] text-slate-400">Clinical Suite</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <Link
              to="/"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:text-slate-200 hover:bg-slate-800/40 [&.active]:bg-slate-800 [&.active]:text-sky-400 ${
                isTablet ? 'justify-center' : ''
              }`}
            >
              <Users className="h-5 w-5" />
              {!isTablet && <span>Patients</span>}
            </Link>

            {/* Dashboard Target Only Navigation */}
            {!isTablet && (
              <button 
                onClick={() => alert('Analytics are online-only and require central database connections.')}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics & Audit</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sync & Connectivity Info at Sidebar Bottom */}
        <div className="flex flex-col gap-4 border-t border-slate-800/60 pt-4">
          <div className={`flex items-center gap-3 px-2 text-xs ${isTablet ? 'justify-center' : ''}`}>
            {isOnline ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <Wifi className="h-4 w-4 shrink-0" />
                {!isTablet && <span>{t('networkStatus.online')}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <WifiOff className="h-4 w-4 shrink-0" />
                {!isTablet && <span>{t('networkStatus.offline')}</span>}
              </div>
            )}
          </div>
          
          {!isTablet && (
            <div className="bg-slate-800/30 border border-slate-800/80 rounded-lg p-2.5 flex items-start gap-2">
              <Database className="h-4 w-4 text-sky-400 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Storage</span>
                <span className="text-xs text-slate-200">IndexedDB Replication</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm sm:text-base text-slate-200">
              {isTablet ? '📱 Clinical Tablet UI' : '💻 Administrative Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Native Sync Status badge */}
            {renderSyncBadge()}

            {/* Language Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-xs font-semibold text-slate-300 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{languagesDisplayNames[i18n.language as ESupportedLanguages]}</span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl z-55">
                  {Object.values(ESupportedLanguages).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                    >
                      {languagesDisplayNames[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Net connection dot */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Toast Notification overlay */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-55 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-slate-900 border-emerald-500/30 text-emerald-400 shadow-emerald-950/20' 
            : 'bg-slate-900 border-red-500/30 text-red-400 shadow-red-950/20'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          )}
          <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
        </div>
      )}
    </div>
  );
};
export default Layout;
