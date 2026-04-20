import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Heart, MessageSquare, Shield, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '@/lib/utils';

interface CompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInteract: () => void;
}

export default function CompanionPanel({ isOpen, onClose, onInteract }: CompanionPanelProps) {
  const { companion } = useGameStore();

  const getLoyaltyStatus = (loyalty: number) => {
    if (loyalty >= 80) return { label: "Devoted", color: "text-primary" };
    if (loyalty >= 60) return { label: "Loyal", color: "text-blue-400" };
    if (loyalty >= 40) return { label: "Neutral", color: "text-muted-foreground" };
    if (loyalty >= 20) return { label: "Disgruntled", color: "text-amber-500" };
    return { label: "Insubordinate", color: "text-destructive" };
  };

  const status = getLoyaltyStatus(companion.loyalty);

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
              <Users className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold parchment-text uppercase tracking-widest">Companion</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X size={20} />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8">
              {/* Profile Header */}
              <div className="text-center space-y-2">
                <div className="w-24 h-24 mx-auto rounded-full border-2 border-primary/30 p-1 bg-card overflow-hidden">
                    <div className="w-full h-full rounded-full bg-secondary/50 flex items-center justify-center">
                        <Users size={40} className="text-primary/40" />
                    </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold parchment-text uppercase tracking-tight">{companion.name || 'Unnamed Ally'}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest italic">{companion.description || 'A mysterious individual following your lead.'}</p>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Loyalty Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Bond Status</span>
                  </div>
                  <span className={cn("text-xs font-bold uppercase tracking-widest", status.color)}>
                    {status.label}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground uppercase tabular-nums">
                    <span>Loyalty Factor</span>
                    <span>{companion.loyalty}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${companion.loyalty}%` }}
                      transition={{ duration: 1, type: "spring" }}
                    />
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  The loyalty of your companion dictates their effectiveness in combat and willingness to provide tactical insights. A low loyalty may lead to desertion or betrayal.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Vox-Available Directives</h4>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12 uppercase tracking-widest text-[10px] border-primary/20 hover:bg-primary/5"
                  onClick={onInteract}
                >
                  <MessageSquare size={16} className="text-primary" />
                  Request Tactical Insight
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-12 uppercase tracking-widest text-[10px] border-border hover:bg-destructive/5 hover:text-destructive group"
                  disabled
                >
                  <Zap size={16} className="group-hover:text-destructive" />
                  Dismiss Operative
                </Button>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 bg-secondary/10 border-t border-border">
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase leading-tight font-mono tracking-tighter">
                Imperial Decree: All followers must maintain a loyalty factor above 20 to avoid summary execution.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full", className)} />;
}
