import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Send,
  Volume2,
  BookOpen,
  Lock,
  Loader2,
  MessageSquare,
  FlaskConical,
} from 'lucide-react';
import { ChemicalElement, NamingResult } from '../../types/chemistry';
import { LIBRARY_RULES } from '../../data/libraryRules';
import { solveCompound } from '../../engine/namingEngine';
import { answerLocallyWithNomenGuide } from '../../engine/nomenGuide';
import { isOfflineFileCopy } from '../../config/appInfo';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';
import {
  DoctorNomenAvatar,
  NomenCharacterState,
} from './DoctorNomenAvatar';
import {
  formatTextForClearSpeech,
  resolveClearManlyPitch,
  selectPreferredClearVoice,
} from '../../engine/guideVoice';

interface DoctorNomenProps {
  onNavigateToLibrary: (libraryId: string) => void;
  onSelectElement: (el: ChemicalElement) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  formula?: string;
  compoundName?: string;
  libraryId?: string;
  followUpSuggestion?: string;
  solved?: NamingResult | null;
  isOfflineFallback?: boolean;
}

const STARTER_QUESTIONS = [
  'How do I name Pb(NO3)4?',
  'Why is HNO2 nitrous acid instead of nitric acid?',
  'When do I use parentheses in chemical formulas?',
  'Explain FeS vs Fe2S3 in Stock and Traditional names',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: "Hello! I'm Doctor Nomen. Ask me anything by voice or text about our 8 chemical naming and formula rules.",
  followUpSuggestion: 'How do Greek prefixes work in N2O5?',
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      } else {
        reject(new Error('Could not read audio stream.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read audio stream.'));
    reader.readAsDataURL(blob);
  });
}

function pickPreferredNaturalVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const preferOffline = typeof navigator !== 'undefined' ? !navigator.onLine : true;
    return selectPreferredClearVoice(voices, '', preferOffline) || null;
  } catch {
    return null;
  }
}

export const DoctorNomen: React.FC<DoctorNomenProps> = ({
  onNavigateToLibrary,
  onSelectElement,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const playbackRequestIdRef = useRef<number>(0);
  const speechMeterTimerRef = useRef<number | null>(null);
  const speechFallbackTimerRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isAsking]);

  const clearSpeechAnimationTimers = () => {
    if (speechMeterTimerRef.current !== null) {
      window.clearInterval(speechMeterTimerRef.current);
      speechMeterTimerRef.current = null;
    }
    if (speechFallbackTimerRef.current !== null) {
      window.clearTimeout(speechFallbackTimerRef.current);
      speechFallbackTimerRef.current = null;
    }
    setSpeechLevel(0);
  };

  const startCadenceSpeechMeter = () => {
    clearSpeechAnimationTimers();
    let tick = 0;
    speechMeterTimerRef.current = window.setInterval(() => {
      tick += 1;
      const wave = 0.48 + 0.44 * Math.abs(Math.sin(tick * 0.72) * Math.cos(tick * 0.31));
      setSpeechLevel(Number(wave.toFixed(2)));
    }, 90);
  };

  const revokeActiveAudio = () => {
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const stopPlayback = () => {
    playbackRequestIdRef.current += 1;
    clearSpeechAnimationTimers();
    revokeActiveAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  };

  const speakWithBrowserFallback = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      clearSpeechAnimationTimers();
      setSpeakingMessageId(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const spokenText = formatTextForClearSpeech(text) || text;
      const utterance = new SpeechSynthesisUtterance(spokenText);
      const preferredVoice = pickPreferredNaturalVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        if (preferredVoice.lang) {
          utterance.lang = preferredVoice.lang;
        }
      }
      utterance.rate = 0.85;
      utterance.pitch = resolveClearManlyPitch(0.84, preferredVoice);
      setSpeakingMessageId(msgId);
      startCadenceSpeechMeter();

      utterance.onboundary = () => {
        setSpeechLevel(0.95);
      };
      utterance.onend = () => {
        clearSpeechAnimationTimers();
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        clearSpeechAnimationTimers();
        setSpeakingMessageId(null);
      };

      // Safety cleanup if a headless/browser synthesizer never triggers onend
      const maxDurationMs = Math.min(20000, Math.max(4000, text.length * 85));
      speechFallbackTimerRef.current = window.setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          clearSpeechAnimationTimers();
          setSpeakingMessageId(null);
        }
      }, maxDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      clearSpeechAnimationTimers();
      setSpeakingMessageId(null);
    }
  };

  const playBase64AudioWav = async (
    reqId: number,
    msgId: string,
    base64Data: string,
    mimeType: string,
    fallbackText: string
  ) => {
    if (reqId !== playbackRequestIdRef.current) return;
    try {
      const binaryStr = window.atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType || 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);

      if (reqId !== playbackRequestIdRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      revokeActiveAudio();
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audioUrlRef.current = objectUrl;

      audio.onplay = () => {
        if (reqId !== playbackRequestIdRef.current) return;
        setSpeakingMessageId(msgId);
        startCadenceSpeechMeter();
      };
      audio.onended = () => {
        if (reqId !== playbackRequestIdRef.current) return;
        clearSpeechAnimationTimers();
        revokeActiveAudio();
        setSpeakingMessageId(null);
      };
      audio.onerror = () => {
        if (reqId !== playbackRequestIdRef.current) return;
        revokeActiveAudio();
        speakWithBrowserFallback(msgId, fallbackText);
      };

      await audio.play();
    } catch {
      if (reqId !== playbackRequestIdRef.current) return;
      revokeActiveAudio();
      speakWithBrowserFallback(msgId, fallbackText);
    }
  };

  const speakMessage = async (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      stopPlayback();
      return;
    }
    stopPlayback();
    const reqId = playbackRequestIdRef.current;

    const offlineOrFileCopy =
      isOfflineFileCopy() || (typeof navigator !== 'undefined' && navigator.onLine === false);
    if (offlineOrFileCopy) {
      speakWithBrowserFallback(msgId, text);
      return;
    }

    const spokenText = formatTextForClearSpeech(text) || text;
    setSpeakingMessageId(msgId);

    try {
      const res = await fetch('/api/nomen/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText }),
      });

      if (reqId !== playbackRequestIdRef.current) return;

      if (!res.ok) {
        speakWithBrowserFallback(msgId, text);
        return;
      }

      const data = await res.json();
      if (reqId !== playbackRequestIdRef.current) return;

      if (typeof data?.audioBase64 === 'string' && data.audioBase64.length > 0) {
        await playBase64AudioWav(
          reqId,
          msgId,
          data.audioBase64,
          typeof data.mimeType === 'string' ? data.mimeType : 'audio/wav',
          text
        );
        return;
      }

      speakWithBrowserFallback(msgId, text);
    } catch {
      if (reqId !== playbackRequestIdRef.current) return;
      speakWithBrowserFallback(msgId, text);
    }
  };

  const askDoctorNomen = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isAsking) return;

    setStatusNotice(null);
    stopPlayback();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsAsking(true);

    const historyPayload = nextMessages
      .filter((m) => m.id !== 'welcome')
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      if (isOfflineFileCopy() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        throw new Error('offline');
      }

      const res = await fetch('/api/nomen/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          history: historyPayload.slice(0, -1),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503 || res.status === 403 || res.status === 400) {
          setStatusNotice(data.error || 'Using built-in guide while AI service is unavailable.');
          throw new Error('fallback');
        }
        throw new Error(data.error || 'Request failed');
      }

      const formula = typeof data.formula === 'string' ? data.formula.trim() : '';
      const solved = formula ? solveCompound(formula) : null;

      const modelMsg: ChatMessage = {
        id: `nomen-${Date.now()}`,
        role: 'model',
        text: data.reply,
        formula: solved?.formula || formula || undefined,
        compoundName: data.compoundName || undefined,
        libraryId: data.libraryId || undefined,
        followUpSuggestion: data.followUpSuggestion || undefined,
        solved,
      };

      setMessages((prev) => [...prev, modelMsg]);
      if (autoSpeak) {
        void speakMessage(modelMsg.id, modelMsg.text);
      }
    } catch (err) {
      const local = answerLocallyWithNomenGuide(trimmed);
      const modelMsg: ChatMessage = {
        id: `nomen-${Date.now()}`,
        role: 'model',
        text: local.reply,
        formula: local.formula || undefined,
        compoundName: local.compoundName || undefined,
        libraryId: local.libraryId || undefined,
        followUpSuggestion: local.followUpSuggestion || undefined,
        solved: local.solved ?? (local.formula ? solveCompound(local.formula) : null),
        isOfflineFallback: true,
      };
      if (err instanceof Error && err.message !== 'offline' && err.message !== 'fallback') {
        setStatusNotice('Switched to built-in offline guide for this answer.');
      }
      setMessages((prev) => [...prev, modelMsg]);
      if (autoSpeak) {
        void speakMessage(modelMsg.id, modelMsg.text);
      }
    } finally {
      setIsAsking(false);
    }
  };

  const startVoiceInput = async () => {
    setStatusNotice(null);
    stopPlayback();

    const offlineOrFileMode =
      isOfflineFileCopy() || (typeof navigator !== 'undefined' && !navigator.onLine);

    if (offlineOrFileMode || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // Fall back to Web Speech API if available
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

      if (!SpeechRec) {
        setStatusNotice('Microphone recording is not supported in this browser. Please type your question.');
        return;
      }

      try {
        const recognition = new SpeechRec() as {
          lang: string;
          interimResults: boolean;
          onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onerror: () => void;
          onend: () => void;
          start: () => void;
        };
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        setIsRecording(true);
        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript?.trim();
          setIsRecording(false);
          if (transcript) {
            void askDoctorNomen(transcript);
          }
        };
        recognition.onerror = () => {
          setIsRecording(false);
          setStatusNotice('Could not capture voice. Please check microphone permissions or type below.');
        };
        recognition.onend = () => setIsRecording(false);
        recognition.start();
      } catch {
        setIsRecording(false);
        setStatusNotice('Could not start voice input. Please type your question below.');
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setIsRecording(false);

        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 200) {
          setStatusNotice('No speech detected. Hold or speak clearly, then tap Stop.');
          return;
        }

        setIsTranscribing(true);
        try {
          const base64 = await blobToBase64(audioBlob);
          const cleanMime = mimeType.split(';')[0] || 'audio/webm';
          const res = await fetch('/api/nomen/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType: cleanMime }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Could not transcribe audio.');
          }
          const transcript = (data.transcript || '').trim();
          if (!transcript) {
            setStatusNotice('Could not hear words clearly. Please try again or type your question.');
          } else {
            await askDoctorNomen(transcript);
          }
        } catch (err) {
          setStatusNotice(
            err instanceof Error
              ? err.message
              : 'Voice transcription unavailable. Please type your question.'
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setStatusNotice('Microphone access was blocked. Allow mic permission or type your question.');
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  const handleReset = () => {
    stopPlayback();
    setMessages([WELCOME_MESSAGE]);
    setStatusNotice(null);
    setInput('');
  };

  const latestModelMessage =
    [...messages].reverse().find((m) => m.role === 'model') || WELCOME_MESSAGE;

  const isAnyVoiceActive = speakingMessageId !== null;

  const characterState: NomenCharacterState = isRecording
    ? 'listening'
    : isAsking || isTranscribing
      ? 'thinking'
      : isAnyVoiceActive
        ? 'speaking'
        : 'idle';

  const handleSpeakOrStopLatest = () => {
    if (isAnyVoiceActive) {
      stopPlayback();
      return;
    }
    void speakMessage(latestModelMessage.id, latestModelMessage.text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200 pb-8">
      {/* Interactive Animated Doctor Nomen Stage */}
      <DoctorNomenAvatar
        state={characterState}
        speechLevel={speechLevel}
        spokenPreview={latestModelMessage.text}
        autoSpeak={autoSpeak}
        isSpeaking={isAnyVoiceActive}
        onToggleAutoSpeak={() => {
          if (autoSpeak) stopPlayback();
          setAutoSpeak(!autoSpeak);
        }}
        onReset={handleReset}
        onSpeakOrStopLatest={handleSpeakOrStopLatest}
      />

      {/* Speak or Type Input Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void askDoctorNomen(input);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <button
            type="button"
            onClick={isRecording ? stopVoiceInput : startVoiceInput}
            disabled={isTranscribing || isAsking}
            className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50 ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-[#f4f9fe] hover:bg-[#eaf3fc] text-[#1f3a56] border border-[#dbe9f4]'
            }`}
            aria-label={isRecording ? 'Stop speaking and send' : 'Speak a question to Doctor Nomen'}
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop &amp; Ask</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-[#0284c7]" />
                <span>Speak</span>
              </>
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Doctor Nomen anything about formulas, ionic names, prefixes, or acids..."
            disabled={isRecording || isTranscribing}
            aria-label="Ask Doctor Nomen a question"
            className="flex-1 px-4 py-3 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] placeholder:text-[#526d88]/70 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          />

          <button
            type="submit"
            disabled={!input.trim() || isAsking || isRecording || isTranscribing}
            className="px-5 py-3 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Ask</span>
          </button>
        </form>

        {statusNotice && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
            {statusNotice}
          </p>
        )}

        {/* Quick Questions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isAsking || isRecording || isTranscribing}
              onClick={() => void askDoctorNomen(q)}
              className="px-3 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-[#eaf3fc] hover:text-[#0284c7] border border-[#dbe9f4] text-xs font-medium text-[#1f3a56] transition cursor-pointer text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Feed */}
      <div className="space-y-4">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-[#0284c7] text-white text-sm font-medium shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          const matchedRule = msg.libraryId
            ? LIBRARY_RULES.find((r) => r.id === msg.libraryId)
            : undefined;
          const isSpeaking = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className="p-5 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm space-y-4"
            >
              {/* Top Row: Doctor Nomen label + Listen Button */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0284c7]">
                  <span className="w-6 h-6 rounded-lg bg-[#f4f9fe] border border-[#dbe9f4] flex items-center justify-center">
                    <FlaskConical className="w-3.5 h-3.5 text-[#0284c7]" />
                  </span>
                  <span>Doctor Nomen</span>
                </div>

                <button
                  type="button"
                  onClick={() => void speakMessage(msg.id, msg.text)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isSpeaking
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                  }`}
                  aria-label={isSpeaking ? 'Stop speaking' : 'Listen to Doctor Nomen'}
                >
                  {isSpeaking ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              </div>

              {/* Answer Text */}
              <p className="text-sm sm:text-base text-[#1f3a56] leading-relaxed">
                {msg.text}
              </p>

              {/* Compound Breakdown Card if Formula Detected */}
              {(msg.formula || msg.solved) && (
                <div className="p-4 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <FormulaRenderer
                      formula={msg.solved?.formula || msg.formula || ''}
                      size="xl"
                      onSelectElement={onSelectElement}
                    />
                    {msg.solved ? (
                      <div className="space-y-0.5">
                        <ColorCodedToken parts={msg.solved.parts} size="md" />
                        {msg.solved.traditionalName && (
                          <span className="block text-xs font-serif italic text-amber-800">
                            Traditional: {msg.solved.traditionalName}
                          </span>
                        )}
                      </div>
                    ) : (
                      msg.compoundName && (
                        <span className="text-sm font-bold text-[#1f3a56]">
                          {msg.compoundName}
                        </span>
                      )
                    )}
                  </div>
                  {msg.solved && <ColorLegend compact />}
                </div>
              )}

              {/* Topic Link + Follow-up */}
              {(matchedRule || msg.followUpSuggestion) && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {matchedRule && (
                    <button
                      type="button"
                      onClick={() => onNavigateToLibrary(matchedRule.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open {matchedRule.title}</span>
                    </button>
                  )}

                  {msg.followUpSuggestion && (
                    <button
                      type="button"
                      disabled={isAsking}
                      onClick={() => void askDoctorNomen(msg.followUpSuggestion!)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f4f9fe] hover:bg-[#eaf3fc] border border-[#dbe9f4] text-[#1f3a56] text-xs font-medium transition cursor-pointer text-left"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
                      <span>{msg.followUpSuggestion}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isAsking && (
          <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] flex items-center gap-2.5 text-sm text-[#1f3a56] shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#0284c7]" />
            <span>Doctor Nomen is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};
