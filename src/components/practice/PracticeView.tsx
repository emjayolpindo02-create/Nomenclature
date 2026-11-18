import React, { useEffect, useState } from 'react';
import { PRACTICE_SETS } from '../../data/practiceQuestions';
import { ChemicalElement, Question } from '../../types/chemistry';
import { checkAnswerForgiving } from '../../engine/namingEngine';
import { useProgress, Badge, SubmitPracticeInput } from '../../context/ProgressContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { formatReadableDateKey } from '../../engine/lessonLock';
import { FormulaRenderer } from '../common/FormulaRenderer';
import {
  Lock,
  CheckCircle,
  XCircle,
  HelpCircle,
  RotateCcw,
  Award,
  ArrowRight,
  Sparkles,
  Trophy,
  Clock,
  ShieldCheck,
  LogIn,
  RefreshCw,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';

interface PracticeViewProps {
  initialSetId?: string;
  blockedNotice?: string | null;
  onClearBlockedNotice?: () => void;
  onSelectElement: (el: ChemicalElement) => void;
  onNavigateToLibrary: (libraryId: string) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  initialSetId,
  blockedNotice,
  onClearBlockedNotice,
  onSelectElement,
  onNavigateToLibrary,
}) => {
  const {
    progressMap,
    queuedAttempts,
    isSyncingQueue,
    submitPracticeAttempt,
    syncOfflineQueueNow,
    isLibraryUnlocked,
    getUnlockStatus,
    badges,
  } = useProgress();
  const { settings } = useSettings();
  const { user, sectionPolicy, openSignInModal } = useAuth();

  const [activeSetId, setActiveSetId] = useState<string | null>(() =>
    initialSetId && isLibraryUnlocked(initialSetId) ? initialSetId : null
  );
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [pendingAttempt, setPendingAttempt] = useState<SubmitPracticeInput | null>(null);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    percent: number;
    passed: boolean;
    newBadges: Badge[];
    status: 'synced' | 'queued' | 'unsubmitted';
    officialPassDate?: string;
    statusMessage?: string;
  } | null>(null);

  const effectivePassingScore = sectionPolicy.passingScore || settings.passingScore || 70;

  // Enforce lock if activeSet becomes locked (e.g. sign out or clock-backward)
  useEffect(() => {
    if (activeSetId && !isLibraryUnlocked(activeSetId)) {
      setActiveSetId(null);
      setQuizCompleted(false);
      setQuizResult(null);
      setPendingAttempt(null);
    }
  }, [activeSetId, isLibraryUnlocked]);

  useEffect(() => {
    if (initialSetId) {
      if (isLibraryUnlocked(initialSetId)) {
        setActiveSetId(initialSetId);
      } else {
        setActiveSetId(null);
      }
    }
  }, [initialSetId, isLibraryUnlocked]);

  const activeSet = activeSetId
    ? PRACTICE_SETS.find((p) => p.id === activeSetId) || null
    : null;

  const currentQuestion: Question | null =
    activeSet && activeSet.questions[currentQuestionIdx]
      ? activeSet.questions[currentQuestionIdx]
      : null;

  const startQuiz = (setId: string) => {
    if (!isLibraryUnlocked(setId)) return;
    onClearBlockedNotice?.();
    setActiveSetId(setId);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setMatchingSelections({});
    setMatchingSelectedLeft(null);
    setSubmittedQuestions({});
    setShowHint(false);
    setQuizCompleted(false);
    setQuizResult(null);
    setPendingAttempt(null);
  };

  const handleSelectOption = (option: string) => {
    if (!currentQuestion || submittedQuestions[currentQuestion.id]) return;
    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  const handleTypeAnswer = (val: string) => {
    if (!currentQuestion || submittedQuestions[currentQuestion.id]) return;
    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleMatchingLeftClick = (left: string) => {
    if (!currentQuestion || submittedQuestions[currentQuestion.id]) return;
    setMatchingSelectedLeft(left);
  };

  const handleMatchingRightClick = (right: string) => {
    if (!currentQuestion || !matchingSelectedLeft || submittedQuestions[currentQuestion.id]) return;
    setMatchingSelections((prev) => ({
      ...prev,
      [matchingSelectedLeft]: right,
    }));
    setMatchingSelectedLeft(null);
  };

  const isQuestionCorrect = (q: Question): boolean => {
    if (q.type === 'matching') {
      if (!q.matchingPairs) return false;
      return q.matchingPairs.every((pair) => matchingSelections[pair.left] === pair.right);
    }
    const studentAns = userAnswers[q.id] || '';
    const validAnswers = [q.correctAnswer, ...(q.alternateAnswers || [])];
    return checkAnswerForgiving(studentAns, validAnswers);
  };

  const submitCurrentAnswer = () => {
    if (!currentQuestion) return;
    setSubmittedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
  };

  const goToNextQuestion = async () => {
    if (!activeSet) return;
    setShowHint(false);
    if (currentQuestionIdx + 1 < activeSet.questions.length) {
      setCurrentQuestionIdx((prev) => prev + 1);
      return;
    }

    let correctCount = 0;
    const questionIds: string[] = [];
    const missedQuestionIds: string[] = [];

    activeSet.questions.forEach((q) => {
      questionIds.push(q.id);
      if (isQuestionCorrect(q)) {
        correctCount++;
      } else {
        missedQuestionIds.push(q.id);
      }
    });

    const total = activeSet.questions.length;
    const percent = Math.round((correctCount / total) * 100);

    const attemptInput: SubmitPracticeInput = {
      libraryId: activeSet.id,
      scorePercent: percent,
      correctCount,
      totalQuestions: total,
      questionIds,
      missedQuestionIds,
    };

    setPendingAttempt(attemptInput);
    setSubmittingScore(true);
    try {
      const res = await submitPracticeAttempt(attemptInput);
      setQuizResult({
        score: correctCount,
        total,
        percent,
        passed: res.passed,
        newBadges: res.newBadges,
        status: res.status,
        officialPassDate: res.officialPassDate,
        statusMessage: res.message,
      });
      setQuizCompleted(true);
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleSignInAndSubmit = () => {
    if (!pendingAttempt || !quizResult) return;
    openSignInModal({
      reason: 'Sign in with your username and PIN to submit your score and record your official pass date.',
      onSuccess: async (newSession) => {
        setSubmittingScore(true);
        try {
          const res = await submitPracticeAttempt({
            ...pendingAttempt,
            overrideSession: newSession,
          });
          setQuizResult((prev) =>
            prev
              ? {
                  ...prev,
                  passed: res.passed,
                  newBadges: res.newBadges,
                  status: res.status,
                  officialPassDate: res.officialPassDate,
                  statusMessage: res.message,
                }
              : prev
          );
        } finally {
          setSubmittingScore(false);
        }
      },
    });
  };

  // Practice Set Hub
  if (!activeSet || (!currentQuestion && !quizCompleted)) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
        {/* Hub Header */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-sky-950 text-white shadow-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-sky-400 shrink-0" />
              <span>Practice Sets</span>
            </h1>
            {sectionPolicy.waitingTimeHours > 0 && (
              <span className="text-xs font-semibold text-sky-300">
                Pass ≥{effectivePassingScore}% + Next Day ({sectionPolicy.waitingTimeHours}h min)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300">
            Submit a score of <strong>{effectivePassingScore}%+</strong> to unlock the next topic tomorrow. You can practice freely anytime; sign in only when submitting a score.
          </p>
        </div>

        {/* Route Guard Notice if redirected from a locked URL/Back button */}
        {blockedNotice && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs font-medium">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{blockedNotice}</span>
            </div>
            {onClearBlockedNotice && (
              <button
                type="button"
                onClick={onClearBlockedNotice}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Student Session & Offline Queue Banner */}
        <div
          className={`px-4 py-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            user
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5 text-xs font-medium min-w-0 flex-1">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                user ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
              }`}
            />
            <span className="leading-relaxed">
              {user
                ? `Signed in as ${user.fullName}${user.section ? ` (${user.section})` : ''}. Submitted scores sync to your teacher's private sheet.`
                : 'Guest Mode: Try any unlocked practice freely. Sign in with your username and PIN when you want to submit your score or restore progress.'}
            </span>
          </div>
          {!user ? (
            <button
              type="button"
              onClick={() =>
                openSignInModal({
                  reason:
                    'Sign in with your username and PIN to restore your progress or submit scores.',
                })
              }
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap self-start sm:self-auto"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          ) : queuedAttempts.length > 0 ? (
            <button
              type="button"
              onClick={() => void syncOfflineQueueNow()}
              disabled={isSyncingQueue}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap self-start sm:self-auto disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingQueue ? 'Syncing...' : `Sync ${queuedAttempts.length} Queued`}
              </span>
            </button>
          ) : null}
        </div>

        {/* Badges Earned Ribbon */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            Badges ({badges.filter((b) => b.unlocked).length} / {badges.length})
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  b.unlocked
                    ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
                title={b.description}
              >
                <span>{b.icon}</span>
                <span className="font-semibold">{b.name}</span>
                {b.unlocked && <span className="text-[10px] text-amber-500 font-bold">✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Sequential Practice Sets */}
        <div className="space-y-3">
          {PRACTICE_SETS.map((set, idx) => {
            const unlockStatus = getUnlockStatus(set.id);
            const unlocked = unlockStatus.unlocked;
            const prog = progressMap[set.id];
            const isPassed = Boolean(prog?.submitted && prog?.passed);

            return (
              <div
                key={set.id}
                className={`p-5 rounded-2xl border transition-all duration-150 flex flex-wrap items-center justify-between gap-4 ${
                  unlocked
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-sky-500'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-85'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                      isPassed
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : unlocked
                        ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                        : unlockStatus.reason === 'wait-next-day' ||
                          unlockStatus.reason === 'awaiting-sync' ||
                          unlockStatus.reason === 'clock-backward'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPassed ? (
                      '✓'
                    ) : unlocked ? (
                      idx + 1
                    ) : unlockStatus.reason === 'wait-next-day' ||
                      unlockStatus.reason === 'awaiting-sync' ||
                      unlockStatus.reason === 'clock-backward' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {set.title}
                      </h3>
                      {isPassed && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Passed ({prog.bestScore}%)
                        </span>
                      )}
                    </div>

                    {!unlocked && unlockStatus.previousTitle && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                        {unlockStatus.reason === 'clock-backward' ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Device clock moved backward. Restore automatic time to verify unlock.
                            </span>
                          </>
                        ) : unlockStatus.reason === 'awaiting-sync' ? (
                          <>
                            <CloudOff className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Queued score waiting to sync so the official server pass date can be recorded.
                            </span>
                          </>
                        ) : unlockStatus.reason === 'wait-next-day' && unlockStatus.unlockDate ? (
                          <>
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Opens {formatReadableDateKey(unlockStatus.unlockDate)} • {unlockStatus.countdownLabel}
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Submit ≥{unlockStatus.requiredScore}% on {unlockStatus.previousTitle} + Next day
                            </span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => startQuiz(set.id)}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>{prog ? 'Retake Set' : 'Start Set'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                      {unlockStatus.reason === 'wait-next-day' ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Opens Tomorrow
                        </>
                      ) : unlockStatus.reason === 'awaiting-sync' ? (
                        <>
                          <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                          Awaiting Sync
                        </>
                      ) : unlockStatus.reason === 'clock-backward' ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          Clock Check
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Locked
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz Completed Score Screen
  if (quizCompleted && quizResult) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        <div
          className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg ${
            quizResult.passed
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white'
              : 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white'
          }`}
        >
          {quizResult.passed ? <Trophy className="w-10 h-10" /> : <RotateCcw className="w-10 h-10" />}
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {activeSet.title} Practice Results
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {quizResult.passed ? 'Practice Set Passed!' : 'Keep Practicing!'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {quizResult.status === 'unsubmitted'
              ? quizResult.passed
                ? `You scored ${quizResult.percent}%! This score is NOT submitted yet — sign in with your username and PIN to submit it and schedule tomorrow's unlock.`
                : `You scored ${quizResult.percent}% (Passing: ${effectivePassingScore}%). Sign in with your username and PIN if you want to submit this attempt, or try again.`
              : quizResult.status === 'queued'
              ? `You scored ${quizResult.percent}%. Your attempt is queued offline and will sync automatically with no duplicates when connected.`
              : quizResult.passed
              ? activeSet.id === 'final-mixed-review'
                ? `Outstanding work! Your score of ${quizResult.percent}% was submitted and recorded on ${quizResult.officialPassDate}. You conquered the Final Mixed Review!`
                : `Submitted! Official pass date: ${quizResult.officialPassDate || 'today'}. Your next topic unlocks tomorrow when the next calendar day arrives.`
              : `Submitted (${quizResult.percent}%). You need at least ${effectivePassingScore}% to qualify for tomorrow's unlock.`}
          </p>
        </div>

        {quizResult.status === 'unsubmitted' && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-left">
            <span className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
              Unsubmitted guest scores never unlock the next topic. Sign in to submit this attempt.
            </span>
            <button
              type="button"
              onClick={handleSignInAndSubmit}
              disabled={submittingScore}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{submittingScore ? 'Submitting...' : 'Sign In & Submit Score'}</span>
            </button>
          </div>
        )}

        {quizResult.status === 'queued' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-left">
            <span className="text-xs text-amber-900 dark:text-amber-200 font-medium">
              Saved in offline queue ({queuedAttempts.length} pending). Official pass date will be confirmed automatically once connected.
            </span>
            <button
              type="button"
              onClick={() => void syncOfflineQueueNow()}
              disabled={isSyncingQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {/* Score Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-around">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Correct</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {quizResult.score} / {quizResult.total}
            </span>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Final Score</span>
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {quizResult.percent}%
            </span>
          </div>
        </div>

        {/* New Badges Alert */}
        {quizResult.newBadges.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> New Badges Unlocked!
            </span>
            <div className="flex flex-wrap gap-2">
              {quizResult.newBadges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold"
                >
                  <span>{b.icon}</span>
                  <span>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => startQuiz(activeSet.id)}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Retake This Set
          </button>
          <button
            type="button"
            onClick={() => setActiveSetId(null)}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition shadow-sm cursor-pointer"
          >
            Back to Practice Hub
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isSubmitted = !!submittedQuestions[currentQuestion.id];
  const isCorrect = isSubmitted && isQuestionCorrect(currentQuestion);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Quiz Top Navigation Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={() => setActiveSetId(null)}
          className="hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
        >
          ← Exit to Hub
        </button>
        <span className="text-slate-700 dark:text-slate-300 font-mono">
          Question {currentQuestionIdx + 1} of {activeSet.questions.length}
        </span>
        <button
          type="button"
          onClick={() => onNavigateToLibrary(activeSet.id)}
          className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
        >
          Review Lesson
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all duration-300"
          style={{
            width: `${((currentQuestionIdx + 1) / activeSet.questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
            {currentQuestion.ruleTitle}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 leading-snug">
            {currentQuestion.prompt}
          </h2>

          {currentQuestion.formula && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 inline-block">
              <FormulaRenderer
                formula={currentQuestion.formula}
                size="xl"
                onSelectElement={onSelectElement}
              />
            </div>
          )}
        </div>

        {/* Multiple Choice */}
        {currentQuestion.options && (
          <div className="grid grid-cols-1 gap-2.5">
            {currentQuestion.options.map((opt, i) => {
              const isSelected = userAnswers[currentQuestion.id] === opt;
              let btnStyle =
                'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-sky-500';

              if (isSubmitted) {
                if (opt === currentQuestion.correctAnswer) {
                  btnStyle =
                    'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-300';
                }
              } else if (isSelected) {
                btnStyle =
                  'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 font-semibold ring-1 ring-sky-500';
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full p-4 rounded-xl border text-left text-sm transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isSubmitted && opt === currentQuestion.correctAnswer && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                  {isSubmitted && isSelected && opt !== currentQuestion.correctAnswer && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Typed Answers */}
        {!currentQuestion.options && currentQuestion.type !== 'matching' && (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                disabled={isSubmitted}
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => handleTypeAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !isSubmitted &&
                    userAnswers[currentQuestion.id]?.trim()
                  ) {
                    submitCurrentAnswer();
                  }
                }}
                placeholder={
                  currentQuestion.type === 'typed-formula'
                    ? 'Type formula (e.g. Ca3(PO4)2 or Al2O3)...'
                    : 'Type compound name...'
                }
                aria-label="Your answer"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Tip: Plain text like <code>H2SO4</code> or <code>iron(II) sulfide</code> works.
            </span>
          </div>
        )}

        {/* Matching Questions */}
        {currentQuestion.type === 'matching' && currentQuestion.matchingPairs && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click an item on the left, then click its corresponding match on the right:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 block uppercase">Prompts</span>
                {currentQuestion.matchingPairs.map((pair, i) => {
                  const matchedRight = matchingSelections[pair.left];
                  const isSelected = matchingSelectedLeft === pair.left;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleMatchingLeftClick(pair.left)}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                          : matchedRight
                          ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{pair.left}</span>
                      {matchedRight && (
                        <span className="block font-mono text-[11px] text-sky-600 dark:text-sky-400 mt-1">
                          ↳ {matchedRight}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 block uppercase">Matches</span>
                {currentQuestion.matchingPairs.map((pair, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleMatchingRightClick(pair.right)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-emerald-500 text-left text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                  >
                    {pair.right}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hint toggle */}
        {settings.hintsEnabled && currentQuestion.hint && !isSubmitted && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHint ? 'Hide Hint' : 'Need a hint?'}</span>
            </button>
            {showHint && (
              <p className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
                {currentQuestion.hint}
              </p>
            )}
          </div>
        )}

        {/* Action Controls & Feedback */}
        {!isSubmitted ? (
          <button
            type="button"
            onClick={submitCurrentAnswer}
            disabled={
              currentQuestion.type === 'matching'
                ? Object.keys(matchingSelections).length !==
                  (currentQuestion.matchingPairs?.length || 0)
                : !userAnswers[currentQuestion.id]?.trim()
            }
            className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition cursor-pointer disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <div className="space-y-4 pt-2 animate-in fade-in duration-150">
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-sm block">
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
                {!isCorrect && (
                  <div className="font-medium">
                    Correct answer:{' '}
                    <strong className="font-mono">{currentQuestion.correctAnswer}</strong>
                  </div>
                )}
                <p className="leading-relaxed pt-1 text-slate-700 dark:text-slate-300">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={goToNextQuestion}
              disabled={submittingScore}
              className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-md hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>
                {submittingScore
                  ? 'Saving...'
                  : currentQuestionIdx + 1 === activeSet.questions.length
                  ? 'View Results'
                  : 'Next Question'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
