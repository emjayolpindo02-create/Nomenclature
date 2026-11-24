import React, { useState } from 'react';
import { solveCompound } from '../../engine/namingEngine';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';
import { ArrowLeftRight, Search, AlertCircle, BookOpen, Compass } from 'lucide-react';
import { ChemicalElement, NamingResult } from '../../types/chemistry';
import { useGuide } from '../../context/GuideContext';

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
  const { startTour } = useGuide();
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
      <div
        data-guide-id="tool-header"
        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#ebf6ff] via-[#dff1ff] to-[#d8edff] border border-sky-300 shadow-[0_6px_22px_-6px_rgba(18,54,90,0.09)] flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-[#12365a] flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#0284c7]" />
            <span>Name ↔ Formula Converter</span>
          </h2>
          <p className="mt-1 text-sm text-[#1e4b7a]">
            Enter a formula or compound name to see its translation and rule.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTour('converter')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-[#eff8ff] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer shadow-xs shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Guided Tour</span>
        </button>
      </div>

      {/* Input Box */}
      <div
        data-guide-id="tool-workspace"
        className="p-4 rounded-2xl bg-[#ebf6ff] border border-sky-300 shadow-[0_6px_22px_-6px_rgba(18,54,90,0.09)] space-y-3"
      >
        <label
          htmlFor="converter-input"
          className="text-xs font-bold text-[#12365a] uppercase tracking-wider block"
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
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#dff1ff] border border-sky-300 text-[#12365a] placeholder:text-[#2e5d8e]/70 font-mono text-base focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          />
          <Search className="w-5 h-5 text-[#2e5d8e] absolute left-3.5 top-3.5" />
        </div>

        {/* Quick Picks */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-[#1e4b7a] uppercase tracking-wider block">
            Curated Benchmark Compounds:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {PRESET_CONVERTER_QUICK_PICKS.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSearch(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                  query === preset
                    ? 'bg-[#0284c7] text-[#eff8ff] border-[#0284c7] shadow-xs'
                    : 'bg-[#dff1ff] text-[#12365a] border-sky-300 hover:bg-[#d8edff]'
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
        <div className="p-6 rounded-2xl bg-[#ebf6ff] border border-sky-300 shadow-[0_8px_24px_-8px_rgba(18,54,90,0.09)] space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-200 pb-4">
            <div>
              <span className="text-xs font-bold text-[#1e4b7a] uppercase tracking-wider block">
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
              <span className="text-xs font-bold text-[#1e4b7a] uppercase tracking-wider block">
                Applicable Library Rule
              </span>
              {(() => {
                const targetId = getLibraryIdFromTitle(result.ruleTitle);
                return (
                  <button
                    onClick={() => onNavigateToLibrary(targetId)}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d8edff] text-[#12365a] border border-sky-300 text-xs font-bold hover:bg-[#c5e3fc] transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#0284c7]" />
                    <span>{result.ruleTitle}</span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Names Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#dff1ff] border border-sky-300 space-y-1.5">
              <span className="text-xs font-bold text-[#1e4b7a] uppercase block">
                IUPAC / Stock Systematic Name
              </span>
              <ColorCodedToken parts={result.parts} size="lg" />
            </div>

            {result.traditionalName && (
              <div className="p-4 rounded-xl bg-[#dff1ff] border border-sky-300 space-y-1.5">
                <span className="text-xs font-bold text-[#1e4b7a] uppercase block">
                  Traditional Latin Name (-ous / -ic)
                </span>
                <span className="text-xl font-bold text-amber-800 font-serif">
                  {result.traditionalName}
                </span>
              </div>
            )}
          </div>

          {/* Color Legend */}
          <ColorLegend />

          {/* Derivation Steps */}
          {result.steps && result.steps.length > 0 && (
            <div className="p-4 rounded-xl bg-[#dff1ff] border border-sky-300 space-y-1.5 text-xs text-[#12365a]">
              <span className="font-bold text-[#12365a] block uppercase tracking-wider">
                Derivation Notes:
              </span>
              {result.steps.map((st, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#0284c7] font-bold shrink-0">{i + 1}.</span>
                  <span>{st}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-[#ebf6ff] border border-sky-300 text-center space-y-2 shadow-sm">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h4 className="text-base font-bold text-[#12365a]">
            Compound Not Found
          </h4>
          <p className="text-xs text-[#1e4b7a] max-w-sm mx-auto">
            Try checking the spelling or click one of the curated benchmark quick-picks above (e.g. <code>Fe2S3</code>, <code>Pb(NO3)4</code>, <code>H2SO4</code>).
          </p>
        </div>
      )}
    </div>
  );
};
