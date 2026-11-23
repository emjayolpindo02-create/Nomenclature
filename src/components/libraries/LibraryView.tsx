import React, { useEffect, useState } from 'react';
import { LibraryRuleContent, ChemicalElement } from '../../types/chemistry';
import { ELEMENT_MAP } from '../../data/elements';
import { getTopicForLibraryRule } from '../../data/topics';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';
import { useGuide } from '../../context/GuideContext';
import { OfflineDownloadCard } from '../common/OfflineDownloadCard';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Sparkles,
  Compass,
} from 'lucide-react';

interface LibraryViewProps {
  rule: LibraryRuleContent;
  onStartPractice: (topicId: string) => void;
  onSelectElement: (element: ChemicalElement) => void;
  onNavigateToLibrary?: (libraryId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  rule,
  onStartPractice,
  onSelectElement,
}) => {
  const { startTour, activeHighlightId } = useGuide();

  const [expandedExamples, setExpandedExamples] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false,
  });

  useEffect(() => {
    if (activeHighlightId?.startsWith('example-')) {
      const idx = Number(activeHighlightId.replace('example-', ''));
      if (!Number.isNaN(idx)) {
        setExpandedExamples((prev) => ({ ...prev, [idx]: true }));
      }
    }
  }, [activeHighlightId]);

  const toggleExample = (idx: number) => {
    setExpandedExamples((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const linkedTopicId = getTopicForLibraryRule(rule.id);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 text-[#1f3a56]">
      {/* 1. Bright Hero Card & Rule Sentence (Built-in & always open offline) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_8px_26px_-10px_rgba(31,58,86,0.08)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1f3a56] flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#0284c7]" />
            </span>
            <span>{rule.title}</span>
          </h1>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => startTour('library')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] text-[#1f3a56] font-bold text-xs border border-[#dbe9f4] transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#0284c7]" />
              <span>Guided Tour</span>
            </button>

            <button
              type="button"
              onClick={() => onStartPractice(linkedTopicId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Practice Topic</span>
            </button>
          </div>
        </div>

        {/* Section 1: The Rule in One Sentence */}
        <div
          data-guide-id="rule-sentence"
          className="p-4 sm:p-5 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4]"
        >
          <p className="text-base sm:text-lg font-medium text-[#1f3a56] leading-relaxed">
            {rule.ruleSentence}
          </p>
        </div>
      </div>

      {/* Color Legend Bar */}
      <ColorLegend />

      {/* 2 & 3: Steps Grid ("How to Name It" & "How to Read It") */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          data-guide-id="how-to-name"
          className="p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.08)] space-y-4"
        >
          <div className="flex items-center gap-2.5 font-bold">
            <span className="w-8 h-8 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#0284c7]" />
            </span>
            <h2 className="font-display text-lg font-bold text-[#1f3a56]">How to Name It</h2>
          </div>
          <div className="space-y-3.5">
            {rule.howToNameSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-[#1f3a56]">
                <span className="w-6 h-6 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#0284c7] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          data-guide-id="how-to-read"
          className="p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.08)] space-y-4"
        >
          <div className="flex items-center gap-2.5 font-bold">
            <span className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
            </span>
            <h2 className="font-display text-lg font-bold text-[#1f3a56]">How to Read It</h2>
          </div>
          <div className="space-y-3.5">
            {rule.howToReadSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-[#1f3a56]">
                <span className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Worked Examples */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#1f3a56]">Worked Examples</h2>

        <div className="space-y-3">
          {rule.examples.map((ex, idx) => {
            const isExpanded = !!expandedExamples[idx];
            return (
              <div
                key={idx}
                data-guide-id={`example-${idx}`}
                className="rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.07)] overflow-hidden transition"
              >
                <div className="w-full p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-left">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="w-7 h-7 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#0284c7] font-mono text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <FormulaRenderer
                      formula={ex.formula}
                      size="xl"
                      onSelectElement={onSelectElement}
                    />
                    <div className="border-l border-[#dbe9f4] pl-4 py-0.5">
                      <ColorCodedToken parts={ex.parts} size="md" />
                      {ex.traditionalName && (
                        <span className="block text-xs font-serif italic text-amber-800 mt-0.5">
                          Traditional: {ex.traditionalName}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExample(idx)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-[#e8f3fd] text-xs font-semibold text-[#1f3a56] border border-[#dbe9f4] transition cursor-pointer"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} explanation for ${ex.formula}`}
                  >
                    <span>{isExpanded ? 'Hide Explanation' : 'Explain'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-[#e8f1f8] bg-[#f8fbff] text-sm text-[#1f3a56] leading-relaxed">
                    <p className="mt-3">{ex.explanation}</p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                      {ex.elementsInvolved.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            const el = ELEMENT_MAP.get(sym);
                            if (el) onSelectElement(el);
                          }}
                          className="px-2.5 py-0.5 rounded-lg font-mono font-bold text-[#0284c7] bg-[#ffffff] border border-[#dbe9f4] hover:bg-[#f4f9fe] cursor-pointer"
                          title={`View ${sym} element card`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Common Mistake & Remember Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          data-guide-id="common-mistakes"
          className="p-5 sm:p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.06)] space-y-3"
        >
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-display text-base font-bold text-[#1f3a56]">Common Mistakes</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {rule.commonMistakes.map((m, idx) => (
              <div
                key={idx}
                className="space-y-1 p-3 rounded-xl bg-rose-50/60 border border-rose-200"
              >
                <div className="text-rose-800 font-semibold flex items-start gap-1.5">
                  <span className="font-bold shrink-0">✗</span>
                  <span>{m.mistake}</span>
                </div>
                <div className="text-emerald-800 font-semibold flex items-start gap-1.5">
                  <span className="font-bold shrink-0">✓</span>
                  <span>{m.correction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.06)] space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <Lightbulb className="w-5 h-5" />
            <h3 className="font-display text-base font-bold text-[#1f3a56]">Remember</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {rule.rememberTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-[#1f3a56] leading-relaxed font-medium"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Cheat-Sheet Card */}
      <div className="p-6 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_8px_26px_-10px_rgba(31,58,86,0.08)] space-y-4">
        <div className="flex items-center gap-2 text-[#0284c7] font-bold text-sm">
          <FileSpreadsheet className="w-5 h-5" />
          <h3 className="font-display text-lg font-bold text-[#1f3a56]">{rule.cheatSheet.header}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {rule.cheatSheet.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] flex flex-col justify-between"
            >
              <span className="font-bold text-[#1f3a56] text-sm">{item.label}</span>
              <span className="font-mono text-[#0284c7] font-semibold mt-1">{item.value}</span>
              {item.tip && (
                <span className="text-[11px] text-[#3b5775] mt-1 leading-relaxed">
                  {item.tip}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 7. Start Practice Card */}
      <div
        data-guide-id="start-practice"
        className="p-5 sm:p-6 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_8px_26px_-10px_rgba(31,58,86,0.08)] flex flex-wrap items-center justify-between gap-4"
      >
        <h3 className="font-display text-lg font-bold text-[#1f3a56]">Ready to practice {rule.title}?</h3>
        <button
          type="button"
          onClick={() => onStartPractice(linkedTopicId)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 cursor-pointer"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Practice Topic</span>
        </button>
      </div>

      {/* 8. Offline single-file download & sharing */}
      <OfflineDownloadCard variant="home" />
    </div>
  );
};
