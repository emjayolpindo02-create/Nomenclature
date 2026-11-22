import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Square, FlaskConical } from 'lucide-react';

export type NomenCharacterState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface DoctorNomenAvatarProps {
  state: NomenCharacterState;
  speechLevel: number;
  spokenPreview: string;
  autoSpeak: boolean;
  isSpeaking: boolean;
  onToggleAutoSpeak: () => void;
  onReset: () => void;
  onSpeakOrStopLatest: () => void;
}

const WAVE_WEIGHTS = [0.42, 0.78, 1.0, 0.68, 0.9, 0.52, 0.82];

export const DoctorNomenAvatar: React.FC<DoctorNomenAvatarProps> = ({
  state,
  speechLevel,
  spokenPreview,
  autoSpeak,
  isSpeaking,
  onToggleAutoSpeak,
  onReset,
  onSpeakOrStopLatest,
}) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; tx: number; ty: number }>({
    rx: 0,
    ry: 0,
    tx: 0,
    ty: 0,
  });
  const [hopping, setHopping] = useState(false);
  const hopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hopTimerRef.current !== null) {
        window.clearTimeout(hopTimerRef.current);
      }
    };
  }, []);

  const triggerHop = () => {
    setHopping(false);
    window.requestAnimationFrame(() => {
      setHopping(true);
      if (hopTimerRef.current !== null) {
        window.clearTimeout(hopTimerRef.current);
      }
      hopTimerRef.current = window.setTimeout(() => setHopping(false), 480);
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Math.max(-7, Math.min(7, -ny * 12)),
      ry: Math.max(-10, Math.min(10, nx * 16)),
      tx: nx * 6,
      ty: ny * 4,
    });
  };

  const resetTilt = () => {
    setTilt({ rx: 0, ry: 0, tx: 0, ty: 0 });
  };

  const handleCharacterClick = () => {
    triggerHop();
    onSpeakOrStopLatest();
  };

  const motionClass = hopping
    ? 'animate-nomen-hop'
    : state === 'speaking'
      ? 'animate-nomen-speak'
      : state === 'thinking'
        ? 'animate-nomen-think'
        : state === 'listening'
          ? 'animate-nomen-listen'
          : 'animate-nomen-idle';

  const statusText =
    state === 'listening'
      ? 'Listening to your voice'
      : state === 'thinking'
        ? 'Checking the naming rules'
        : state === 'speaking'
          ? 'Speaking answer aloud'
          : 'Ready for your question';

  const effectiveLevel = state === 'speaking' ? Math.max(0.28, speechLevel) : 0.14;

  return (
    <section
      aria-label="Doctor Nomen interactive stage"
      data-guide-id="tool-header"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white border border-slate-800 shadow-lg p-5 sm:p-6"
    >
      {/* Subtle lab backdrop glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-sky-500/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-8 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl"
      />

      <div className="relative flex flex-col md:flex-row items-center md:items-stretch gap-5 sm:gap-7">
        {/* Interactive Moving Character Pedestal */}
        <div className="relative flex flex-col items-center justify-center shrink-0">
          {/* Reactive Aura Rings behind character */}
          <div
            aria-hidden="true"
            className={`absolute inset-2 rounded-full transition-all duration-300 ${
              state === 'speaking'
                ? 'bg-sky-400/25 blur-xl scale-110'
                : state === 'listening'
                  ? 'bg-emerald-400/25 blur-xl scale-105'
                  : state === 'thinking'
                    ? 'bg-amber-400/20 blur-xl scale-105'
                    : 'bg-sky-500/15 blur-lg scale-95'
            }`}
            style={
              state === 'speaking'
                ? { transform: `scale(${1 + effectiveLevel * 0.24})` }
                : undefined
            }
          />

          {/* Orbit ring when thinking */}
          {state === 'thinking' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-sky-400/50 animate-spin-slow"
            />
          )}

          {/* Listening ring */}
          {state === 'listening' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-1 rounded-full border-2 border-emerald-400/60 animate-ping"
              style={{ animationDuration: '1.8s' }}
            />
          )}

          <button
            type="button"
            onClick={handleCharacterClick}
            aria-label={
              isSpeaking
                ? 'Doctor Nomen is speaking. Click to stop.'
                : 'Tap Doctor Nomen to hear him speak his latest answer'
            }
            data-testid="doctor-nomen-avatar"
            data-state={state}
            className="group relative w-32 h-32 sm:w-40 sm:h-40 rounded-3xl flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 select-none bg-gradient-to-br from-sky-500/20 to-indigo-600/20 border border-sky-400/30"
          >
            <div
              className={`w-full h-full flex flex-col items-center justify-center transition-transform duration-150 ease-out ${motionClass}`}
              style={{
                transform: `perspective(520px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translate3d(${tilt.tx}px, ${tilt.ty}px, 0)`,
              }}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-[0_12px_24px_rgba(14,165,233,0.35)] border border-sky-300/40">
                <FlaskConical className="w-11 h-11 sm:w-12 sm:h-12 text-white" />
              </div>
              <span className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-950/60 border border-sky-400/30 text-[10px] font-mono font-bold text-sky-200 tracking-wider">
                CHEM LAB
              </span>
            </div>
          </button>

          {/* Ground shadow */}
          <div
            aria-hidden="true"
            className="w-24 h-2.5 -mt-1 rounded-full bg-black/45 blur-[3px] transition-transform duration-300"
            style={{
              transform: `scaleX(${state === 'speaking' ? 0.92 + effectiveLevel * 0.14 : 1})`,
            }}
          />

          {/* Live Voice Waveform Bars */}
          <div
            aria-hidden="true"
            className="mt-2.5 flex items-end justify-center gap-1 h-5"
          >
            {WAVE_WEIGHTS.map((weight, idx) => {
              const barHeight =
                state === 'speaking'
                  ? Math.round(5 + weight * effectiveLevel * 15)
                  : state === 'listening'
                    ? Math.round(6 + ((idx % 3) + 1) * 3)
                    : 4;
              return (
                <span
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    state === 'speaking'
                      ? 'bg-sky-400'
                      : state === 'listening'
                        ? 'bg-emerald-400'
                        : state === 'thinking'
                          ? 'bg-amber-400/75'
                          : 'bg-slate-600'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        </div>

        {/* Right Side: Title, Controls, and Live Speech Caption */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-4 w-full text-center md:text-left">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Doctor Nomen
              </h1>
              <p
                className="mt-1 text-xs sm:text-sm font-medium text-sky-300"
                data-testid="doctor-nomen-status"
              >
                {statusText}
              </p>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleAutoSpeak}
                aria-pressed={autoSpeak}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  autoSpeak
                    ? 'bg-sky-500 text-white border-sky-400 hover:bg-sky-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {autoSpeak ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>{autoSpeak ? 'Voice On' : 'Voice Off'}</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                aria-label="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Live Speech Bubble showing active response */}
          <div className="rounded-xl bg-slate-800/75 border border-slate-700/80 px-4 py-3.5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-slate-100 leading-relaxed line-clamp-3">
              {spokenPreview}
            </p>
            <button
              type="button"
              onClick={handleCharacterClick}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                isSpeaking
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
              aria-label={isSpeaking ? 'Stop Doctor Nomen speaking' : 'Have Doctor Nomen speak aloud'}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Voice</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Speak Aloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
