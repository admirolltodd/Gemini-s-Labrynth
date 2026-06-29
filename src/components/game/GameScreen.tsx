import React, { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Skull,
  Save,
  Package,
  Zap,
  Send,
  Heart,
  Users,
  ChevronRight,
  MessageSquare,
  Loader2,
  Cpu,
  ChevronLeft,
  Check,
  BarChart2,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Stats } from "../../types/game";
import { processGameTurn, buildCampaignEntry } from "../../lib/gemini";
import InventoryPanel from "./InventoryPanel";
import CompanionPanel from "./CompanionPanel";
import SkillsPanel from "./SkillsPanel";

export default function GameScreen({ onBack }: { onBack?: () => void }) {
  const game = useGameStore();
  const { apiKey } = useSettingsStore();

  // Show NES-style intro for new games only (no history yet)
  const [showIntro, setShowIntro] = useState(() => game.history.length === 0);

  const [input, setInput] = useState("");
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [loyaltyMessage, setLoyaltyMessage] = useState<{ value: number; label: string } | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState("Consulting the Imperial Tarot...");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLoyalty = useRef(game.companion.loyalty);
  const initialActionsRan = useRef(false);

  const LOADING_PHRASES = [
    "Vox-casting orbital command...",
    "Scanning the horizon for drop pods...",
    "Awaiting macro-cannon barrage resolution...",
    "Appeasing the Machine Spirit...",
    "Analyzing tactical cogitator feeds...",
    "Surveying the war-torn gothic ruins...",
    "Translating Noospheric battle echoes...",
  ];

  // Derive the latest choices from history for the pinned panel
  const latestChoices = useMemo<Record<string, string> | null>(() => {
    for (let i = game.history.length - 1; i >= 0; i--) {
      if (game.history[i].role === "ai" && game.history[i].choices) {
        return game.history[i].choices as Record<string, string>;
      }
    }
    return null;
  }, [game.history]);

  const lastMsgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (isThinking) {
      // Reveal the Cogitator loader at the bottom while the GM thinks.
      if (el) el.scrollTop = el.scrollHeight;
    } else if (lastMsgRef.current) {
      // A new narrative arrived — bring its start into view so the player
      // reads top-down, then scrolls to the choices at the end.
      lastMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [game.history.length, isThinking]);

  useEffect(() => {
    if (!apiKey || initialActionsRan.current || showIntro) return;
    initialActionsRan.current = true;
    if (!game.portrait) generatePortrait();
    if (game.history.length === 0) {
      handleAction(
        "Describe my insertion into the active warzone. Establish an epic, vast scale with towering ruins, dramatic lighting over the battlefield, and the chaotic roar of war. Give me tactical options.",
        true,
      );
    } else {
      // Loaded game — brief the player on where they left off
      handleAction(
        "Provide a brief Cogitator Briefing: 2 sentences recapping recent events and current tactical situation. Then give me 4 fresh tactical options.",
        true,
      );
    }
  }, [apiKey, showIntro]);

  useEffect(() => {
    if (game.companion.loyalty !== prevLoyalty.current) {
      const diff = game.companion.loyalty - prevLoyalty.current;
      setLoyaltyMessage({
        value: diff,
        label: diff > 0 ? `Loyalty Gained (+${diff})` : `Loyalty Lost (${diff})`,
      });
      prevLoyalty.current = game.companion.loyalty;
      const timer = setTimeout(() => setLoyaltyMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [game.companion.loyalty]);

  const generatePortrait = async () => {
    try {
      setIsGeneratingPortrait(true);
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `A high-quality grimdark character portrait of a ${game.archetype} in the Warhammer 40,000 universe. Dark, gritty, oil painting style, dramatic lighting.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: [{ text: prompt }] },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          game.setGameState({ portrait: `data:image/png;base64,${part.inlineData.data}` });
          break;
        }
      }
    } catch {
      // non-critical
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const handleAction = async (action: string, silent = false) => {
    if (!action.trim() || isThinking) return;
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
    setIsThinking(true);
    setInput("");

    if (!silent && game.history.length > 0) game.addHistory({ role: "user", content: action });

    try {
      if (!apiKey) throw new Error("VOX-LINK FAILURE: No Gemini API Key. Open Settings to connect.");
      const result = await processGameTurn(apiKey, action, game);
      const updates = result.state_updates;

      const newChapter = updates.chapter_update || game.chapter;

      // Append a compact record of this decision to the persistent campaign
      // log (skip silent system prompts — only real player decisions count).
      const campaignLog = silent
        ? game.campaignLog
        : [
            ...game.campaignLog,
            buildCampaignEntry(game.campaignLog.length + 1, action, newChapter, result),
          ];

      game.setGameState({
        hp: {
          current: Math.max(0, Math.min(game.hp.max, game.hp.current + (updates.hp_change || 0))),
          max: game.hp.max,
        },
        xp: {
          total: game.xp.total + (updates.xp_gain || 0),
          unspent: game.xp.unspent + (updates.xp_gain || 0),
        },
        credits: game.credits + (updates.credits_change || 0),
        corruption: game.corruption + (updates.corruption_gain || 0),
        companion: {
          ...game.companion,
          loyalty: Math.max(0, Math.min(100, game.companion.loyalty + (updates.loyalty_change || 0))),
        },
        gear: [...game.gear, ...(updates.inventory_add || [])].filter(
          (item) => !(updates.inventory_remove || []).includes(item),
        ),
        chapter: newChapter,
        active_threats: updates.active_threats_update || game.active_threats,
        last_scene_summary: result.narrative,
        campaignLog,
      });

      game.addHistory({
        role: "ai",
        content: result.narrative,
        choices: result.choices,
        narrative: result.roll_log,
        dialogue: result.dialogue
          ? { speaker: result.dialogue_speaker, text: result.dialogue }
          : null,
      });
    } catch (error) {
      const errDetail = error instanceof Error ? error.message : String(error);
      game.addHistory({
        role: "ai",
        content:
          error instanceof Error && error.message.startsWith("VOX-LINK")
            ? error.message
            : `The Warp interferes with your connection. (${errDetail})`,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSave = async () => {
    const saveName = game.name || "Unnamed_Operative";
    try {
      await game.saveGame(saveName);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  const handleSaveAndExit = async () => {
    const saveName = game.name || "Unnamed_Operative";
    try {
      await game.saveGame(saveName);
    } catch (e) {
      console.error("Save failed:", e);
    }
    onBack?.();
  };

  const handleUseItem = async (itemName: string) => {
    if (itemName.toLowerCase().includes("medkit")) {
      game.setGameState({ hp: { current: Math.min(game.hp.max, game.hp.current + 4), max: game.hp.max } });
    }
    game.setGameState({ gear: game.gear.filter((i) => i !== itemName) });
    handleAction(`I use my ${itemName}.`);
    setIsInventoryOpen(false);
  };

  const handleCompanionInteract = () => {
    handleAction(`I consult with ${game.companion.name || "my companion"} for advice.`);
    setIsCompanionOpen(false);
  };

  const getLoyaltyStatus = (loyalty: number) => {
    if (loyalty >= 80) return "Devoted";
    if (loyalty >= 60) return "Loyal";
    if (loyalty >= 40) return "Neutral";
    if (loyalty >= 20) return "Disgruntled";
    return "Insubordinate";
  };

  const operativeName = game.name || "OPERATIVE";

  const hpPercent = game.hp.max > 0 ? (game.hp.current / game.hp.max) * 100 : 0;
  const hpColor =
    hpPercent > 60 ? "text-primary" : hpPercent > 30 ? "text-amber-500" : "text-destructive";

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">

      {/* Moral atmosphere — the screen darkens with corruption/low loyalty,
          warms with the Emperor's grace (high loyalty + clean conscience). */}
      <MoralAtmosphere corruption={game.corruption} loyalty={game.companion.loyalty} hasCompanion={!!game.companion.name} />

      {/* ── Top Bar ── */}
      <div className="h-12 border-b border-border flex items-center justify-between px-3 sm:px-6 bg-card/30 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground -ml-1 mr-1"
            >
              <ChevronLeft size={16} />
            </Button>
          )}
          <Skull className="text-primary w-4 h-4 shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-bold parchment-text truncate">
            {game.chapter || "Chapter I: The Awakening"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className={cn(
              "h-7 gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
              isSaved
                ? "border-primary bg-primary/10 text-primary"
                : "border-primary/30 hover:bg-primary/10"
            )}
          >
            {isSaved ? <Check size={12} /> : <Save size={12} />}
            <span className="hidden sm:inline">{isSaved ? "Saved!" : "Save"}</span>
          </Button>
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAndExit}
              className="h-7 gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-widest border-border/60 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Save &amp; Exit</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Narrative Scroll ── */}
      <div className="flex-1 flex overflow-hidden bg-card/70 backdrop-blur-md min-h-0">
        <ScrollArea ref={scrollRef} className="flex-1 px-3 py-4 sm:px-8 sm:py-6">
          <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-4">
            {game.history.map((msg, i) => (
              <motion.div
                key={i}
                ref={i === game.history.length - 1 ? lastMsgRef : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex flex-col gap-2 scroll-mt-4", msg.role === "user" ? "items-end" : "items-start")}
              >
                {msg.role === "ai" ? (
                  <div className="space-y-4 sm:space-y-6 w-full">
                    {msg.narrative && <RollLog text={msg.narrative} />}
                    <div>
                      {i === game.history.length - 1 ? (
                        <TypewriterText
                          text={msg.content}
                          className="leading-loose text-base sm:text-lg first-letter:text-3xl sm:first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left"
                        />
                      ) : (
                        <div className="space-y-4 sm:space-y-5">
                          {msg.content
                            .split("\n")
                            .filter((p) => p.trim())
                            .map((para, pIdx) => (
                              <p
                                key={pIdx}
                                className={cn(
                                  "leading-loose text-base sm:text-lg",
                                  pIdx === 0 &&
                                    "first-letter:text-3xl sm:first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left",
                                )}
                              >
                                {para}
                              </p>
                            ))}
                        </div>
                      )}
                    </div>
                    {msg.dialogue && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-5 sm:pl-7 py-4 sm:py-5 border-l-2 border-primary/40 bg-primary/5 rounded-r-lg"
                      >
                        <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold text-primary mb-3 flex items-center gap-2">
                          <MessageSquare size={12} />
                          Vox-Link: {msg.dialogue.speaker}
                        </div>
                        <p className="text-primary/95 italic font-serif text-lg sm:text-2xl leading-relaxed border-l-2 border-primary/25 pl-4 sm:pl-5 py-1">
                          "{msg.dialogue.text}"
                        </p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="bg-primary/20 border border-primary/30 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium text-primary shadow-sm max-w-[90%]">
                    <span className="opacity-50 text-[9px] uppercase block mb-0.5">Transmission:</span>
                    {msg.content}
                  </div>
                )}
              </motion.div>
            ))}

            {isThinking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative p-4 sm:p-6 border border-primary/30 bg-background/80 backdrop-blur-md rounded-lg overflow-hidden flex flex-col items-center gap-3 max-w-sm mx-auto shadow-xl shadow-primary/10"
              >
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                <div className="relative z-10 flex gap-4 items-center w-full">
                  <div className="relative">
                    <Skull size={32} className="text-primary animate-pulse opacity-80" />
                    <motion.div
                      className="absolute -inset-2 border border-primary/30 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Cpu size={12} className="text-primary animate-pulse" />
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                        Cogitator Active
                      </h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono opacity-80">
                      {loadingPhrase}
                    </p>
                  </div>
                </div>
                <div className="w-full h-0.5 bg-secondary rounded-full overflow-hidden relative z-10">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%", x: "-100%" }}
                    animate={{ width: "100%", x: "100%" }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            )}

            {/* Choices flow at the end of the narrative — scroll down to reach
                them after reading, so the story gets the full window. */}
            {!isThinking && latestChoices && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 pt-2"
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 font-bold mb-1 flex items-center gap-2">
                  <ChevronRight size={12} className="text-primary" /> Choose Your Action
                </div>
                {Object.entries(latestChoices).map(([key, value]: [string, string]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="w-full h-auto py-3 px-4 text-left flex items-start gap-3 border-border/70 bg-card/60 hover:border-primary hover:bg-primary/5 transition-all group whitespace-normal"
                    onClick={() => handleAction(value)}
                  >
                    <Badge
                      variant="outline"
                      className="shrink-0 mt-0.5 border-primary/50 text-primary bg-primary/5 font-bold tracking-widest text-[10px] h-6 w-7 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                    >
                      {key}
                    </Badge>
                    <span className="flex-1 min-w-0 text-sm font-medium leading-snug opacity-90 group-hover:opacity-100 break-words">
                      {value}
                    </span>
                  </Button>
                ))}
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Input Area ── */}
      <div className="p-2 sm:p-3 border-t border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              disabled={isThinking}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAction(input)}
              placeholder={isThinking ? "Waiting for the Warp..." : "Or type a custom action..."}
              className="w-full bg-secondary/50 border border-border rounded-lg pl-4 pr-11 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
            />
            <Button
              size="icon"
              variant="ghost"
              disabled={isThinking || !input.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary"
              onClick={() => handleAction(input)}
            >
              <Send size={16} />
            </Button>
          </div>
          <div className="flex gap-1.5">
            <ActionButton icon={<Package size={16} />} label="Inventory" onClick={() => setIsInventoryOpen(true)} />
            <ActionButton icon={<Users size={16} />} label="Companion" onClick={() => setIsCompanionOpen(true)} />
            <ActionButton icon={<BarChart2 size={16} />} label="Stats & Skills" onClick={() => setIsSkillsOpen(true)} />
          </div>
        </div>
      </div>

      {/* ── HUD ── */}
      <div className="border-t border-border bg-background/90 backdrop-blur-md z-20 shrink-0">

        {/* Mobile HUD — compact single row */}
        <div className="sm:hidden flex items-center px-3 py-2 gap-3">
          <div className="relative w-8 h-8 border-2 border-primary rounded-md overflow-hidden bg-card shrink-0">
            {isGeneratingPortrait ? (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Loader2 className="animate-spin text-primary w-3 h-3" />
              </div>
            ) : game.portrait ? (
              <img src={game.portrait} alt="Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Skull className="text-primary/40 w-3 h-3" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold parchment-text uppercase truncate">{operativeName}</span>
              <span className={cn("text-xs font-bold font-mono shrink-0 flex items-center gap-0.5", hpColor)}>
                <Heart size={9} /> {game.hp.current}/{game.hp.max}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-tighter truncate">
                {game.archetype} · {game.xp.total} XP{game.xp.unspent > 0 ? ` (${game.xp.unspent} unspent)` : ''}
              </span>
              {game.companion.name && (
                <span className="text-[9px] text-primary font-mono shrink-0">
                  Bond {game.companion.loyalty}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop HUD */}
        <div className="hidden sm:flex items-center px-8 gap-8 h-24 relative">
          <div className="relative w-20 h-20 -mt-10 border-2 border-primary rounded-lg overflow-hidden bg-card shadow-2xl shadow-primary/20 shrink-0">
            {isGeneratingPortrait ? (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : game.portrait ? (
              <img src={game.portrait} alt="Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Skull className="text-primary/40 w-8 h-8" />
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="space-y-1 min-w-0">
              <h3 className="text-xl font-bold parchment-text leading-none uppercase truncate">{operativeName}</h3>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{game.archetype}</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-primary">XP: {game.xp.total}{game.xp.unspent > 0 ? ` (${game.xp.unspent} unspent)` : ''}</span>
              </div>
            </div>

            <div className="flex gap-4 mx-4">
              <StatHex label="HP" value={`${game.hp.current}/${game.hp.max}`} icon={<Heart size={11} />} color={hpColor} />
              {Object.entries(game.stats).map(([key, val]) => (
                <StatHex key={key} label={key} value={val} />
              ))}
            </div>

            <div className="flex items-center gap-4 border-l border-border pl-6 relative">
              <AnimatePresence>
                {loyaltyMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: -40 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "absolute -top-12 right-0 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-black border whitespace-nowrap z-50",
                      loyaltyMessage.value > 0 ? "text-primary border-primary" : "text-destructive border-destructive",
                    )}
                  >
                    {loyaltyMessage.label}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-tighter text-muted-foreground flex items-center justify-end gap-2">
                  <span>Companion: {game.companion.name || "None"}</span>
                  {game.companion.name && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] h-4 px-1.5 border-border uppercase tracking-widest",
                        game.companion.loyalty >= 60 ? "text-primary border-primary/30" : "",
                        game.companion.loyalty < 40 ? "text-destructive border-destructive/30" : "",
                      )}
                    >
                      {getLoyaltyStatus(game.companion.loyalty)}
                    </Badge>
                  )}
                </div>
                <div className="w-32 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                  <motion.div className="h-full bg-primary" animate={{ width: `${game.companion.loyalty}%` }} />
                </div>
              </div>
              <button
                onClick={() => setIsCompanionOpen(true)}
                className="w-10 h-10 rounded-full border border-border bg-secondary/50 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all group"
              >
                <Users size={16} className="text-muted-foreground group-hover:text-primary" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Panels */}
      <InventoryPanel isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} onUseItem={handleUseItem} />
      <CompanionPanel isOpen={isCompanionOpen} onClose={() => setIsCompanionOpen(false)} onInteract={handleCompanionInteract} />
      <SkillsPanel
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        onAction={(action) => { setIsSkillsOpen(false); handleAction(action, true); }}
      />

      {/* NES-style intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <PreGameIntro
            name={game.name}
            archetype={game.archetype}
            motivation={game.motivation}
            difficulty={game.difficulty}
            stats={game.stats}
            skills={game.skills}
            talents={game.talents}
            onDismiss={() => setShowIntro(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const ARCHETYPE_FLAVOR: Record<string, string> = {
  "Guardsman Veteran":   "A hundred campaigns have ground your soul to bedrock. You do not fear death — you have watched it take better soldiers than you.",
  "Exiled Psyker":       "The Warp whispers in your blood. You are a weapon the Imperium fears to wield and cannot afford to discard.",
  "Hive Ganger":         "The underhive forged you in poison and darkness. Every scar is a lesson. Every lesson kept you breathing.",
  "Rogue Trader Scion":  "You carry a Warrant of Trade worth a dozen star systems and a reputation worth considerably less. Both are problems you intend to fix.",
  "Penitent Sister":     "Faith is your armor. Guilt is your fuel. The Emperor's enemies will learn which burns hotter.",
  "Tech-Priest Initiate":"Flesh is weak. Steel endures. You seek knowledge the Mechanicus buried — and you will dig until your mechadendrites break.",
  "Criminal Conscript":  "They gave you a gun instead of a firing squad. You intend to make them regret the generosity.",
  "Civilian Survivor":   "You were nobody. Then the war found you. Now you are nobody with a weapon and nothing left to lose.",
};

const DIFFICULTY_FLAVOR: Record<string, string> = {
  "Narrative": "The Emperor's light guides your path. Death is possible — but the story comes first.",
  "Balanced":  "Standard combat conditions. Expect fire, blood, and hard choices with no clean answers.",
  "Grimdark":  "There is only war. Every wound is permanent. Every mistake is final. Fortune does not favor the faithful here.",
};

const INTRO_PAGES = [
  "lore",
  "rules",
  "dossier",
  "sendoff",
] as const;

type IntroPage = typeof INTRO_PAGES[number];

interface PreGameIntroProps {
  name: string;
  archetype: string;
  motivation: string;
  difficulty: string;
  stats: Stats;
  skills: string[];
  talents: string[];
  onDismiss: () => void;
}

function PreGameIntro({ name, archetype, motivation, difficulty, stats, skills, talents, onDismiss }: PreGameIntroProps) {
  const [page, setPage] = useState<IntroPage>("lore");
  const [visible, setVisible] = useState(true);

  const pageIndex = INTRO_PAGES.indexOf(page);
  const isLast = pageIndex === INTRO_PAGES.length - 1;

  const advance = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onDismiss, 400);
    } else {
      setPage(INTRO_PAGES[pageIndex + 1]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 sm:p-12"
      onClick={advance}
    >
      <div className="w-full max-w-lg">

        <AnimatePresence mode="wait">

          {page === "lore" && (
            <IntroScreen key="lore">
              <IntroTitle>GRIM ECHOES</IntroTitle>
              <IntroSub>40K Solo Narrative RPG · M41.999</IntroSub>
              <IntroDivider />
              <IntroBody delay={0.3}>
                Ten thousand years have passed since the Emperor ascended to the Golden Throne.
                The Imperium of Man — five hundred worlds of fire and iron — creaks under the weight
                of eternal war.
              </IntroBody>
              <IntroBody delay={0.9}>
                On every front, the tide turns against humanity. Chaos pours from the Eye of Terror.
                Xenos fleets darken the stars. Heresy festers in the hive cities and forge worlds alike.
              </IntroBody>
              <IntroBody delay={1.5}>
                Into this darkness, one operative steps forward. One soul, armed and afraid,
                to do what must be done.
              </IntroBody>
            </IntroScreen>
          )}

          {page === "rules" && (
            <IntroScreen key="rules">
              <IntroTitle>MISSION BRIEFING</IntroTitle>
              <IntroSub>Standing Orders for All Operatives</IntroSub>
              <IntroDivider />
              <div className="space-y-3 mt-4">
                {[
                  ["ACTIONS",     "Select a tactical option or type a custom command to shape the narrative."],
                  ["HP",          "Reach zero and your deployment ends. Use medkits and rest to recover."],
                  ["XP & STATS",  "Gain XP through combat and deeds. Spend it in your Dossier to raise stats."],
                  ["CREDITS",     "Barter, scavenge, and complete jobs. Credits buy gear and information."],
                  ["CORRUPTION",  "Every dark act costs you. Reach 10 Corruption and the Warp claims your soul."],
                  ["SAVE",        "Hit the Save button in the top bar after any major moment to record your progress."],
                ].map(([label, desc], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 * i + 0.2 }}
                    className="flex gap-3 items-start"
                  >
                    <span className="text-primary font-mono text-[10px] font-bold shrink-0 w-20 uppercase tracking-tight pt-0.5">{label}</span>
                    <span className="text-zinc-400 text-xs leading-relaxed">{desc}</span>
                  </motion.div>
                ))}
              </div>
            </IntroScreen>
          )}

          {page === "dossier" && (
            <IntroScreen key="dossier">
              <IntroTitle>OPERATIVE DOSSIER</IntroTitle>
              <IntroSub>Inquisitorial Record — Eyes Only</IntroSub>
              <IntroDivider />
              <div className="space-y-4 mt-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs"
                >
                  {[
                    ["DESIGNATION", name || "Unknown"],
                    ["ARCHETYPE",   archetype || "Unclassified"],
                    ["CLEARANCE",   difficulty || "Balanced"],
                    ["PRIMARY DRIVE", motivation || "Survival"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{k}</div>
                      <div className="text-white font-bold font-mono text-xs uppercase tracking-tight">{v}</div>
                    </div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-2 flex-wrap"
                >
                  {Object.entries(stats).map(([k, v]) => (
                    <div key={k} className="text-center border border-zinc-800 rounded px-2 py-1 min-w-[36px]">
                      <div className="text-[8px] text-zinc-600 uppercase">{k}</div>
                      <div className="text-primary font-mono font-bold text-sm">{v}</div>
                    </div>
                  ))}
                </motion.div>

                {archetype && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-zinc-500 text-xs leading-relaxed italic border-l border-zinc-800 pl-3"
                  >
                    {ARCHETYPE_FLAVOR[archetype] ?? "An operative of unknown provenance. Proceed with caution."}
                  </motion.p>
                )}
              </div>
            </IntroScreen>
          )}

          {page === "sendoff" && (
            <IntroScreen key="sendoff">
              <IntroTitle>FOR THE EMPEROR</IntroTitle>
              <IntroDivider />
              <IntroBody delay={0.3}>
                {DIFFICULTY_FLAVOR[difficulty] ?? DIFFICULTY_FLAVOR["Balanced"]}
              </IntroBody>
              <IntroBody delay={1.0}>
                The drop pod is locked. The coordinates are loaded.
                Whatever waits down there in the dark — it does not know you are coming.
              </IntroBody>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="mt-8 text-center"
              >
                <p className="text-primary font-bold uppercase tracking-[0.3em] text-sm mb-1">Good Luck, Operative.</p>
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest">You will need it.</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 2.5, duration: 1.2, repeat: Infinity }}
                className="mt-10 text-center"
              >
                <span className="text-zinc-500 text-[10px] uppercase tracking-[0.4em]">Tap to Begin Deployment</span>
              </motion.div>
            </IntroScreen>
          )}

        </AnimatePresence>

        {/* Page indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {INTRO_PAGES.map((p, i) => (
            <div
              key={p}
              className={cn(
                "h-0.5 rounded-full transition-all duration-300",
                p === page ? "w-6 bg-primary" : i < pageIndex ? "w-2 bg-zinc-700" : "w-2 bg-zinc-800"
              )}
            />
          ))}
        </div>

        {page !== "sendoff" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0 }}
            className="text-center text-[10px] text-zinc-700 uppercase tracking-[0.3em] mt-4"
          >
            Tap to continue
          </motion.p>
        )}

      </div>
    </motion.div>
  );
}

function IntroScreen({ children }: { children: React.ReactNode; key?: React.Key }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}

function IntroTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      initial={{ opacity: 0, letterSpacing: "0.1em" }}
      animate={{ opacity: 1, letterSpacing: "0.3em" }}
      transition={{ duration: 0.6 }}
      className="text-2xl sm:text-3xl font-bold parchment-text uppercase tracking-[0.3em] text-center"
    >
      {children}
    </motion.h2>
  );
}

function IntroSub({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] text-center mt-1"
    >
      {children}
    </motion.p>
  );
}

function IntroDivider() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="h-px bg-primary/40 my-5 origin-left"
    />
  );
}

function IntroBody({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="text-zinc-400 text-sm leading-relaxed mt-3 font-serif"
    >
      {children}
    </motion.p>
  );
}

function MoralAtmosphere({ corruption, loyalty, hasCompanion }: { corruption: number; loyalty: number; hasCompanion: boolean }) {
  // corruption 0–10 (higher = worse). loyalty 0–100 (50 neutral).
  const corruptN = Math.min(1, Math.max(0, corruption) / 10);
  const lowLoyalty = hasCompanion ? Math.max(0, (50 - loyalty) / 50) : 0;
  const highLoyalty = hasCompanion ? Math.max(0, (loyalty - 60) / 40) : 0;

  // Darkness rises with corruption and with treating your companion badly.
  const dark = Math.min(1, corruptN * 0.85 + lowLoyalty * 0.45);
  // Grace: earned through loyalty, snuffed out by corruption.
  const grace = Math.min(1, highLoyalty * (1 - corruptN) * 0.9);

  return (
    <>
      {/* Corruption: oppressive crimson vignette (edges only, center stays legible) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[55]"
        animate={{ opacity: dark }}
        transition={{ duration: 1.6 }}
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(28,0,0,0.6) 100%)" }}
      />
      {/* Corruption: faint global crimson multiply for a sickly cast */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[55] mix-blend-multiply"
        animate={{ opacity: dark * 0.3 }}
        transition={{ duration: 1.6 }}
        style={{ background: "rgb(90,14,14)" }}
      />
      {/* Grace: warm golden light from above */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[55] mix-blend-soft-light"
        animate={{ opacity: grace }}
        transition={{ duration: 1.6 }}
        style={{ background: "radial-gradient(ellipse at top, rgba(255,224,150,0.85) 0%, rgba(255,224,150,0) 55%)" }}
      />
    </>
  );
}

function RollLog({ text }: { text: string }) {
  // Parse: "[ROLL] Action: '...' Check: WIL + 5 vs DC 14 Roll: 1d20 (14) + 5 = 19 → Success"
  const outcomeMatch = text.match(/→\s*(Critical\s+)?(\w+)\s*$/i);
  const outcome = outcomeMatch ? outcomeMatch[0].replace('→', '').trim() : null;
  const totalMatch = text.match(/=\s*(\d+)\s*→/);
  const total = totalMatch?.[1] ?? null;
  const checkMatch = text.match(/Check:\s*(.+?)\s*Roll:/);
  const check = checkMatch?.[1]?.trim() ?? null;
  const rollMatch = text.match(/Roll:\s*(.+?)\s*→/);
  const rollExpr = rollMatch?.[1]?.trim() ?? null;

  const isSuccess = /success/i.test(outcome ?? '');
  const isCritical = /critical/i.test(outcome ?? '');

  if (!outcome || !total) {
    // No recognisable roll structure — render compact fallback
    return (
      <div className="text-[9px] font-mono text-muted-foreground/60 bg-secondary/20 px-3 py-1.5 rounded border border-border/30 inline-block">
        {text}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 sm:gap-3 rounded-lg px-3 py-2 border font-mono text-[10px] sm:text-xs w-full",
      isSuccess
        ? "bg-primary/5 border-primary/20"
        : "bg-destructive/5 border-destructive/20"
    )}>
      {/* Dice icon */}
      <span className="text-base shrink-0">⚂</span>

      {/* Check formula — small, muted */}
      {check && (
        <span className="text-muted-foreground/70 shrink-0 hidden sm:inline">{check}</span>
      )}
      {check && <span className="text-border/60 hidden sm:inline">·</span>}

      {/* Roll expression compact on mobile */}
      {rollExpr && (
        <span className="text-muted-foreground/60 shrink-0 truncate max-w-[120px] sm:max-w-none">
          {rollExpr}
        </span>
      )}

      <span className="flex-1" />

      {/* The number — this is what they need to see */}
      <span className={cn(
        "text-xl sm:text-2xl font-bold shrink-0 tabular-nums",
        isSuccess ? "text-primary" : "text-destructive"
      )}>
        {total}
      </span>

      {/* Outcome badge */}
      <span className={cn(
        "shrink-0 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
        isCritical && isSuccess && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        !isCritical && isSuccess && "bg-primary/20 text-primary border border-primary/30",
        isCritical && !isSuccess && "bg-orange-500/20 text-orange-400 border border-orange-500/30",
        !isCritical && !isSuccess && "bg-destructive/20 text-destructive border border-destructive/30",
      )}>
        {isSuccess ? "✓" : "✗"} {outcome}
      </span>
    </div>
  );
}

function StatHex({ label, value, icon, color }: {
  label: string; value: string | number; icon?: React.ReactNode; color?: string; key?: React.Key;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[9px] uppercase tracking-tighter text-muted-foreground mb-0.5">{label}</div>
      <div className={cn("text-sm font-bold font-mono flex items-center gap-0.5", color)}>{icon}{value}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="h-10 w-10 border-border/50 hover:border-primary/50 hover:bg-primary/5 group relative shrink-0"
    >
      {icon}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest border border-border whitespace-nowrap z-50 hidden sm:block">
        {label}
      </span>
    </Button>
  );
}

function TypewriterText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split("\n").filter((p) => p.trim());
  return (
    <div className="space-y-4 sm:space-y-5">
      {paragraphs.map((para, pIdx) => {
        const words = para.split(" ");
        return (
          <motion.p
            key={pIdx}
            className={cn("leading-loose text-base sm:text-lg", pIdx === 0 ? className : "")}
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.015, delayChildren: pIdx * 0.1 } },
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, filter: "blur(4px)", y: 2 },
                  visible: { opacity: 1, filter: "blur(0px)", y: 0 },
                }}
                className="inline-block mr-1"
              >
                {word}
              </motion.span>
            ))}
          </motion.p>
        );
      })}
    </div>
  );
}
