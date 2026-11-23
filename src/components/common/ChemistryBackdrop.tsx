import React, { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface OrbitAtomProps {
  className: string;
  size: number;
  ringColor: string;
  coreColor: string;
  electronColor: string;
  opacity?: number;
  durationSec?: number;
  reverse?: boolean;
}

const OrbitAtom: React.FC<OrbitAtomProps> = ({
  className,
  size,
  ringColor,
  coreColor,
  electronColor,
  opacity = 0.34,
  durationSec = 18,
  reverse = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 160 160"
    fill="none"
    className={className}
    style={{ opacity }}
  >
    <g transform="rotate(24 80 80)">
      <ellipse cx="80" cy="80" rx="62" ry="24" stroke={ringColor} strokeWidth="2.2" />
      <g
        className={reverse ? 'chem-orbit-ccw' : 'chem-orbit-cw'}
        style={{
          transformOrigin: '80px 80px',
          animationDuration: `${durationSec}s`,
        }}
      >
        <circle cx="142" cy="80" r="5" fill={electronColor} />
        <circle cx="18" cy="80" r="3.8" fill={electronColor} opacity="0.75" />
      </g>
    </g>

    <g transform="rotate(-36 80 80)">
      <ellipse cx="80" cy="80" rx="62" ry="24" stroke={ringColor} strokeWidth="2.2" />
      <g
        className={reverse ? 'chem-orbit-cw' : 'chem-orbit-ccw'}
        style={{
          transformOrigin: '80px 80px',
          animationDuration: `${Math.round(durationSec * 1.25)}s`,
        }}
      >
        <circle cx="80" cy="56" r="4.8" fill={electronColor} />
        <circle cx="80" cy="104" r="3.6" fill={electronColor} opacity="0.75" />
      </g>
    </g>

    <g transform="rotate(86 80 80)">
      <ellipse
        cx="80"
        cy="80"
        rx="60"
        ry="22"
        stroke={ringColor}
        strokeWidth="1.9"
        strokeDasharray="6 4"
      />
      <g
        className={reverse ? 'chem-orbit-ccw' : 'chem-orbit-cw'}
        style={{
          transformOrigin: '80px 80px',
          animationDuration: `${Math.round(durationSec * 0.85)}s`,
        }}
      >
        <circle cx="140" cy="80" r="4.4" fill={electronColor} />
      </g>
    </g>

    <circle cx="80" cy="80" r="14" fill={coreColor} opacity="0.35" />
    <circle cx="76" cy="77" r="6" fill={coreColor} />
    <circle cx="84" cy="79" r="5.5" fill={electronColor} />
    <circle cx="79" cy="85" r="5.5" fill={coreColor} />
  </svg>
);

const FLOATING_SYMBOLS = [
  {
    text: 'H',
    sub: '1',
    positionClass: 'top-[14%] left-[4%] sm:left-[7%]',
    colorClass: 'text-sky-700 border-[#dbe9f4] bg-[#ffffff]/80',
    animClass: 'chem-float-a',
    delay: '0s',
    opacity: 0.32,
  },
  {
    text: 'O',
    sub: '8',
    positionClass: 'top-[22%] right-[5%] sm:right-[9%]',
    colorClass: 'text-teal-700 border-[#dbe9f4] bg-[#ffffff]/80',
    animClass: 'chem-float-b',
    delay: '-2s',
    opacity: 0.3,
  },
  {
    text: 'Na',
    sub: '11',
    positionClass: 'top-[48%] left-[2%] sm:left-[5%]',
    colorClass: 'text-blue-700 border-[#dbe9f4] bg-[#ffffff]/80',
    animClass: 'chem-float-b',
    delay: '-4s',
    opacity: 0.28,
  },
  {
    text: 'Cl',
    sub: '17',
    positionClass: 'top-[54%] right-[3%] sm:right-[6%]',
    colorClass: 'text-cyan-700 border-[#dbe9f4] bg-[#ffffff]/80',
    animClass: 'chem-float-a',
    delay: '-1.5s',
    opacity: 0.3,
  },
  {
    text: 'Ca',
    sub: '20',
    positionClass: 'bottom-[18%] left-[6%] sm:left-[12%]',
    colorClass: 'text-indigo-700 border-[#dbe9f4] bg-[#ffffff]/80',
    animClass: 'chem-float-a',
    delay: '-3.2s',
    opacity: 0.26,
  },
  {
    text: 'Fe',
    sub: '26',
    positionClass: 'bottom-[15%] right-[6%] sm:right-[14%]',
    colorClass: 'text-sky-700 border-[#dbe9f4] bg-[#ffffff]/80',
    animClass: 'chem-float-b',
    delay: '-5s',
    opacity: 0.28,
  },
];

const FLOATING_FORMULAS = [
  {
    parts: [{ text: 'H' }, { text: '2', isSub: true }, { text: 'O' }],
    positionClass: 'top-[12%] left-[22%] sm:left-[26%]',
    colorClass: 'text-sky-700',
    animClass: 'chem-float-b',
    delay: '-0.8s',
    opacity: 0.32,
  },
  {
    parts: [{ text: 'NaCl' }],
    positionClass: 'top-[16%] right-[20%] sm:right-[25%]',
    colorClass: 'text-teal-700',
    animClass: 'chem-float-a',
    delay: '-2.3s',
    opacity: 0.3,
  },
  {
    parts: [{ text: 'CO' }, { text: '2', isSub: true }],
    positionClass: 'top-[64%] left-[5%] sm:left-[10%]',
    colorClass: 'text-blue-700',
    animClass: 'chem-float-a',
    delay: '-4.2s',
    opacity: 0.28,
  },
  {
    parts: [{ text: 'CaSO' }, { text: '4', isSub: true }],
    positionClass: 'top-[40%] right-[4%] sm:right-[8%]',
    colorClass: 'text-cyan-700',
    animClass: 'chem-float-b',
    delay: '-3.1s',
    opacity: 0.28,
  },
  {
    parts: [{ text: 'HNO' }, { text: '3', isSub: true }],
    positionClass: 'bottom-[8%] left-[24%] sm:left-[30%]',
    colorClass: 'text-sky-700',
    animClass: 'chem-float-b',
    delay: '-1.8s',
    opacity: 0.28,
  },
  {
    parts: [{ text: 'Fe' }, { text: '2', isSub: true }, { text: 'O' }, { text: '3', isSub: true }],
    positionClass: 'bottom-[9%] right-[22%] sm:right-[28%]',
    colorClass: 'text-teal-700',
    animClass: 'chem-float-a',
    delay: '-4.6s',
    opacity: 0.26,
  },
];

export const ChemistryBackdrop: React.FC = () => {
  const { settings } = useSettings();
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );
  const [tabHidden, setTabHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisChange = () => {
      const hidden = document.visibilityState === 'hidden';
      setTabHidden(hidden);
      document.documentElement.classList.toggle('animations-paused', hidden);
    };
    onVisChange();
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      document.documentElement.classList.remove('animations-paused');
    };
  }, []);

  const gradientClass =
    settings.theme === 'cream'
      ? 'bg-gradient-to-br from-[#fdfcf9] via-[#f9f8f3] to-[#f2f6fb]'
      : settings.theme === 'mint'
        ? 'bg-gradient-to-br from-[#f8fcfb] via-[#f2faf8] to-[#e9f5f9]'
        : 'bg-gradient-to-br from-[#fbfdff] via-[#f5faff] to-[#eef6fd]';

  // Strictly cap animated elements to max 12 on mobile (2 atoms + 5 symbols + 5 formulas = 12)
  const visibleSymbols = isMobile ? FLOATING_SYMBOLS.slice(0, 5) : FLOATING_SYMBOLS;
  const visibleFormulas = isMobile ? FLOATING_FORMULAS.slice(0, 5) : FLOATING_FORMULAS;

  return (
    <div
      aria-hidden="true"
      data-testid="chemistry-backdrop"
      data-paused={tabHidden ? 'true' : 'false'}
      className={`pointer-events-none select-none fixed inset-0 z-0 overflow-hidden ${gradientClass} transition-colors duration-300`}
    >
      {/* Subtle light ambient glows */}
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-sky-200/20 blur-3xl" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-cyan-100/25 blur-3xl" />
      <div className="absolute -bottom-28 left-1/4 w-96 h-96 rounded-full bg-blue-100/20 blur-3xl" />

      {/* Moving Bohr Atoms with Orbiting Electrons (capped at 2 on mobile) */}
      <OrbitAtom
        className="absolute -top-6 -left-6 sm:top-6 sm:left-4 w-40 h-40 sm:w-52 sm:h-52 chem-float-a"
        size={200}
        ringColor="#0284c7"
        coreColor="#0369a1"
        electronColor="#0d9488"
        opacity={0.28}
        durationSec={16}
      />

      <OrbitAtom
        className="absolute bottom-6 -right-8 sm:top-20 sm:right-4 w-36 h-36 sm:w-48 sm:h-48 chem-float-b"
        size={185}
        ringColor="#0d9488"
        coreColor="#0284c7"
        electronColor="#38bdf8"
        opacity={0.26}
        durationSec={20}
        reverse
      />

      {!isMobile && (
        <>
          <OrbitAtom
            className="hidden sm:block absolute bottom-10 -left-10 lg:left-6 w-44 h-44 chem-float-b"
            size={175}
            ringColor="#3b82f6"
            coreColor="#2563eb"
            electronColor="#14b8a6"
            opacity={0.24}
            durationSec={22}
          />
          <OrbitAtom
            className="hidden sm:block absolute bottom-12 right-6 w-44 h-44 chem-float-a"
            size={175}
            ringColor="#0284c7"
            coreColor="#0d9488"
            electronColor="#60a5fa"
            opacity={0.25}
            durationSec={18}
            reverse
          />
        </>
      )}

      {/* Floating Element Tiles */}
      {visibleSymbols.map((sym) => (
        <div
          key={sym.text}
          data-backdrop-item="symbol"
          style={{ opacity: sym.opacity, animationDelay: sym.delay }}
          className={`absolute ${sym.positionClass} ${sym.animClass} w-10 h-10 sm:w-12 sm:h-12 rounded-xl border backdrop-blur-[1px] flex flex-col items-center justify-center font-mono ${sym.colorClass}`}
        >
          {sym.sub && (
            <span className="text-[8px] sm:text-[9px] font-bold leading-none opacity-80">
              {sym.sub}
            </span>
          )}
          <span className="text-sm sm:text-base font-extrabold leading-tight">{sym.text}</span>
        </div>
      ))}

      {/* Floating Chemical Formulas */}
      {visibleFormulas.map((f, idx) => (
        <div
          key={idx}
          data-backdrop-item="formula"
          style={{ opacity: f.opacity, animationDelay: f.delay }}
          className={`absolute ${f.positionClass} ${f.animClass} font-mono font-extrabold text-sm sm:text-lg tracking-tight ${f.colorClass}`}
        >
          {f.parts.map((p, pIdx) =>
            p.isSub ? (
              <sub key={pIdx} className="text-[0.72em] align-sub">
                {p.text}
              </sub>
            ) : (
              <span key={pIdx}>{p.text}</span>
            )
          )}
        </div>
      ))}
    </div>
  );
};
