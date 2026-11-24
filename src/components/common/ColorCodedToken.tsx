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
        return 'text-sky-700 font-semibold bg-sky-50 rounded border border-sky-300';
      case 'oxidation':
        return 'text-amber-700 font-bold bg-amber-50 rounded border border-amber-300';
      case 'ending':
        return 'text-emerald-700 font-semibold bg-emerald-50 rounded border border-emerald-300';
      case 'prefix':
        return 'text-purple-700 font-semibold bg-purple-50 rounded border border-purple-300';
      case 'neutral':
      default:
        return 'text-[#1f3a56]';
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
      className={`flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#ffffff] border border-[#dbe9f4] shadow-xs text-xs ${
        compact ? 'text-[11px] py-2' : ''
      }`}
      aria-label="Color Code Legend"
    >
      <span className="font-semibold text-[#1f3a56]">
        Legend:
      </span>
      <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-300 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Metal / Cation
      </span>
      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Oxidation #
      </span>
      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Nonmetal / Suffix
      </span>
      <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-300 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Prefix / Acid
      </span>
    </div>
  );
};
