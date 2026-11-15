import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProgressProvider } from './context/ProgressContext';
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
import { LIBRARY_RULES } from './data/libraryRules';
import { ChemicalElement } from './types/chemistry';

function MainContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('libraries');
  const [currentLibraryId, setCurrentLibraryId] = useState<string>('writing-chemical-formulas');
  const [practiceInitialSetId, setPracticeInitialSetId] = useState<string | undefined>(undefined);
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  // Check URL parameters on mount (e.g., autostart=1 or tab=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab | null;
      const ruleParam = params.get('rule');

      if (ruleParam && LIBRARY_RULES.some((r) => r.id === ruleParam)) {
        setCurrentLibraryId(ruleParam);
        setCurrentTab('libraries');
      } else if (tabParam) {
        setCurrentTab(tabParam === ('nomen' as NavTab) ? 'wizard' : tabParam);
      }
    } catch (e) {
      console.warn('Could not parse URL search parameters:', e);
    }
  }, []);

  const handleStartPractice = (libraryId: string) => {
    setPracticeInitialSetId(libraryId);
    setCurrentTab('practice');
  };

  const handleNavigateToLibrary = (libraryId: string) => {
    setCurrentLibraryId(libraryId);
    setCurrentTab('libraries');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeRule =
    LIBRARY_RULES.find((r) => r.id === currentLibraryId) || LIBRARY_RULES[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        onOpenSettings={() => setSettingsModalOpen(true)}
        onNavigateHome={() => {
          setCurrentTab('libraries');
          setCurrentLibraryId('writing-chemical-formulas');
        }}
      />

      <Navigation
        currentTab={currentTab}
        currentLibraryId={currentLibraryId}
        onSelectTab={(tab) => {
          if (tab === 'practice') {
            setPracticeInitialSetId(undefined);
          }
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectLibrary={handleNavigateToLibrary}
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
              onClick={() => setSettingsModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Settings &amp; Themes
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setCurrentTab('periodic-table');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Periodic Table (118)
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setCurrentTab('wizard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              Doctor Nomen
            </button>
          </div>
        </div>
      </footer>

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
