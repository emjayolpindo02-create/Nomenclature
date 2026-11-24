import React, { useState } from 'react';
import { CATIONS, ANIONS } from '../../data/ions';
import { buildCompoundName } from '../../engine/namingEngine';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';
import { ArrowDownRight, ArrowDownLeft, Shuffle, Sparkles, Compass } from 'lucide-react';
import { ChemicalElement } from '../../types/chemistry';
import { useGuide } from '../../context/GuideContext';

interface CrissCrossBuilderProps {
  onSelectElement: (el: ChemicalElement) => void;
}

export const CrissCrossBuilder: React.FC<CrissCrossBuilderProps> = ({ onSelectElement }) => {
  const { startTour } = useGuide();
  const [selectedCationId, setSelectedCationId] = useState<string>('ca-2');
  const [selectedAnionId, setSelectedAnionId] = useState<string>('po4-3');

  const cation = CATIONS.find((c) => c.id === selectedCationId) || CATIONS[0];
  const anion = ANIONS.find((a) => a.id === selectedAnionId) || ANIONS[0];

  const result = buildCompoundName(cation, anion);

  const handleRandomize = () => {
    const randomCat = CATIONS[Math.floor(Math.random() * CATIONS.length)];
    const randomAn = ANIONS[Math.floor(Math.random() * ANIONS.length)];
    setSelectedCationId(randomCat.id);
    setSelectedAnionId(randomAn.id);
  };

  const cationChargeVal = Math.abs(cation.charge);
  const anionChargeVal = Math.abs(anion.charge);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Tool Header */}
      <div
        data-guide-id="tool-header"
        className="p-5 sm:p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1f3a56] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0284c7]" />
              <span>Criss-Cross Formula Builder</span>
            </h2>
            <p className="mt-1 text-sm text-[#3b5775]">
              Choose a cation and anion to build and reduce the formula.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => startTour('crisscross')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer shadow-xs"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Guided Tour</span>
            </button>
            <button
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ffffff] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56] hover:bg-[#f4f9fe] transition cursor-pointer shadow-xs shrink-0"
              aria-label="Randomize ions"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#0284c7]" />
              Random Pair
            </button>
          </div>
        </div>
      </div>

      {/* Selectors Panel */}
      <div data-guide-id="tool-workspace" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cation Picker */}
        <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm space-y-3">
          <label
            htmlFor="cation-select"
            className="block text-xs font-bold text-[#0284c7] uppercase tracking-wider"
          >
            1. Select Positive Ion (Cation +)
          </label>
          <select
            id="cation-select"
            value={selectedCationId}
            onChange={(e) => setSelectedCationId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          >
            <optgroup label="Fixed Metals & Ammonium">
              {CATIONS.filter((c) => !c.isVariable).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.symbol}^{c.charge > 1 ? `+${c.charge}` : '+'})
                </option>
              ))}
            </optgroup>
            <optgroup label="Variable Oxidation Metals (Transition Metals)">
              {CATIONS.filter((c) => c.isVariable).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.stockName || c.name} ({c.symbol}^{c.charge > 1 ? `+${c.charge}` : '+'}) {c.traditionalName ? `[${c.traditionalName}]` : ''}
                </option>
              ))}
            </optgroup>
          </select>
          <div className="flex items-center justify-between text-xs text-[#3b5775] pt-1">
            <span>Symbol: <strong className="text-[#1f3a56]">{cation.symbol}</strong></span>
            <span>Charge: <strong className="text-[#0284c7]">+{cation.charge}</strong></span>
          </div>
        </div>

        {/* Anion Picker */}
        <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm space-y-3">
          <label
            htmlFor="anion-select"
            className="block text-xs font-bold text-emerald-700 uppercase tracking-wider"
          >
            2. Select Negative Ion (Anion -)
          </label>
          <select
            id="anion-select"
            value={selectedAnionId}
            onChange={(e) => setSelectedAnionId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <optgroup label="Monatomic Nonmetals (-ide)">
              {ANIONS.filter((a) => !a.isPolyatomic).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.symbol}^{a.charge})
                </option>
              ))}
            </optgroup>
            <optgroup label="Polyatomic Oxyanions (-ate / -ite)">
              {ANIONS.filter((a) => a.isPolyatomic).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.symbol}^{a.charge})
                </option>
              ))}
            </optgroup>
          </select>
          <div className="flex items-center justify-between text-xs text-[#3b5775] pt-1">
            <span>Symbol: <strong className="text-[#1f3a56]">{anion.symbol}</strong></span>
            <span>Charge: <strong className="text-emerald-700">{anion.charge}</strong></span>
          </div>
        </div>
      </div>

      {/* Visual Criss-Cross Board */}
      <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-[#1f3a56] uppercase tracking-wider">
          Visual Exchange of Charges
        </h3>

        {/* Diagonal Animation Simulation Cards */}
        <div className="grid grid-cols-2 gap-6 relative max-w-md mx-auto py-4">
          {/* Top row: Charges */}
          <div className="p-4 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-center relative">
            <span className="text-xs text-[#0284c7] font-bold block">Cation Charge</span>
            <span className="text-3xl font-extrabold text-[#0284c7] font-mono">
              +{cationChargeVal}
            </span>
            <div className="absolute -bottom-6 right-0 text-[#0284c7] flex items-center gap-1 font-mono text-xs">
              <span className="text-[10px] hidden sm:inline">drops down-right</span>
              <ArrowDownRight className="w-5 h-5 animate-bounce" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center relative">
            <span className="text-xs text-emerald-700 font-bold block">Anion Charge</span>
            <span className="text-3xl font-extrabold text-emerald-700 font-mono">
              -{anionChargeVal}
            </span>
            <div className="absolute -bottom-6 left-0 text-emerald-600 flex items-center gap-1 font-mono text-xs">
              <ArrowDownLeft className="w-5 h-5 animate-bounce" />
              <span className="text-[10px] hidden sm:inline">drops down-left</span>
            </div>
          </div>
        </div>

        {/* Step by step derivation */}
        <div className="p-4 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] space-y-2 text-xs text-[#1f3a56] font-mono">
          <div className="font-bold text-[#1f3a56] uppercase tracking-wider">
            Step-by-Step Chemistry Log:
          </div>
          {result.steps.map((st, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#0284c7] font-bold shrink-0">{i + 1}.</span>
              <span>{st}</span>
            </div>
          ))}
        </div>

        {/* Final Formula & Names Box */}
        <div
          data-guide-id="tool-result"
          className="p-6 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] shadow-xs space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#3b5775] uppercase font-mono font-semibold block">
                Final Balanced Chemical Formula
              </span>
              <div className="mt-1 flex items-baseline gap-3">
                <FormulaRenderer
                  formula={result.formula}
                  size="xl"
                  onSelectElement={onSelectElement}
                />
                <span className="text-xs text-[#3b5775] font-mono">
                  ({result.cationCount} cation{result.cationCount > 1 ? 's' : ''} : {result.anionCount} anion{result.anionCount > 1 ? 's' : ''})
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#3b5775] uppercase font-mono font-semibold block">
                Rule Classification
              </span>
              <span className="inline-block mt-1 px-3 py-1 rounded-full bg-[#ffffff] text-[#1f3a56] border border-[#dbe9f4] text-xs font-semibold">
                {result.ruleTitle}
              </span>
            </div>
          </div>

          <div className="border-t border-[#dbe9f4] pt-3 space-y-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs font-bold text-[#3b5775]">IUPAC Stock Name:</span>
              <ColorCodedToken parts={result.parts} size="lg" />
            </div>

            {result.traditionalName && (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-bold text-[#3b5775]">Traditional Latin Name:</span>
                <span className="text-lg font-semibold text-amber-800 font-serif">
                  {result.traditionalName}
                </span>
              </div>
            )}
          </div>
        </div>

        <ColorLegend />
      </div>
    </div>
  );
};
