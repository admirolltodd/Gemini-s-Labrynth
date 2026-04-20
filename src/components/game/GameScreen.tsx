import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Skull, Save, Package, Zap, Map as MapIcon, 
  Send, Heart, Shield, Brain, Users, 
  ChevronRight, MessageSquare, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/lib/utils';
import { processGameTurn, generateSpeech } from '../../lib/gemini';
import { playPcmFromBase64, stopAllAudio } from '../../lib/audio';
import InventoryPanel from './InventoryPanel';
import CompanionPanel from './CompanionPanel';
import { Volume2, VolumeX, Speaker } from 'lucide-react';

export default function GameScreen() {
  const game = useGameStore();
  const { apiKey, theme, fontSize, fontFamily, audioEnabled, narratorVoice, setAudioEnabled } = useSettingsStore();
  const [input, setInput] = useState('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(!game.portrait);
  const [isThinking, setIsThinking] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [loyaltyMessage, setLoyaltyMessage] = useState<{ value: number, label: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLoyalty = useRef(game.companion.loyalty);

  // Auto-scroll to bottom of history
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [game.history, isThinking]);

  // Portrait Generation Effect
  useEffect(() => {
    if (!game.portrait && apiKey) {
      generatePortrait();
    }
    
    // Initial scene if history is empty
    if (game.history.length === 0 && apiKey) {
      handleAction("Begin my journey.");
    }
  }, []);

  // Loyalty Change Notification
  useEffect(() => {
    if (game.companion.loyalty !== prevLoyalty.current) {
      const diff = game.companion.loyalty - prevLoyalty.current;
      setLoyaltyMessage({ value: diff, label: diff > 0 ? `Loyalty Gained (+${diff})` : `Loyalty Lost (${diff})` });
      prevLoyalty.current = game.companion.loyalty;
      
      const timer = setTimeout(() => setLoyaltyMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [game.companion.loyalty]);

  const generatePortrait = async () => {
    try {
      setIsGeneratingPortrait(true);
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `A high-quality grimdark character portrait of a ${game.archetype} in the Warhammer 40,000 universe. Dark, gritty, oil painting style, dramatic lighting.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          game.setGameState({ portrait: `data:image/png;base64,${part.inlineData.data}` });
          break;
        }
      }
    } catch (error) {
      console.error("Portrait Generation Failed:", error);
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!action.trim() || isThinking) return;

    setIsThinking(true);
    setInput('');

    // Add user action to history immediately
    if (game.history.length > 0) {
      game.addHistory({ role: 'user', content: action });
    }

    try {
      const result = await processGameTurn(apiKey, action, game);
      
      // Apply state updates
      const updates = result.state_updates;
      game.setGameState({
        hp: { 
          current: Math.max(0, Math.min(game.hp.max, game.hp.current + (updates.hp_change || 0))), 
          max: game.hp.max 
        },
        xp: { 
          total: game.xp.total + (updates.xp_gain || 0), 
          unspent: game.xp.unspent + (updates.xp_gain || 0) 
        },
        credits: game.credits + (updates.credits_change || 0),
        corruption: game.corruption + (updates.corruption_gain || 0),
        companion: {
          ...game.companion,
          loyalty: Math.max(0, Math.min(100, game.companion.loyalty + (updates.loyalty_change || 0)))
        },
        gear: [...game.gear, ...(updates.inventory_add || [])].filter(item => !(updates.inventory_remove || []).includes(item)),
        chapter: updates.chapter_update || game.chapter,
        active_threats: updates.active_threats_update || game.active_threats,
        last_scene_summary: result.narrative
      });

      // Add AI response to history
      game.addHistory({ 
        role: 'ai', 
        content: result.narrative, 
        choices: result.choices,
        narrative: result.roll_log, // Using narrative field for roll log in history
        dialogue: result.dialogue ? { speaker: result.dialogue_speaker, text: result.dialogue } : null
      });

      // Play Audio if enabled
      if (audioEnabled && apiKey) {
        stopAllAudio();
        // Construct full text for speech (narrative + dialogue)
        const speechText = result.dialogue 
          ? `${result.narrative} ... ${result.dialogue_speaker} says: ${result.dialogue}` 
          : result.narrative;
        const base64 = await generateSpeech(apiKey, speechText, narratorVoice);
        if (base64) {
          playPcmFromBase64(base64);
        }
      }

    } catch (error) {
      game.addHistory({ role: 'ai', content: "The Warp interferes with your connection. (Error processing turn)" });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSave = async () => {
    const name = game.history[0]?.content.split(',')[0].replace('Character Created: ', '') || 'Unnamed_Operative';
    try {
      await game.saveGame(name);
      // Show success toast or feedback
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleUseItem = async (itemName: string) => {
    // Basic hardcoded logic for specific items
    if (itemName.toLowerCase().includes('medkit')) {
      game.setGameState({
        hp: { current: Math.min(game.hp.max, game.hp.current + 4), max: game.hp.max }
      });
    }

    // Remove item from gear after use (assuming single-use for now)
    const newGear = game.gear.filter(item => item !== itemName);
    game.setGameState({ gear: newGear });

    // Inform the AI
    handleAction(`I use my ${itemName}.`);
    setIsInventoryOpen(false);
  };

  const handleCompanionInteract = () => {
    handleAction(`I consult with ${game.companion.name || 'my companion'} for advice.`);
    setIsCompanionOpen(false);
  };

  const getLoyaltyStatus = (loyalty: number) => {
    if (loyalty >= 80) return "Devoted";
    if (loyalty >= 60) return "Loyal";
    if (loyalty >= 40) return "Neutral";
    if (loyalty >= 20) return "Disgruntled";
    return "Insubordinate";
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Top Bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Skull className="text-primary w-5 h-5" />
          <span className="text-xs uppercase tracking-[0.3em] font-bold parchment-text">
            {game.chapter || 'Chapter I: The Awakening'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {audioEnabled && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 mr-2">
              <Speaker className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[8px] uppercase tracking-tighter font-bold text-primary">Vox-Link Active: {narratorVoice}</span>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (audioEnabled) stopAllAudio();
              setAudioEnabled(!audioEnabled);
            }}
            className={cn(
                "h-8 w-8 p-0 border-primary/30",
                audioEnabled ? "bg-primary/20 text-primary" : "text-muted-foreground"
            )}
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave}
            className="h-8 gap-2 text-[10px] uppercase tracking-widest border-primary/30 hover:bg-primary/10"
          >
            <Save size={14} /> Save Game
          </Button>
        </div>
      </div>

      {/* Main Narrative Area */}
      <div className="flex-1 flex overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 p-8">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {game.history.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-2",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
              >
                {msg.role === 'ai' ? (
                  <div className="space-y-4 w-full">
                    {msg.narrative && (
                      <div className="text-[10px] font-mono text-accent bg-accent/10 px-3 py-1 rounded border border-accent/20 inline-block">
                        {msg.narrative}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        {i === game.history.length - 1 ? (
                          <TypewriterText 
                            text={msg.content} 
                            className="leading-relaxed text-lg first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left" 
                          />
                        ) : (
                          <div className="space-y-4">
                            {msg.content.split('\n').filter(p => p.trim() !== '').map((para, pIdx) => (
                              <p key={pIdx} className={cn(
                                "leading-relaxed text-lg",
                                pIdx === 0 && "first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left"
                              )}>
                                {para}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      {audioEnabled && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                          onClick={async () => {
                            stopAllAudio();
                            const speechContent = msg.dialogue 
                              ? `${msg.content} ... ${msg.dialogue.speaker} says: ${msg.dialogue.text}`
                              : msg.content;
                            const base64 = await generateSpeech(apiKey, speechContent, narratorVoice);
                            if (base64) playPcmFromBase64(base64);
                          }}
                        >
                          <Volume2 size={16} />
                        </Button>
                      )}
                    </div>
                    {msg.dialogue && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-6 py-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                          <MessageSquare size={64} className="text-primary" />
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-2 flex items-center gap-2">
                          <Speaker size={12} className="animate-pulse" />
                          Vox-Link Transmit: {msg.dialogue.speaker}
                        </div>
                        <p className="text-primary/90 italic leading-relaxed font-serif text-xl border-l border-primary/20 pl-4 py-1">
                          "{msg.dialogue.text}"
                        </p>
                      </motion.div>
                    )}
                    {msg.choices && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                        {Object.entries(msg.choices).map(([key, value]) => (
                          <Button 
                            key={key} 
                            variant="outline" 
                            disabled={isThinking}
                            className="justify-start h-auto py-3 px-4 text-left border-border/50 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => handleAction(value)}
                          >
                            <Badge variant="outline" className="mr-3 border-primary text-primary">{key}</Badge>
                            <span className="text-sm">{value}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-primary/20 border border-primary/30 px-4 py-3 rounded-lg text-sm font-medium tracking-tight text-primary shadow-sm bg-linear-to-r from-primary/20 to-transparent">
                    <span className="opacity-50 text-[10px] uppercase block mb-1">Transmission:</span>
                    {msg.content}
                  </div>
                )}
              </motion.div>
            ))}
            
            {isThinking && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex items-center gap-3 text-muted-foreground italic text-sm"
              >
                <Loader2 className="animate-spin w-4 h-4" />
                The Game Master is weaving the tapestry of fate...
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-border bg-card/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex gap-4">
          <div className="flex-1 relative">
            <input 
              type="text"
              value={input}
              disabled={isThinking}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAction(input)}
              placeholder={isThinking ? "Waiting for the Warp..." : "Type your command or custom action..."}
              className="w-full bg-secondary/50 border border-border rounded-lg pl-4 pr-12 py-3 text-sm focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              disabled={isThinking || !input.trim()}
              className="absolute right-1 top-1 h-10 w-10 text-primary"
              onClick={() => handleAction(input)}
            >
              <Send size={18} />
            </Button>
          </div>
          <div className="flex gap-2">
            <GameModalButton icon={<Package size={18} />} label="Inventory" onClick={() => setIsInventoryOpen(true)} />
            <GameModalButton icon={<Users size={18} />} label="Companion" onClick={() => setIsCompanionOpen(true)} />
            <GameModalButton icon={<Zap size={18} />} label="Skills" />
            <GameModalButton icon={<MapIcon size={18} />} label="Map" />
          </div>
        </div>
      </div>

      <InventoryPanel 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
        onUseItem={handleUseItem}
      />

      <CompanionPanel
        isOpen={isCompanionOpen}
        onClose={() => setIsCompanionOpen(false)}
        onInteract={handleCompanionInteract}
      />

      {/* HUD / Character Card */}
      <div className="h-24 border-t border-border bg-background/90 backdrop-blur-md flex items-center px-8 gap-8 z-20">
        {/* Portrait */}
        <div className="relative w-20 h-20 -mt-10 border-2 border-primary rounded-lg overflow-hidden bg-card shadow-2xl shadow-primary/20">
          {isGeneratingPortrait ? (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            <img src={game.portrait} alt="Portrait" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Stats & Info */}
        <div className="flex-1 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold parchment-text leading-none uppercase">{game.history[0]?.content.split(',')[0].replace('Character Created: ', '') || 'OPERATIVE'}</h3>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{game.archetype}</span>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-primary">XP: {game.xp.total}</span>
            </div>
          </div>

          <div className="flex gap-6">
            <StatHex label="HP" value={`${game.hp.current}/${game.hp.max}`} icon={<Heart size={12} />} color="text-red-500" />
            <StatHex label="STR" value={game.stats.STR} />
            <StatHex label="DEX" value={game.stats.DEX} />
            <StatHex label="TGH" value={game.stats.TGH} />
            <StatHex label="INT" value={game.stats.INT} />
            <StatHex label="WIL" value={game.stats.WIL} />
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
                    loyaltyMessage.value > 0 ? "text-primary border-primary" : "text-destructive border-destructive"
                  )}
                >
                  {loyaltyMessage.label}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-tighter text-muted-foreground flex items-center justify-end gap-2">
                <span>Companion: {game.companion.name || 'None'}</span>
                {game.companion.name && (
                  <Badge variant="outline" className={cn(
                    "text-[8px] h-4 px-1.5 border-border uppercase tracking-widest",
                    game.companion.loyalty >= 60 ? "text-primary border-primary/30" : 
                    game.companion.loyalty < 40 ? "text-destructive border-destructive/30" : ""
                  )}>
                    {getLoyaltyStatus(game.companion.loyalty)}
                  </Badge>
                )}
              </div>
              <div className="w-32 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-primary" 
                  initial={{ width: 0 }}
                  animate={{ width: `${game.companion.loyalty}%` }}
                />
              </div>
            </div>
            <button 
              onClick={() => setIsCompanionOpen(true)}
              className="w-10 h-10 rounded-full border border-border bg-secondary/50 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all group"
            >
              <Users size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatHex({ label, value, icon, color }: { label: string, value: string | number, icon?: React.ReactNode, color?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[9px] uppercase tracking-tighter text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-sm font-bold font-mono flex items-center gap-1", color)}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function GameModalButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={onClick}
      className="h-12 w-12 border-border/50 hover:border-primary/50 hover:bg-primary/5 group relative"
    >
      {icon}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest border border-border">
        {label}
      </span>
    </Button>
  );
}

function TypewriterText({ text, className }: { text: string, className?: string }) {
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  
  return (
    <div className="space-y-4">
      {paragraphs.map((para, pIdx) => {
        const words = para.split(' ');
        return (
          <motion.p
            key={pIdx}
            className={cn(
                "leading-relaxed text-lg",
                pIdx === 0 ? className : ""
            )}
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.015,
                  delayChildren: pIdx * 0.1
                },
              },
            }}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, filter: 'blur(4px)', y: 2 },
                  visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
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


