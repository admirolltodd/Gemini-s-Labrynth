import React, { useState, useEffect, useRef } from "react";
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
  Map as MapIcon,
  Send,
  Heart,
  Users,
  ChevronRight,
  MessageSquare,
  Loader2,
  Cpu,
  ChevronLeft,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { processGameTurn } from "../../lib/gemini";
import InventoryPanel from "./InventoryPanel";
import CompanionPanel from "./CompanionPanel";
import SkillsPanel from "./SkillsPanel";
import TacticalMap from "./TacticalMap";

export default function GameScreen({ onBack }: { onBack?: () => void }) {
  const game = useGameStore();
  const { apiKey } = useSettingsStore();

  const [input, setInput] = useState("");
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(!game.portrait);
  const [isThinking, setIsThinking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
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

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [game.history, isThinking]);

  useEffect(() => {
    if (!apiKey || initialActionsRan.current) return;
    initialActionsRan.current = true;
    if (!game.portrait) generatePortrait();
    if (game.history.length === 0) {
      handleAction(
        "Describe my insertion into the active warzone. Establish an epic, vast scale with towering ruins, dramatic lighting over the battlefield, and the chaotic roar of war. Give me tactical options.",
      );
    }
  }, [apiKey]);

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
      // non-critical, fail silently
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!action.trim() || isThinking) return;
    setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
    setIsThinking(true);
    setInput("");

    if (game.history.length > 0) game.addHistory({ role: "user", content: action });

    try {
      if (!apiKey) throw new Error("VOX-LINK FAILURE: No Gemini API Key. Open Settings to connect.");
      const result = await processGameTurn(apiKey, action, game);
      const updates = result.state_updates;

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
        chapter: updates.chapter_update || game.chapter,
        active_threats: updates.active_threats_update || game.active_threats,
        last_scene_summary: result.narrative,
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
    const name =
      game.history[0]?.content.split(",")[0].replace("Character Created: ", "") ||
      "Unnamed_Operative";
    try {
      await game.saveGame(name);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      console.error("Save failed:", e);
    }
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

  const operativeName =
    game.history[0]?.content.split(",")[0].replace("Character Created: ", "") || "OPERATIVE";

  const hpPercent = game.hp.max > 0 ? (game.hp.current / game.hp.max) * 100 : 0;
  const hpColor =
    hpPercent > 60 ? "text-primary" : hpPercent > 30 ? "text-amber-500" : "text-destructive";

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          className={cn(
            "h-7 gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-widest shrink-0 ml-2 transition-all",
            isSaved
              ? "border-primary bg-primary/10 text-primary"
              : "border-primary/30 hover:bg-primary/10"
          )}
        >
          {isSaved ? <Check size={12} /> : <Save size={12} />}
          <span className="hidden sm:inline">{isSaved ? "Saved!" : "Save Game"}</span>
        </Button>
      </div>

      {/* ── Narrative Scroll ── */}
      <div className="flex-1 flex overflow-hidden bg-card/70 backdrop-blur-md min-h-0">
        <ScrollArea ref={scrollRef} className="flex-1 px-3 py-4 sm:px-8 sm:py-6">
          <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-4">
            {game.history.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}
              >
                {msg.role === "ai" ? (
                  <div className="space-y-3 sm:space-y-4 w-full">
                    {msg.narrative && (
                      <div className="text-[9px] sm:text-[10px] font-mono text-accent bg-accent/10 px-3 py-1 rounded border border-accent/20 inline-block">
                        {msg.narrative}
                      </div>
                    )}
                    <div>
                      {i === game.history.length - 1 ? (
                        <TypewriterText
                          text={msg.content}
                          className="leading-relaxed text-base sm:text-lg first-letter:text-3xl sm:first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left"
                        />
                      ) : (
                        <div className="space-y-3">
                          {msg.content
                            .split("\n")
                            .filter((p) => p.trim())
                            .map((para, pIdx) => (
                              <p
                                key={pIdx}
                                className={cn(
                                  "leading-relaxed text-base sm:text-lg",
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
                        className="relative pl-4 sm:pl-6 py-3 sm:py-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg gothic-border"
                      >
                        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-1.5 flex items-center gap-1.5">
                          <MessageSquare size={10} />
                          Vox-Link: {msg.dialogue.speaker}
                        </div>
                        <p className="text-primary/90 italic leading-relaxed font-serif text-base sm:text-xl border-l border-primary/20 pl-3 sm:pl-4 py-1">
                          "{msg.dialogue.text}"
                        </p>
                      </motion.div>
                    )}
                    {msg.choices && (
                      <div className="flex flex-col gap-2 sm:gap-3 pt-2 sm:pt-4 w-full">
                        {Object.entries(msg.choices).map(([key, value]) => (
                          <Button
                            key={key}
                            variant="outline"
                            disabled={isThinking}
                            className="w-full flex items-start justify-start text-left h-auto py-3 sm:py-4 px-4 sm:px-5 border-border/80 bg-card/60 hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden whitespace-normal break-words"
                            onClick={() => handleAction(value)}
                          >
                            <div className="flex gap-3 sm:gap-4 w-full pr-5">
                              <Badge
                                variant="outline"
                                className="shrink-0 mt-0.5 border-primary/50 text-primary bg-primary/5 uppercase font-bold tracking-widest text-[9px] sm:text-[10px] items-center justify-center h-5 sm:h-6 w-8 sm:w-10 ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                              >
                                {key}
                              </Badge>
                              <span className="text-xs sm:text-sm font-medium leading-relaxed opacity-85 group-hover:opacity-100 flex-1">
                                {value}
                              </span>
                            </div>
                            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all text-primary w-4 h-4" />
                          </Button>
                        ))}
                      </div>
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
          </div>
        </ScrollArea>
      </div>

      {/* ── Input Area ── */}
      <div className="p-2 sm:p-4 border-t border-border bg-card/50 backdrop-blur-md shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              disabled={isThinking}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAction(input)}
              placeholder={isThinking ? "Waiting for the Warp..." : "Type your action..."}
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
          {/* 4-across on mobile, row on desktop */}
          <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-2">
            <ActionButton icon={<Package size={16} />} label="Inventory" onClick={() => setIsInventoryOpen(true)} />
            <ActionButton icon={<Users size={16} />} label="Companion" onClick={() => setIsCompanionOpen(true)} />
            <ActionButton icon={<Zap size={16} />} label="Dossier" onClick={() => setIsSkillsOpen(true)} />
            <ActionButton icon={<MapIcon size={16} />} label="Tactical" onClick={() => setIsMapOpen(true)} />
          </div>
        </div>
      </div>

      {/* ── HUD ── */}
      <div className="border-t border-border bg-background/90 backdrop-blur-md z-20 shrink-0">

        {/* Mobile HUD */}
        <div className="sm:hidden">
          <div className="flex items-center px-3 pt-2 pb-1 gap-3">
            <div className="relative w-9 h-9 border-2 border-primary rounded-md overflow-hidden bg-card shrink-0">
              {isGeneratingPortrait ? (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <Loader2 className="animate-spin text-primary w-3 h-3" />
                </div>
              ) : game.portrait ? (
                <img src={game.portrait} alt="Portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <Skull className="text-primary/40 w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-bold parchment-text uppercase truncate">{operativeName}</span>
                <span className={cn("text-xs font-bold font-mono shrink-0 flex items-center gap-0.5", hpColor)}>
                  <Heart size={9} /> {game.hp.current}/{game.hp.max}
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                {game.archetype} · XP {game.xp.total}
              </div>
            </div>
          </div>
          {/* Scrollable stat strip */}
          <div className="overflow-x-auto px-3 pb-2">
            <div className="flex gap-4 min-w-max">
              {Object.entries(game.stats).map(([key, val]) => (
                <div key={key} className="flex flex-col items-center">
                  <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">{key}</div>
                  <div className="text-xs font-bold font-mono">{val}</div>
                </div>
              ))}
              {game.companion.name && (
                <div className="flex flex-col items-center border-l border-border pl-3">
                  <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">Bond</div>
                  <div className="text-xs font-bold font-mono text-primary">{game.companion.loyalty}%</div>
                </div>
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
                <span className="text-primary">XP: {game.xp.total}</span>
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
      <SkillsPanel isOpen={isSkillsOpen} onClose={() => setIsSkillsOpen(false)} />
      <TacticalMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
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
      className="h-10 w-full sm:w-10 border-border/50 hover:border-primary/50 hover:bg-primary/5 group relative"
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
    <div className="space-y-3 sm:space-y-4">
      {paragraphs.map((para, pIdx) => {
        const words = para.split(" ");
        return (
          <motion.p
            key={pIdx}
            className={cn("leading-relaxed text-base sm:text-lg", pIdx === 0 ? className : "")}
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
