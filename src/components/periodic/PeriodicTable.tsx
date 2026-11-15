import React, { useState } from 'react';
import { ELEMENTS } from '../../data/elements';
import { ChemicalElement, ElementCategory } from '../../types/chemistry';
import { Search, Filter, Sparkles, Zap, Info } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface PeriodicTableProps {
  onSelectElement: (element: ChemicalElement) => void;
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({ onSelectElement }) => {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const categoryColors: Record<ElementCategory, { bg: string; text: string; border: string }> = {
    'alkali-metal': { bg: 'bg-red-500/15 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-400 dark:border-red-800' },
    'alkaline-earth': { bg: 'bg-orange-500/15 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-400 dark:border-orange-800' },
    'transition-metal': { bg: 'bg-blue-500/15 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-400 dark:border-blue-800' },
    'post-transition-metal': { bg: 'bg-cyan-500/15 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-400 dark:border-cyan-800' },
    'metalloid': { bg: 'bg-teal-500/15 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-400 dark:border-teal-800' },
    'reactive-nonmetal': { bg: 'bg-emerald-500/15 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-800' },
    'noble-gas': { bg: 'bg-purple-500/15 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-400 dark:border-purple-800' },
    'lanthanide': { bg: 'bg-pink-500/15 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-400 dark:border-pink-800' },
    'actinide': { bg: 'bg-rose-500/15 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-400 dark:border-rose-800' },
    'unknown': { bg: 'bg-slate-500/15 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-400 dark:border-slate-800' },
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

  // Render a single element tile
  const renderTile = (el: ChemicalElement, customClass: string = '') => {
    const matched = isMatched(el);
    const colors = categoryColors[el.category] || categoryColors.unknown;
    const isVarMetal = !!el.isVariableOxidationMetal;

    return (
      <button
        key={el.number}
        onClick={() => onSelectElement(el)}
        style={{ gridRow: el.period, gridColumn: el.group }}
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
          <span className="text-slate-500 dark:text-slate-400">{el.number}</span>
          {isVarMetal && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Variable Oxidation Metal" />
          )}
        </div>
        <span className={`text-xs sm:text-sm font-extrabold ${colors.text} leading-tight`}>
          {el.symbol}
        </span>
        <span className="text-[7px] sm:text-[8px] truncate max-w-full font-medium text-slate-600 dark:text-slate-400 leading-none">
          {el.name}
        </span>
      </button>
    );
  };

  // Standard elements (excluding lanthanides 57-71 and actinides 89-103 from main 1-7 grid)
  const mainElements = ELEMENTS.filter(
    (el) => !(el.number >= 57 && el.number <= 71) && !(el.number >= 89 && el.number <= 103)
  );

  const lanthanides = ELEMENTS.filter((el) => el.number >= 57 && el.number <= 71);
  const actinides = ELEMENTS.filter((el) => el.number >= 89 && el.number <= 103);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 border border-teal-500/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500" />
              <span>Periodic Table (118 Elements)</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Tap any element to view its details and oxidation states.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, symbol, number..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-2 border-t border-teal-500/20">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
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
              onClick={() => setSelectedFilter(pill.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedFilter === pill.id
                  ? pill.special
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                  : pill.special
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Periodic Table Grid Container (Horizontally scrollable on small screens) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-x-auto">
        <div className="min-w-[840px] space-y-4">
          {/* Main 1-7 Grid */}
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(18, minmax(42px, 1fr))',
              gridTemplateRows: 'repeat(7, 54px)',
            }}
          >
            {mainElements.map((el) => renderTile(el))}

            {/* Lanthanide placeholder tile at row 6, col 3 */}
            <div
              style={{ gridRow: 6, gridColumn: 3 }}
              className="flex flex-col items-center justify-center p-1 rounded-lg border border-pink-400/50 bg-pink-500/10 text-pink-700 dark:text-pink-300 text-[10px] font-bold text-center"
            >
              <span>57-71</span>
              <span className="text-[8px] font-normal leading-tight">La-Lu *</span>
            </div>

            {/* Actinide placeholder tile at row 7, col 3 */}
            <div
              style={{ gridRow: 7, gridColumn: 3 }}
              className="flex flex-col items-center justify-center p-1 rounded-lg border border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-bold text-center"
            >
              <span>89-103</span>
              <span className="text-[8px] font-normal leading-tight">Ac-Lr **</span>
            </div>
          </div>

          {/* Lanthanide & Actinide Separate Rows */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {/* Lanthanide Row */}
            <div className="flex items-center gap-1.5">
              <span className="w-16 text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-tight text-right shrink-0">
                * Lanthanides
              </span>
              <div
                className="grid gap-1.5 flex-1"
                style={{
                  gridTemplateColumns: 'repeat(15, minmax(42px, 1fr))',
                  gridAutoRows: '54px',
                }}
              >
                {lanthanides.map((el) => renderTile(el))}
              </div>
            </div>

            {/* Actinide Row */}
            <div className="flex items-center gap-1.5">
              <span className="w-16 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight text-right shrink-0">
                ** Actinides
              </span>
              <div
                className="grid gap-1.5 flex-1"
                style={{
                  gridTemplateColumns: 'repeat(15, minmax(42px, 1fr))',
                  gridAutoRows: '54px',
                }}
              >
                {actinides.map((el) => renderTile(el))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Legend & Variable Metal Callout */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">Category Key:</span>
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

        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>
            <strong>Variable Oxidation Metals Focus:</strong> Copper (Cu +1/+2), Iron (Fe +2/+3), Cobalt (Co +2/+3), Manganese (Mn +2/+4), Mercury (Hg +1/+2), Tin (Sn +2/+4), Lead (Pb +2/+4), Arsenic (As +3/+5), Antimony (Sb +3/+5).
          </span>
        </div>
      </div>
    </div>
  );
};
