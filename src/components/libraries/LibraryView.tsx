import React, { useEffect, useState } from 'react';
import { LibraryRuleContent, ChemicalElement } from '../../types/chemistry';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';
import { useProgress } from '../../context/ProgressContext';
import { useAuth } from '../../context/AuthContext';
import { useGuide } from '../../context/GuideContext';
import { formatReadableDateKey } from '../../engine/lessonLock';
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
  Lock,
  Clock,
  ArrowLeft,
  LogIn,
  Compass,
} from 'lucide-react';

interface LibraryViewProps {
  rule: LibraryRuleContent;
  onStartPractice: (libraryId: string) => void;
  onSelectElement: (element: ChemicalElement) => void;
  onNavigateToLibrary?: (libraryId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  rule,
  onStartPractice,
  onSelectElement,
  onNavigateToLibrary,
}) => {
  const { getUnlockStatus } = useProgress();
  const { user, openSignInModal } = useAuth();
  const { startTour, activeHighlightId, announceLockedTopic } = useGuide();
  const unlockStatus = getUnlockStatus(rule.id);

  // Track which examples are expanded
  const [expandedExamples, setExpandedExamples] = useState<Record<number, boolean>>({
    0: true, // first expanded by default
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

  useEffect(() => {
    if (!unlockStatus.unlocked) {
      announceLockedTopic(unlockStatus);
    }
  }, [rule.id, unlockStatus.unlocked, unlockStatus.reason, announceLockedTopic]);

  const toggleExample = (idx: number) => {
    setExpandedExamples((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!unlockStatus.unlocked) {
    const scoreAcquired =
      unlockStatus.reason === 'wait-next-day' ||
      unlockStatus.reason === 'awaiting-sync' ||
      unlockStatus.reason === 'clock-backward';

    return (
      <div className="w-full max-w-2xl mx-auto py-8 animate-in fade-in duration-200">
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                scoreAcquired
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {scoreAcquired ? <Clock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Lesson Locked
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {rule.title}
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {unlockStatus.reason === 'clock-backward'
              ? 'Your device clock appears set backward. Restore automatic date & time and stay online to verify the official unlock date.'
              : unlockStatus.reason === 'awaiting-sync'
              ? 'Your passing score is queued offline. Reconnect so the official submission date can be recorded.'
              : 'Submit a passing score on the previous practice and wait until the next day to unlock this lesson.'}
          </p>

          {/* Unlock Checklist */}
          <div className="space-y-3">
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                scoreAcquired
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  scoreAcquired ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`}
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-sm block">
                  1. Submit ≥{unlockStatus.requiredScore}% on {unlockStatus.previousTitle}
                </span>
                <span className="opacity-85">
                  {scoreAcquired
                    ? `Submitted (${unlockStatus.previousBestScore}%)`
                    : unlockStatus.previousBestScore > 0
                    ? `Current best: ${unlockStatus.previousBestScore}%`
                    : 'Not submitted yet'}
                </span>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                scoreAcquired
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Clock
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  scoreAcquired ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                }`}
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-sm block">2. Next Official Calendar Day</span>
                <span className="opacity-85">
                  {unlockStatus.reason === 'clock-backward'
                    ? 'Locked until device clock matches current or official server time'
                    : unlockStatus.reason === 'awaiting-sync'
                    ? 'Waiting for connection to record official server date'
                    : scoreAcquired && unlockStatus.unlockDate
                    ? `Opens ${formatReadableDateKey(unlockStatus.unlockDate)} (${unlockStatus.countdownLabel})`
                    : 'Unlocks the day after your passing score is submitted'}
                </span>
              </div>
            </div>
          </div>

          {!user && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                Already passed earlier on another device? Sign in with your username and PIN to restore your unlocks.
              </p>
              <button
                type="button"
                onClick={() =>
                  openSignInModal({
                    reason:
                      'Sign in with your username and PIN to restore your submitted scores and unlock dates.',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {unlockStatus.previousId && onNavigateToLibrary && (
              <button
                type="button"
                onClick={() => onNavigateToLibrary(unlockStatus.previousId!)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Review {unlockStatus.previousTitle}</span>
              </button>
            )}
            {unlockStatus.previousId && !scoreAcquired && (
              <button
                type="button"
                onClick={() => onStartPractice(unlockStatus.previousId!)}
                className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Practice {unlockStatus.previousTitle}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200 pb-12">
      {/* 1. Header & The Rule in One Sentence */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-sky-400 shrink-0" />
            <span>{rule.title}</span>
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startTour('library')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-300" />
              <span>Guided Tour</span>
            </button>

            <button
              onClick={() => onStartPractice(rule.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Practice</span>
            </button>
          </div>
        </div>

        {/* Section 1: The Rule in One Sentence */}
        <div
          data-guide-id="rule-sentence"
          className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15"
        >
          <p className="text-base sm:text-lg font-medium text-slate-100 leading-snug">
            {rule.ruleSentence}
          </p>
        </div>
      </div>

      {/* Color Legend Bar */}
      <ColorLegend />

      {/* 2 & 3: Steps Grid ("How to name it" & "How to read it") */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 2: How to name it */}
        <div
          data-guide-id="how-to-name"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">How to Name It</h2>
          </div>
          <div className="space-y-3">
            {rule.howToNameSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: How to read it */}
        <div
          data-guide-id="how-to-read"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">How to Read It</h2>
          </div>
          <div className="space-y-3">
            {rule.howToReadSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Three Worked Examples with Expandable Explanations */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Worked Examples
        </h2>

        <div className="space-y-3">
          {rule.examples.map((ex, idx) => {
            const isExpanded = !!expandedExamples[idx];
            return (
              <div
                key={idx}
                data-guide-id={`example-${idx}`}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
              >
                <div className="w-full p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-left">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <FormulaRenderer
                      formula={ex.formula}
                      size="xl"
                      onSelectElement={onSelectElement}
                    />
                    <div className="border-l border-slate-200 dark:border-slate-700 pl-4 py-0.5">
                      <ColorCodedToken parts={ex.parts} size="md" />
                      {ex.traditionalName && (
                        <span className="block text-xs font-serif italic text-amber-600 dark:text-amber-400 mt-0.5">
                          Traditional: {ex.traditionalName}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExample(idx)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} explanation for ${ex.formula}`}
                  >
                    <span>{isExpanded ? 'Hide Explanation' : 'Explain'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 text-sm text-slate-700 dark:text-slate-300 leading-relaxed animate-in fade-in duration-150">
                    <p className="mt-3">{ex.explanation}</p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                      {ex.elementsInvolved.map((sym) => (
                        <button
                          key={sym}
                          onClick={() => {
                            const found = rule.examples
                              .flatMap((e) => e.elementsInvolved)
                              .includes(sym);
                            if (found) {
                              import('../../data/elements').then((m) => {
                                const el = m.ELEMENT_MAP.get(sym);
                                if (el) onSelectElement(el);
                              });
                            }
                          }}
                          className="px-2 py-0.5 rounded font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 cursor-pointer"
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
        {/* Common Mistakes */}
        <div
          data-guide-id="common-mistakes"
          className="p-5 sm:p-6 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3"
        >
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-rose-950 dark:text-rose-200">Common Mistakes</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {rule.commonMistakes.map((m, idx) => (
              <div key={idx} className="space-y-1 p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-rose-200/60 dark:border-rose-900/30">
                <div className="text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-1.5">
                  <span className="font-bold shrink-0">✗</span>
                  <span>{m.mistake}</span>
                </div>
                <div className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-start gap-1.5">
                  <span className="font-bold shrink-0">✓</span>
                  <span>{m.correction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remember Callouts */}
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <Lightbulb className="w-5 h-5" />
            <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">Remember</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {rule.rememberTips.map((tip, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/30 text-slate-800 dark:text-slate-200 leading-relaxed font-medium"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Cheat-Sheet Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
          <FileSpreadsheet className="w-5 h-5" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{rule.cheatSheet.header}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {rule.cheatSheet.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between"
            >
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {item.label}
              </span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-medium mt-1">
                {item.value}
              </span>
              {item.tip && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {item.tip}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 7. Practice Button */}
      <div
        data-guide-id="start-practice"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg"
      >
        <h3 className="text-lg font-bold">Ready to practice {rule.title}?</h3>
        <button
          onClick={() => onStartPractice(rule.id)}
          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-100 transition shadow-md flex items-center gap-2 cursor-pointer"
        >
          <PlayCircle className="w-5 h-5 text-sky-600" />
          <span>Start Practice</span>
        </button>
      </div>
    </div>
  );
};
