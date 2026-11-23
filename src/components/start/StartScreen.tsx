import React, { useEffect, useRef, useState } from 'react';
import {
  Atom,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  Play,
  Settings,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { TOPICS } from '../../data/topics';

interface StartScreenProps {
  onStartTopics: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenTeacher: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartTopics,
  onOpenLibrary,
  onOpenSettings,
  onOpenTeacher,
}) => {
  const { firebaseUser, studentProfile, isTeacher, openSignInModal } = useAuth();
  const { getTopicAccess } = useProgress();
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [clockAngles, setClockAngles] = useState(() => {
    const d = new Date();
    return {
      minDeg: d.getMinutes() * 6 + d.getSeconds() * 0.1,
      hourDeg: (d.getHours() % 12) * 30 + d.getMinutes() * 0.5,
    };
  });
  const startingRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const d = new Date();
      setClockAngles({
        minDeg: d.getMinutes() * 6 + d.getSeconds() * 0.1,
        hourDeg: (d.getHours() % 12) * 30 + d.getMinutes() * 0.5,
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleStartClick = () => {
    if (startingRef.current || isLeaving) return;
    startingRef.current = true;
    setIsLeaving(true);
    window.setTimeout(() => {
      onStartTopics();
    }, 220);
  };

  // Compute returning progress summary (works for both signed-in students and device-only guests)
  const passedTopicsCount = TOPICS.filter((t) => getTopicAccess(t.id).passed).length;
  const nextOpenTopic =
    TOPICS.find((t) => {
      const access = getTopicAccess(t.id);
      return access.unlocked && !access.passed;
    }) || TOPICS[0];

  const statusLabel = isTeacher
    ? `Teacher: ${firebaseUser?.displayName || firebaseUser?.email || 'Verified'}`
    : studentProfile
      ? `${studentProfile.displayName} (${studentProfile.section})`
      : firebaseUser?.isAnonymous
        ? 'Guest'
        : 'Guest Mode';

  return (
    <div
      data-testid="classroom-start-screen"
      className={`relative min-h-screen w-full overflow-hidden flex flex-col justify-between bg-transparent text-[#1f3a56] transition-opacity duration-200 ${
        isLeaving ? 'opacity-0 scale-[1.01]' : 'opacity-100 scale-100'
      }`}
    >
      {/* Flat-illustrated classroom background layers */}
      <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 overflow-hidden">
        {/* Wall upper trim (translucent so moving atoms & chemical symbols shine softly behind) */}
        <div className="absolute inset-x-0 top-0 h-[76%] bg-gradient-to-b from-[#fbfdff]/40 via-[#f5faff]/25 to-[#eef6fd]/35" />

        {/* Left sunny classroom window + light beam + floating motes */}
        <div className="hidden sm:block absolute left-[3%] top-[10%] w-32 md:w-44 h-44 md:h-56 rounded-2xl border-4 border-[#c99e6d] bg-gradient-to-b from-[#f0f7ff] to-[#dfeffc] shadow-md overflow-hidden">
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            <div className="border-r-2 border-b-2 border-[#d9b385]" />
            <div className="border-b-2 border-[#d9b385]" />
            <div className="border-r-2 border-[#d9b385]" />
            <div />
          </div>
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-amber-200/70 blur-[2px]" />
        </div>
        {/* Diagonal sunlight beam */}
        <div
          className="hidden sm:block absolute left-[6%] top-[14%] w-72 md:w-96 h-96 bg-gradient-to-br from-[#fef9c3]/45 via-[#e0f2fe]/20 to-transparent -rotate-12 blur-sm"
        />
        {/* Dust motes in sunlight */}
        <div className="hidden sm:block absolute left-[12%] top-[24%] w-2 h-2 rounded-full bg-amber-100/80 dust-float" />
        <div
          className="hidden sm:block absolute left-[17%] top-[34%] w-1.5 h-1.5 rounded-full bg-sky-100/90 dust-float"
          style={{ animationDelay: '-2.1s' }}
        />
        <div
          className="hidden sm:block absolute left-[14%] top-[44%] w-2 h-2 rounded-full bg-amber-100/75 dust-float"
          style={{ animationDelay: '-4.2s' }}
        />

        {/* Animated Classroom Wall Clock (top right) */}
        <div className="hidden sm:flex absolute right-[6%] top-[8%] w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-[#93c5fd] bg-[#ffffff] shadow-sm items-center justify-center">
          <div className="relative w-full h-full">
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#3b5775]">
              12
            </span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#3b5775]">
              6
            </span>
            {/* Hour hand */}
            <div
              className="absolute left-1/2 bottom-1/2 w-1 h-4 bg-[#1f3a56] rounded-full origin-bottom"
              style={{ transform: `translateX(-50%) rotate(${clockAngles.hourDeg}deg)` }}
            />
            {/* Minute hand */}
            <div
              className="absolute left-1/2 bottom-1/2 w-0.5 h-5.5 bg-[#0284c7] rounded-full origin-bottom"
              style={{ transform: `translateX(-50%) rotate(${clockAngles.minDeg}deg)` }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0284c7]" />
          </div>
        </div>

        {/* Periodic Table Poster & Lab Flask Shelf (right wall) */}
        <div className="hidden lg:block absolute right-[4%] top-[26%] w-40 rounded-xl border border-[#dbe9f4] bg-[#ffffff]/95 p-2.5 shadow-sm">
          <div className="text-[8px] font-bold text-[#1f3a56] uppercase tracking-wider mb-1.5 text-center">
            Elements
          </div>
          <div className="grid grid-cols-6 gap-1">
            {['H', 'He', 'Li', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Cl', 'Fe'].map((el, i) => (
              <div
                key={el}
                className={`text-[7px] font-mono font-bold text-center py-0.5 rounded ${
                  i % 3 === 0
                    ? 'bg-sky-100 text-[#1f3a56]'
                    : i % 3 === 1
                      ? 'bg-cyan-100 text-[#1f3a56]'
                      : 'bg-blue-100 text-[#1f3a56]'
                }`}
              >
                {el}
              </div>
            ))}
          </div>
        </div>

        {/* Shelf with colorful lab flasks */}
        <div className="hidden md:flex flex-col items-center absolute right-[5%] bottom-[26%]">
          <div className="flex items-end gap-2.5 px-3">
            {/* Beaker 1 */}
            <div className="w-6 h-8 rounded-b-md border-2 border-sky-400 bg-sky-200/70 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-4 bg-cyan-400/65" />
            </div>
            {/* Erlenmeyer Flask */}
            <svg width="26" height="32" viewBox="0 0 26 32" fill="none">
              <path
                d="M10 3H16V10L23 26C23.5 27.3 22.6 29 21 29H5C3.4 29 2.5 27.3 3 26L10 10V3Z"
                fill="#bae6fd"
                stroke="#0284c7"
                strokeWidth="2"
              />
              <path d="M5.5 22H20.5L22 26C22.3 26.8 21.7 27.5 20.8 27.5H5.2C4.3 27.5 3.7 26.8 4 26L5.5 22Z" fill="#2dd4bf" />
            </svg>
            {/* Test tube */}
            <div className="w-3.5 h-9 rounded-b-full border-2 border-blue-400 bg-blue-100/80 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-5 bg-sky-400/70" />
            </div>
          </div>
          <div className="w-28 h-2.5 rounded-full bg-[#c99e6d] shadow-xs" />
        </div>

        {/* Classroom floor & wooden desks along bottom */}
        <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-b from-[#e4c496] to-[#d4ad77] border-t-4 border-[#c0955e]" />
        <div className="absolute inset-x-0 bottom-2 flex justify-around px-6 opacity-90">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center ${idx === 1 ? 'hidden md:flex' : ''}`}
            >
              {/* Desk top */}
              <div className="w-28 sm:w-36 h-3.5 rounded-md bg-[#eccd9e] border-b-2 border-[#b58752] shadow-xs" />
              {/* Desk legs */}
              <div className="w-24 sm:w-32 flex justify-between px-2">
                <div className="w-1.5 h-8 bg-[#60a5fa]" />
                <div className="w-1.5 h-8 bg-[#60a5fa]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Subtle User Status Bar (No Sync / Online / Technical Clutter) */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 pt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#ffffff]/95 border border-[#dbe9f4] shadow-xs text-xs font-semibold text-[#1f3a56]">
          <UserCheck className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
          <span>Signed in as {statusLabel}</span>
          {studentProfile && !studentProfile.approved && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
              <Clock className="w-3 h-3" />
              Waiting for teacher approval
            </span>
          )}
        </div>

        {!firebaseUser && (
          <button
            type="button"
            onClick={() => openSignInModal({ mode: 'student' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-bold text-[#1f3a56] transition cursor-pointer shadow-xs"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Student Sign In</span>
          </button>
        )}
      </div>

      {/* Center Interactive Whiteboard */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-2xl">
          {/* Rounded-wood classroom whiteboard frame */}
          <div className="p-2.5 sm:p-3.5 rounded-[2rem] bg-gradient-to-b from-[#d1a472] to-[#b88652] shadow-[0_22px_50px_-14px_rgba(31,58,86,0.22)]">
            <div className="relative rounded-[1.5rem] bg-[#ffffff] border border-[#dbe9f4] px-6 py-7 sm:px-10 sm:py-9 text-center space-y-6">
              {/* Whiteboard top glare */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-3 left-6 right-6 h-2.5 rounded-full bg-[#f4f9fe]"
              />

              {/* Logo & Title */}
              <div className="space-y-2.5 pt-1">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-[#2563eb] text-white shadow-md shadow-sky-500/25 mx-auto">
                  <Atom className="w-9 h-9 animate-spin-slow" />
                </div>

                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#0284c7]">
                    I-LAB Classroom
                  </span>
                  <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#1f3a56] mt-0.5">
                    Chemical Nomenclature
                  </h1>
                  <p className="text-sm sm:text-base font-medium text-[#3b5775] mt-1 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0284c7]" />
                    <span>Name it. Master it.</span>
                  </p>
                </div>
              </div>

              {/* Returning progress indicator */}
              {passedTopicsCount > 0 && (
                <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]">
                  <CheckCircle2 className="w-4 h-4 text-[#0284c7] shrink-0" />
                  <span>
                    {passedTopicsCount} of {TOPICS.length} topics passed
                  </span>
                  <span className="text-[#0284c7]">•</span>
                  <span>Next up: {nextOpenTopic.title}</span>
                </div>
              )}

              {/* Big Glowing Vivid Blue START Button */}
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleStartClick}
                  disabled={isLeaving}
                  className="start-btn-pulse group relative inline-flex items-center justify-center gap-3 px-12 sm:px-14 py-4 sm:py-4.5 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] active:scale-[0.98] text-white font-display text-xl sm:text-2xl font-bold tracking-wide shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer disabled:opacity-75"
                >
                  <Play className="w-6 h-6 fill-current group-hover:translate-x-0.5 transition-transform" />
                  <span>
                    {passedTopicsCount > 0 ? 'CONTINUE' : 'START'}
                  </span>
                </button>
              </div>

              {/* Crisp Secondary Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setHowToPlayOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <HelpCircle className="w-4 h-4 text-[#0284c7]" />
                  <span>How to Play</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenLibrary}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <BookOpen className="w-4 h-4 text-[#0284c7]" />
                  <span>Compound Library</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Settings className="w-4 h-4 text-[#0284c7]" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenTeacher}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ffffff] hover:bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56] text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <GraduationCap className="w-4 h-4 text-[#0284c7]" />
                  <span>{isTeacher ? 'Teacher Dashboard' : 'Teacher Login'}</span>
                </button>
              </div>
            </div>

            {/* Whiteboard marker tray */}
            <div className="mt-1.5 flex items-center justify-center gap-3">
              <div className="w-12 h-2 rounded-full bg-sky-500/85" />
              <div className="w-10 h-2 rounded-full bg-teal-500/80" />
              <div className="w-14 h-2.5 rounded-md bg-[#e8d5b9]" />
            </div>
          </div>
        </div>
      </main>

      {/* Subtle footer spacer above classroom desks */}
      <div className="relative z-10 h-6" />

      {/* How to Play Modal */}
      {howToPlayOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs"
          onClick={() => setHowToPlayOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="How to Play"
        >
          <div
            className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-2xl p-6 sm:p-7 space-y-5 text-[#1f3a56]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#dbe9f4] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#0284c7]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h2 className="font-display text-xl font-bold text-[#1f3a56]">How to Play</h2>
              </div>
              <button
                type="button"
                onClick={() => setHowToPlayOpen(false)}
                className="p-2 rounded-xl hover:bg-[#f4f9fe] text-[#3b5775] cursor-pointer"
                aria-label="Close How to Play"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-[#1f3a56]">
              {[
                {
                  step: '1',
                  title: 'Study the Built-In Compound Library',
                  body: 'All naming rules, worked examples, Periodic Table cards, and interactive tools work anytime—even offline.',
                },
                {
                  step: '2',
                  title: 'Start Right Away — No Sign-In Required',
                  body: 'Begin Topic 1 (Ionic Compounds) immediately as a guest, or sign in with Google so your teacher can view your progress.',
                },
                {
                  step: '3',
                  title: 'Pass with 75%+ to Unlock Tomorrow',
                  body: 'Score 75%+ to pass a topic and unlock the next topic at 12:00 AM the next day. Need more tries? Review a guide and retry anytime!',
                },
                {
                  step: '4',
                  title: 'Use Your Interactive Tools',
                  body: 'Ask Doctor Nomen, test charge balancing in the Criss-Cross Builder, or solve unknown charges with the Oxidation Solver.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-4 rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] flex items-start gap-3"
                >
                  <span className="w-7 h-7 rounded-full bg-[#0284c7] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#1f3a56]">{item.title}</div>
                    <p className="text-xs text-[#3b5775] leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setHowToPlayOpen(false);
                  onStartTopics();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Go to Topics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
