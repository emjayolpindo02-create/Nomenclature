import React from 'react';
import { ColorPart } from '../../types/chemistry';

interface ColorCodedTokenProps {
  parts: ColorPart[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ColorCodedToken: React.FC<ColorCodedTokenProps> = ({
  parts,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-sm px-1 py-0.5',
    md: 'text-base px-1.5 py-0.5',
    lg: 'text-lg px-2 py-1',
    xl: 'text-2xl font-semibold px-2.5 py-1',
  };

  const getStyle = (type: ColorPart['type']) => {
    switch (type) {
      case 'metal':
        return 'text-sky-600 dark:text-sky-400 font-semibold bg-sky-50 dark:bg-sky-950/40 rounded border border-sky-300 dark:border-sky-800/60';
      case 'oxidation':
        return 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-300 dark:border-amber-800/60';
      case 'ending':
        return 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-300 dark:border-emerald-800/60';
      case 'prefix':
        return 'text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-300 dark:border-purple-800/60';
      case 'neutral':
      default:
        return 'text-slate-600 dark:text-slate-300';
    }
  };

  return (
    <span className={`inline-flex items-baseline flex-wrap gap-0.5 ${className}`}>
      {parts.map((p, idx) => {
        if (p.type === 'neutral') {
          return (
            <span key={idx} className={sizeClasses[size]}>
              {p.text}
            </span>
          );
        }
        return (
          <span
            key={idx}
            className={`${sizeClasses[size]} ${getStyle(p.type)} transition-colors duration-150 inline-block`}
          >
            {p.text}
          </span>
        );
      })}
    </span>
  );
};

export const ColorLegend: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs ${
        compact ? 'text-[11px] py-1.5' : ''
      }`}
      aria-label="Color Code Legend"
    >
      <span className="font-semibold text-slate-600 dark:text-slate-300">
        Legend:
      </span>
      <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Metal / Cation
      </span>
      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Oxidation #
      </span>
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Nonmetal / Suffix
      </span>
      <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-800 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Prefix / Acid
      </span>
    </div>
  );
};
