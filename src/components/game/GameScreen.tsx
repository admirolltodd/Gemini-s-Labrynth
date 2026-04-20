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
import { processGameTurn } from '../../lib/gemini';

export default function GameScreen() {
  const game = useGameStore();
  const { apiKey, theme, fontSize, fontFamily } = useSettingsStore();
  const [input, setInput] = useState('');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(!game.portrait);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        narrative: result.roll_log // Using narrative field for roll log in history
      });

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
                      <div className="text-[10px] font-mono text-muted-foreground bg-secondary/30 px-3 py-1 rounded border border-border/30 inline-block">
                        {msg.narrative}
                      </div>
                    )}
                    <p className="leading-relaxed text-lg first-letter:text-4xl first-letter:font-serif first-letter:mr-1 first-letter:float-left">
                      {msg.content}
                    </p>
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
                  <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg text-sm italic text-primary">
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
            <GameModalButton icon={<Package size={18} />} label="Inventory" />
            <GameModalButton icon={<Zap size={18} />} label="Skills" />
            <GameModalButton icon={<MapIcon size={18} />} label="Map" />
          </div>
        </div>
      </div>

      {/* HUD / Character Card */}
      <div className="h-24 border-t border-border bg-black/80 flex items-center px-8 gap-8 z-20">
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

          <div className="flex items-center gap-4 border-l border-border pl-6">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-tighter text-muted-foreground">Companion: {game.companion.name || 'None'}</div>
              <div className="w-32 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-primary" 
                  initial={{ width: 0 }}
                  animate={{ width: `${game.companion.loyalty}%` }}
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border border-border bg-secondary/50 flex items-center justify-center">
              <Users size={16} className="text-muted-foreground" />
            </div>
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

function GameModalButton({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <Button variant="outline" size="icon" className="h-12 w-12 border-border/50 hover:border-primary/50 hover:bg-primary/5 group relative">
      {icon}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest border border-border">
        {label}
      </span>
    </Button>
  );
}


