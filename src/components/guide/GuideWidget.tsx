import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Move,
  EyeOff,
  Send,
  Mic,
  Square,
  RotateCcw,
  Trash2,
  Compass,
  BookOpen,
  ChevronRight,
  SkipForward,
  Sliders,
  X,
  MessageCircle,
  Lock,
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { AnimatedGuideCanvas } from './AnimatedGuideCanvas';
import { formatCornerLabel, getSuggestedChipsForTab } from '../../data/guideKnowledge';
import { TourId } from '../../types/guide';
import { FormulaRenderer } from '../common/FormulaRenderer';
import { ColorCodedToken } from '../common/ColorCodedToken';

interface GuideWidgetProps {
  onOpenSettings: () => void;
  onNavigateToLibrary: (libraryId: string) => void;
}

export const GuideWidget: React.FC<GuideWidgetProps> = ({
  onOpenSettings,
  onNavigateToLibrary,
}) => {
  const {
    guideSettings,
    updateGuideSettings,
    chatHistory,
    clearChatHistory,
    visualState,
    activeCaptionText,
    activeWordIndex,
    hasOfflineVoice,
    speechRecognitionSupported,
    isListeningMic,
    startMicListening,
    stopMicListening,
    speakText,
    stopSpeaking,
    replayText,
    askGuide,
    activeTour,
    activeHighlightId,
    startTour,
    nextTourStep,
    repeatTourStep,
    skipTour,
    isMinimized,
    setIsMinimized,
    isMobileExpanded,
    setIsMobileExpanded,
    appSnapshot,
    cycleCorner,
    toggleSize,
  } = useGuide();

  const [input, setInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll chat to newest response smoothly
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory.length]);

  // Highlight active DOM element cleanly during tours
  useEffect(() => {
    if (!activeHighlightId) return;
    const el = document.querySelector(`[data-guide-id="${activeHighlightId}"]`) as HTMLElement | null;
    if (!el) return;

    el.setAttribute('data-guide-active', 'true');
    el.classList.add('guide-highlight-ring');
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      el.scrollIntoView();
    }

    return () => {
      el.removeAttribute('data-guide-active');
      el.classList.remove('guide-highlight-ring');
    };
  }, [activeHighlightId, appSnapshot.currentTab, appSnapshot.currentLibraryId]);

  const captionWords = useMemo(() => {
    if (!activeCaptionText) return [];
    return activeCaptionText.split(/\s+/).filter(Boolean);
  }, [activeCaptionText]);

  const suggestedChips = useMemo(
    () => getSuggestedChipsForTab(appSnapshot.currentTab, appSnapshot.currentLibraryId),
    [appSnapshot.currentTab, appSnapshot.currentLibraryId]
  );

  if (!guideSettings.guideEnabled) {
    return null;
  }

  const resolveTourForTab = (): TourId => {
    switch (appSnapshot.currentTab) {
      case 'periodic-table':
        return 'periodic-table';
      case 'crisscross':
        return 'crisscross';
      case 'oxidation-solver':
        return 'oxidation-solver';
      case 'flashcards':
        return 'flashcards';
      case 'converter':
        return 'converter';
      case 'wizard':
        return 'wizard';
      case 'practice':
        return 'practice';
      default:
        return 'library';
    }
  };

  const pillPositionClass =
    guideSettings.corner === 'bottom-left'
      ? 'bottom-4 left-4'
      : guideSettings.corner === 'top-right'
        ? 'top-20 right-4'
        : 'bottom-4 right-4';

  const desktopCornerClass =
    guideSettings.corner === 'bottom-left'
      ? 'md:bottom-4 md:left-4 md:top-auto md:right-auto'
      : guideSettings.corner === 'top-right'
        ? 'md:top-20 md:right-4 md:bottom-auto md:left-auto'
        : 'md:bottom-4 md:right-4 md:top-auto md:left-auto';

  const cardWidthClass =
    guideSettings.size === 'compact'
      ? 'md:w-76'
      : guideSettings.size === 'large'
        ? 'md:w-[400px]'
        : 'md:w-[348px]';

  const avatarSize =
    guideSettings.size === 'compact' ? 72 : guideSettings.size === 'large' ? 104 : 80;

  const isTalking = visualState === 'talking';

  // Minimized pill on desktop OR closed launcher button on mobile (<md)
  const renderLauncherPill = (visibilityClasses: string, onOpen: () => void) => (
    <div className={`fixed z-40 ${pillPositionClass} ${visibilityClasses}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open Virtual Guide"
        data-testid="virtual-guide-launcher"
        className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-[#ffffff] text-[#1f3a56] border border-[#dbe9f4] shadow-lg hover:bg-[#f4f9fe] transition cursor-pointer"
      >
        <AnimatedGuideCanvas dimension={38} paused={false} />
        <div className="text-left">
          <span className="font-display text-xs font-bold block leading-tight text-[#1f3a56]">Virtual Guide</span>
          <span className="text-[10px] text-[#0284c7] font-semibold block leading-tight">
            {isTalking ? 'Speaking...' : 'Ask or Tour'}
          </span>
        </div>
      </button>
    </div>
  );

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    askGuide(input);
    setInput('');
  };

  return (
    <>
      {/* Mobile collapsed launcher (keeps <= 15% sticky height when collapsed) */}
      {!isMobileExpanded && renderLauncherPill('md:hidden', () => setIsMobileExpanded(true))}

      {/* Desktop minimized bar */}
      {isMinimized && renderLauncherPill('hidden md:block', () => setIsMinimized(false))}

      {/* Expanded Guide Card (Side corner panel on desktop, bottom drawer on mobile) */}
      {(isMobileExpanded || !isMinimized) && (
        <aside
          aria-label="Interactive Virtual Guide"
          data-testid="virtual-guide-panel"
          className={`fixed z-40 ${
            isMobileExpanded ? 'inset-x-3 bottom-3' : 'hidden md:flex'
          } ${desktopCornerClass} ${
            isMinimized ? 'md:hidden' : 'md:flex'
          } ${cardWidthClass} max-h-[82vh] flex flex-col rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-xl overflow-hidden`}
        >
          {/* Header Stage with Animated Teacher Photo */}
          <div className="bg-[#f4f9fe] text-[#1f3a56] px-3 py-3 flex items-center gap-2.5 border-b border-[#dbe9f4]">
            <button
              type="button"
              onClick={() => (isTalking ? stopSpeaking() : speakText(activeCaptionText))}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] cursor-pointer shrink-0"
              aria-label={isTalking ? 'Stop speaking' : 'Replay guide speech'}
            >
              <AnimatedGuideCanvas dimension={avatarSize} paused={false} />
            </button>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <span className="font-display text-sm font-bold block leading-tight whitespace-nowrap text-[#1f3a56]">
                    Virtual Guide
                  </span>
                  <span
                    className="text-[11px] text-[#0284c7] font-semibold block leading-tight mt-0.5 whitespace-nowrap"
                    data-testid="virtual-guide-state"
                  >
                    {visualState === 'talking'
                      ? 'Speaking'
                      : visualState === 'listening'
                        ? 'Listening'
                        : visualState === 'thinking'
                          ? 'Thinking'
                          : 'Ready to help'}
                  </span>
                </div>

                {/* Window controls: Move, Resize, Mute, Minimize, Hide */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      updateGuideSettings({
                        muted: !guideSettings.muted,
                      })
                    }
                    className="p-1 rounded-lg text-[#3b5775] hover:text-[#0284c7] hover:bg-[#ffffff] cursor-pointer"
                    aria-label={guideSettings.muted ? 'Unmute guide voice' : 'Mute guide voice'}
                    title={guideSettings.muted ? 'Unmute voice' : 'Mute voice'}
                  >
                    {guideSettings.muted || !guideSettings.voiceEnabled ? (
                      <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={cycleCorner}
                    className="hidden md:inline-flex p-1 rounded-lg text-[#3b5775] hover:text-[#0284c7] hover:bg-[#ffffff] cursor-pointer"
                    aria-label={`Move guide corner (currently ${formatCornerLabel(guideSettings.corner)})`}
                    title={`Move corner (${formatCornerLabel(guideSettings.corner)})`}
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleSize}
                    className="hidden md:inline-flex p-1 rounded-lg text-[#3b5775] hover:text-[#0284c7] hover:bg-[#ffffff] cursor-pointer"
                    aria-label="Resize guide card"
                    title={`Size: ${guideSettings.size}`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMinimized(true);
                      setIsMobileExpanded(false);
                    }}
                    className="p-1 rounded-lg text-[#3b5775] hover:text-[#0284c7] hover:bg-[#ffffff] cursor-pointer"
                    aria-label="Minimize virtual guide"
                    title="Minimize"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      updateGuideSettings({ guideEnabled: false });
                    }}
                    className="p-1 rounded-lg text-[#3b5775] hover:text-rose-600 hover:bg-[#ffffff] cursor-pointer"
                    aria-label="Hide virtual guide"
                    title="Hide guide (re-enable in Settings)"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick action row: Start Tour / Settings */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => startTour(resolveTourForTab())}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  <span>Tour Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => startTour('signin-scores')}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#ffffff] hover:bg-[#eaf3fc] text-[#1f3a56] border border-[#dbe9f4] text-[11px] font-medium transition cursor-pointer"
                >
                  <span>Score Tour</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#ffffff] hover:bg-[#eaf3fc] text-[#1f3a56] border border-[#dbe9f4] text-[11px] font-medium transition cursor-pointer"
                  aria-label="Open guide voice and calibration settings"
                >
                  <Sliders className="w-3 h-3 text-[#0284c7]" />
                  <span>Options</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Guided Tour Stepper */}
          {activeTour && activeTour.steps[activeTour.stepIndex] && (
            <div className="px-3.5 py-2.5 bg-[#f4f9fe] border-b border-[#dbe9f4] space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#1f3a56] truncate">
                  Tour {activeTour.stepIndex + 1}/{activeTour.steps.length}:{' '}
                  {activeTour.steps[activeTour.stepIndex].title}
                </span>
                <button
                  type="button"
                  onClick={skipTour}
                  className="text-[#3b5775] hover:text-[#1f3a56] cursor-pointer"
                  aria-label="Close guided tour"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={nextTourStep}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold cursor-pointer"
                >
                  <span>
                    {activeTour.stepIndex + 1 >= activeTour.steps.length ? 'Finish' : 'Next'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={repeatTourStep}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#ffffff] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56] hover:bg-[#eaf3fc] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Repeat</span>
                </button>
                <button
                  type="button"
                  onClick={skipTour}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#3b5775] hover:bg-[#ffffff] cursor-pointer"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Captions Box with Active Word Highlight */}
          {guideSettings.captionsEnabled && (
            <div
              className="px-3.5 py-2.5 bg-[#f4f9fe] border-b border-[#dbe9f4] space-y-1.5"
              aria-live="polite"
              data-testid="virtual-guide-captions"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3b5775]">
                  Live Captions
                </span>
                <div className="flex items-center gap-1.5">
                  {isTalking ? (
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold cursor-pointer"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => replayText(activeCaptionText)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffffff] text-[#0284c7] border border-[#dbe9f4] text-[11px] font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Replay</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#1f3a56] max-h-20 overflow-y-auto">
                {captionWords.map((w, i) => (
                  <span
                    key={i}
                    className={
                      i === activeWordIndex && isTalking
                        ? 'bg-[#dbe9f4] text-[#1f3a56] font-semibold rounded px-0.5'
                        : ''
                    }
                  >
                    {w}{' '}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Practice Lockout Indicator */}
          {appSnapshot.practiceInProgress && !appSnapshot.isActiveQuestionSubmitted && (
            <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
              <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>Practice mode: Hints only until you check your answer.</span>
            </div>
          )}

          {/* Scrollable Local Chat & Answer History */}
          <div
            ref={chatScrollRef}
            className="flex-1 min-h-[120px] max-h-56 overflow-y-auto px-3.5 py-3 space-y-2.5 bg-[#ffffff]"
          >
            {chatHistory.length === 0 ? (
              <div className="text-xs text-[#3b5775] space-y-2">
                <p>Ask about a formula, compound name, element, or naming rule:</p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === 'user'
                      ? 'flex justify-end'
                      : 'rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] p-2.5 space-y-2 text-xs'
                  }
                >
                  {msg.role === 'user' ? (
                    <span className="max-w-[85%] px-3 py-1.5 rounded-xl bg-[#0284c7] text-white text-xs font-medium">
                      {msg.text}
                    </span>
                  ) : (
                    <>
                      <p className="text-[#1f3a56] leading-relaxed">{msg.text}</p>

                      {msg.formula && (
                        <div className="p-2 rounded-lg bg-[#ffffff] border border-[#dbe9f4] flex flex-wrap items-center justify-between gap-2">
                          <FormulaRenderer formula={msg.formula} size="md" />
                          {msg.parts ? (
                            <ColorCodedToken parts={msg.parts} size="sm" />
                          ) : (
                            msg.iupacName && (
                              <span className="font-bold text-[#1f3a56]">
                                {msg.iupacName}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {msg.steps && msg.steps.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#3b5775]">
                          {msg.steps.slice(0, 2).map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      )}

                      {msg.examples && msg.examples.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {msg.examples.map((ex, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#ffffff] border border-[#dbe9f4] text-[#1f3a56] font-medium"
                            >
                              {ex.formula}: {ex.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => replayText(msg.text)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0284c7] hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Replay</span>
                        </button>

                        {msg.libraryId && (
                          <button
                            type="button"
                            onClick={() => onNavigateToLibrary(msg.libraryId!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-semibold cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Open this library</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Contextual Chips & Clear Chat */}
          <div className="px-3.5 pb-2 pt-2 border-t border-[#dbe9f4] bg-[#ffffff] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1 flex-1">
                {suggestedChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => askGuide(chip)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f4f9fe] hover:bg-[#eaf3fc] border border-[#dbe9f4] text-[#1f3a56] text-[11px] font-medium transition cursor-pointer"
                  >
                    <MessageCircle className="w-2.5 h-2.5 text-[#0284c7] shrink-0" />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
              {chatHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearChatHistory}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#3b5775] hover:text-rose-600 cursor-pointer shrink-0"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear chat</span>
                </button>
              )}
            </div>

            {!hasOfflineVoice && guideSettings.voiceEnabled && (
              <p className="text-[10px] text-amber-800">
                No offline voices were detected on this device; live captions remain active.
              </p>
            )}

            {/* Offline Q&A Input Form */}
            <form onSubmit={handleSubmitQuestion} className="flex items-center gap-1.5 pt-1">
              {speechRecognitionSupported && (
                <button
                  type="button"
                  onClick={isListeningMic ? stopMicListening : startMicListening}
                  className={`p-2 rounded-xl text-white transition cursor-pointer shrink-0 ${
                    isListeningMic ? 'bg-rose-600 hover:bg-rose-500' : 'bg-[#0284c7] hover:bg-[#0369a1]'
                  }`}
                  aria-label={isListeningMic ? 'Stop voice input' : 'Ask by voice'}
                  title={isListeningMic ? 'Stop listening' : 'Ask by voice'}
                >
                  {isListeningMic ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a formula, name, or rule..."
                aria-label="Ask the virtual guide a question"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs text-[#1f3a56] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send question to guide"
                className="p-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-45 text-white transition cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <p className="text-[10px] text-[#526d88] leading-tight pt-0.5">
              Animated virtual assistant. All chemistry answers stay on this device.
            </p>
          </div>
        </aside>
      )}
    </>
  );
};
