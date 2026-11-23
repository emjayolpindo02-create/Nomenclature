import React, { useState } from 'react';
import { Layers, RotateCw, ChevronLeft, ChevronRight, Shuffle, Check, Compass } from 'lucide-react';
import { useGuide } from '../../context/GuideContext';

interface FlashCard {
  id: string;
  front: string;
  frontSub?: string;
  back: string;
  backDetail?: string;
  category: 'prefix' | 'latin-stem' | 'acid-ending' | 'polyatomic';
}

const CARDS: FlashCard[] = [
  // Prefixes
  { id: 'p-1', front: 'mono-', frontSub: 'Prefix for 1', back: '1 atom', backDetail: 'Never used on the first element. Drops "o" before oxide (e.g. carbon monoxide).', category: 'prefix' },
  { id: 'p-2', front: 'di-', frontSub: 'Prefix for 2', back: '2 atoms', backDetail: 'Does not drop vowel (e.g. carbon dioxide, dinitrogen).', category: 'prefix' },
  { id: 'p-3', front: 'tri-', frontSub: 'Prefix for 3', back: '3 atoms', backDetail: 'Does not drop vowel (e.g. sulfur trioxide, phosphorus trichloride).', category: 'prefix' },
  { id: 'p-4', front: 'tetra-', frontSub: 'Prefix for 4', back: '4 atoms', backDetail: 'Drops "a" before oxide: "tetroxide" (e.g. dinitrogen tetroxide).', category: 'prefix' },
  { id: 'p-5', front: 'penta-', frontSub: 'Prefix for 5', back: '5 atoms', backDetail: 'Drops "a" before oxide: "pentoxide" (e.g. dinitrogen pentoxide).', category: 'prefix' },
  { id: 'p-6', front: 'hexa-', frontSub: 'Prefix for 6', back: '6 atoms', backDetail: 'Drops "a" before oxide: "hexoxide" (e.g. sulfur hexafluoride).', category: 'prefix' },
  { id: 'p-7', front: 'hepta-', frontSub: 'Prefix for 7', back: '7 atoms', backDetail: 'Drops "a" before oxide: "heptoxide" (e.g. dichlorine heptoxide).', category: 'prefix' },
  { id: 'p-8', front: 'octa-', frontSub: 'Prefix for 8', back: '8 atoms', backDetail: 'Drops "a" before oxide: "octoxide".', category: 'prefix' },
  { id: 'p-9', front: 'nona-', frontSub: 'Prefix for 9', back: '9 atoms', backDetail: 'Drops "a" before oxide: "nonoxide".', category: 'prefix' },
  { id: 'p-10', front: 'deca-', frontSub: 'Prefix for 10', back: '10 atoms', backDetail: 'Drops "a" before oxide: "decoxide" (e.g. tetraphosphorus decoxide).', category: 'prefix' },

  // Latin Stems
  { id: 'l-1', front: 'Iron (Fe)', frontSub: 'Latin stem: Ferrum', back: 'Fe²⁺ = Ferrous (-ous: lower)\nFe³⁺ = Ferric (-ic: higher)', backDetail: 'Example: FeS ferrous sulfide, Fe₂S₃ ferric sulfide.', category: 'latin-stem' },
  { id: 'l-2', front: 'Copper (Cu)', frontSub: 'Latin stem: Cuprum', back: 'Cu⁺ = Cuprous (-ous: lower)\nCu²⁺ = Cupric (-ic: higher)', backDetail: 'Example: Cu₂O cuprous oxide, CuO cupric oxide.', category: 'latin-stem' },
  { id: 'l-3', front: 'Tin (Sn)', frontSub: 'Latin stem: Stannum', back: 'Sn²⁺ = Stannous (-ous: lower)\nSn⁴⁺ = Stannic (-ic: higher)', backDetail: 'Example: SnCl₂ stannous chloride, SnCl₄ stannic chloride.', category: 'latin-stem' },
  { id: 'l-4', front: 'Lead (Pb)', frontSub: 'Latin stem: Plumbum', back: 'Pb²⁺ = Plumbous (-ous: lower)\nPb⁴⁺ = Plumbic (-ic: higher)', backDetail: 'Example: Pb(NO₃)₂ plumbous nitrate, Pb(NO₃)₄ plumbic nitrate.', category: 'latin-stem' },
  { id: 'l-5', front: 'Mercury (Hg)', frontSub: 'Latin stem: Hydrargyrum', back: 'Hg⁺ = Mercurous (-ous: lower)\nHg²⁺ = Mercuric (-ic: higher)', backDetail: 'Example: Hg₂O mercurous oxide, HgO mercuric oxide.', category: 'latin-stem' },
  { id: 'l-6', front: 'Cobalt (Co)', frontSub: 'Variable transition metal', back: 'Co²⁺ = Cobaltous (lower)\nCo³⁺ = Cobaltic (higher)', backDetail: 'Example: CoCl₂ cobaltous chloride, CoCl₃ cobaltic chloride.', category: 'latin-stem' },
  { id: 'l-7', front: 'Manganese (Mn)', frontSub: 'Variable transition metal', back: 'Mn²⁺ = Manganous (lower)\nMn⁴⁺ = Manganic (higher)', backDetail: 'Example: MnO manganous oxide, MnO₂ manganic oxide.', category: 'latin-stem' },

  // Acid Endings
  { id: 'a-1', front: '-ite Anion', frontSub: 'Transformation in Ternary Acid', back: 'Becomes "-ous acid"', backDetail: 'Memory Mnemonic: "Give me the -ITE-OUS!" Example: nitrite (NO₂⁻) -> nitrous acid (HNO₂).', category: 'acid-ending' },
  { id: 'a-2', front: '-ate Anion', frontSub: 'Transformation in Ternary Acid', back: 'Becomes "-ic acid"', backDetail: 'Memory Mnemonic: "I ATE something ICky!" Example: nitrate (NO₃⁻) -> nitric acid (HNO₃).', category: 'acid-ending' },
  { id: 'a-3', front: 'hydro- ... -ic acid', frontSub: 'Binary Halogen Acids', back: 'Aqueous acid with NO oxygen', backDetail: 'Strictly for binary acids: HF (hydrofluoric), HCl (hydrochloric), HBr (hydrobromic), HI (hydroiodic).', category: 'acid-ending' },
  { id: 'a-4', front: 'H₂O', frontSub: 'Special Acid Exemption', back: 'Water (Neutral Molecule)', backDetail: 'Never named like an acid or as "dihydrogen monoxide acid" — pH 7 neutral liquid.', category: 'acid-ending' },

  // Polyatomic Ions
  { id: 'po-1', front: 'Nitrate vs Nitrite', frontSub: 'Oxyanion comparison', back: 'NO₃⁻ = Nitrate (-ate)\nNO₂⁻ = Nitrite (-ite)', backDetail: '-ate has one more oxygen than -ite with the same charge (-1).', category: 'polyatomic' },
  { id: 'po-2', front: 'Sulfate vs Sulfite', frontSub: 'Oxyanion comparison', back: 'SO₄²⁻ = Sulfate (-ate)\nSO₃²⁻ = Sulfite (-ite)', backDetail: 'Both carry a -2 charge; sulfate has 4 oxygens, sulfite has 3.', category: 'polyatomic' },
  { id: 'po-3', front: 'Phosphate (PO₄³⁻)', frontSub: 'Trivalent oxyanion', back: 'PO₄³⁻ = Phosphate', backDetail: 'Carries a -3 charge. Forms Ca₃(PO₄)₂ and H₃PO₄ (phosphoric acid).', category: 'polyatomic' },
  { id: 'po-4', front: 'Carbonate (CO₃²⁻)', frontSub: 'Divalent oxyanion', back: 'CO₃²⁻ = Carbonate', backDetail: 'Forms Na₂CO₃, CaCO₃, and H₂CO₃ (carbonic acid).', category: 'polyatomic' },
  { id: 'po-5', front: 'Ammonium (NH₄⁺)', frontSub: 'Polyatomic cation', back: 'NH₄⁺ = Ammonium (+1)', backDetail: 'The only common positive polyatomic ion in introductory inorganic nomenclature.', category: 'polyatomic' },
];

export const FlashCardsTool: React.FC = () => {
  const { startTour } = useGuide();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  const filteredCards =
    selectedCategory === 'all'
      ? CARDS
      : CARDS.filter((c) => c.category === selectedCategory);

  const activeCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const rand = Math.floor(Math.random() * filteredCards.length);
    setCurrentIndex(rand);
  };

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div
        data-guide-id="tool-header"
        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#ebf6ff] via-[#dff1ff] to-[#d8edff] border border-sky-300 shadow-[0_6px_22px_-6px_rgba(18,54,90,0.09)] flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-[#12365a] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0284c7]" />
            <span>Prefix &amp; Ending Flip Cards</span>
          </h2>
          <p className="mt-1 text-sm text-[#1e4b7a]">
            Review Greek prefixes, Latin metal stems, and acid endings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTour('flashcards')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-[#eff8ff] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer shadow-xs shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Guided Tour</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'All Decks' },
          { id: 'prefix', label: 'Greek Prefixes' },
          { id: 'latin-stem', label: 'Latin Metal Stems' },
          { id: 'acid-ending', label: 'Acid Suffixes' },
          { id: 'polyatomic', label: 'Polyatomic Ions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-[#0284c7] text-[#eff8ff] shadow-sm'
                : 'bg-[#ebf6ff] text-[#12365a] border border-sky-300 hover:bg-[#d8edff]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flashcard Component */}
      {activeCard && (
        <div data-guide-id="tool-workspace" className="space-y-4">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[260px] p-8 rounded-3xl bg-[#ebf6ff] border-2 border-sky-300 hover:border-[#0284c7] shadow-[0_12px_32px_-10px_rgba(18,54,90,0.12)] cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center relative select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIsFlipped(!isFlipped);
              }
            }}
            aria-label="Click to flip card"
          >
            {/* Top Bar on Card */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-[#1e4b7a]">
              <span className="font-mono">
                Card {currentIndex + 1} of {filteredCards.length}
              </span>
              <span className="flex items-center gap-1 text-[#0284c7] font-semibold">
                <RotateCw className="w-3.5 h-3.5" />
                Tap to Flip
              </span>
            </div>

            {/* Front of Card */}
            {!isFlipped ? (
              <div className="space-y-2 animate-in fade-in duration-150">
                <span className="font-display text-4xl font-bold text-[#12365a] tracking-tight">
                  {activeCard.front}
                </span>
                {activeCard.frontSub && (
                  <p className="text-sm font-medium text-[#1e4b7a]">
                    {activeCard.frontSub}
                  </p>
                )}
              </div>
            ) : (
              /* Back of Card */
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="text-2xl font-bold text-[#0284c7] whitespace-pre-line font-mono">
                  {activeCard.back}
                </div>
                {activeCard.backDetail && (
                  <p className="text-xs text-[#1e4b7a] max-w-md mx-auto leading-relaxed">
                    {activeCard.backDetail}
                  </p>
                )}
              </div>
            )}

            {/* Mastered Badge in Bottom Left */}
            <div className="absolute bottom-4 left-4">
              {masteredIds.has(activeCard.id) && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <Check className="w-3 h-3" /> Mastered
                </span>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrev}
              className="p-3 rounded-xl bg-[#ebf6ff] border border-sky-300 text-[#12365a] hover:bg-[#d8edff] transition cursor-pointer shadow-xs"
              aria-label="Previous card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMastered(activeCard.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  masteredIds.has(activeCard.id)
                    ? 'bg-emerald-600 text-[#eff8ff] border-emerald-600 shadow-sm'
                    : 'bg-[#d8edff] text-[#12365a] border-sky-300 hover:bg-[#c5e3fc]'
                }`}
              >
                {masteredIds.has(activeCard.id) ? '✓ Mastered' : 'Mark as Mastered'}
              </button>

              <button
                onClick={handleShuffle}
                className="p-2.5 rounded-xl bg-[#ebf6ff] border border-sky-300 text-[#12365a] hover:bg-[#d8edff] transition cursor-pointer"
                title="Shuffle Cards"
                aria-label="Shuffle cards"
              >
                <Shuffle className="w-4 h-4 text-[#0284c7]" />
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-3 rounded-xl bg-[#ebf6ff] border border-sky-300 text-[#12365a] hover:bg-[#d8edff] transition cursor-pointer shadow-xs"
              aria-label="Next card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
