import React, { useState } from 'react';
import { LIBRARY_RULES } from '../../data/libraryRules';
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
    <nav className="w-full bg-[#f8fbff]/95 backdrop-blur-sm border-b border-[#dbe9f4] text-sm font-medium text-[#1f3a56]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Desktop & Tablet Navigation */}
        <div className="hidden md:flex items-center justify-between h-12 gap-2">
          <div className="flex items-center gap-1.5">
            {/* Libraries Dropdown (Always Open & Instant) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setLibraryMenuOpen(!libraryMenuOpen);
                  setToolsMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                  currentTab === 'libraries'
                    ? 'bg-[#0284c7] text-white shadow-xs'
                    : 'text-[#1f3a56] hover:bg-[#eef5fc]'
                }`}
                aria-expanded={libraryMenuOpen}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Compound Library</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {libraryMenuOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-96 max-h-[28rem] overflow-y-auto rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-xl py-2 z-50"
                  onMouseLeave={() => setLibraryMenuOpen(false)}
                >
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-[#3b5775] uppercase tracking-wider flex items-center justify-between">
                    <span>Compound Library (8 Guides)</span>
                    <span className="text-[10px] font-semibold normal-case text-[#0284c7]">
                      Always Open
                    </span>
                  </div>
                  {LIBRARY_RULES.map((rule) => {
                    const isActive = currentLibraryId === rule.id && currentTab === 'libraries';
                    return (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => handleLibraryClick(rule.id)}
                        className={`w-full px-3.5 py-2.5 text-left text-xs font-medium transition flex items-center gap-2.5 cursor-pointer ${
                          isActive
                            ? 'bg-[#eff6ff] text-[#0284c7] font-bold'
                            : 'text-[#1f3a56] hover:bg-[#f4f9fe]'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />
                        <span className="truncate">{rule.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topics Button */}
            <button
              type="button"
              onClick={() => {
                onSelectTab('practice');
                setLibraryMenuOpen(false);
                setToolsMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-xs font-semibold whitespace-nowrap shrink-0 ${
                currentTab === 'practice'
                  ? 'bg-[#0284c7] text-white shadow-xs'
                  : 'text-[#1f3a56] hover:bg-[#eef5fc]'
              }`}
            >
              <CheckCircle
                className={`w-3.5 h-3.5 ${currentTab === 'practice' ? 'text-white' : 'text-[#0284c7]'}`}
              />
              <span>Topics</span>
            </button>

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
                  ? 'bg-[#0284c7] text-white shadow-xs'
                  : 'text-[#1f3a56] hover:bg-[#eef5fc]'
              }`}
            >
              <Stethoscope
                className={`w-3.5 h-3.5 ${currentTab === 'wizard' ? 'text-white' : 'text-[#0284c7]'}`}
              />
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
                    ? 'bg-[#0284c7] text-white shadow-xs'
                    : 'text-[#1f3a56] hover:bg-[#eef5fc]'
                }`}
                aria-expanded={toolsMenuOpen}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Interactive Tools</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {toolsMenuOpen && (
                <div
                  className="absolute left-0 mt-1.5 w-64 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-xl py-2 z-50"
                  onMouseLeave={() => setToolsMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => handleToolClick('crisscross')}
                    className="w-full px-4 py-2.5 text-left text-xs text-[#1f3a56] hover:bg-[#f4f9fe] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Wrench className="w-4 h-4 text-[#0284c7]" />
                    <div>
                      <span className="font-bold block">Criss-Cross Formula Builder</span>
                      <span className="text-[10px] text-[#3b5775]">Exchange charges into subscripts</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToolClick('oxidation-solver')}
                    className="w-full px-4 py-2.5 text-left text-xs text-[#1f3a56] hover:bg-[#f4f9fe] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-[#0284c7]" />
                    <div>
                      <span className="font-bold block">Oxidation Number Solver</span>
                      <span className="text-[10px] text-[#3b5775]">Step-by-step algebra &amp; exceptions</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToolClick('flashcards')}
                    className="w-full px-4 py-2.5 text-left text-xs text-[#1f3a56] hover:bg-[#f4f9fe] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-[#0284c7]" />
                    <div>
                      <span className="font-bold block">Prefix &amp; Ending Flip Cards</span>
                      <span className="text-[10px] text-[#3b5775]">Greek prefixes, Latin stems, endings</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToolClick('converter')}
                    className="w-full px-4 py-2.5 text-left text-xs text-[#1f3a56] hover:bg-[#f4f9fe] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-[#0284c7]" />
                    <div>
                      <span className="font-bold block">Name ↔ Formula Converter</span>
                      <span className="text-[10px] text-[#3b5775]">Instant bidirectional translation</span>
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
                  ? 'bg-[#0284c7] text-white shadow-xs'
                  : 'text-[#1f3a56] hover:bg-[#eef5fc]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Periodic Table</span>
            </button>
          </div>

          {/* Current view breadcrumb */}
          <div className="text-xs text-[#3b5775] font-medium truncate max-w-xs">
            {currentTab === 'libraries' && (
              <span>
                Library: <strong className="text-[#1f3a56]">{activeRule.title}</strong>
              </span>
            )}
            {currentTab === 'wizard' && <span>Doctor Nomen</span>}
            {currentTab === 'crisscross' && <span>Criss-Cross Formula Builder</span>}
            {currentTab === 'oxidation-solver' && <span>Oxidation Number Solver</span>}
            {currentTab === 'flashcards' && <span>Prefix &amp; Ending Flip Cards</span>}
            {currentTab === 'converter' && <span>Name ↔ Formula Converter</span>}
            {currentTab === 'periodic-table' && <span>Periodic Table (118 Elements)</span>}
            {currentTab === 'practice' && <span>Topics &amp; Practice</span>}
          </div>
        </div>

        {/* Mobile Header Toggle */}
        <div className="md:hidden flex items-center justify-between h-12">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1f3a56]">
            <span className="text-[#0284c7]">View:</span>
            <span className="truncate max-w-[200px]">
              {currentTab === 'libraries'
                ? activeRule.title
                : currentTab === 'wizard'
                  ? 'Doctor Nomen'
                  : currentTab === 'practice'
                    ? 'Topics'
                    : currentTab}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-[#1f3a56] hover:bg-[#eef5fc] transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#dbe9f4] space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#3b5775] uppercase tracking-wider px-2">
                Main Views
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('practice');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 border ${
                    currentTab === 'practice'
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4]'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Topics</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('wizard');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 border ${
                    currentTab === 'wizard'
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4]'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Doctor Nomen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('periodic-table');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 border ${
                    currentTab === 'periodic-table'
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4]'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Periodic Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('converter');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 border ${
                    currentTab === 'converter'
                      ? 'bg-[#0284c7] text-white border-[#0284c7]'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4]'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Converter</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#3b5775] uppercase tracking-wider px-2">
                Interactive Tools
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToolClick('crisscross')}
                  className="w-full p-2.5 rounded-xl text-left text-xs font-semibold bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56]"
                >
                  ⚡ Criss-Cross Formula Builder
                </button>
                <button
                  type="button"
                  onClick={() => handleToolClick('oxidation-solver')}
                  className="w-full p-2.5 rounded-xl text-left text-xs font-semibold bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56]"
                >
                  🧮 Oxidation Number Solver
                </button>
                <button
                  type="button"
                  onClick={() => handleToolClick('flashcards')}
                  className="w-full p-2.5 rounded-xl text-left text-xs font-semibold bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56]"
                >
                  🎴 Prefix &amp; Ending Flip Cards
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-[#dbe9f4]">
              <span className="text-[11px] font-bold text-[#3b5775] uppercase tracking-wider px-2">
                Compound Library (8 Guides)
              </span>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {LIBRARY_RULES.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleLibraryClick(rule.id)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center gap-2 border ${
                      currentLibraryId === rule.id && currentTab === 'libraries'
                        ? 'bg-[#0284c7] text-white border-[#0284c7] font-bold'
                        : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4]'
                    }`}
                  >
                    <span className="truncate">{rule.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
