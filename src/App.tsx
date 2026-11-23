import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { GuideProvider, useGuide } from './context/GuideContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { Navigation, NavTab } from './components/common/Navigation';
import { StartScreen } from './components/start/StartScreen';
import { LibraryView } from './components/libraries/LibraryView';
import { DoctorNomen } from './components/tools/DoctorNomen';
import { CrissCrossBuilder } from './components/tools/CrissCrossBuilder';
import { OxidationSolverTool } from './components/tools/OxidationSolverTool';
import { FlashCardsTool } from './components/tools/FlashCardsTool';
import { ConverterTool } from './components/tools/ConverterTool';
import { PeriodicTable } from './components/periodic/PeriodicTable';
import { PracticeView } from './components/practice/PracticeView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ElementDetailModal } from './components/common/ElementDetailModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { StudentSignInModal } from './components/auth/StudentSignInModal';
import { GuideWidget } from './components/guide/GuideWidget';
import { CalibrateGuideModal } from './components/guide/CalibrateGuideModal';
import { ChemistryBackdrop } from './components/common/ChemistryBackdrop';
import { LIBRARY_RULES } from './data/libraryRules';
import {
  TOPICS,
  VALID_TOPIC_IDS,
  getTopicById,
  getTopicForLibraryRule,
} from './data/topics';
import { ChemicalElement, TopicId } from './types/chemistry';
import { IS_SINGLE_FILE_BUILD } from './config/appInfo';
import {
  buildAppRouteUrl,
  parseAppRoute,
  shouldUseHashRouting,
} from './utils/routing';

const VALID_RULE_IDS = LIBRARY_RULES.map((r) => r.id);
const VALID_SET_IDS = Array.from(new Set([...VALID_TOPIC_IDS, ...VALID_RULE_IDS]));

function getBasePath(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

function hasExplicitDeepLink(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hash = (window.location.hash || '').replace(/^#\/?/, '').trim();
    if (hash.length > 0) return true;
    const params = new URLSearchParams(window.location.search);
    if (params.has('tab') || params.has('rule') || params.has('set')) return true;
    const base = getBasePath().replace(/\/+$/, '');
    const path = window.location.pathname.replace(/\/+$/, '');
    return path.length > base.length;
  } catch {
    return false;
  }
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

function resolveTopicId(rawSetOrRuleId: string | null | undefined): TopicId | null {
  if (!rawSetOrRuleId) return null;
  const direct = getTopicById(rawSetOrRuleId);
  if (direct) return direct.id;
  if (VALID_RULE_IDS.includes(rawSetOrRuleId)) {
    return getTopicForLibraryRule(rawSetOrRuleId);
  }
  return null;
}

function MainContent() {
  const { getTopicAccess, isTopicUnlocked, queuedCompletions } = useProgress();
  const { firebaseUser, isTeacher, storageUnavailable, openSignInModal } = useAuth();
  const { settings } = useSettings();
  const {
    updateAppSnapshot,
    onNavigateTabRef,
    onNavigateLibraryRef,
    guideSettings,
    isMinimized,
  } = useGuide();
  const useHashRouting = shouldUseHashRouting(IS_SINGLE_FILE_BUILD);

  const [showStartScreen, setShowStartScreen] = useState<boolean>(() => !hasExplicitDeepLink());
  const [currentTab, setCurrentTab] = useState<NavTab>('practice');
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
      // Built-in Compound Library is ALWAYS unlocked with no login, sync, or internet
      if (targetTab === 'libraries') {
        const safeRuleId =
          targetRuleId && VALID_RULE_IDS.includes(targetRuleId)
            ? targetRuleId
            : currentLibraryId;
        setBlockedRouteNotice(null);
        setCurrentLibraryId(safeRuleId);
        setCurrentTab('libraries');
        if (pushHistory) {
          navigateBrowserUrl(buildCurrentRoute('libraries', safeRuleId), useHashRouting, false);
        }
        return;
      }

      if (targetTab === 'practice' && targetSetId) {
        const resolvedTopicId = resolveTopicId(targetSetId);
        if (resolvedTopicId && !isTopicUnlocked(resolvedTopicId)) {
          const access = getTopicAccess(resolvedTopicId);
          const lockedTitle =
            TOPICS.find((t) => t.id === resolvedTopicId)?.title || 'This topic';
          setBlockedRouteNotice(
            `${lockedTitle} is locked. ${access.lockLabel || 'Check the unlock requirements below.'}`
          );
          setCurrentTab('practice');
          setPracticeInitialSetId(undefined);
          navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
          return;
        }
        setBlockedRouteNotice(null);
        setPracticeInitialSetId(resolvedTopicId || undefined);
        setCurrentTab('practice');
        if (pushHistory) {
          navigateBrowserUrl(
            buildCurrentRoute('practice', undefined, resolvedTopicId || undefined),
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
          buildCurrentRoute(targetTab),
          useHashRouting,
          false
        );
      }
    },
    [isTopicUnlocked, getTopicAccess, currentLibraryId, buildCurrentRoute, useHashRouting]
  );

  const applyGuardedRouteRef = useRef(applyGuardedRoute);
  applyGuardedRouteRef.current = applyGuardedRoute;

  // Sync URL/hash route on mount and protect browser Back/Forward/Hash navigation
  useEffect(() => {
    const syncFromUrl = () => {
      const explicit = hasExplicitDeepLink();
      if (!explicit) return;
      setShowStartScreen(false);
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

    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, [useHashRouting]);

  // If active topic becomes locked (e.g. teacher locked it live or user signed out), return safely to Topics list
  useEffect(() => {
    if (currentTab === 'practice' && practiceInitialSetId) {
      const resolved = resolveTopicId(practiceInitialSetId);
      if (resolved && !isTopicUnlocked(resolved)) {
        setPracticeInitialSetId(undefined);
        navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
      }
    }
  }, [currentTab, practiceInitialSetId, isTopicUnlocked, buildCurrentRoute, useHashRouting]);

  const handleStartPractice = (topicOrLibraryId: string) => {
    const resolvedTopicId = resolveTopicId(topicOrLibraryId) || 'ionic-compounds';
    setShowStartScreen(false);
    if (!isTopicUnlocked(resolvedTopicId)) {
      const access = getTopicAccess(resolvedTopicId);
      const title = getTopicById(resolvedTopicId)?.title || 'That topic';
      setBlockedRouteNotice(
        `${title} is locked. ${access.lockLabel || 'Check unlock requirements below.'}`
      );
      setCurrentTab('practice');
      setPracticeInitialSetId(undefined);
      navigateBrowserUrl(buildCurrentRoute('practice'), useHashRouting, true);
      return;
    }
    applyGuardedRoute(true, 'practice', undefined, resolvedTopicId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToLibrary = (libraryId: string) => {
    setShowStartScreen(false);
    applyGuardedRoute(true, 'libraries', libraryId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTeacher = () => {
    if (isTeacher) {
      setShowStartScreen(false);
      applyGuardedRoute(true, 'teacher');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    openSignInModal({
      mode: 'teacher',
      onSuccess: () => {
        setShowStartScreen(false);
        applyGuardedRoute(true, 'teacher');
      },
    });
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
      setShowStartScreen(false);
      applyGuardedRouteRef.current(
        true,
        tab as NavTab,
        tab === 'libraries' ? currentLibraryId : undefined
      );
    };
    onNavigateLibraryRef.current = (id) => {
      setShowStartScreen(false);
      applyGuardedRouteRef.current(true, 'libraries', id);
    };
  }, [currentLibraryId, onNavigateTabRef, onNavigateLibraryRef]);

  useEffect(() => {
    updateAppSnapshot({
      currentTab,
      currentLibraryId,
      isOnline,
      isSignedIn: Boolean(firebaseUser),
      passingScore: settings.passingScore || 75,
      queuedCount: queuedCompletions.length,
      isCurrentLibraryUnlocked: true,
    });
  }, [
    currentTab,
    currentLibraryId,
    isOnline,
    firebaseUser,
    settings.passingScore,
    queuedCompletions.length,
    updateAppSnapshot,
  ]);

  const activeRule =
    LIBRARY_RULES.find((r) => r.id === currentLibraryId) || LIBRARY_RULES[0];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#fbfdff] text-[#1f3a56]">
      <ChemistryBackdrop />

      <div className="relative z-10 min-h-screen flex flex-col">
        {showStartScreen ? (
          <StartScreen
            onStartTopics={() => {
              setShowStartScreen(false);
              applyGuardedRoute(true, 'practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenLibrary={() => {
              setShowStartScreen(false);
              applyGuardedRoute(true, 'libraries', currentLibraryId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onOpenTeacher={handleOpenTeacher}
          />
        ) : (
          <>
            <Header
              onOpenSettings={() => setSettingsModalOpen(true)}
              onNavigateHome={() => {
                setShowStartScreen(true);
                navigateBrowserUrl(
                  useHashRouting ? '#/' : getBasePath(),
                  useHashRouting,
                  false
                );
              }}
              onNavigateTeacher={handleOpenTeacher}
            />

            {storageUnavailable && (
              <div
                role="status"
                className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs font-medium py-1.5 px-4 text-center"
              >
                Progress may not be saved in this browser.
              </div>
            )}

            <Navigation
              currentTab={currentTab}
              currentLibraryId={currentLibraryId}
              onSelectTab={(tab) => {
                if (tab === 'practice') {
                  setPracticeInitialSetId(undefined);
                }
                applyGuardedRoute(
                  true,
                  tab,
                  tab === 'libraries' ? currentLibraryId : undefined
                );
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectLibrary={(id) => {
                handleNavigateToLibrary(id);
              }}
            />

            <main
              className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24 transition-all duration-200"
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

                {currentTab === 'teacher' && <TeacherDashboard />}
              </ErrorBoundary>
            </main>

            {/* Clean White Footer without author, school, email, or course code */}
            <footer className="w-full border-t border-[#dbe9f4] bg-[#ffffff]/95 backdrop-blur-sm py-6 text-xs text-[#435e7a]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[#1f3a56]">I-LAB</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeInitialSetId(undefined);
                      applyGuardedRoute(true, 'practice');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-[#0284c7] font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    Topics
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(true)}
                    className="hover:text-[#0284c7] font-semibold transition cursor-pointer whitespace-nowrap"
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
                    className="hover:text-[#0284c7] font-semibold transition cursor-pointer whitespace-nowrap"
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
                    className="hover:text-[#0284c7] font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    Doctor Nomen
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}

        {/* Student / Teacher Google & Guest Modal */}
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
          onOpenTeacherPortal={handleOpenTeacher}
        />

        {/* Virtual Guide Floating Card & Calibration Modal (hidden on StartScreen so StartScreen stays clean) */}
        {!showStartScreen && (
          <ErrorBoundary fallbackTitle="Virtual Guide paused">
            <GuideWidget
              onOpenSettings={() => setSettingsModalOpen(true)}
              onNavigateToLibrary={handleNavigateToLibrary}
            />
          </ErrorBoundary>
        )}
        <CalibrateGuideModal />
      </div>
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
