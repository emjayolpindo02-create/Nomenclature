import React, { useState } from 'react';
import { LIBRARY_RULES } from '../../data/libraryRules';
import { useProgress } from '../../context/ProgressContext';
import {
  BookOpen,
  Stethoscope,
  Wrench,
  Grid,
  CheckCircle,
  ChevronDown,
  Menu,
  X,
  Layers,
  ArrowLeftRight,
  Calculator,
  Lock,
  Clock,
  Check,
} from 'lucide-react';

export type NavTab =
  | 'libraries'
  | 'wizard'
  | 'crisscross'
  | 'oxidation-solver'
  | 'flashcards'
  | 'converter'
  | 'periodic-table'
  | 'practice';

interface NavigationProps {
  currentTab: NavTab;
  currentLibraryId: string;
  onSelectTab: (tab: NavTab) => void;
  onSelectLibrary: (libraryId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  currentLibraryId,
  onSelectTab,
  onSelectLibrary,
}) => {
  const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getUnlockStatus, progressMap } = useProgress();

  const activeRule = LIBRARY_RULES.find((r) => r.id === currentLibraryId) || LIBRARY_RULES[0];

  const handleLibraryClick = (id: string) => {
    onSelectLibrary(id);
    setLibraryMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const handleToolClick = (toolTab: NavTab) => {
    onSelectTab(toolTab);
    setToolsMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="w-full bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-sm font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop & Tablet Navigation */}
        <div className="hidden md:flex items-center justify-between h-12 gap-2">
          <div className="flex items-center gap-1.5">
            {/* Libraries Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLibraryMenuOpen(!libraryMenuOpen);
                  setToolsMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                  currentTab === 'libraries'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
                aria-expanded={libraryMenuOpen}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Libraries</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {libraryMenuOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-96 max-h-[28rem] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setLibraryMenuOpen(false)}
                >
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Rule Libraries (8)</span>
                    <span className="text-[10px] font-normal normal-case">Submit Score + Next Day</span>
                  </div>
                  {LIBRARY_RULES.map((rule) => {
                    const status = getUnlockStatus(rule.id);
                    const isPassed = Boolean(
                      progressMap[rule.id]?.submitted && progressMap[rule.id]?.passed
                    );
                    const isActive = currentLibraryId === rule.id && currentTab === 'libraries';

                    return (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => handleLibraryClick(rule.id)}
                        className={`w-full px-3.5 py-2.5 text-left text-xs font-medium transition flex items-center justify-between gap-2 cursor-pointer ${
                          isActive
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                            : status.unlocked
                            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {!status.unlocked ? (
                            status.reason === 'wait-next-day' ||
                            status.reason === 'awaiting-sync' ||
                            status.reason === 'clock-backward' ? (
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )
                          ) : isPassed ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                          )}
                          <span className="truncate">{rule.title}</span>
                        </span>

                        {!status.unlocked && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                              status.reason === 'wait-next-day' ||
                              status.reason === 'awaiting-sync' ||
                              status.reason === 'clock-backward'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {status.reason === 'wait-next-day'
                              ? `Next day (${status.countdownLabel})`
                              : status.reason === 'awaiting-sync'
                              ? 'Awaiting Sync'
                              : status.reason === 'clock-backward'
                              ? 'Clock Check'
                              : `Score ≥${status.requiredScore}%`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Doctor Nomen Button */}
            <button
              type="button"
              onClick={() => {
                onSelectTab('wizard');
                setLibraryMenuOpen(false);
                setToolsMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                currentTab === 'wizard'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-sky-500" />
              <span>Doctor Nomen</span>
            </button>

            {/* Interactive Tools Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setToolsMenuOpen(!toolsMenuOpen);
                  setLibraryMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                  ['crisscross', 'oxidation-solver', 'flashcards', 'converter'].includes(currentTab)
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
                aria-expanded={toolsMenuOpen}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Interactive Tools</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {toolsMenuOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setToolsMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => handleToolClick('crisscross')}
                    className="w-full px-4 py-2.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Wrench className="w-4 h-4 text-sky-500" />
                    <div>
                      <span className="font-bold block">Criss-Cross Formula Builder</span>
                      <span className="text-[10px] text-slate-400">Exchange charges into subscripts</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToolClick('oxidation-solver')}
                    className="w-full px-4 py-2.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="font-bold block">Oxidation Number Solver</span>
                      <span className="text-[10px] text-slate-400">Step-by-step algebra &amp; exceptions</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToolClick('flashcards')}
                    className="w-full px-4 py-2.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-purple-500" />
                    <div>
                      <span className="font-bold block">Prefix &amp; Ending Flip Cards</span>
                      <span className="text-[10px] text-slate-400">Greek prefixes, Latin stems, endings</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToolClick('converter')}
                    className="w-full px-4 py-2.5 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="font-bold block">Name ↔ Formula Converter</span>
                      <span className="text-[10px] text-slate-400">Instant bidirectional translation</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Periodic Table Button */}
            <button
              type="button"
              onClick={() => {
                onSelectTab('periodic-table');
                setLibraryMenuOpen(false);
                setToolsMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                currentTab === 'periodic-table'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Periodic Table</span>
            </button>

            {/* Practice Curriculum Button */}
            <button
              type="button"
              onClick={() => {
                onSelectTab('practice');
                setLibraryMenuOpen(false);
                setToolsMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                currentTab === 'practice'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Practice</span>
            </button>
          </div>

          {/* Current view indicator breadcrumb on right */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs">
            {currentTab === 'libraries' && (
              <span>
                Viewing: <strong>{activeRule.title}</strong>
              </span>
            )}
            {currentTab === 'wizard' && <span>Doctor Nomen</span>}
            {currentTab === 'crisscross' && <span>Criss-Cross Formula Builder</span>}
            {currentTab === 'oxidation-solver' && <span>Oxidation Number Solver</span>}
            {currentTab === 'flashcards' && <span>Prefix &amp; Ending Flip Cards</span>}
            {currentTab === 'converter' && <span>Name ↔ Formula Converter</span>}
            {currentTab === 'periodic-table' && <span>Periodic Table (118 Elements)</span>}
            {currentTab === 'practice' && <span>Practice Sets</span>}
          </div>
        </div>

        {/* Mobile Header Toggle */}
        <div className="md:hidden flex items-center justify-between h-12">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="text-sky-600 dark:text-sky-400">Current:</span>
            <span className="truncate max-w-[200px]">
              {currentTab === 'libraries'
                ? activeRule.title
                : currentTab === 'wizard'
                ? 'Doctor Nomen'
                : currentTab}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Main Views
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('wizard');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 ${
                    currentTab === 'wizard' ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-sky-500" />
                  <span>Doctor Nomen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('periodic-table');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 ${
                    currentTab === 'periodic-table' ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <Grid className="w-4 h-4 text-teal-500" />
                  <span>Periodic Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('practice');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 ${
                    currentTab === 'practice' ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Practice</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('converter');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 ${
                    currentTab === 'converter' ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                  <span>Converter</span>
                </button>
              </div>
            </div>

            {/* Interactive Tools */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Interactive Tools
              </span>
              <div className="grid grid-cols-1 gap-1">
                <button
                  type="button"
                  onClick={() => handleToolClick('crisscross')}
                  className="w-full p-2 rounded-lg text-left text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  ⚡ Criss-Cross Formula Builder
                </button>
                <button
                  type="button"
                  onClick={() => handleToolClick('oxidation-solver')}
                  className="w-full p-2 rounded-lg text-left text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  🧮 Oxidation Number Solver
                </button>
                <button
                  type="button"
                  onClick={() => handleToolClick('flashcards')}
                  className="w-full p-2 rounded-lg text-left text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  🎴 Prefix &amp; Ending Flip Cards
                </button>
              </div>
            </div>

            {/* 8 Libraries List with Lock Icons */}
            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Rule Libraries (8)
              </span>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {LIBRARY_RULES.map((rule) => {
                  const status = getUnlockStatus(rule.id);
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => handleLibraryClick(rule.id)}
                      className={`w-full p-2 rounded-lg text-left text-xs transition flex items-center justify-between gap-2 ${
                        currentLibraryId === rule.id && currentTab === 'libraries'
                          ? 'bg-sky-600 text-white font-bold'
                          : status.unlocked
                          ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      <span className="truncate">{rule.title}</span>
                      {!status.unlocked && (
                        <Lock className="w-3.5 h-3.5 shrink-0 opacity-75" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
