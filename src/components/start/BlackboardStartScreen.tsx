import React from 'react';
import { Sliders, Subtitles, Volume2, VolumeX } from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { AnimatedGuideCanvas } from '../guide/AnimatedGuideCanvas';

interface BlackboardStartScreenProps {
  onStart: () => void;
  onOpenSettings: () => void;
  skipNextTime: boolean;
  onToggleSkipNextTime: (skip: boolean) => void;
  isWiping: boolean;
  reduceMotion: boolean;
}

export const WELCOME_ANNOUNCER_LINE =
  "Welcome to I-LAB, Compound Naming Guide! Let's master those chemical formulas, one rule at a time!";

export const BlackboardStartScreen: React.FC<BlackboardStartScreenProps> = ({
  onStart,
  onOpenSettings,
  skipNextTime,
  onToggleSkipNextTime,
  isWiping,
  reduceMotion,
}) => {
  const { guideSettings, updateGuideSettings } = useGuide();

  const voiceActive = guideSettings.voiceEnabled && !guideSettings.muted;
  const captionsActive = guideSettings.captionsEnabled;

  const chalkNoiseTileUrl = React.useMemo(() => {
    let dots = '';
    for (let i = 0; i < 160; i++) {
      const x = (i * 73 + 19) % 160;
      const y = (i * 137 + 41) % 160;
      const op = i % 3 === 0 ? '0.28' : i % 2 === 0 ? '0.16' : '0.1';
      dots += `%3Crect x='${x}' y='${y}' width='1.5' height='1.5' fill='%23eef6ef' opacity='${op}'/%3E`;
    }
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E${dots}%3C/svg%3E")`;
  }, []);

  return (
    <div
      data-testid="blackboard-front-page"
      className={`fixed inset-0 z-50 flex flex-col select-none ${
        isWiping ? 'pointer-events-none' : ''
      }`}
      role="region"
      aria-label="I-LAB Classroom Blackboard Welcome Screen"
    >
      {/* Animated chalk-eraser sweep head during exit transition */}
      {isWiping && !reduceMotion && (
        <div
          aria-hidden="true"
          className="chalk-eraser-sweep-head fixed inset-y-0 left-0 z-[60] w-24 pointer-events-none flex items-center justify-center"
        >
          {/* Soft chalk-dust cloud trailing behind the eraser */}
          <div
            className="w-20 h-full opacity-80"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(248, 250, 232, 0.28) 45%, rgba(254, 249, 195, 0.55) 85%, transparent 100%)',
              filter: 'blur(8px)',
            }}
          />
          {/* Felt blackboard eraser bar */}
          <svg
            viewBox="0 0 48 160"
            className="w-10 h-36 -ml-10 drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)]"
          >
            <rect x="6" y="8" width="14" height="144" rx="4" fill="#d8cfc0" />
            <rect x="20" y="6" width="22" height="148" rx="5" fill="#7c4d28" stroke="#4a2b13" strokeWidth="2" />
            <line x1="27" y1="16" x2="27" y2="144" stroke="#9b663b" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Wooden classroom blackboard frame */}
      <div
        className={`flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 md:p-5 blackboard-wood-frame ${
          isWiping && !reduceMotion ? 'chalk-eraser-wipe-panel' : ''
        }`}
      >
        {/* Dark green-black slate surface */}
        <div className="relative flex-1 min-h-0 flex flex-col justify-between overflow-y-auto overflow-x-hidden rounded-[6px] blackboard-slate border-2 border-[#050d09]/90">
          {/* Subtle CSS + inline SVG tiled noise chalk texture (zero image files, cached once) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.11]"
            style={{
              backgroundImage: chalkNoiseTileUrl,
              backgroundRepeat: 'repeat',
              backgroundSize: '180px 180px',
            }}
          />

          {/* Faint chalk-eraser smudges along upper-left and lower-right slate */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-10 left-8 w-52 h-24 rounded-full opacity-25 -rotate-6"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(242,248,242,0.18) 0%, rgba(242,248,242,0.05) 55%, transparent 78%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-16 right-10 w-60 h-28 rounded-full opacity-20 rotate-12"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(254,249,195,0.14) 0%, rgba(242,248,242,0.03) 55%, transparent 78%)',
            }}
          />

          {/* Faint inline SVG chalk doodles kept strictly in perimeter margins so text stays 100% legible (desktop/tablet) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1200 760"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none hidden sm:block absolute inset-0 w-full h-full"
          >
            <g
              className="font-chalk"
              stroke="#eef6ef"
              fill="#eef6ef"
              opacity="0.24"
            >
              {/* Top-left Bohr atom doodle */}
              <g transform="translate(115, 118)">
                <circle cx="0" cy="0" r="6" fill="#fef08a" stroke="none" />
                <ellipse cx="0" cy="0" rx="46" ry="17" fill="none" strokeWidth="1.9" transform="rotate(28)" />
                <ellipse cx="0" cy="0" rx="46" ry="17" fill="none" strokeWidth="1.9" transform="rotate(-32)" />
                <ellipse cx="0" cy="0" rx="46" ry="17" fill="none" strokeWidth="1.9" transform="rotate(88)" />
                <circle cx="38" cy="-12" r="3" stroke="none" />
                <circle cx="-32" cy="18" r="3" stroke="none" />
              </g>

              {/* Top-left formulas: H2O -> NaCl */}
              <text x="64" y="222" fontSize="28" stroke="none" letterSpacing="1">
                H<tspan dy="6" fontSize="19">2</tspan>
                <tspan dy="-6">O</tspan>
              </text>
              <path d="M 136 212 L 178 212 M 170 205 L 180 212 L 170 219" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <text x="68" y="294" fontSize="25" stroke="none" fill="#fef08a">
                NaCl
              </text>

              {/* Bottom-left chalk beaker & Fe2O3 */}
              <g transform="translate(88, 520)">
                <path
                  d="M 18 0 L 42 0 M 22 0 L 22 24 L 4 68 Q 1 76 10 76 L 50 76 Q 59 76 56 68 L 38 24 L 38 0"
                  fill="none"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M 11 52 Q 30 46 49 52" fill="none" strokeWidth="1.7" strokeDasharray="4 3" />
                <circle cx="24" cy="40" r="2.2" fill="none" strokeWidth="1.5" />
                <circle cx="34" cy="33" r="1.8" fill="none" strokeWidth="1.5" />
              </g>
              <text x="58" y="655" fontSize="26" stroke="none">
                Fe<tspan dy="6" fontSize="18">2</tspan>
                <tspan dy="-6">O</tspan>
                <tspan dy="6" fontSize="18">3</tspan>
              </text>

              {/* Top-right CO2 & HNO3 */}
              <text x="1012" y="112" fontSize="29" stroke="none">
                CO<tspan dy="6" fontSize="20">2</tspan>
              </text>
              <text x="1028" y="184" fontSize="27" stroke="none" fill="#fef08a">
                HNO<tspan dy="6" fontSize="19">3</tspan>
              </text>

              {/* Reversible equilibrium arrows */}
              <g transform="translate(1038, 224)" fill="none" strokeWidth="2" strokeLinecap="round">
                <path d="M 0 6 L 58 6 L 50 0" />
                <path d="M 58 16 L 0 16 L 8 22" />
              </g>

              {/* Bottom-right small periodic table fragment */}
              <g transform="translate(996, 515)">
                <rect x="0" y="0" width="54" height="54" rx="3" fill="none" strokeWidth="1.8" />
                <text x="8" y="16" fontSize="11" stroke="none">1</text>
                <text x="18" y="40" fontSize="21" stroke="none">H</text>

                <rect x="60" y="0" width="54" height="54" rx="3" fill="none" strokeWidth="1.8" />
                <text x="68" y="16" fontSize="11" stroke="none">6</text>
                <text x="77" y="40" fontSize="21" stroke="none">C</text>

                <rect x="0" y="60" width="54" height="54" rx="3" fill="none" strokeWidth="1.8" />
                <text x="8" y="76" fontSize="11" stroke="none">7</text>
                <text x="18" y="100" fontSize="21" stroke="none">N</text>

                <rect x="60" y="60" width="54" height="54" rx="3" fill="none" strokeWidth="1.8" />
                <text x="68" y="76" fontSize="11" stroke="none">8</text>
                <text x="76" y="100" fontSize="21" stroke="none" fill="#fef08a">O</text>
              </g>
            </g>
          </svg>

          {/* Compact mobile corner chalk doodles strictly outside center chalk frame */}
          <svg
            aria-hidden="true"
            viewBox="0 0 390 800"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none sm:hidden absolute inset-0 w-full h-full"
          >
            <g className="font-chalk" stroke="#eef6ef" fill="#eef6ef" opacity="0.22">
              <g transform="translate(52, 54)">
                <circle cx="0" cy="0" r="3.5" fill="#fef08a" stroke="none" />
                <ellipse cx="0" cy="0" rx="26" ry="10" fill="none" strokeWidth="1.5" transform="rotate(28)" />
                <ellipse cx="0" cy="0" rx="26" ry="10" fill="none" strokeWidth="1.5" transform="rotate(-32)" />
                <ellipse cx="0" cy="0" rx="26" ry="10" fill="none" strokeWidth="1.5" transform="rotate(88)" />
              </g>
              <text x="112" y="62" fontSize="19" stroke="none">
                H<tspan dy="4" fontSize="13">2</tspan><tspan dy="-4">O</tspan>
              </text>
              <text x="275" y="56" fontSize="19" stroke="none" fill="#fef08a">
                CO<tspan dy="4" fontSize="13">2</tspan>
              </text>
              <text x="28" y="718" fontSize="18" stroke="none">
                NaCl
              </text>
              <text x="148" y="720" fontSize="18" stroke="none" fill="#fef08a">
                HNO<tspan dy="4" fontSize="12">3</tspan>
              </text>
              <text x="292" y="718" fontSize="18" stroke="none">
                Fe<tspan dy="4" fontSize="12">2</tspan><tspan dy="-4">O</tspan><tspan dy="4" fontSize="12">3</tspan>
              </text>
            </g>
          </svg>

          {/* Top Spacer */}
          <div className="h-3 sm:h-5 shrink-0" />

          {/* Main Centered Blackboard Content inside a rough chalk-drawn frame */}
          <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 my-auto py-3">
            <div className="relative px-5 py-7 sm:px-10 sm:py-9 rounded-3xl">
              {/* Rough chalk-drawn rectangle outline */}
              <svg
                aria-hidden="true"
                viewBox="0 0 600 420"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 w-full h-full"
              >
                <rect
                  x="6"
                  y="6"
                  width="588"
                  height="408"
                  rx="24"
                  fill="none"
                  stroke="#f2f6ea"
                  strokeOpacity="0.34"
                  strokeWidth="2.5"
                  strokeDasharray="18 6 92 5 44 7"
                  strokeLinecap="round"
                />
                <rect
                  x="11"
                  y="11"
                  width="578"
                  height="398"
                  rx="20"
                  fill="none"
                  stroke="#fef08a"
                  strokeOpacity="0.16"
                  strokeWidth="1.4"
                  strokeDasharray="65 12 24 9"
                  strokeLinecap="round"
                />
              </svg>

              <div className="relative z-10 flex flex-col items-center text-center gap-4 sm:gap-5">
                {/* Small chalk-framed Doctor Nomen cameo (silent until user taps START) */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-1.5 rounded-full border-2 border-dashed border-[#f3f6ea]/55 bg-[#0a1911]/80 shadow-[0_0_16px_rgba(254,240,138,0.12)]">
                    <AnimatedGuideCanvas dimension={68} paused={false} />
                  </div>
                  <span className="font-chalk text-xs tracking-wide text-[#e5efe6]/90">
                    Doctor Nomen • Virtual Guide
                  </span>
                </div>

                {/* Big Chalk Lettering Title + Subtitle + Tagline */}
                <div className="space-y-1.5 sm:space-y-2">
                  <h1 className="font-chalk text-5xl sm:text-7xl font-bold tracking-wider text-[#f8faee] blackboard-chalk-text leading-none">
                    I-LAB
                  </h1>
                  <h2 className="font-chalk text-xl sm:text-3xl font-bold text-[#fef08a] blackboard-chalk-text">
                    Compound Naming Guide
                  </h2>
                  <p className="font-chalk text-sm sm:text-base text-[#e4efe7] max-w-md mx-auto leading-relaxed pt-0.5">
                    Learn to name and read chemical compounds, one rule at a time.
                  </p>
                </div>

                {/* Large Chalk-Styled START Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    data-testid="blackboard-start-btn"
                    onClick={onStart}
                    className={`group relative px-10 sm:px-14 py-3.5 sm:py-4 rounded-2xl border-2 border-[#fef08a]/85 bg-[#193b29]/70 hover:bg-[#214c35]/85 active:scale-[0.97] font-chalk text-2xl sm:text-3xl font-bold tracking-widest text-[#fef9c3] hover:text-white blackboard-chalk-text transition cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#fef08a]/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e2318] ${
                      reduceMotion ? '' : 'chalk-start-pulse'
                    }`}
                  >
                    START
                  </button>
                </div>

                {/* Small chalk-style controls directly under START (and nothing else) */}
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      data-testid="blackboard-voice-toggle"
                      aria-pressed={voiceActive}
                      onClick={() =>
                        updateGuideSettings({
                          voiceEnabled: !voiceActive,
                          muted: false,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-chalk tracking-wide transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fef08a]/75 ${
                        voiceActive
                          ? 'border-[#e6f2e8]/65 bg-[#1b3d2b]/75 text-[#f6f9ef] hover:bg-[#234d37]'
                          : 'border-[#e6f2e8]/30 bg-transparent text-[#b9ccc0] hover:border-[#e6f2e8]/50'
                      }`}
                    >
                      {voiceActive ? (
                        <Volume2 className="w-3.5 h-3.5 text-[#fef08a]" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-[#b9ccc0]" />
                      )}
                      <span>Voice: {voiceActive ? 'On' : 'Off'}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="blackboard-captions-toggle"
                      aria-pressed={captionsActive}
                      onClick={() =>
                        updateGuideSettings({
                          captionsEnabled: !captionsActive,
                        })
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-chalk tracking-wide transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fef08a]/75 ${
                        captionsActive
                          ? 'border-[#e6f2e8]/65 bg-[#1b3d2b]/75 text-[#f6f9ef] hover:bg-[#234d37]'
                          : 'border-[#e6f2e8]/30 bg-transparent text-[#b9ccc0] hover:border-[#e6f2e8]/50'
                      }`}
                    >
                      <Subtitles className="w-3.5 h-3.5 text-[#fef08a]" />
                      <span>Sound captions: {captionsActive ? 'On' : 'Off'}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="blackboard-settings-btn"
                      onClick={onOpenSettings}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e6f2e8]/50 bg-[#153122]/65 hover:bg-[#214732] text-[#f2f7ec] text-xs font-chalk tracking-wide transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fef08a]/75"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#fef08a]" />
                      <span>Settings</span>
                    </button>
                  </div>

                  {/* Skip front page next time checkbox */}
                  <label className="inline-flex items-center gap-2 text-xs font-chalk text-[#dbe8df]/90 hover:text-white cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      data-testid="blackboard-skip-checkbox"
                      checked={skipNextTime}
                      onChange={(e) => onToggleSkipNextTime(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#eab308] cursor-pointer"
                    />
                    <span>Skip front page next time</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Chalk Tray at the bottom with inline SVG piece of chalk and eraser */}
          <div className="relative z-10 shrink-0 pt-2">
            {/* Inline SVG chalk sticks & wooden felt eraser resting on tray */}
            <div className="max-w-3xl mx-auto px-8 flex items-end justify-between pointer-events-none -mb-[2px]">
              {/* Left side: two chalk pieces */}
              <svg
                aria-hidden="true"
                viewBox="0 0 120 24"
                className="w-24 sm:w-28 h-5 sm:h-6 drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]"
              >
                {/* White chalk stick */}
                <rect x="6" y="12" width="46" height="8" rx="3" fill="#f7f7f2" stroke="#d5d5c8" strokeWidth="1" />
                <ellipse cx="52" cy="16" rx="2" ry="4" fill="#e2e2d6" />
                {/* Pale yellow chalk stick tilted slightly */}
                <g transform="rotate(-4 86 15)">
                  <rect x="64" y="11" width="42" height="8" rx="3" fill="#fef08a" stroke="#e5d067" strokeWidth="1" />
                  <ellipse cx="106" cy="15" rx="2" ry="4" fill="#ecd86e" />
                </g>
              </svg>

              {/* Right side: blackboard felt eraser */}
              <svg
                aria-hidden="true"
                viewBox="0 0 110 28"
                className="w-20 sm:w-24 h-6 sm:h-7 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]"
              >
                {/* Felt pad bottom */}
                <rect x="10" y="16" width="84" height="9" rx="2" fill="#d9d4c7" stroke="#b5afa0" strokeWidth="1" />
                {/* Chalk dust smudge on felt */}
                <rect x="22" y="19" width="52" height="3" rx="1.5" fill="#f5f5ee" opacity="0.6" />
                {/* Wooden handle top */}
                <rect x="8" y="6" width="88" height="11" rx="3" fill="#7e4f2a" stroke="#4f2f16" strokeWidth="1.2" />
                <line x1="16" y1="10.5" x2="88" y2="10.5" stroke="#a26b3f" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>

            {/* Physical Chalk Tray Ledge */}
            <div
              aria-hidden="true"
              className="h-3 sm:h-3.5 w-full border-t border-[#b88b5a]/45"
              style={{
                background:
                  'linear-gradient(180deg, #7f512c 0%, #5b371b 60%, #3d220e 100%)',
                boxShadow: 'inset 0 2px 3px rgba(255,235,205,0.22)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
