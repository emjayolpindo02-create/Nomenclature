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
        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <span>Oxidation Number Solver</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Step-by-step charge algebra for compounds, ions, and exceptions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTour('oxidation-solver')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Guided Tour</span>
        </button>
      </div>

      {/* Preset Problem Picker */}
      <div
        data-guide-id="tool-workspace"
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor="preset-select"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
          >
            Choose a Chemical Substance or Benchmark Problem:
          </label>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
            {PRESET_OXIDATION_PROBLEMS.length} Curated Cases
          </span>
        </div>

        <select
          id="preset-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
        {/* Top Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Target Species & Element
            </span>
            <div className="mt-1 flex items-center gap-3">
              <FormulaRenderer
                formula={activeProblem.formula}
                size="xl"
                onSelectElement={onSelectElement}
              />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                ({activeProblem.name})
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Oxidation Number of {solution.targetElement}
            </span>
            <span className="inline-block mt-1 px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black font-mono text-2xl shadow-sm">
              {typeof solution.targetOxidation === 'number' && solution.targetOxidation > 0
                ? `+${solution.targetOxidation}`
                : solution.targetOxidation}
            </span>
          </div>
        </div>

        {/* Exception alert callout if applicable */}
        {solution.isException && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Algebraic Derivation:
          </h3>
          <div className="space-y-2.5">
            {solution.steps.map((st, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-mono font-bold text-slate-900 dark:text-amber-300 text-sm">
                    {st.equation}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {st.explanation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary of all elements in compound */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Complete State Breakdown:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(solution.allOxidations).map(([sym, ox]) => (
              <span
                key={sym}
                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-semibold"
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
