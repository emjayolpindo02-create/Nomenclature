import React, { useState } from 'react';
import {
  PRESET_OXIDATION_PROBLEMS,
  solveOxidationSteps,
  PresetProblem,
} from '../../engine/oxidationSolver';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { Calculator, AlertCircle, Compass } from 'lucide-react';
import { ChemicalElement } from '../../types/chemistry';
import { useGuide } from '../../context/GuideContext';

interface OxidationSolverToolProps {
  onSelectElement: (el: ChemicalElement) => void;
}

export const OxidationSolverTool: React.FC<OxidationSolverToolProps> = ({ onSelectElement }) => {
  const { startTour } = useGuide();
  const [selectedId, setSelectedId] = useState<string>('h2o2');

  const activeProblem: PresetProblem =
    PRESET_OXIDATION_PROBLEMS.find((p) => p.id === selectedId) ||
    PRESET_OXIDATION_PROBLEMS[0];

  const solution = solveOxidationSteps(activeProblem);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div
        data-guide-id="tool-header"
        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#ebf6ff] via-[#dff1ff] to-[#d8edff] border border-sky-300 shadow-[0_6px_22px_-6px_rgba(18,54,90,0.09)] flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-[#12365a] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            <span>Oxidation Number Solver</span>
          </h2>
          <p className="mt-1 text-sm text-[#1e4b7a]">
            Step-by-step charge algebra for compounds, ions, and exceptions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTour('oxidation-solver')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-[#eff8ff] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer shadow-xs shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Guided Tour</span>
        </button>
      </div>

      {/* Preset Problem Picker */}
      <div
        data-guide-id="tool-workspace"
        className="p-4 rounded-2xl bg-[#ebf6ff] border border-sky-300 shadow-[0_6px_22px_-6px_rgba(18,54,90,0.09)] space-y-3"
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor="preset-select"
            className="text-xs font-bold text-[#12365a] uppercase tracking-wider"
          >
            Choose a Chemical Substance or Benchmark Problem:
          </label>
          <span className="text-xs text-amber-800 font-semibold">
            {PRESET_OXIDATION_PROBLEMS.length} Curated Cases
          </span>
        </div>

        <select
          id="preset-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#dff1ff] border border-sky-300 text-[#12365a] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
        >
          <optgroup label="⚠️ Famous Chemical Exceptions">
            {PRESET_OXIDATION_PROBLEMS.filter((p) => p.tag === 'exception').map((p) => (
              <option key={p.id} value={p.id}>
                {p.formula} — {p.name} ({p.note})
              </option>
            ))}
          </optgroup>
          <optgroup label="Polyatomic Ions">
            {PRESET_OXIDATION_PROBLEMS.filter((p) => p.tag === 'polyatomic').map((p) => (
              <option key={p.id} value={p.id}>
                {p.formula} — {p.name} ({p.note})
              </option>
            ))}
          </optgroup>
          <optgroup label="Neutral Compounds">
            {PRESET_OXIDATION_PROBLEMS.filter((p) => p.tag === 'neutral').map((p) => (
              <option key={p.id} value={p.id}>
                {p.formula} — {p.name} ({p.note})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Solution Card */}
      <div className="p-6 rounded-2xl bg-[#ebf6ff] border border-sky-300 shadow-[0_8px_24px_-8px_rgba(18,54,90,0.09)] space-y-6">
        {/* Top Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#dff1ff] border border-sky-300">
          <div>
            <span className="text-xs font-semibold text-[#1e4b7a] uppercase tracking-wider block">
              Target Species &amp; Element
            </span>
            <div className="mt-1 flex items-center gap-3">
              <FormulaRenderer
                formula={activeProblem.formula}
                size="xl"
                onSelectElement={onSelectElement}
              />
              <span className="text-[#1e4b7a] font-medium">
                ({activeProblem.name})
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-[#1e4b7a] uppercase tracking-wider block">
              Oxidation Number of {solution.targetElement}
            </span>
            <span className="inline-block mt-1 px-4 py-1.5 rounded-xl bg-amber-600 text-[#eff8ff] font-black font-mono text-2xl shadow-sm">
              {typeof solution.targetOxidation === 'number' && solution.targetOxidation > 0
                ? `+${solution.targetOxidation}`
                : solution.targetOxidation}
            </span>
          </div>
        </div>

        {/* Exception alert callout if applicable */}
        {solution.isException && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-100 border border-amber-300 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Exception Alert:</strong>
              {solution.exceptionType === 'peroxide' &&
                'Oxygen has an oxidation state of -1 in peroxides (due to the nonpolar O-O bond in H₂O₂ and metal peroxides).'}
              {solution.exceptionType === 'superoxide' &&
                'Oxygen has an oxidation state of -1/2 in superoxides (like KO₂ containing the O₂⁻ ion).'}
              {solution.exceptionType === 'hydride' &&
                'Hydrogen has an oxidation state of -1 when directly bonded to active metals (such as NaH, CaH₂).'}
              {solution.exceptionType === 'elemental' &&
                'Free uncombined elements in standard state (monatomic or polyatomic like O₂, N₂, S₈) always equal 0.'}
            </div>
          </div>
        )}

        {/* Step-by-Step Equations */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#12365a] uppercase tracking-wider">
            Algebraic Derivation:
          </h3>
          <div className="space-y-2.5">
            {solution.steps.map((st, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#dff1ff] border border-sky-300 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-mono font-bold text-[#12365a] text-sm">
                    {st.equation}
                  </div>
                  <div className="text-xs text-[#1e4b7a]">
                    {st.explanation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary of all elements in compound */}
        <div className="pt-2 border-t border-sky-200 flex flex-wrap items-center justify-between gap-3 text-xs text-[#1e4b7a]">
          <span>Complete State Breakdown:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(solution.allOxidations).map(([sym, ox]) => (
              <span
                key={sym}
                className="px-2.5 py-1 rounded-md bg-[#dff1ff] border border-sky-300 text-[#12365a] font-mono font-semibold"
              >
                {sym}: {typeof ox === 'number' && ox > 0 ? `+${ox}` : ox}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
