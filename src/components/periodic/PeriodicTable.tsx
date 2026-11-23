import React, { useRef, useState } from 'react';
import { ELEMENTS } from '../../data/elements';
import { ChemicalElement, ElementCategory } from '../../types/chemistry';
import { Search, Filter, Sparkles, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useGuide } from '../../context/GuideContext';

interface PeriodicTableProps {
  onSelectElement: (element: ChemicalElement) => void;
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({ onSelectElement }) => {
  const { settings } = useSettings();
  const { startTour } = useGuide();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const fBlockRef = useRef<HTMLDivElement | null>(null);

  const categoryColors: Record<ElementCategory, { bg: string; text: string; border: string }> = {
    'alkali-metal': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    'alkaline-earth': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    'transition-metal': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    'post-transition-metal': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' },
    'metalloid': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
    'reactive-nonmetal': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    'noble-gas': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    'lanthanide': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300' },
    'actinide': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
    'unknown': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  };

  const isMatched = (el: ChemicalElement): boolean => {
    // Search match
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const matchName = el.name.toLowerCase().includes(term);
      const matchSym = el.symbol.toLowerCase() === term || el.symbol.toLowerCase().startsWith(term);
      const matchNum = String(el.number) === term;
      const matchLatin = el.latinName?.toLowerCase().includes(term);
      if (!matchName && !matchSym && !matchNum && !matchLatin) return false;
    }

    // Filter match
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'variable') return !!el.isVariableOxidationMetal;
    return el.category === selectedFilter;
  };

  const scrollGridHorizontally = (delta: number) => {
    const el = gridScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleToggleFBlockFilter = (series: 'lanthanide' | 'actinide', shouldScrollIntoView = true) => {
    setSelectedFilter((prev) => {
      const next = prev === series ? 'all' : series;
      if (next === series && shouldScrollIntoView) {
        window.requestAnimationFrame(() => {
          fBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  };

  // Render a single element tile
  const renderTile = (
    el: ChemicalElement,
    customClass: string = '',
    gridOverride?: { row: number; col: number }
  ) => {
    const matched = isMatched(el);
    const colors = categoryColors[el.category] || categoryColors.unknown;
    const isVarMetal = !!el.isVariableOxidationMetal;

    return (
      <button
        key={el.number}
        type="button"
        onClick={() => onSelectElement(el)}
        style={{
          gridRow: gridOverride ? gridOverride.row : el.period,
          gridColumn: gridOverride ? gridOverride.col : el.group,
        }}
        className={`relative flex flex-col items-center justify-between p-1 rounded-lg border text-center transition-all duration-150 cursor-pointer ${
          colors.bg
        } ${colors.border} ${
          matched
            ? 'opacity-100 scale-100 hover:scale-110 hover:z-20 hover:shadow-lg'
            : 'opacity-25 grayscale-[60%] scale-95'
        } ${isVarMetal && selectedFilter === 'variable' ? 'ring-2 ring-amber-500 ring-offset-1' : ''} ${customClass}`}
        aria-label={`${el.name}, atomic number ${el.number}, symbol ${el.symbol}`}
        title={`${el.name} (${el.symbol})\nAtomic #: ${el.number}\nWeight: ${el.atomicWeight}\nCategory: ${el.category}`}
      >
        <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] font-mono leading-none px-0.5">
          <span className="text-slate-600">{el.number}</span>
          {isVarMetal && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Variable Oxidation Metal" />
          )}
        </div>
        <span className={`text-xs sm:text-sm font-extrabold ${colors.text} leading-tight`}>
          {el.symbol}
        </span>
        <span className="text-[7px] sm:text-[8px] truncate max-w-full font-medium text-slate-600 leading-none">
          {el.name}
        </span>
      </button>
    );
  };

  // Standard elements (excluding lanthanides 57-71 and actinides 89-103 from main 1-7 grid)
  const mainElements = ELEMENTS.filter(
    (el) => !(el.number >= 57 && el.number <= 71) && !(el.number >= 89 && el.number <= 103)
  );
  const lanthanideElements = ELEMENTS.filter((el) => el.number >= 57 && el.number <= 71);
  const actinideElements = ELEMENTS.filter((el) => el.number >= 89 && el.number <= 103);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div
        data-guide-id="pt-header"
        className="p-4 sm:p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1f3a56] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0284c7] shrink-0" />
              <span>Periodic Table (118 Elements)</span>
            </h2>
            <p className="mt-1 text-sm text-[#3b5775]">
              Tap any element to view its details and oxidation states.
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => startTour('periodic-table')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Tour</span>
            </button>

            {/* Search bar */}
            <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, symbol, number..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] placeholder:text-[#526d88]/70 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
              <Search className="w-4 h-4 text-[#526d88] absolute left-3 top-2.5" />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div
          data-guide-id="pt-controls"
          className="mt-4 flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#dbe9f4]"
        >
          <span className="text-xs font-bold text-[#1f3a56] mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#0284c7]" />
            Filter:
          </span>
          {[
            { id: 'all', label: 'All 118' },
            { id: 'variable', label: '⭐ Metals with Variable Oxidation Numbers', special: true },
            { id: 'alkali-metal', label: 'Alkali Metals' },
            { id: 'alkaline-earth', label: 'Alkaline Earth' },
            { id: 'transition-metal', label: 'Transition Metals' },
            { id: 'post-transition-metal', label: 'Post-Transition' },
            { id: 'metalloid', label: 'Metalloids' },
            { id: 'reactive-nonmetal', label: 'Reactive Nonmetals' },
            { id: 'noble-gas', label: 'Noble Gases' },
            { id: 'lanthanide', label: 'Lanthanides' },
            { id: 'actinide', label: 'Actinides' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                if (pill.id === 'lanthanide' || pill.id === 'actinide') {
                  handleToggleFBlockFilter(pill.id, true);
                } else {
                  setSelectedFilter(pill.id);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedFilter === pill.id
                  ? pill.special
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'bg-[#0284c7] text-white font-bold shadow-xs'
                  : pill.special
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  : 'bg-[#ffffff] text-[#1f3a56] border border-[#dbe9f4] hover:bg-[#f4f9fe]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Periodic Table Card (Horizontally scrollable on narrow screens without page overflow) */}
      <div className="p-3 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm max-w-full overflow-hidden space-y-3">
        {/* Mobile/Tablet Horizontal Scroll Helper Bar */}
        <div className="flex lg:hidden items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[11px] text-[#1f3a56]">
          <span className="font-medium truncate">
            Swipe table horizontally to view Groups 1–18, Lanthanides &amp; Actinides
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => scrollGridHorizontally(-240)}
              className="p-1 rounded-lg bg-[#ffffff] border border-[#dbe9f4] hover:bg-[#eaf3fc] transition cursor-pointer text-[#1f3a56]"
              aria-label="Scroll periodic table left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollGridHorizontally(240)}
              className="p-1 rounded-lg bg-[#ffffff] border border-[#dbe9f4] hover:bg-[#eaf3fc] transition cursor-pointer text-[#1f3a56]"
              aria-label="Scroll periodic table right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={gridScrollRef}
          data-guide-id="pt-grid"
          className="w-full max-w-full overflow-x-auto touch-pan-x overscroll-x-contain pb-2"
        >
          <div className="w-max min-w-[876px] lg:w-full lg:min-w-0 space-y-4">
            {/* Main 1-7 Grid */}
            <div
              className="grid gap-1 sm:gap-1.5 grid-cols-[repeat(18,minmax(44px,1fr))] lg:grid-cols-[repeat(18,minmax(36px,1fr))]"
              style={{
                gridTemplateRows: 'repeat(7, 54px)',
              }}
            >
              {mainElements.map((el) => renderTile(el))}

              {/* Lanthanide marker tile at row 6, col 3 */}
              <button
                type="button"
                onClick={() => handleToggleFBlockFilter('lanthanide', true)}
                style={{ gridRow: 6, gridColumn: 3 }}
                className={`flex flex-col items-center justify-center p-1 rounded-lg border border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold text-center transition cursor-pointer ${
                  selectedFilter === 'lanthanide' ? 'ring-2 ring-pink-500' : ''
                }`}
                title="Filter or view Lanthanides (57-71) below"
                aria-label="Filter Lanthanides 57 to 71"
              >
                <span>57-71</span>
                <span className="text-[8px] font-normal leading-tight">La-Lu *</span>
              </button>

              {/* Actinide marker tile at row 7, col 3 */}
              <button
                type="button"
                onClick={() => handleToggleFBlockFilter('actinide', true)}
                style={{ gridRow: 7, gridColumn: 3 }}
                className={`flex flex-col items-center justify-center p-1 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold text-center transition cursor-pointer ${
                  selectedFilter === 'actinide' ? 'ring-2 ring-rose-500' : ''
                }`}
                title="Filter or view Actinides (89-103) below"
                aria-label="Filter Actinides 89 to 103"
              >
                <span>89-103</span>
                <span className="text-[8px] font-normal leading-tight">Ac-Lr **</span>
              </button>
            </div>

            {/* F-Block: Lanthanides (57-71) & Actinides (89-103) */}
            <div
              ref={fBlockRef}
              data-testid="f-block-grid"
              className="grid gap-1 sm:gap-1.5 pt-3 border-t border-dashed border-[#dbe9f4] grid-cols-[repeat(18,minmax(44px,1fr))] lg:grid-cols-[repeat(18,minmax(36px,1fr))]"
              style={{
                gridTemplateRows: 'repeat(2, 54px)',
              }}
            >
              <button
                type="button"
                onClick={() => handleToggleFBlockFilter('lanthanide', false)}
                style={{ gridRow: 1, gridColumn: '1 / span 3' }}
                className={`flex flex-col items-end justify-center px-2.5 py-1 rounded-lg border text-right transition cursor-pointer ${
                  selectedFilter === 'lanthanide'
                    ? 'border-pink-500 bg-pink-100 text-pink-800 ring-1 ring-pink-500'
                    : 'border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-700'
                }`}
              >
                <span className="text-[11px] font-extrabold leading-tight">* Lanthanides</span>
                <span className="text-[9px] opacity-80 leading-tight">Elements 57–71</span>
              </button>
              {lanthanideElements.map((el, idx) =>
                renderTile(el, '', { row: 1, col: idx + 4 })
              )}

              <button
                type="button"
                onClick={() => handleToggleFBlockFilter('actinide', false)}
                style={{ gridRow: 2, gridColumn: '1 / span 3' }}
                className={`flex flex-col items-end justify-center px-2.5 py-1 rounded-lg border text-right transition cursor-pointer ${
                  selectedFilter === 'actinide'
                    ? 'border-rose-500 bg-rose-100 text-rose-800 ring-1 ring-rose-500'
                    : 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                }`}
              >
                <span className="text-[11px] font-extrabold leading-tight">** Actinides</span>
                <span className="text-[9px] opacity-80 leading-tight">Elements 89–103</span>
              </button>
              {actinideElements.map((el, idx) =>
                renderTile(el, '', { row: 2, col: idx + 4 })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Legend & Variable Metal Callout */}
      <div className="p-4 rounded-xl bg-[#ffffff] border border-[#dbe9f4] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#1f3a56]">Category Key:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryColors).map(([cat, col]) => (
              <span
                key={cat}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${col.bg} ${col.text} ${col.border}`}
              >
                <span className="capitalize">{cat.replace('-', ' ')}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[#dbe9f4] text-xs text-[#3b5775] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>
            <strong className="text-[#1f3a56]">Variable Oxidation Metals Focus:</strong> Copper (Cu +1/+2), Iron (Fe +2/+3), Cobalt (Co +2/+3), Manganese (Mn +2/+4), Mercury (Hg +1/+2), Tin (Sn +2/+4), Lead (Pb +2/+4), Arsenic (As +3/+5), Antimony (Sb +3/+5).
          </span>
        </div>
      </div>
    </div>
  );
};
