import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { GuideProvider, useGuide } from './context/GuideContext';
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
import { GuideWidget } from './components/guide/GuideWidget';
import { CalibrateGuideModal } from './components/guide/CalibrateGuideModal';
import { LIBRARY_RULES } from './data/libraryRules';
import { PRACTICE_SETS } from './data/practiceQuestions';
import { ChemicalElement } from './types/chemistry';
import { IS_SINGLE_FILE_BUILD } from './config/appInfo';
import {
  buildAppRouteUrl,
  parseAppRoute,
  shouldUseHashRouting,
} from './utils/routing';

const VALID_RULE_IDS = LIBRARY_RULES.map((r) => r.id);
const VALID_SET_IDS = PRACTICE_SETS.map((s) => s.id);

function getBasePath(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

function navigateBrowserUrl(url: string, useHash: boolean, replace = false): void {
  if (typeof window === 'undefined') return;
  try {
    if (useHash) {
      const normalizedHash = url.startsWith('#') ? url : `#${url}`;
      if (replace) {
        try {
          window.history.replaceState({}, '', normalizedHash);
          return;
        } catch {
          window.location.hash = normalizedHash;
          return;
        }
      }
      if (window.location.hash !== normalizedHash) {
        window.location.hash = normalizedHash;
      }
      return;
    }

    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  } catch {
    // Ignore restricted history mutations on sandboxed origins
  }
}

function MainContent() {
  const { isLibraryUnlocked, queuedAttempts } = useProgress();
  const { user, sectionPolicy, storageUnavailable } = useAuth();
  const { settings } = useSettings();
  const {
    updateAppSnapshot,
    onNavigateTabRef,
    onNavigateLibraryRef,
    guideSettings,
    isMinimized,
  } = useGuide();
  const useHashRouting = shouldUseHashRouting(IS_SINGLE_FILE_BUILD);

  const [currentTab, setCurrentTab] = useState<NavTab>('libraries');
  const [currentLibraryId, setCurrentLibraryId] = useState<string>('writing-chemical-formulas');
  const [practiceInitialSetId, setPracticeInitialSetId] = useState<string | undefined>(undefined);
  const [blockedRouteNotice, setBlockedRouteNotice] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const buildCurrentRoute = useCallback(
    (tab: NavTab, libraryId?: string, practiceSetId?: string) =>
      buildAppRouteUrl({
        useHash: useHashRouting,
        basePath: getBasePath(),
        tab,
        libraryId,
        practiceSetId,
      }),
    [useHashRouting]
  );

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
          navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
          return;
        }
        setBlockedRouteNotice(null);
        setCurrentLibraryId(targetRuleId);
        setCurrentTab('libraries');
        if (pushHistory) {
          navigateBrowserUrl(buildCurrentRoute('libraries', targetRuleId), useHashRouting, false);
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
          navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
          return;
        }
        setBlockedRouteNotice(null);
        setPracticeInitialSetId(targetSetId);
        setCurrentTab('practice');
        if (pushHistory) {
          navigateBrowserUrl(
            buildCurrentRoute('practice', undefined, targetSetId),
            useHashRouting,
            false
          );
        }
        return;
      }

      setBlockedRouteNotice(null);
      setCurrentTab(targetTab);
      if (targetTab !== 'practice') {
        setPracticeInitialSetId(undefined);
      }
      if (pushHistory) {
        navigateBrowserUrl(
          buildCurrentRoute(targetTab, targetTab === 'libraries' ? currentLibraryId : undefined),
          useHashRouting,
          false
        );
      }
    },
    [isLibraryUnlocked, currentLibraryId, buildCurrentRoute, useHashRouting]
  );

  const applyGuardedRouteRef = useRef(applyGuardedRoute);
  applyGuardedRouteRef.current = applyGuardedRoute;

  // Sync URL/hash route once on mount and protect browser Back/Forward/Hash navigation
  useEffect(() => {
    const syncFromUrl = () => {
      const parsed = parseAppRoute(
        {
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        },
        getBasePath(),
        VALID_RULE_IDS,
        VALID_SET_IDS
      );
      applyGuardedRouteRef.current(false, parsed.tab, parsed.ruleId, parsed.setId);
    };

    syncFromUrl();
    if (useHashRouting && !window.location.hash) {
      navigateBrowserUrl(
        buildAppRouteUrl({
          useHash: true,
          basePath: getBasePath(),
          tab: 'libraries',
          libraryId: 'writing-chemical-formulas',
        }),
        true,
        true
      );
    }

    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, [useHashRouting]);

  // If active library or practice set becomes locked (e.g. after signing out), return to safe unlocked state
  useEffect(() => {
    if (currentTab === 'libraries' && !isLibraryUnlocked(currentLibraryId)) {
      setCurrentLibraryId('writing-chemical-formulas');
      navigateBrowserUrl(
        buildCurrentRoute('libraries', 'writing-chemical-formulas'),
        useHashRouting,
        true
      );
    }
    if (
      currentTab === 'practice' &&
      practiceInitialSetId &&
      !isLibraryUnlocked(practiceInitialSetId)
    ) {
      setPracticeInitialSetId(undefined);
      navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
    }
  }, [currentTab, currentLibraryId, practiceInitialSetId, isLibraryUnlocked, buildCurrentRoute, useHashRouting]);

  const handleStartPractice = (libraryId: string) => {
    if (!isLibraryUnlocked(libraryId)) {
      const title =
        PRACTICE_SETS.find((s) => s.id === libraryId)?.title || 'That practice set';
      setBlockedRouteNotice(
        `${title} is locked. Submit a passing score on the previous practice and wait until tomorrow to open it.`
      );
      setCurrentTab('practice');
      setPracticeInitialSetId(undefined);
      navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
      return;
    }
    applyGuardedRoute(true, 'practice', undefined, libraryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToLibrary = (libraryId: string) => {
    applyGuardedRoute(true, 'libraries', libraryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    onNavigateTabRef.current = (tab) => {
      applyGuardedRouteRef.current(
        true,
        tab as NavTab,
        tab === 'libraries' ? currentLibraryId : undefined
      );
    };
    onNavigateLibraryRef.current = (id) => {
      applyGuardedRouteRef.current(true, 'libraries', id);
    };
  }, [currentLibraryId, onNavigateTabRef, onNavigateLibraryRef]);

  useEffect(() => {
    updateAppSnapshot({
      currentTab,
      currentLibraryId,
      isOnline,
      isSignedIn: Boolean(user),
      passingScore: sectionPolicy.passingScore || settings.passingScore || 70,
      queuedCount: queuedAttempts.length,
      isCurrentLibraryUnlocked: isLibraryUnlocked(currentLibraryId),
    });
  }, [
    currentTab,
    currentLibraryId,
    isOnline,
    user,
    sectionPolicy.passingScore,
    settings.passingScore,
    queuedAttempts.length,
    isLibraryUnlocked,
    updateAppSnapshot,
  ]);

  const activeRule =
    LIBRARY_RULES.find((r) => r.id === currentLibraryId) || LIBRARY_RULES[0];

  const guideDesktopReserveClass = (() => {
    if (!guideSettings.guideEnabled || isMinimized) return '';
    if (guideSettings.corner === 'bottom-left') {
      if (guideSettings.size === 'large') return 'md:pl-[420px]';
      if (guideSettings.size === 'compact') return 'md:pl-[324px]';
      return 'md:pl-[368px]';
    }
    if (guideSettings.size === 'large') return 'md:pr-[420px]';
    if (guideSettings.size === 'compact') return 'md:pr-[324px]';
    return 'md:pr-[368px]';
  })();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        onOpenSettings={() => setSettingsModalOpen(true)}
        onNavigateHome={() => {
          applyGuardedRoute(true, 'libraries', 'writing-chemical-formulas');
        }}
      />

      {storageUnavailable && (
        <div
          role="status"
          className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium py-1.5 px-4 text-center"
        >
          Progress may not be saved in this browser
        </div>
      )}

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

      <main
        className={`flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-20 md:pb-10 transition-all duration-200 ${guideDesktopReserveClass}`}
      >
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

      {/* Virtual Guide Floating Card & Calibration Modal */}
      <ErrorBoundary fallbackTitle="Virtual Guide paused">
        <GuideWidget
          onOpenSettings={() => setSettingsModalOpen(true)}
          onNavigateToLibrary={handleNavigateToLibrary}
        />
      </ErrorBoundary>
      <CalibrateGuideModal />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <AuthProvider>
        <SettingsProvider>
          <ProgressProvider>
            <GuideProvider>
              <MainContent />
            </GuideProvider>
          </ProgressProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
