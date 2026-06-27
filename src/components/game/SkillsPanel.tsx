import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Star, TrendingUp, Coins, Skull, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '@/lib/utils';

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

const TALENT_DESCRIPTIONS: Record<string, string> = {
  "Duelist's Flourish": "Bypass crude flak armor and parry chainswords using elegant, deadly finesse over brute strength.",
  "Relentless Advance": "Ignore difficult terrain, shrug off suppressing fire from heavy bolters, and continuously press the attack.",
  "Deadeye": "Incredibly precise with las-rifles and sniper weaponry, hitting vital organs through ceramite plating.",
  "Brutal Swing": "Unleash devastating melee attacks that can cleave through multiple weak foes or shatter carapace armor.",
  "Silver Tongue": "Talk your way out of inquisitorial purges or secure lucrative void-charters.",
  "Intimidating Presence": "Your grim demeanor breaks cultist morale and forces enemies to flinch before striking.",
  "Black Market Savvy": "Always knows where to find restricted xenotech, illegal combat-stimms, or a reliable cold-trade fence.",
  "Mechanicus Adept": "Rapidly repair damaged augmetics, bypass complex cogitator tech-locks, and soothe angry engines.",
  "Tough as Nails": "Withstand punishing amounts of physical trauma that would vaporize a lesser human.",
  "Street Survivor": "Sense mutant ambushes before they spring and scavenge rations from the grim ruins.",
};

const STAT_LABELS: Record<string, string> = {
  STR: 'Strength', DEX: 'Agility', TGH: 'Toughness',
  INT: 'Intellect', WIL: 'Willpower', AWA: 'Awareness', INF: 'Influence',
};

const DIFFICULTIES: { id: 'Narrative' | 'Balanced' | 'Grimdark'; desc: string }[] = [
  { id: 'Narrative', desc: 'Forgiving, story-first. DC 8–20.' },
  { id: 'Balanced', desc: 'Standard 41st-Millennium war. DC 10–22.' },
  { id: 'Grimdark', desc: 'Brutal and lethal. DC 12–24.' },
];

export default function SkillsPanel({ isOpen, onClose, onAction }: SkillsPanelProps) {
  const game = useGameStore();
  const { skills, talents, xp, credits, corruption, stats, difficulty, setGameState } = game;

  const corruptionColor =
    corruption >= 8 ? 'text-destructive' :
    corruption >= 5 ? 'text-amber-500' :
    'text-muted-foreground';

  const handleSpendXp = (statKey: string, currentVal: number) => {
    const newVal = currentVal + 1;
    const cost = newVal * 3;
    setGameState({
      stats: { ...stats, [statKey]: newVal },
      xp: { ...xp, unspent: xp.unspent - cost },
    });
    onAction?.(`I spend ${cost} XP raising my ${STAT_LABELS[statKey]} from ${currentVal} to ${newVal}. Narrate this advancement briefly — a single powerful sentence describing what changed in my body or mind.`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border z-[200] shadow-2xl flex flex-col"
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2">
              <Zap className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold parchment-text uppercase tracking-widest">Operative Dossier</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X size={20} />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">

              {/* Resources */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                  <TrendingUp size={14} className="text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono">{xp.total}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Total XP</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 text-center border border-border/50">
                  <Coins size={14} className="text-amber-500 mx-auto mb-1" />
                  <div className="text-lg font-bold font-mono">{credits}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Credits</div>
                </div>
                <div className={cn("bg-secondary/30 rounded-lg p-3 text-center border border-border/50", corruption >= 5 && "border-amber-500/30")}>
                  <Skull size={14} className={cn("mx-auto mb-1", corruptionColor)} />
                  <div className={cn("text-lg font-bold font-mono", corruptionColor)}>{corruption}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Corruption</div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Bio-Metrics</div>
                <div className="grid grid-cols-7 gap-1">
                  {Object.entries(stats).map(([key, val]) => (
                    <div key={key} className="text-center bg-secondary/20 rounded p-1.5 border border-border/30">
                      <div className="text-[8px] text-muted-foreground uppercase">{key}</div>
                      <div className="text-sm font-bold font-mono">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threat Level / Difficulty */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Threat Level</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIFFICULTIES.map((d) => (
                    <Button
                      key={d.id}
                      variant={difficulty === d.id ? 'default' : 'outline'}
                      onClick={() => setGameState({ difficulty: d.id })}
                      className={cn(
                        'h-auto py-2 px-1 flex flex-col items-center gap-0.5 text-[10px] uppercase tracking-tight',
                        difficulty === d.id
                          ? 'bg-primary text-white border-primary'
                          : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                      )}
                    >
                      {d.id}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                  {DIFFICULTIES.find((d) => d.id === difficulty)?.desc ?? 'Sets the difficulty of skill checks. Takes effect on your next action.'}
                </p>
              </div>

              {/* XP Spend */}
              {xp.unspent > 0 && onAction && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
                      <ChevronUp size={12} /> Spend XP
                    </div>
                    <Badge variant="outline" className="text-[9px] border-primary/40 text-primary bg-primary/10">
                      {xp.unspent} available
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(stats).map(([key, val]) => {
                      const cost = (val + 1) * 3;
                      const canAfford = xp.unspent >= cost;
                      return (
                        <div key={key} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                          <span className="text-xs text-muted-foreground">
                            {STAT_LABELS[key]} <span className="text-foreground font-mono font-bold">{val}→{val + 1}</span>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canAfford}
                            onClick={() => handleSpendXp(key, val)}
                            className={cn(
                              "h-6 px-2 text-[9px] uppercase tracking-widest",
                              canAfford && "border-primary/40 text-primary hover:bg-primary hover:text-white"
                            )}
                          >
                            {cost} XP
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Sanctioned Skills</div>
                {skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No skills on record.</p>
                ) : (
                  <div className="space-y-2">
                    {skills.map((skill) => (
                      <div key={skill} className="flex items-center justify-between bg-secondary/20 rounded-md px-3 py-2 border border-border/40">
                        <span className="text-sm font-medium uppercase tracking-tight">{skill}</span>
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/40 bg-primary/10 h-5">
                          +2 Bonus
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Talents */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Unique Augment / Talent</div>
                {talents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No talents acquired.</p>
                ) : (
                  <div className="space-y-2">
                    {talents.map((talent) => (
                      <div key={talent} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Star size={12} className="text-primary" />
                          <span className="text-xs font-bold uppercase tracking-widest text-primary">{talent}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-serif">
                          {TALENT_DESCRIPTIONS[talent] ?? 'A specialized martial or cognitive augment.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </ScrollArea>

          <div className="p-3 bg-secondary/10 border-t border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-tighter font-mono text-center">
              Raise Stat: Cost = New Value × 3 XP · Skill: 10 XP · Talent: 15 XP
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
