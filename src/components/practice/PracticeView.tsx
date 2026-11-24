import React, { useEffect, useRef, useState } from 'react';
import { TOPICS, getTopicById } from '../../data/topics';
import { ChemicalElement, Question, TopicId } from '../../types/chemistry';
import { checkAnswerForgiving } from '../../engine/namingEngine';
import { useProgress, Badge } from '../../context/ProgressContext';
import { useSettings } from '../../context/SettingsContext';
import { useStudent } from '../../context/StudentContext';
import { useGuide } from '../../context/GuideContext';
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
  User,
  RefreshCw,
  AlertTriangle,
  Compass,
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
    queuedResults,
    isFlushingQueue,
    lastSyncError,
    sheetsConfigured,
    submitTopicAttempt,
    flushResultsQueueNow,
    isTopicUnlocked,
    getTopicAccess,
    badges,
  } = useProgress();
  const { settings } = useSettings();
  const { studentIdentity, openIdentityModal } = useStudent();
  const {
    updateAppSnapshot,
    givePracticeHint,
    givePracticeFeedback,
    announcePracticeOutcome,
    announceLockedTopic,
    startTour,
  } = useGuide();

  const resolvedInitialTopicId = getTopicById(initialSetId)?.id;
  const [activeTopicId, setActiveTopicId] = useState<TopicId | null>(() =>
    resolvedInitialTopicId && isTopicUnlocked(resolvedInitialTopicId)
      ? resolvedInitialTopicId
      : null
  );
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    percent: number;
    passed: boolean;
    newBadges: Badge[];
    status: 'saved' | 'queued' | 'local-only';
    statusMessage?: string;
  } | null>(null);

  const completionLockRef = useRef<boolean>(false);

  // Guard active topic if lock status changes
  useEffect(() => {
    if (activeTopicId && !isTopicUnlocked(activeTopicId)) {
      setActiveTopicId(null);
      setQuizCompleted(false);
      setQuizResult(null);
    }
  }, [activeTopicId, isTopicUnlocked]);

  useEffect(() => {
    if (resolvedInitialTopicId) {
      if (isTopicUnlocked(resolvedInitialTopicId)) {
        setActiveTopicId(resolvedInitialTopicId);
      } else {
        setActiveTopicId(null);
      }
    }
  }, [resolvedInitialTopicId, isTopicUnlocked]);

  const activeTopic = activeTopicId ? getTopicById(activeTopicId) : null;
  const currentQuestion: Question | null =
    activeTopic && activeTopic.questions[currentQuestionIdx]
      ? activeTopic.questions[currentQuestionIdx]
      : null;
  const currentQuestionSubmitted = currentQuestion
    ? Boolean(submittedQuestions[currentQuestion.id])
    : false;

  useEffect(() => {
    const inQuiz = Boolean(activeTopic && currentQuestion && !quizCompleted);
    updateAppSnapshot({
      practiceInProgress: inQuiz,
      activeQuestion: inQuiz ? currentQuestion ?? undefined : undefined,
      isActiveQuestionSubmitted: inQuiz ? currentQuestionSubmitted : false,
    });
  }, [activeTopic, currentQuestion, currentQuestionSubmitted, quizCompleted, updateAppSnapshot]);

  useEffect(() => {
    return () => {
      updateAppSnapshot({
        practiceInProgress: false,
        activeQuestion: undefined,
        isActiveQuestionSubmitted: false,
      });
    };
  }, [updateAppSnapshot]);

  const startQuiz = (topicId: TopicId) => {
    const access = getTopicAccess(topicId);
    if (!access.unlocked) {
      announceLockedTopic(access);
      return;
    }

    onClearBlockedNotice?.();
    completionLockRef.current = false;
    setActiveTopicId(topicId);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setMatchingSelections({});
    setMatchingSelectedLeft(null);
    setSubmittedQuestions({});
    setShowHint(false);
    setQuizCompleted(false);
    setQuizResult(null);
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
    if (!currentQuestion || submittedQuestions[currentQuestion.id]) return;
    if (currentQuestion.type === 'matching') {
      const pairLen = currentQuestion.matchingPairs?.length || 0;
      if (Object.keys(matchingSelections).length !== pairLen) return;
    } else if (!userAnswers[currentQuestion.id]?.trim()) {
      return;
    }

    const correct = isQuestionCorrect(currentQuestion);
    setSubmittedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
    givePracticeFeedback(currentQuestion, correct);
  };

  const goToNextQuestion = async () => {
    if (!activeTopic || completionLockRef.current) return;
    setShowHint(false);

    if (currentQuestionIdx + 1 < activeTopic.questions.length) {
      setCurrentQuestionIdx((prev) => prev + 1);
      return;
    }

    completionLockRef.current = true;
    setSubmittingScore(true);

    let correctCount = 0;
    activeTopic.questions.forEach((q) => {
      if (isQuestionCorrect(q)) correctCount++;
    });

    const total = activeTopic.questions.length;
    const percent = Math.round((correctCount / total) * 100);

    try {
      const res = await submitTopicAttempt({
        topicId: activeTopic.id,
        scorePercent: percent,
        correctCount,
        totalQuestions: total,
      });
      setQuizResult({
        score: correctCount,
        total,
        percent,
        passed: res.passed,
        newBadges: res.newBadges,
        status: res.status,
        statusMessage: res.message,
      });
      setQuizCompleted(true);
      announcePracticeOutcome({
        passed: res.passed,
        percent,
        passingScore: activeTopic.passingScore,
        title: activeTopic.title,
      });
    } finally {
      setSubmittingScore(false);
    }
  };

  // Topics Hub
  if (!activeTopic || (!currentQuestion && !quizCompleted)) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-5 pb-12 text-[#1f3a56]">
        {/* Hub Header */}
        <div
          data-guide-id="practice-header"
          className="p-5 sm:p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.08)] space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1f3a56] flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-[#0284c7] shrink-0" />
              <span>Topics</span>
            </h1>
            <button
              type="button"
              onClick={() => startTour('practice')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f4f9fe] hover:bg-[#e8f3fd] text-[#1f3a56] text-xs font-bold border border-[#dbe9f4] transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Guided Tour</span>
            </button>
          </div>
          <p className="text-sm text-[#3b5775]">
            Score <strong className="text-[#1f3a56]">75%+</strong> on each topic to pass and unlock the next level at 12:00 AM the next day.
          </p>
        </div>

        {/* Route Guard Notice */}
        {blockedNotice && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs font-medium">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{blockedNotice}</span>
            </div>
            {onClearBlockedNotice && (
              <button
                type="button"
                onClick={onClearBlockedNotice}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Student Details & Sync Status Banner */}
        <div
          data-guide-id="practice-signin"
          className="p-4 sm:px-5 rounded-2xl border border-[#dbe9f4] bg-[#ffffff] text-[#1f3a56] shadow-[0_4px_16px_-8px_rgba(31,58,86,0.06)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm font-medium min-w-0 flex-1">
            <User className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed">
              {studentIdentity ? (
                <>
                  Student:{' '}
                  <strong className="text-[#1f3a56]">
                    {studentIdentity.fullName} ({studentIdentity.section})
                  </strong>
                  .{' '}
                  {sheetsConfigured
                    ? 'Completed topic scores sync to your class Sheet when online.'
                    : 'Scores save directly on this device (works offline).'}
                </>
              ) : (
                'Enter your Full Name and Section so completed topic scores are labeled properly.'
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            {sheetsConfigured && queuedResults.length > 0 && (
              <button
                type="button"
                onClick={() => void flushResultsQueueNow(true)}
                disabled={isFlushingQueue}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer shrink-0 disabled:opacity-60 flex-1 sm:flex-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingQueue ? 'animate-spin' : ''}`} />
                <span>
                  {isFlushingQueue ? 'Syncing...' : `Sync Queued (${queuedResults.length})`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={openIdentityModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#f4f9fe] hover:bg-[#e8f3fd] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap flex-1 sm:flex-none"
            >
              <User className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>{studentIdentity ? 'Edit Name / Section' : 'Set Name & Section'}</span>
            </button>
          </div>
        </div>

        {lastSyncError && queuedResults.length > 0 && (
          <div className="px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{lastSyncError}</span>
          </div>
        )}

        {/* Badges Earned */}
        <div
          data-guide-id="practice-badges"
          className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_4px_16px_-8px_rgba(31,58,86,0.06)] space-y-2.5"
        >
          <span className="text-xs font-bold text-[#3b5775] uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            Badges ({badges.filter((b) => b.unlocked).length} / {badges.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                  b.unlocked
                    ? 'bg-amber-50 text-amber-950 border-amber-300'
                    : 'bg-[#f4f9fe] text-[#3b5775] border-[#dbe9f4] opacity-85'
                }`}
                title={b.description}
              >
                <span>{b.icon}</span>
                <span className="font-semibold">{b.name}</span>
                {b.unlocked && <span className="text-[10px] text-amber-700 font-bold">✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 5 Topics List — Clean Full-Width Cards */}
        <div data-guide-id="practice-sets" className="space-y-4">
          {TOPICS.map((topic) => {
            const access = getTopicAccess(topic.id);
            const isPassed = access.passed;
            const unlocked = access.unlocked;

            return (
              <div
                key={topic.id}
                className={`w-full p-5 sm:p-6 rounded-2xl border transition-all duration-150 flex flex-col gap-3.5 ${
                  unlocked
                    ? 'bg-[#ffffff] border-[#dbe9f4] shadow-[0_6px_22px_-8px_rgba(31,58,86,0.08)] hover:border-[#93c5fd]'
                    : 'bg-[#ffffff] border-[#dbe9f4] shadow-[0_4px_16px_-8px_rgba(31,58,86,0.06)]'
                }`}
              >
                {/* Row 1: Number Badge + Title + Status Chips */}
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : unlocked
                            ? 'bg-[#0284c7] text-white shadow-xs'
                            : access.reason === 'wait-next-day'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-[#f1f6fb] text-[#435e7a] border border-[#dbe9f4]'
                      }`}
                    >
                      {isPassed ? (
                        '✓'
                      ) : unlocked ? (
                        topic.order
                      ) : access.reason === 'wait-next-day' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-bold text-[#1f3a56] leading-snug">
                      {topic.title}
                    </h3>
                  </div>

                  {isPassed && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                        Passed ({access.bestScore}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Row 2: Full-width Description & Lock Status */}
                <div className="w-full space-y-2">
                  <p className="text-sm text-[#3b5775] leading-relaxed">{topic.description}</p>

                  {!unlocked && access.lockLabel && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                      {access.reason === 'wait-next-day' ? (
                        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                      )}
                      <span>{access.lockLabel}</span>
                    </div>
                  )}
                </div>

                {/* Row 3: Action Buttons on their own bottom row */}
                <div className="w-full pt-3 border-t border-[#ebf3fa] flex flex-col sm:flex-row sm:items-center gap-2.5">
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => startQuiz(topic.id)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span>{isPassed ? 'Practice Again' : 'Start Topic'}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => announceLockedTopic(access)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] hover:bg-[#e8f3fd] text-[#1f3a56] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      {access.reason === 'wait-next-day' ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>{access.countdownLabel || 'Opens tomorrow'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-[#435e7a] shrink-0" />
                          <span>Locked</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigateToLibrary(topic.relatedLibraryIds[0])}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap transition flex items-center justify-center"
                  >
                    Study Guide
                  </button>
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
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-lg space-y-6 text-center text-[#1f3a56]">
        <div
          className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg ${
            quizResult.passed
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white'
              : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
          }`}
        >
          {quizResult.passed ? <Trophy className="w-10 h-10" /> : <RotateCcw className="w-10 h-10" />}
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3b5775]">
            {activeTopic.title}
          </span>
          <h2 className="font-display text-3xl font-bold text-[#1f3a56] mt-1">
            {quizResult.passed ? 'Topic Passed!' : 'Keep Practicing!'}
          </h2>
          <p className="text-sm text-[#3b5775] mt-1">
            {quizResult.passed
              ? activeTopic.id === 'mixed-practice'
                ? `Awesome work! You passed Mixed Practice with ${quizResult.percent}%!`
                : 'Passed! Your next topic unlocks tomorrow at 12:00 AM.'
              : `You scored ${quizResult.percent}%. Score at least ${activeTopic.passingScore}% to pass and unlock the next topic.`}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] flex items-center justify-around">
          <div>
            <span className="text-xs text-[#3b5775] block font-medium">Correct</span>
            <span className="text-2xl font-black text-emerald-700">
              {quizResult.score} / {quizResult.total}
            </span>
          </div>
          <div className="w-px h-10 bg-[#dbe9f4]" />
          <div>
            <span className="text-xs text-[#3b5775] block font-medium">Final Score</span>
            <span className="text-2xl font-black text-[#0284c7]">{quizResult.percent}%</span>
          </div>
        </div>

        {quizResult.statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium ${
              quizResult.status === 'saved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : quizResult.status === 'queued'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-[#f4f9fe] border-[#dbe9f4] text-[#3b5775]'
            }`}
          >
            {quizResult.statusMessage}
          </div>
        )}

        {quizResult.newBadges.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2">
            <span className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" /> New Badges Unlocked!
            </span>
            <div className="flex flex-wrap gap-2">
              {quizResult.newBadges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-950 text-xs font-bold border border-amber-200"
                >
                  <span>{b.icon}</span>
                  <span>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => startQuiz(activeTopic.id)}
            className="flex-1 py-3 px-4 rounded-xl bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56] font-bold text-xs hover:bg-[#f4f9fe] transition cursor-pointer"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => setActiveTopicId(null)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            Back to Topics
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isSubmitted = !!submittedQuestions[currentQuestion.id];
  const isCorrect = isSubmitted && isQuestionCorrect(currentQuestion);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-12 text-[#1f3a56]">
      <div className="flex items-center justify-between text-xs font-bold text-[#3b5775]">
        <button
          type="button"
          onClick={() => setActiveTopicId(null)}
          className="hover:text-[#1f3a56] transition cursor-pointer"
        >
          ← Back to Topics
        </button>
        <span className="text-[#1f3a56] font-mono">
          Question {currentQuestionIdx + 1} of {activeTopic.questions.length}
        </span>
        <button
          type="button"
          onClick={() => onNavigateToLibrary(activeTopic.relatedLibraryIds[0])}
          className="text-[#0284c7] hover:underline cursor-pointer"
        >
          Study Guide
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-[#e5eff8] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0284c7] to-[#2563eb] transition-all duration-300"
          style={{
            width: `${((currentQuestionIdx + 1) / activeTopic.questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-[0_10px_28px_-10px_rgba(31,58,86,0.08)] space-y-6">
        <div>
          <span className="text-xs font-bold text-[#0284c7] uppercase tracking-wider block">
            {currentQuestion.ruleTitle}
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1f3a56] mt-1 leading-snug">
            {currentQuestion.prompt}
          </h2>

          {currentQuestion.formula && (
            <div className="mt-3 p-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] inline-block">
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
                'bg-[#ffffff] border-[#dbe9f4] text-[#1f3a56] hover:border-[#0284c7] hover:bg-[#f4f9fe]';

              if (isSubmitted) {
                if (opt === currentQuestion.correctAnswer) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-50 border-rose-500 text-rose-950';
                }
              } else if (isSelected) {
                btnStyle =
                  'bg-[#eff6ff] border-[#0284c7] text-[#1f3a56] font-semibold ring-1 ring-[#0284c7]';
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
                    <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
                  )}
                  {isSubmitted && isSelected && opt !== currentQuestion.correctAnswer && (
                    <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Typed Answers */}
        {!currentQuestion.options && currentQuestion.type !== 'matching' && (
          <div className="space-y-3">
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
              className="w-full px-4 py-3 rounded-xl bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56] placeholder:text-[#526d88]/70 font-mono text-base focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
            <span className="text-[11px] text-[#3b5775] block">
              Tip: Plain text like <code>H2SO4</code> or <code>iron(II) sulfide</code> works.
            </span>
          </div>
        )}

        {/* Matching Questions */}
        {currentQuestion.type === 'matching' && currentQuestion.matchingPairs && (
          <div className="space-y-4">
            <p className="text-xs text-[#3b5775]">
              Click an item on the left, then click its corresponding match on the right:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#3b5775] block uppercase">Prompts</span>
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
                          ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-sm'
                          : matchedRight
                            ? 'bg-[#eff6ff] border-[#93c5fd] text-[#1f3a56]'
                            : 'bg-[#ffffff] border-[#dbe9f4] text-[#1f3a56] hover:bg-[#f4f9fe]'
                      }`}
                    >
                      <span>{pair.left}</span>
                      {matchedRight && (
                        <span
                          className={`block font-mono text-[11px] mt-1 ${
                            isSelected ? 'text-sky-100' : 'text-[#0284c7]'
                          }`}
                        >
                          ↳ {matchedRight}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#3b5775] block uppercase">Matches</span>
                {currentQuestion.matchingPairs.map((pair, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleMatchingRightClick(pair.right)}
                    className="w-full p-3 rounded-xl border border-[#dbe9f4] bg-[#ffffff] hover:border-[#0284c7] hover:bg-[#f4f9fe] text-left text-xs font-mono font-bold text-[#1f3a56] transition cursor-pointer"
                  >
                    {pair.right}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hint toggle */}
        {settings.hintsEnabled && !isSubmitted && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                const opening = !showHint;
                setShowHint(opening);
                if (opening) givePracticeHint(currentQuestion);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-amber-800 font-semibold hover:underline cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
            </button>
            {showHint && currentQuestion.hint && (
              <p className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                {currentQuestion.hint}
              </p>
            )}
          </div>
        )}

        {/* Action Controls */}
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] disabled:opacity-50 text-white font-bold text-sm shadow-md transition cursor-pointer disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <div className="space-y-4 pt-2">
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
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
                <p className="leading-relaxed pt-1 text-[#1f3a56]">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void goToNextQuestion()}
              disabled={submittingScore}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>
                {submittingScore
                  ? 'Saving...'
                  : currentQuestionIdx + 1 === activeTopic.questions.length
                    ? 'Finish Topic'
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
