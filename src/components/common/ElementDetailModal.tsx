import React, { useEffect } from 'react';
import { ChemicalElement } from '../../types/chemistry';
import { X, Zap } from 'lucide-react';

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
    'alkali-metal': 'bg-red-50 text-red-700 border-red-300',
    'alkaline-earth': 'bg-orange-50 text-orange-700 border-orange-300',
    'transition-metal': 'bg-blue-50 text-blue-700 border-blue-300',
    'post-transition-metal': 'bg-cyan-50 text-cyan-700 border-cyan-300',
    'metalloid': 'bg-teal-50 text-teal-700 border-teal-300',
    'reactive-nonmetal': 'bg-emerald-50 text-emerald-700 border-emerald-300',
    'noble-gas': 'bg-purple-50 text-purple-700 border-purple-300',
    'lanthanide': 'bg-pink-50 text-pink-700 border-pink-300',
    'actinide': 'bg-rose-50 text-rose-700 border-rose-300',
    'unknown': 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${element.name} element details`}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-2xl p-6 overflow-hidden relative text-[#1f3a56]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-[#3b5775] hover:text-[#1f3a56] hover:bg-[#f4f9fe] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] shadow-inner">
            <span className="text-xs font-mono text-[#3b5775]">
              {element.number}
            </span>
            <span className="text-3xl font-extrabold text-[#1f3a56] tracking-tight">
              {element.symbol}
            </span>
            <span className="text-[10px] text-[#3b5775]">
              {element.atomicWeight}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-[#1f3a56] truncate">
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
              <p className="mt-1 text-xs text-amber-800 font-medium">
                Traditional Latin name: <span className="italic font-bold">{element.latinName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Grid Details */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4]">
            <span className="text-xs text-[#3b5775] block font-medium">Atomic Number</span>
            <span className="text-base font-semibold text-[#1f3a56]">
              {element.number}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4]">
            <span className="text-xs text-[#3b5775] block font-medium">Atomic Weight</span>
            <span className="text-base font-semibold text-[#1f3a56]">
              {element.atomicWeight} amu
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4]">
            <span className="text-xs text-[#3b5775] block font-medium">Electronegativity</span>
            <span className="text-base font-semibold text-[#1f3a56]">
              {element.electronegativity !== undefined ? element.electronegativity : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4]">
            <span className="text-xs text-[#3b5775] block font-medium">Period / Group</span>
            <span className="text-base font-semibold text-[#1f3a56]">
              Period {element.period}, Group {element.group || '—'}
            </span>
          </div>
        </div>

        {/* Oxidation States & Nomenclature info */}
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-xs text-amber-900 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-700" />
            Common Oxidation States in Nomenclature:
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {element.oxidationStates.map((st, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-[#ffffff] text-amber-900 border border-amber-300"
              >
                {st > 0 ? `+${st}` : st}
              </span>
            ))}
          </div>
          {element.isVariableOxidationMetal && (
            <p className="mt-2 text-xs text-amber-900">
              ⭐ <strong>Variable Oxidation Metal:</strong> Requires Stock Roman numeral (e.g., {element.name} ({element.oxidationStates.filter(s => s > 0).map(s => s === 1 ? 'I' : s === 2 ? 'II' : s === 3 ? 'III' : s === 4 ? 'IV' : 'V').join('/')})) or Latin -ous / -ic traditional naming!
            </p>
          )}
        </div>

        {/* Electron Config */}
        <div className="mt-3 p-2.5 rounded-lg bg-[#f4f9fe] border border-[#dbe9f4] flex items-center justify-between text-xs font-mono">
          <span className="text-[#3b5775]">Electron Config:</span>
          <span className="text-[#1f3a56] font-semibold">{element.electronConfig}</span>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-semibold text-sm transition shadow-sm cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
