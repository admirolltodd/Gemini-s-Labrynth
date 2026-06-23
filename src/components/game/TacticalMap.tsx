import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Map, AlertTriangle, BookOpen, Shield, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '@/lib/utils';

interface TacticalMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TacticalMap({ isOpen, onClose }: TacticalMapProps) {
  const { chapter, last_scene_summary, active_threats, difficulty, companion, hp } = useGameStore();

  const threatColor = (i: number) => {
    const colors = ['text-destructive', 'text-amber-500', 'text-yellow-400', 'text-muted-foreground'];
    return colors[Math.min(i, colors.length - 1)];
  };

  const hpPercent = hp.max > 0 ? (hp.current / hp.max) * 100 : 0;
  const hpColor = hpPercent > 60 ? 'bg-primary' : hpPercent > 30 ? 'bg-amber-500' : 'bg-destructive';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="absolute right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border z-[100] shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2">
              <Map className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold parchment-text uppercase tracking-widest">Tactical Vox</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X size={20} />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-5">

              {/* Chapter & Difficulty */}
              <div className="bg-secondary/20 rounded-lg p-3 border border-border/50">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Active Theatre</div>
                <div className="font-bold parchment-text text-base uppercase tracking-tight">
                  {chapter || 'Prologue: Insertion'}
                </div>
                <Badge variant="outline" className={cn(
                  "mt-1 text-[9px] uppercase tracking-widest",
                  difficulty === 'Grimdark' ? 'text-destructive border-destructive/40' :
                  difficulty === 'Balanced' ? 'text-amber-500 border-amber-500/40' :
                  'text-primary border-primary/40'
                )}>
                  {difficulty || 'Narrative'} Protocol
                </Badge>
              </div>

              {/* Vitals */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Operative Vitals</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-red-400" />
                      <span className="uppercase tracking-widest text-[10px]">Hull Integrity</span>
                    </div>
                    <span className="font-mono font-bold text-sm">{hp.current} / {hp.max}</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", hpColor)}
                      initial={{ width: 0 }}
                      animate={{ width: `${hpPercent}%` }}
                      transition={{ duration: 0.8, type: 'spring' }}
                    />
                  </div>
                </div>
              </div>

              {/* Last Scene Intel */}
              {last_scene_summary && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={12} className="text-muted-foreground" />
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Last Known Intel</div>
                  </div>
                  <div className="bg-secondary/20 rounded-lg p-3 border border-border/40">
                    <p className="text-xs leading-relaxed text-muted-foreground font-serif italic">
                      {last_scene_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Active Threats */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={12} className="text-destructive" />
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Active Threats {active_threats.length > 0 && `(${active_threats.length})`}
                  </div>
                </div>
                {active_threats.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No contacts on vox-array.</p>
                ) : (
                  <div className="space-y-1.5">
                    {active_threats.map((threat, i) => (
                      <div key={i} className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded px-3 py-2">
                        <AlertTriangle size={12} className={threatColor(i)} />
                        <span className={cn("text-xs font-medium uppercase tracking-tight", threatColor(i))}>
                          {threat}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Companion Status */}
              {companion.name && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Attached Operative</div>
                  <div className="bg-secondary/20 rounded-lg p-3 border border-border/40">
                    <div className="font-bold parchment-text text-sm uppercase">{companion.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 italic">{companion.description}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] text-muted-foreground uppercase mb-1">
                        <span>Loyalty</span>
                        <span>{companion.loyalty}%</span>
                      </div>
                      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          animate={{ width: `${companion.loyalty}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>

          <div className="p-3 bg-secondary/10 border-t border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-tighter font-mono text-center">
              Vox-Array Tactical Feed — Cogitator Secure Channel
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
