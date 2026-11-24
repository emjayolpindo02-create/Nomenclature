import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaceCalibration,
  GuideAnimationLevel,
  GuideAppSnapshot,
  GuideCorner,
  GuideMessage,
  GuideSettings,
  GuideSize,
  GuideVisualState,
  SpeechTimeline,
  TourId,
  TourStep,
} from '../types/guide';
import { Question } from '../types/chemistry';
import {
  buildSpeechTimeline,
  DEFAULT_FACE_CALIBRATION,
  findWordIndexForCharIndex,
  resolveEffectiveAnimationMode,
  sanitizeCalibration,
} from '../engine/guideSpeechTimeline';
import {
  formatTextForClearSpeech,
  resolveClearManlyPitch,
  selectPreferredClearVoice,
} from '../engine/guideVoice';
import {
  answerGuideQuestion,
  buildPracticeFeedbackReply,
  buildPracticeHintText,
  GuideBrainReply,
} from '../engine/guideBrain';
import { getTourSteps } from '../data/guideKnowledge';
import { LessonUnlockStatus } from '../engine/lessonLock';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { isOfflineFileCopy } from '../config/appInfo';
import { useSettings } from './SettingsContext';

const GUIDE_SETTINGS_KEY = 'ilab_virtual_guide_settings_v1';
const GUIDE_CHAT_KEY = 'ilab_virtual_guide_chat_v1';
const MAX_STORED_CHAT_MESSAGES = 24;

export const DEFAULT_GUIDE_SETTINGS: GuideSettings = {
  guideEnabled: true,
  voiceEnabled: true,
  captionsEnabled: true,
  welcomeOnStartup: true,
  hasSeenWelcome: false,
  corner: 'bottom-right',
  size: 'standard',
  animationLevel: 'full',
  voiceURI: '',
  rate: 0.85,
  pitch: 0.84,
  volume: 1.0,
  muted: false,
  voiceProfileVersion: 4,
  calibration: { ...DEFAULT_FACE_CALIBRATION },
};

function loadGuideSettings(): GuideSettings {
  try {
    const raw = safeGetItem(GUIDE_SETTINGS_KEY);
    if (!raw) return DEFAULT_GUIDE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GuideSettings>;
    const merged: GuideSettings = {
      ...DEFAULT_GUIDE_SETTINGS,
      ...parsed,
      calibration: sanitizeCalibration(parsed.calibration),
    };
    // Upgrade older fast/high-pitched defaults once to slower, clear manly speech
    if ((parsed.voiceProfileVersion ?? 1) < 4) {
      if (
        !parsed.voiceURI ||
        (typeof parsed.rate === 'number' && parsed.rate >= 0.9) ||
        (typeof parsed.pitch === 'number' && parsed.pitch >= 0.9)
      ) {
        merged.rate = DEFAULT_GUIDE_SETTINGS.rate;
        merged.pitch = DEFAULT_GUIDE_SETTINGS.pitch;
      }
      merged.voiceProfileVersion = 4;
    }
    return merged;
  } catch {
    return DEFAULT_GUIDE_SETTINGS;
  }
}

function loadChatHistory(): GuideMessage[] {
  try {
    const raw = safeGetItem(GUIDE_CHAT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED_CHAT_MESSAGES) : [];
  } catch {
    return [];
  }
}

export interface ActiveTourState {
  tourId: TourId;
  steps: TourStep[];
  stepIndex: number;
}

interface SpeechSpeechRefs {
  isSpeaking: boolean;
  startTimeMs: number;
  timeline: SpeechTimeline;
  boundaryWordIndex: number | null;
  lastBoundaryAtMs: number;
}

interface GuideContextType {
  guideSettings: GuideSettings;
  updateGuideSettings: (partial: Partial<GuideSettings>) => void;
  updateCalibration: (cal: FaceCalibration) => void;
  resetCalibration: () => void;
  chatHistory: GuideMessage[];
  clearChatHistory: () => void;
  visualState: GuideVisualState;
  effectiveAnimationMode: GuideAnimationLevel;
  prefersReducedMotion: boolean;
  activeCaptionText: string;
  activeWordIndex: number;
  setActiveWordIndex: (idx: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  hasOfflineVoice: boolean;
  speechSupported: boolean;
  speechRecognitionSupported: boolean;
  isListeningMic: boolean;
  startMicListening: () => void;
  stopMicListening: () => void;
  speechTimingRef: React.MutableRefObject<SpeechSpeechRefs>;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  replayText: (text: string) => void;
  askGuide: (question: string) => void;
  givePracticeHint: (question: Question) => void;
  givePracticeFeedback: (question: Question, wasCorrect: boolean) => void;
  announcePracticeOutcome: (opts: {
    passed: boolean;
    percent: number;
    passingScore: number;
    title: string;
  }) => void;
  announceLockedTopic: (unlockStatus: LessonUnlockStatus) => void;
  activeTour: ActiveTourState | null;
  activeHighlightId: string | null;
  startTour: (tourId: TourId) => void;
  nextTourStep: () => void;
  repeatTourStep: () => void;
  skipTour: () => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  isMobileExpanded: boolean;
  setIsMobileExpanded: (val: boolean) => void;
  calibrateModalOpen: boolean;
  setCalibrateModalOpen: (open: boolean) => void;
  appSnapshot: GuideAppSnapshot;
  updateAppSnapshot: (partial: Partial<GuideAppSnapshot>) => void;
  onNavigateTabRef: React.MutableRefObject<((tab: string) => void) | null>;
  onNavigateLibraryRef: React.MutableRefObject<((id: string) => void) | null>;
  cycleCorner: () => void;
  toggleSize: () => void;
}

const GuideContext = createContext<GuideContextType | null>(null);

const INITIAL_SNAPSHOT: GuideAppSnapshot = {
  currentTab: 'libraries',
  currentLibraryId: 'writing-chemical-formulas',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSignedIn: false,
  passingScore: 70,
  queuedCount: 0,
  isCurrentLibraryUnlocked: true,
  practiceInProgress: false,
};

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [guideSettings, setGuideSettings] = useState<GuideSettings>(() => loadGuideSettings());
  const [chatHistory, setChatHistory] = useState<GuideMessage[]>(() => loadChatHistory());
  const [visualState, setVisualState] = useState<GuideVisualState>('idle');
  const [activeCaptionText, setActiveCaptionText] = useState<string>(
    'Welcome! Tap Tour for a walkthrough, or ask me any compound formula or naming rule.'
  );
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [canvasSupported, setCanvasSupported] = useState<boolean>(true);
  const [activeTour, setActiveTour] = useState<ActiveTourState | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const [calibrateModalOpen, setCalibrateModalOpen] = useState<boolean>(false);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [appSnapshot, setAppSnapshot] = useState<GuideAppSnapshot>(INITIAL_SNAPSHOT);

  const appSnapshotRef = useRef<GuideAppSnapshot>(appSnapshot);
  appSnapshotRef.current = appSnapshot;

  const onNavigateTabRef = useRef<((tab: string) => void) | null>(null);
  const onNavigateLibraryRef = useRef<((id: string) => void) | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<{ stop?: () => void } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speakRequestIdRef = useRef<number>(0);

  const speechTimingRef = useRef<SpeechSpeechRefs>({
    isSpeaking: false,
    startTimeMs: 0,
    timeline: buildSpeechTimeline('', 1.0),
    boundaryWordIndex: null,
    lastBoundaryAtMs: 0,
  });

  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const speechRecognitionSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    );

  // Detect canvas & prefers-reduced-motion safely
  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      setCanvasSupported(Boolean(testCanvas.getContext && testCanvas.getContext('2d')));
    } catch {
      setCanvasSupported(false);
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
      } catch {
        // ignore
      }
    }
    return undefined;
  }, []);

  // Load Web Speech voices safely across browsers (Chrome async voiceschanged + Safari immediate)
  useEffect(() => {
    if (!speechSupported) return;
    const refreshVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices() || [];
        setAvailableVoices(list);
      } catch {
        setAvailableVoices([]);
      }
    };
    refreshVoices();
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    } catch {
      // ignore legacy Safari addEventListener gaps
    }
    const poll = window.setTimeout(refreshVoices, 400);
    return () => {
      window.clearTimeout(poll);
      try {
        window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
      } catch {
        // ignore
      }
    };
  }, [speechSupported]);

  const updateGuideSettings = useCallback((partial: Partial<GuideSettings>) => {
    setGuideSettings((prev) => {
      const next: GuideSettings = {
        ...prev,
        ...partial,
        calibration: partial.calibration ? sanitizeCalibration(partial.calibration) : prev.calibration,
      };
      safeSetItem(GUIDE_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateCalibration = useCallback(
    (cal: FaceCalibration) => {
      updateGuideSettings({ calibration: sanitizeCalibration(cal) });
    },
    [updateGuideSettings]
  );

  const resetCalibration = useCallback(() => {
    updateGuideSettings({ calibration: { ...DEFAULT_FACE_CALIBRATION, isCustom: false } });
  }, [updateGuideSettings]);

  const appendMessages = useCallback((msgs: GuideMessage[]) => {
    setChatHistory((prev) => {
      const next = [...prev, ...msgs].slice(-MAX_STORED_CHAT_MESSAGES);
      safeSetItem(GUIDE_CHAT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    safeSetItem(GUIDE_CHAT_KEY, '[]');
  }, []);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const revokeActiveAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {
        // ignore
      }
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch {
        // ignore
      }
      audioUrlRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    speakRequestIdRef.current += 1;
    clearSafetyTimer();
    revokeActiveAudio();
    speechTimingRef.current = {
      ...speechTimingRef.current,
      isSpeaking: false,
      boundaryWordIndex: null,
    };
    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setActiveWordIndex(-1);
    setVisualState((prev) => (prev === 'listening' ? 'listening' : 'idle'));
  }, [speechSupported, revokeActiveAudio]);

  // Ensure speech stops if guide is hidden or component unmounts
  useEffect(() => {
    if (!guideSettings.guideEnabled) {
      stopSpeaking();
    }
  }, [guideSettings.guideEnabled, stopSpeaking]);

  useEffect(() => {
    return () => {
      clearSafetyTimer();
      revokeActiveAudio();
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    };
  }, [revokeActiveAudio]);

  const guideSettingsRef = useRef(guideSettings);
  guideSettingsRef.current = guideSettings;

  const speakWithBrowserFallback = useCallback(
    (reqId: number, cleanText: string, timeline: SpeechTimeline, cfg: GuideSettings) => {
      if (reqId !== speakRequestIdRef.current) return;
      if (!speechSupported) return;

      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const spokenText = formatTextForClearSpeech(cleanText) || cleanText;
        const utterance = new SpeechSynthesisUtterance(spokenText);
        const voices = window.speechSynthesis.getVoices() || [];
        const preferOffline = !appSnapshotRef.current.isOnline;
        const pickedVoice = selectPreferredClearVoice(voices, cfg.voiceURI, preferOffline);

        if (pickedVoice) {
          utterance.voice = pickedVoice;
          if (pickedVoice.lang) {
            utterance.lang = pickedVoice.lang;
          }
        }
        utterance.rate = Math.min(1.3, Math.max(0.65, cfg.rate));
        utterance.pitch = resolveClearManlyPitch(cfg.pitch, pickedVoice);
        utterance.volume = Math.min(1, Math.max(0, cfg.volume));

        utterance.onboundary = (event) => {
          if (reqId !== speakRequestIdRef.current) return;
          if (typeof event.charIndex === 'number') {
            const scaledCharIdx =
              spokenText.length > 0
                ? Math.round((event.charIndex / spokenText.length) * cleanText.length)
                : event.charIndex;
            const idx = findWordIndexForCharIndex(timeline, scaledCharIdx);
            speechTimingRef.current.boundaryWordIndex = idx;
            speechTimingRef.current.lastBoundaryAtMs = performance.now();
            setActiveWordIndex(idx);
          }
        };

        utterance.onend = () => {
          if (reqId !== speakRequestIdRef.current) return;
          clearSafetyTimer();
          speechTimingRef.current.isSpeaking = false;
          speechTimingRef.current.boundaryWordIndex = null;
          setActiveWordIndex(-1);
          setVisualState('idle');
        };

        utterance.onerror = () => {
          // Keep caption/lip timeline fallback running smoothly if audio fails silently
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        // Safe fallback: timeline captions still run cleanly
      }
    },
    [speechSupported]
  );

  const speakText = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      stopSpeaking();
      const reqId = speakRequestIdRef.current;
      const cfg = guideSettingsRef.current;
      const timeline = buildSpeechTimeline(cleanText, cfg.rate);
      const startMs = performance.now();

      setActiveCaptionText(cleanText);
      setActiveWordIndex(timeline.words.length > 0 ? 0 : -1);
      setVisualState('talking');

      speechTimingRef.current = {
        isSpeaking: true,
        startTimeMs: startMs,
        timeline,
        boundaryWordIndex: null,
        lastBoundaryAtMs: startMs,
      };

      const shouldUseAudio = cfg.voiceEnabled && !cfg.muted && cfg.volume > 0;
      const fallbackDurationMs = Math.max(1400, timeline.totalEstimatedMs + 1200);

      // Guaranteed close-mouth timer so mouth never stays open on stalled/muted browsers
      safetyTimerRef.current = window.setTimeout(() => {
        if (reqId !== speakRequestIdRef.current) return;
        speechTimingRef.current.isSpeaking = false;
        speechTimingRef.current.boundaryWordIndex = null;
        setActiveWordIndex(-1);
        setVisualState('idle');
      }, fallbackDurationMs);

      if (!shouldUseAudio) {
        return;
      }

      const offlineOrFileCopy =
        isOfflineFileCopy() ||
        !appSnapshotRef.current.isOnline ||
        (typeof navigator !== 'undefined' && navigator.onLine === false);

      if (offlineOrFileCopy) {
        speakWithBrowserFallback(reqId, cleanText, timeline, cfg);
        return;
      }

      const spokenText = formatTextForClearSpeech(cleanText) || cleanText;
      void (async () => {
        try {
          const res = await fetch('/api/nomen/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: spokenText, voiceProfile: 'hype-announcer' }),
          });
          if (reqId !== speakRequestIdRef.current) return;
          if (!res.ok) {
            speakWithBrowserFallback(reqId, cleanText, timeline, cfg);
            return;
          }
          const data = (await res.json()) as { audioBase64?: string | null; mimeType?: string };
          if (reqId !== speakRequestIdRef.current) return;

          if (typeof data?.audioBase64 === 'string' && data.audioBase64.length > 0) {
            const binaryStr = window.atob(data.audioBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
            const objectUrl = URL.createObjectURL(blob);
            if (reqId !== speakRequestIdRef.current) {
              URL.revokeObjectURL(objectUrl);
              return;
            }
            revokeActiveAudio();
            const audio = new Audio(objectUrl);
            audio.volume = Math.min(1, Math.max(0, cfg.volume));
            audio.playbackRate = Math.min(1.25, Math.max(0.85, cfg.rate / 0.85));
            audioRef.current = audio;
            audioUrlRef.current = objectUrl;

            audio.onplay = () => {
              if (reqId !== speakRequestIdRef.current) return;
              speechTimingRef.current.startTimeMs = performance.now();
              setVisualState('talking');
            };
            audio.onended = () => {
              if (reqId !== speakRequestIdRef.current) return;
              clearSafetyTimer();
              revokeActiveAudio();
              speechTimingRef.current.isSpeaking = false;
              speechTimingRef.current.boundaryWordIndex = null;
              setActiveWordIndex(-1);
              setVisualState('idle');
            };
            audio.onerror = () => {
              if (reqId !== speakRequestIdRef.current) return;
              revokeActiveAudio();
              speakWithBrowserFallback(reqId, cleanText, timeline, cfg);
            };
            await audio.play();
            return;
          }

          speakWithBrowserFallback(reqId, cleanText, timeline, cfg);
        } catch {
          if (reqId !== speakRequestIdRef.current) return;
          speakWithBrowserFallback(reqId, cleanText, timeline, cfg);
        }
      })();
    },
    [stopSpeaking, revokeActiveAudio, speakWithBrowserFallback]
  );

  // Welcome message on first startup (once) if enabled
  const welcomeTriggeredRef = useRef(false);
  useEffect(() => {
    if (welcomeTriggeredRef.current) return;
    welcomeTriggeredRef.current = true;
    if (guideSettings.guideEnabled && guideSettings.welcomeOnStartup && !guideSettings.hasSeenWelcome) {
      const welcomeText =
        'Welcome to the Compound Naming Guide! Tap Tour Page anytime to walk through a lesson, or ask me any formula or rule question below.';
      setActiveCaptionText(welcomeText);
      updateGuideSettings({ hasSeenWelcome: true });
    }
  }, [
    guideSettings.guideEnabled,
    guideSettings.welcomeOnStartup,
    guideSettings.hasSeenWelcome,
    updateGuideSettings,
  ]);

  const replyAsMessage = useCallback(
    (userQuestion: string | null, reply: GuideBrainReply) => {
      const now = Date.now();
      const batch: GuideMessage[] = [];
      if (userQuestion) {
        batch.push({
          id: `user-${now}`,
          role: 'user',
          text: userQuestion,
        });
      }
      batch.push({
        id: `guide-${now + 1}`,
        role: 'guide',
        text: reply.text,
        formula: reply.formula,
        iupacName: reply.iupacName,
        traditionalName: reply.traditionalName,
        ruleTitle: reply.ruleTitle,
        libraryId: reply.libraryId,
        parts: reply.parts,
        solved: reply.solved,
        examples: reply.examples,
        steps: reply.steps,
        blockedByPractice: reply.blockedByPractice,
        outOfScope: reply.outOfScope,
      });
      appendMessages(batch);
      speakText(reply.text);
    },
    [appendMessages, speakText]
  );

  const askGuide = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      setVisualState('thinking');
      const reply = answerGuideQuestion(trimmed, appSnapshotRef.current);
      replyAsMessage(trimmed, reply);
    },
    [replyAsMessage]
  );

  const givePracticeHint = useCallback(
    (question: Question) => {
      const hintText = buildPracticeHintText(question);
      replyAsMessage('Hint for this question', {
        text: hintText,
        ruleTitle: question.ruleTitle,
      });
      if (!guideSettingsRef.current.guideEnabled) {
        updateGuideSettings({ guideEnabled: true });
      }
      setIsMinimized(false);
    },
    [replyAsMessage, updateGuideSettings]
  );

  const givePracticeFeedback = useCallback(
    (question: Question, wasCorrect: boolean) => {
      const fb = buildPracticeFeedbackReply(question, wasCorrect);
      setActiveCaptionText(fb.text);
      appendMessages([
        {
          id: `guide-fb-${Date.now()}`,
          role: 'guide',
          text: fb.text,
          ruleTitle: fb.ruleTitle,
          libraryId: fb.libraryId,
          examples: fb.examples,
        },
      ]);
      if (guideSettingsRef.current.guideEnabled && !isMinimized) {
        speakText(fb.text);
      }
    },
    [appendMessages, speakText, isMinimized]
  );

  const announcePracticeOutcome = useCallback(
    (opts: { passed: boolean; percent: number; passingScore: number; title: string }) => {
      const msg = opts.passed
        ? `Great work! You scored ${opts.percent}% on ${opts.title}. Once submitted, the next topic unlocks tomorrow.`
        : `Good effort on ${opts.title}—you scored ${opts.percent}%. Review the rule examples and try again to reach ${opts.passingScore}%.`;
      replyAsMessage(null, { text: msg });
    },
    [replyAsMessage]
  );

  const announceLockedTopic = useCallback(
    (unlockStatus: LessonUnlockStatus) => {
      const text =
        unlockStatus.reason === 'wait-next-day'
          ? `Great job passing ${unlockStatus.previousTitle || 'the previous set'}! ${unlockStatus.countdownLabel || 'Come back tomorrow to open this lesson.'}`
          : unlockStatus.reason === 'awaiting-sync'
            ? 'Your passing score is saved offline as Pending. Connect to the internet so your official unlock date can be recorded.'
            : `This lesson is locked for now. Pass ${unlockStatus.previousTitle || 'the previous set'} with at least ${unlockStatus.requiredScore}% and come back tomorrow.`;
      replyAsMessage(null, { text });
    },
    [replyAsMessage]
  );

  // Tour Navigation
  const runTourStep = useCallback(
    (steps: TourStep[], idx: number) => {
      const step = steps[idx];
      if (!step) return;
      if (step.targetTab && onNavigateTabRef.current) {
        onNavigateTabRef.current(step.targetTab);
      }
      if (step.targetLibraryId && onNavigateLibraryRef.current) {
        onNavigateLibraryRef.current(step.targetLibraryId);
      }
      speakText(step.speechText);
    },
    [speakText]
  );

  const startTour = useCallback(
    (tourId: TourId) => {
      const steps = getTourSteps(tourId, appSnapshotRef.current.currentLibraryId);
      if (steps.length === 0) return;
      setIsMinimized(false);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsMobileExpanded(true);
      }
      setActiveTour({ tourId, steps, stepIndex: 0 });
      runTourStep(steps, 0);
    },
    [runTourStep]
  );

  const nextTourStep = useCallback(() => {
    setActiveTour((prev) => {
      if (!prev) return null;
      const nextIdx = prev.stepIndex + 1;
      if (nextIdx >= prev.steps.length) {
        stopSpeaking();
        setActiveCaptionText('Tour complete! Ask any question whenever you need help.');
        return null;
      }
      runTourStep(prev.steps, nextIdx);
      return { ...prev, stepIndex: nextIdx };
    });
  }, [runTourStep, stopSpeaking]);

  const repeatTourStep = useCallback(() => {
    if (!activeTour) return;
    runTourStep(activeTour.steps, activeTour.stepIndex);
  }, [activeTour, runTourStep]);

  const skipTour = useCallback(() => {
    setActiveTour(null);
    stopSpeaking();
  }, [stopSpeaking]);

  const stopMicListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setIsListeningMic(false);
    setVisualState('idle');
  }, []);

  const startMicListening = useCallback(() => {
    if (!speechRecognitionSupported) return;
    stopSpeaking();
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
            onerror: () => void;
            onend: () => void;
            start: () => void;
            stop: () => void;
          };
          webkitSpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
            onerror: () => void;
            onend: () => void;
            start: () => void;
            stop: () => void;
          };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
            onerror: () => void;
            onend: () => void;
            start: () => void;
            stop: () => void;
          };
        }
      ).webkitSpeechRecognition;

    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = 'en-US';
      rec.interimResults = false;
      setIsListeningMic(true);
      setVisualState('listening');
      rec.onresult = (ev) => {
        const transcript = ev.results?.[0]?.[0]?.transcript?.trim();
        setIsListeningMic(false);
        if (transcript) {
          askGuide(transcript);
        } else {
          setVisualState('idle');
        }
      };
      rec.onerror = () => {
        setIsListeningMic(false);
        setVisualState('idle');
      };
      rec.onend = () => {
        setIsListeningMic(false);
      };
      rec.start();
    } catch {
      setIsListeningMic(false);
      setVisualState('idle');
    }
  }, [speechRecognitionSupported, stopSpeaking, askGuide]);

  const updateAppSnapshot = useCallback((partial: Partial<GuideAppSnapshot>) => {
    setAppSnapshot((prev) => ({ ...prev, ...partial }));
  }, []);

  const cycleCorner = useCallback(() => {
    const order: GuideCorner[] = ['bottom-right', 'bottom-left', 'top-right'];
    const idx = order.indexOf(guideSettingsRef.current.corner);
    const next = order[(idx + 1) % order.length];
    updateGuideSettings({ corner: next });
  }, [updateGuideSettings]);

  const toggleSize = useCallback(() => {
    const order: GuideSize[] = ['compact', 'standard', 'large'];
    const idx = order.indexOf(guideSettingsRef.current.size);
    const next = order[(idx + 1) % order.length];
    updateGuideSettings({ size: next });
  }, [updateGuideSettings]);

  const effectiveAnimationMode = useMemo(
    () =>
      resolveEffectiveAnimationMode({
        requestedLevel: guideSettings.animationLevel,
        prefersReducedMotion,
        appAnimationsEnabled: settings.animations,
        canvasSupported,
      }),
    [guideSettings.animationLevel, prefersReducedMotion, settings.animations, canvasSupported]
  );

  const hasOfflineVoice = useMemo(
    () => availableVoices.some((v) => v.localService) || availableVoices.length > 0,
    [availableVoices]
  );

  const activeHighlightId = activeTour?.steps[activeTour.stepIndex]?.highlightTarget || null;

  return (
    <GuideContext.Provider
      value={{
        guideSettings,
        updateGuideSettings,
        updateCalibration,
        resetCalibration,
        chatHistory,
        clearChatHistory,
        visualState,
        effectiveAnimationMode,
        prefersReducedMotion,
        activeCaptionText,
        activeWordIndex,
        setActiveWordIndex,
        availableVoices,
        hasOfflineVoice,
        speechSupported,
        speechRecognitionSupported,
        isListeningMic,
        startMicListening,
        stopMicListening,
        speechTimingRef,
        speakText,
        stopSpeaking,
        replayText: speakText,
        askGuide,
        givePracticeHint,
        givePracticeFeedback,
        announcePracticeOutcome,
        announceLockedTopic,
        activeTour,
        activeHighlightId,
        startTour,
        nextTourStep,
        repeatTourStep,
        skipTour,
        isMinimized,
        setIsMinimized,
        isMobileExpanded,
        setIsMobileExpanded,
        calibrateModalOpen,
        setCalibrateModalOpen,
        appSnapshot,
        updateAppSnapshot,
        onNavigateTabRef,
        onNavigateLibraryRef,
        cycleCorner,
        toggleSize,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = () => {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide must be used inside a GuideProvider');
  return ctx;
};
