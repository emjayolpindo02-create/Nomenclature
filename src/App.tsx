import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { Navigation, NavTab } from './components/common/Navigation';
import { LibraryView } from './components/libraries/LibraryView';
import { DoctorNomen } from './components/tools/DoctorNomen';
import { CrissCrossBuilder } from './components/tools/CrissCrossBuilder';
import { OxidationSolverTool } from './components/tools/OxidationSolverTool';
import { FlashCardsTool } from './components/tools/FlashCardsTool';
import { ConverterTool } from './components/tools/ConverterTool';
import { PeriodicTable } from './components/periodic/PeriodicTable';
import { PracticeView } from './components/practice/PracticeView';
import { ElementDetailModal } from './components/common/ElementDetailModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { StudentSignInModal } from './components/auth/StudentSignInModal';
import { LIBRARY_RULES } from './data/libraryRules';
import { PRACTICE_SETS } from './data/practiceQuestions';
import { ChemicalElement } from './types/chemistry';

const VALID_TABS: NavTab[] = [
  'libraries',
  'wizard',
  'crisscross',
  'oxidation-solver',
  'flashcards',
  'converter',
  'periodic-table',
  'practice',
];

function getBasePath(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

function buildRouteUrl(tab: NavTab, libraryId?: string, practiceSetId?: string): string {
  const base = getBasePath();
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (tab === 'libraries' && libraryId) {
    params.set('rule', libraryId);
  }
  if (tab === 'practice' && practiceSetId) {
    params.set('set', practiceSetId);
  }
  return `${base}?${params.toString()}`;
}

function parseLocationRoute(): {
  tab: NavTab;
  ruleId: string | null;
  setId: string | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const ruleParam = params.get('rule');
    const setParam = params.get('set');

    const segments = window.location.pathname
      .replace(new RegExp(`^${getBasePath()}`), '')
      .split('/')
      .filter(Boolean);

    let tab: NavTab = 'libraries';
    let ruleId: string | null = null;
    let setId: string | null = null;

    if (ruleParam && LIBRARY_RULES.some((r) => r.id === ruleParam)) {
      tab = 'libraries';
      ruleId = ruleParam;
    } else if (setParam && PRACTICE_SETS.some((s) => s.id === setParam)) {
      tab = 'practice';
      setId = setParam;
    } else if (tabParam) {
      if (tabParam === 'nomen') {
        tab = 'wizard';
      } else if (VALID_TABS.includes(tabParam as NavTab)) {
        tab = tabParam as NavTab;
      }
    } else if (segments.length > 0) {
      const head = segments[0];
      const second = segments[1];
      if (head === 'rule' && second && LIBRARY_RULES.some((r) => r.id === second)) {
        tab = 'libraries';
        ruleId = second;
      } else if (head === 'practice' && second && PRACTICE_SETS.some((s) => s.id === second)) {
        tab = 'practice';
        setId = second;
      } else if (VALID_TABS.includes(head as NavTab)) {
        tab = head as NavTab;
      }
    }

    return { tab, ruleId, setId };
  } catch {
    return { tab: 'libraries', ruleId: null, setId: null };
  }
}

function MainContent() {
  const { isLibraryUnlocked } = useProgress();

  const [currentTab, setCurrentTab] = useState<NavTab>('libraries');
  const [currentLibraryId, setCurrentLibraryId] = useState<string>('writing-chemical-formulas');
  const [practiceInitialSetId, setPracticeInitialSetId] = useState<string | undefined>(undefined);
  const [blockedRouteNotice, setBlockedRouteNotice] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  const applyGuardedRoute = useCallback(
    (pushHistory: boolean, targetTab: NavTab, targetRuleId?: string | null, targetSetId?: string | null) => {
      if (targetTab === 'libraries' && targetRuleId) {
        if (!isLibraryUnlocked(targetRuleId)) {
          const lockedTitle =
            LIBRARY_RULES.find((r) => r.id === targetRuleId)?.title || 'this topic';
          setBlockedRouteNotice(
            `${lockedTitle} is locked. Submit a passing score on the previous practice and wait until tomorrow to open it.`
          );
          setCurrentTab('practice');
          setPracticeInitialSetId(undefined);
          window.history.replaceState({}, '', buildRouteUrl('practice'));
          return;
        }
        setBlockedRouteNotice(null);
        setCurrentLibraryId(targetRuleId);
        setCurrentTab('libraries');
        if (pushHistory) {
          window.history.pushState({}, '', buildRouteUrl('libraries', targetRuleId));
        }
        return;
      }

      if (targetTab === 'practice' && targetSetId) {
        if (!isLibraryUnlocked(targetSetId)) {
          const lockedTitle =
            PRACTICE_SETS.find((s) => s.id === targetSetId)?.title || 'this practice set';
          setBlockedRouteNotice(
            `${lockedTitle} is locked. Submit a passing score on the previous practice and wait until tomorrow to open it.`
          );
          setCurrentTab('practice');
          setPracticeInitialSetId(undefined);
          window.history.replaceState({}, '', buildRouteUrl('practice'));
          return;
        }
        setBlockedRouteNotice(null);
        setPracticeInitialSetId(targetSetId);
        setCurrentTab('practice');
        if (pushHistory) {
          window.history.pushState({}, '', buildRouteUrl('practice', undefined, targetSetId));
        }
        return;
      }

      setBlockedRouteNotice(null);
      setCurrentTab(targetTab);
      if (targetTab !== 'practice') {
        setPracticeInitialSetId(undefined);
      }
      if (pushHistory) {
        window.history.pushState(
          {},
          '',
          buildRouteUrl(targetTab, targetTab === 'libraries' ? currentLibraryId : undefined)
        );
      }
    },
    [isLibraryUnlocked, currentLibraryId]
  );

  const applyGuardedRouteRef = useRef(applyGuardedRoute);
  applyGuardedRouteRef.current = applyGuardedRoute;

  // Sync URL parameters once on mount and protect browser Back/Forward navigation
  useEffect(() => {
    const syncFromUrl = () => {
      const parsed = parseLocationRoute();
      applyGuardedRouteRef.current(false, parsed.tab, parsed.ruleId, parsed.setId);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // If active library or practice set becomes locked (e.g. after signing out), return to safe unlocked state
  useEffect(() => {
    if (currentTab === 'libraries' && !isLibraryUnlocked(currentLibraryId)) {
      setCurrentLibraryId('writing-chemical-formulas');
      window.history.replaceState(
        {},
        '',
        buildRouteUrl('libraries', 'writing-chemical-formulas')
      );
    }
    if (
      currentTab === 'practice' &&
      practiceInitialSetId &&
      !isLibraryUnlocked(practiceInitialSetId)
    ) {
      setPracticeInitialSetId(undefined);
      window.history.replaceState({}, '', buildRouteUrl('practice'));
    }
  }, [currentTab, currentLibraryId, practiceInitialSetId, isLibraryUnlocked]);

  const handleStartPractice = (libraryId: string) => {
    if (!isLibraryUnlocked(libraryId)) {
      const title =
        PRACTICE_SETS.find((s) => s.id === libraryId)?.title || 'That practice set';
      setBlockedRouteNotice(
        `${title} is locked. Submit a passing score on the previous practice and wait until tomorrow to open it.`
      );
      setCurrentTab('practice');
      setPracticeInitialSetId(undefined);
      window.history.replaceState({}, '', buildRouteUrl('practice'));
      return;
    }
    applyGuardedRoute(true, 'practice', undefined, libraryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToLibrary = (libraryId: string) => {
    applyGuardedRoute(true, 'libraries', libraryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeRule =
    LIBRARY_RULES.find((r) => r.id === currentLibraryId) || LIBRARY_RULES[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        onOpenSettings={() => setSettingsModalOpen(true)}
        onNavigateHome={() => {
          applyGuardedRoute(true, 'libraries', 'writing-chemical-formulas');
        }}
      />

      <Navigation
        currentTab={currentTab}
        currentLibraryId={currentLibraryId}
        onSelectTab={(tab) => {
          if (tab === 'practice') {
            setPracticeInitialSetId(undefined);
          }
          applyGuardedRoute(true, tab, tab === 'libraries' ? currentLibraryId : undefined);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectLibrary={(id) => {
          handleNavigateToLibrary(id);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ErrorBoundary fallbackTitle="Could not load this section">
          {currentTab === 'libraries' && (
            <LibraryView
              rule={activeRule}
              onStartPractice={handleStartPractice}
              onSelectElement={(el) => setSelectedElement(el)}
              onNavigateToLibrary={handleNavigateToLibrary}
            />
          )}

          {currentTab === 'wizard' && (
            <DoctorNomen
              onNavigateToLibrary={handleNavigateToLibrary}
              onSelectElement={(el) => setSelectedElement(el)}
            />
          )}

          {currentTab === 'crisscross' && (
            <CrissCrossBuilder onSelectElement={(el) => setSelectedElement(el)} />
          )}

          {currentTab === 'oxidation-solver' && (
            <OxidationSolverTool onSelectElement={(el) => setSelectedElement(el)} />
          )}

          {currentTab === 'flashcards' && <FlashCardsTool />}

          {currentTab === 'converter' && (
            <ConverterTool
              onSelectElement={(el) => setSelectedElement(el)}
              onNavigateToLibrary={handleNavigateToLibrary}
            />
          )}

          {currentTab === 'periodic-table' && (
            <PeriodicTable onSelectElement={(el) => setSelectedElement(el)} />
          )}

          {currentTab === 'practice' && (
            <PracticeView
              initialSetId={practiceInitialSetId}
              blockedNotice={blockedRouteNotice}
              onClearBlockedNotice={() => setBlockedRouteNotice(null)}
              onSelectElement={(el) => setSelectedElement(el)}
              onNavigateToLibrary={handleNavigateToLibrary}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Clean Footer without author, school, email, or course code */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">I-LAB</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Settings &amp; Themes
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                applyGuardedRoute(true, 'periodic-table');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Periodic Table (118)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                applyGuardedRoute(true, 'wizard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Doctor Nomen
            </button>
          </div>
        </div>
      </footer>

      {/* Student Sign In & PIN Change Modal */}
      <StudentSignInModal />

      {/* Element Detail Modal */}
      <ElementDetailModal
        element={selectedElement}
        onClose={() => setSelectedElement(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <AuthProvider>
        <SettingsProvider>
          <ProgressProvider>
            <MainContent />
          </ProgressProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
