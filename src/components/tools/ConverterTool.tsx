import React, { useState } from 'react';
import { solveCompound } from '../../engine/namingEngine';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';
import { ArrowLeftRight, Search, AlertCircle, BookOpen, Lock } from 'lucide-react';
import { ChemicalElement, NamingResult } from '../../types/chemistry';
import { useProgress } from '../../context/ProgressContext';

interface ConverterToolProps {
  onSelectElement: (el: ChemicalElement) => void;
  onNavigateToLibrary: (libraryId: string) => void;
}

const PRESET_CONVERTER_QUICK_PICKS = [
  'ZnS', 'Li2O', 'FeS', 'Fe2S3', 'Hg2O', 'HgO',
  'CO', 'CO2', 'N2O5', 'HF', 'HI', 'NaNO3',
  'Ca3(PO4)2', 'Pb(NO3)2', 'Pb(NO3)4', 'HNO2', 'HNO3',
  'H2SO3', 'H2SO4', 'H2O'
];

export const ConverterTool: React.FC<ConverterToolProps> = ({
  onSelectElement,
  onNavigateToLibrary,
}) => {
  const { isLibraryUnlocked } = useProgress();
  const [query, setQuery] = useState<string>('Fe2S3');
  const [result, setResult] = useState<NamingResult | null>(() => solveCompound('Fe2S3'));

  const handleSearch = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResult(null);
      return;
    }
    const res = solveCompound(text.trim());
    setResult(res);
  };

  const getLibraryIdFromTitle = (title: string): string => {
    const map: Record<string, string> = {
      'Metal with One Oxidation Number + Nonmetal': 'metal-one-oxidation-nonmetal',
      'Metal with Variable Oxidation Number + Nonmetal': 'metal-variable-oxidation-nonmetal',
      'Nonmetal + Nonmetal': 'nonmetal-nonmetal',
      'Hydrogen + Halogen (Binary Acids)': 'hydrogen-halogen-binary-acids',
      'Metal with One Oxidation Number + Polyatomic Ion': 'metal-one-oxidation-polyatomic',
      'Metal with Variable Oxidation Number + Polyatomic Ion': 'metal-variable-oxidation-polyatomic',
      'Hydrogen + Polyatomic Ion (Ternary Acids)': 'hydrogen-polyatomic-ternary-acids',
    };
    return map[title] || 'writing-chemical-formulas';
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/20">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-emerald-500" />
          <span>Name ↔ Formula Converter</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Enter a formula or compound name to see its translation and rule.
        </p>
      </div>

      {/* Input Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <label
          htmlFor="converter-input"
          className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block"
        >
          Enter Chemical Formula or Compound Name:
        </label>
        <div className="relative">
          <input
            id="converter-input"
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="e.g. Fe2S3, Ca3(PO4)2, lead (IV) nitrate, sulfuric acid..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Quick Picks */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Curated Benchmark Compounds:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {PRESET_CONVERTER_QUICK_PICKS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSearch(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                  query === preset
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Display */}
      {result ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Chemical Formula
              </span>
              <div className="mt-1">
                <FormulaRenderer
                  formula={result.formula}
                  size="xl"
                  onSelectElement={onSelectElement}
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Applicable Library Rule
              </span>
              {(() => {
                const targetId = getLibraryIdFromTitle(result.ruleTitle);
                const unlocked = isLibraryUnlocked(targetId);
                return (
                  <button
                    onClick={() => onNavigateToLibrary(targetId)}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-bold hover:bg-sky-100 transition cursor-pointer"
                  >
                    {unlocked ? <BookOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>
                      {result.ruleTitle}
                      {!unlocked ? ' (Locked)' : ''}
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Names Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                IUPAC / Stock Systematic Name
              </span>
              <ColorCodedToken parts={result.parts} size="lg" />
            </div>

            {result.traditionalName && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">
                  Traditional Latin Name (-ous / -ic)
                </span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-serif">
                  {result.traditionalName}
                </span>
              </div>
            )}
          </div>

          {/* Color Legend */}
          <ColorLegend />

          {/* Derivation Steps */}
          {result.steps && result.steps.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                Derivation Notes:
              </span>
              {result.steps.map((st, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                  <span>{st}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Compound Not Found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try checking the spelling or click one of the curated benchmark quick-picks above (e.g. <code>Fe2S3</code>, <code>Pb(NO3)4</code>, <code>H2SO4</code>).
          </p>
        </div>
      )}
    </div>
  );
};
