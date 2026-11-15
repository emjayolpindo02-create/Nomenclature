import React from 'react';
import { ELEMENT_MAP } from '../../data/elements';
import { useSettings } from '../../context/SettingsContext';
import { ChemicalElement } from '../../types/chemistry';

interface FormulaRendererProps {
  formula: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onSelectElement?: (element: ChemicalElement) => void;
  className?: string;
  interactive?: boolean;
}

export const FormulaRenderer: React.FC<FormulaRendererProps> = ({
  formula,
  size = 'md',
  onSelectElement,
  className = '',
  interactive = true,
}) => {
  const { settings } = useSettings();

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base font-semibold',
    lg: 'text-xl font-bold',
    xl: 'text-3xl font-extrabold tracking-tight',
  };

  // Tokenize formula into elements, numbers, parentheses, charges
  // e.g. "Ca3(PO4)2" -> ["Ca", "3", "(", "P", "O", "4", ")", "2"]
  const regex = /([A-Z][a-z]?|\d+|\(|\)|\+|\-)/g;
  const tokens = formula.match(regex) || [formula];

  return (
    <span className={`inline-flex items-baseline font-mono select-text ${sizeStyles[size]} ${className}`}>
      {tokens.map((token, idx) => {
        const isElement = ELEMENT_MAP.has(token);
        const isDigit = /^\d+$/.test(token);
        const element = isElement ? ELEMENT_MAP.get(token) : null;

        if (isDigit) {
          if (settings.realSubscripts) {
            return (
              <sub key={idx} className="text-[0.75em] bottom-[-0.2em] relative font-bold text-inherit">
                {token}
              </sub>
            );
          }
          return (
            <span key={idx} className="font-bold opacity-90">
              {token}
            </span>
          );
        }

        if (isElement && element) {
          if (interactive && onSelectElement) {
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(element);
                }}
                className="hover:text-blue-500 hover:underline decoration-blue-500/50 cursor-pointer transition-colors p-0 font-bold"
                title={`Click to view ${element.name} (${element.number})`}
                aria-label={`Inspect ${element.name}`}
              >
                {token}
              </button>
            );
          }
          return (
            <span key={idx} className="font-bold">
              {token}
            </span>
          );
        }

        return <span key={idx}>{token}</span>;
      })}
    </span>
  );
};
