import React, { useEffect } from 'react';
import { ChemicalElement } from '../../types/chemistry';
import { X, ExternalLink, Zap, Info } from 'lucide-react';

interface ElementDetailModalProps {
  element: ChemicalElement | null;
  onClose: () => void;
}

export const ElementDetailModal: React.FC<ElementDetailModalProps> = ({ element, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (element) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [element, onClose]);

  if (!element) return null;

  const categoryLabels: Record<string, string> = {
    'alkali-metal': 'Alkali Metal (Group 1A)',
    'alkaline-earth': 'Alkaline Earth Metal (Group 2A)',
    'transition-metal': 'Transition Metal',
    'post-transition-metal': 'Post-Transition Metal',
    'metalloid': 'Metalloid',
    'reactive-nonmetal': 'Reactive Nonmetal',
    'noble-gas': 'Noble Gas',
    'lanthanide': 'Lanthanide',
    'actinide': 'Actinide',
    'unknown': 'Unknown / Synthetic',
  };

  const categoryBadgeColors: Record<string, string> = {
    'alkali-metal': 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    'alkaline-earth': 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    'transition-metal': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    'post-transition-metal': 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    'metalloid': 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    'reactive-nonmetal': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    'noble-gas': 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    'lanthanide': 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    'actinide': 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    'unknown': 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${element.name} element details`}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-inner">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {element.number}
            </span>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {element.symbol}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {element.atomicWeight}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
              {element.name}
            </h3>
            <span
              className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                categoryBadgeColors[element.category] || categoryBadgeColors.unknown
              }`}
            >
              {categoryLabels[element.category] || element.category}
            </span>
            {element.latinName && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                Traditional Latin name: <span className="italic font-bold">{element.latinName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Grid Details */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Atomic Number</span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {element.number}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Atomic Weight</span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {element.atomicWeight} amu
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Electronegativity</span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {element.electronegativity !== undefined ? element.electronegativity : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Period / Group</span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              Period {element.period}, Group {element.group || '—'}
            </span>
          </div>
        </div>

        {/* Oxidation States & Nomenclature info */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Common Oxidation States in Nomenclature:
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {element.oxidationStates.map((st, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40"
              >
                {st > 0 ? `+${st}` : st}
              </span>
            ))}
          </div>
          {element.isVariableOxidationMetal && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
              ⭐ <strong>Variable Oxidation Metal:</strong> Requires Stock Roman numeral (e.g., {element.name} ({element.oxidationStates.filter(s => s > 0).map(s => s === 1 ? 'I' : s === 2 ? 'II' : s === 3 ? 'III' : s === 4 ? 'IV' : 'V').join('/')})) or Latin -ous / -ic traditional naming!
            </p>
          )}
        </div>

        {/* Electron Config */}
        <div className="mt-3 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Electron Config:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{element.electronConfig}</span>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:opacity-90 transition shadow-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
