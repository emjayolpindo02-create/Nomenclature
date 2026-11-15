import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Lock,
  Stethoscope,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { ChemicalElement, NamingResult } from '../../types/chemistry';
import { LIBRARY_RULES } from '../../data/libraryRules';
import { solveCompound } from '../../engine/namingEngine';
import { answerLocallyWithNomenGuide } from '../../engine/nomenGuide';
import { useProgress } from '../../context/ProgressContext';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken, ColorLegend } from '../common/ColorCodedToken';

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

export const DoctorNomen: React.FC<DoctorNomenProps> = ({
  onNavigateToLibrary,
  onSelectElement,
}) => {
  const { isLibraryUnlocked } = useProgress();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({});
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

  const stopPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
    setLoadingAudioId(null);
  };

  const speakWithBrowserFallback = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeakingMessageId(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMessageId(null);
    }
  };

  const speakMessage = async (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      stopPlayback();
      return;
    }
    stopPlayback();

    const cachedUrl = audioCacheRef.current[msgId];
    if (cachedUrl) {
      const audio = new Audio(cachedUrl);
      audioPlayerRef.current = audio;
      setSpeakingMessageId(msgId);
      audio.onended = () => setSpeakingMessageId(null);
      audio.onerror = () => speakWithBrowserFallback(msgId, text);
      audio.play().catch(() => speakWithBrowserFallback(msgId, text));
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      speakWithBrowserFallback(msgId, text);
      return;
    }

    setLoadingAudioId(msgId);
    try {
      const res = await fetch('/api/nomen/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error('Speech service unavailable');
      }

      const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
      if (!data.audioBase64) {
        throw new Error('No audio returned');
      }

      const dataUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      audioCacheRef.current[msgId] = dataUrl;

      const audio = new Audio(dataUrl);
      audioPlayerRef.current = audio;
      setLoadingAudioId(null);
      setSpeakingMessageId(msgId);
      audio.onended = () => setSpeakingMessageId(null);
      audio.onerror = () => speakWithBrowserFallback(msgId, text);
      await audio.play();
    } catch {
      setLoadingAudioId(null);
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
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
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

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
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

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200 pb-8">
      {/* Doctor Nomen Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 border border-sky-500/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Doctor Nomen
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Voice &amp; Q&amp;A guide for all 8 compound naming topics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (autoSpeak) stopPlayback();
                setAutoSpeak(!autoSpeak);
              }}
              aria-pressed={autoSpeak}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                autoSpeak
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{autoSpeak ? 'Voice On' : 'Voice Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              aria-label="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Speak or Type Input Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
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
            className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-50 ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
                <Mic className="w-4 h-4" />
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
            className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isAsking || isRecording || isTranscribing}
            className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Ask</span>
          </button>
        </form>

        {statusNotice && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-2 rounded-xl">
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
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer text-left"
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
                <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-sky-600 text-white text-sm font-medium shadow-xs">
                  {msg.text}
                </div>
              </div>
            );
          }

          const matchedRule = msg.libraryId
            ? LIBRARY_RULES.find((r) => r.id === msg.libraryId)
            : undefined;
          const unlocked = matchedRule ? isLibraryUnlocked(matchedRule.id) : false;
          const isSpeaking = speakingMessageId === msg.id;
          const isLoadingAudio = loadingAudioId === msg.id;

          return (
            <div
              key={msg.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              {/* Top Row: Doctor Nomen label + Listen Button */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
                  <Stethoscope className="w-4 h-4" />
                  <span>Doctor Nomen</span>
                </div>

                <button
                  type="button"
                  onClick={() => void speakMessage(msg.id, msg.text)}
                  disabled={isLoadingAudio}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    isSpeaking
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  aria-label={isSpeaking ? 'Stop speaking' : 'Listen to Doctor Nomen'}
                >
                  {isLoadingAudio ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              </div>

              {/* Answer Text */}
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed">
                {msg.text}
              </p>

              {/* Compound Breakdown Card if Formula Detected */}
              {(msg.formula || msg.solved) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
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
                          <span className="block text-xs font-serif italic text-amber-600 dark:text-amber-400">
                            Traditional: {msg.solved.traditionalName}
                          </span>
                        )}
                      </div>
                    ) : (
                      msg.compoundName && (
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      {unlocked ? <BookOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>
                        Open {matchedRule.title}
                        {!unlocked ? ' (Locked)' : ''}
                      </span>
                    </button>
                  )}

                  {msg.followUpSuggestion && (
                    <button
                      type="button"
                      disabled={isAsking}
                      onClick={() => void askDoctorNomen(msg.followUpSuggestion!)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer text-left"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>{msg.followUpSuggestion}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isAsking && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            <span>Doctor Nomen is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};
