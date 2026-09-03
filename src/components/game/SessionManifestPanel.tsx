import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ClipboardList, HeartPulse, Crosshair, MapPin, AlertTriangle, Skull, Flame, BookOpen, Download, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useGameStore } from '../../store/useGameStore';
import { exportChronicle } from '../../lib/backup';
import { EMPTY_CHRONICLE } from '../../lib/chronicle';
import { cn } from '@/lib/utils';

interface SessionManifestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FATIGUE_LABELS = ['Fresh', 'Winded', 'Tiring', 'Exhausted', 'Collapsing'];

export default function SessionManifestPanel({ isOpen, onClose }: SessionManifestPanelProps) {
  const game = useGameStore();
  const { hp, fatigue, afflictions, weapons, gear, chapter, corruption, companion } = game;
  const chronicle = game.chronicle ?? EMPTY_CHRONICLE;
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    try {
      await exportChronicle(game);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (e) {
      console.error('Chronicle export failed:', e);
    }
  };

  const fatigueTier = Math.max(0, Math.min(4, fatigue || 0));
  const hpPercent = hp.max > 0 ? (hp.current / hp.max) * 100 : 0;
  const hpColor = hpPercent > 60 ? 'text-primary' : hpPercent > 30 ? 'text-amber-500' : 'text-destructive';

  // Derived active modifiers — surfaced so the player understands their penalties.
  const modifiers: { label: string; tone: 'bad' | 'warn' }[] = [];
  if (hpPercent <= 30) modifiers.push({ label: 'Grievously Wounded — actions impaired', tone: 'bad' });
  if (fatigueTier >= 3) modifiers.push({ label: 'Exhausted — physical checks penalised', tone: 'bad' });
  else if (fatigueTier >= 1) modifiers.push({ label: 'Fatigued — stamina waning', tone: 'warn' });
  if (corruption >= 8) modifiers.push({ label: 'Soul Imperilled — the Warp claws close', tone: 'bad' });
  else if (corruption >= 5) modifiers.push({ label: 'Warp-Tainted — scrutiny rises', tone: 'warn' });
  if ((afflictions || []).length === 0 && modifiers.length === 0) {
    modifiers.push({ label: 'No active penalties', tone: 'warn' });
  }

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
              <ClipboardList className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold parchment-text uppercase tracking-widest">Session Manifest</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X size={20} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 font-mono">

            {/* Flesh Status */}
            <section>
              <SectionHeader icon={<HeartPulse size={13} />} label="Flesh Status" />
              <div className="space-y-2">
                <Row label="Wounds">
                  <span className={cn('font-bold', hpColor)}>{hp.current}/{hp.max}</span>
                </Row>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={cn('h-full transition-all', hpPercent > 60 ? 'bg-primary' : hpPercent > 30 ? 'bg-amber-500' : 'bg-destructive')} style={{ width: `${hpPercent}%` }} />
                </div>
                <Row label="Fatigue">
                  <span className={cn('font-bold', fatigueTier >= 3 ? 'text-destructive' : fatigueTier >= 1 ? 'text-amber-500' : 'text-muted-foreground')}>
                    Tier {fatigueTier} · {FATIGUE_LABELS[fatigueTier]}
                  </span>
                </Row>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((t) => (
                    <div key={t} className={cn('h-1.5 flex-1 rounded-full', t <= fatigueTier ? (fatigueTier >= 3 ? 'bg-destructive' : 'bg-amber-500') : 'bg-secondary')} />
                  ))}
                </div>
                <div className="pt-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Afflictions</div>
                  {(afflictions || []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">None — flesh intact.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {afflictions.map((a) => (
                        <span key={a} className="flex items-center gap-1 text-[10px] uppercase tracking-tight bg-destructive/10 text-destructive border border-destructive/30 rounded px-1.5 py-0.5">
                          <Flame size={9} /> {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Arsenal */}
            <section>
              <SectionHeader icon={<Crosshair size={13} />} label="Arsenal" />
              {(weapons || []).length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Unarmed.</p>
              ) : (
                <div className="space-y-1.5">
                  {weapons.map((w, i) => {
                    const melee = w.maxAmmo === 0;
                    const low = !melee && w.ammo <= w.maxAmmo * 0.25;
                    const empty = !melee && w.ammo <= 0;
                    return (
                      <div key={`${w.name}-${i}`} className="flex items-center justify-between bg-secondary/20 border border-border/40 rounded px-2.5 py-1.5">
                        <span className="text-xs uppercase tracking-tight">{w.name}</span>
                        {melee ? (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Melee</span>
                        ) : (
                          <span className={cn('text-xs font-bold tabular-nums', empty ? 'text-destructive' : low ? 'text-amber-500' : 'text-foreground')}>
                            {w.ammo}/{w.maxAmmo}{empty && ' ✗'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {gear.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Gear</div>
                  <div className="flex flex-wrap gap-1.5">
                    {gear.map((g, i) => (
                      <span key={`${g}-${i}`} className="text-[10px] uppercase tracking-tight bg-secondary/30 border border-border/40 rounded px-1.5 py-0.5">{g}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Location */}
            <section>
              <SectionHeader icon={<MapPin size={13} />} label="Location" />
              <p className="text-xs uppercase tracking-tight text-foreground">{chapter || 'Unknown Sector'}</p>
              {companion.name && (
                <p className="text-[11px] text-muted-foreground mt-1">Alongside {companion.name} ({companion.loyalty}% bond)</p>
              )}
            </section>

            {/* Active Modifiers */}
            <section>
              <SectionHeader icon={<AlertTriangle size={13} />} label="Active Modifiers" />
              <div className="space-y-1.5">
                {modifiers.map((m, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-2 text-[11px] rounded px-2 py-1.5 border',
                    m.tone === 'bad' ? 'text-destructive border-destructive/30 bg-destructive/5' : 'text-amber-500 border-amber-500/30 bg-amber-500/5'
                  )}>
                    {m.tone === 'bad' ? <Skull size={11} /> : <AlertTriangle size={11} />}
                    <span className="uppercase tracking-tight">{m.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Chronicle — what the GM remembers */}
            <section>
              <SectionHeader icon={<BookOpen size={13} />} label="Chronicle" />
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Open Threads</div>
                  {chronicle.threads.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">Nothing unresolved.</p>
                  ) : (
                    <ul className="space-y-1">
                      {chronicle.threads.map((th) => (
                        <li key={`${th.t}-${th.text}`} className="text-[11px] leading-snug border-l border-amber-500/40 pl-2">
                          <span className="text-muted-foreground font-mono text-[9px] mr-1">T{th.t}</span>{th.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Persons</div>
                  {chronicle.persons.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">No names worth remembering yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {chronicle.persons.map((p) => (
                        <li key={p.name} className="text-[11px] leading-snug">
                          <span className="uppercase tracking-tight font-bold">{p.name}</span>
                          {p.note && <span className="text-muted-foreground"> — {p.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {chronicle.vows.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Vows &amp; Debts</div>
                    <ul className="space-y-1">
                      {chronicle.vows.map((v) => (
                        <li key={`${v.t}-${v.text}`} className="text-[11px] leading-snug border-l border-primary/40 pl-2">
                          <span className="text-muted-foreground font-mono text-[9px] mr-1">T{v.t}</span>{v.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className={cn(
                    'w-full h-8 gap-1.5 text-[10px] uppercase tracking-widest',
                    exported ? 'border-primary bg-primary/10 text-primary' : 'border-primary/30 hover:bg-primary/10'
                  )}
                >
                  {exported ? <Check size={12} /> : <Download size={12} />}
                  {exported ? 'Exported' : 'Export Chronicle (.md)'}
                </Button>
              </div>
            </section>

          </div>

          <div className="p-3 bg-secondary/10 border-t border-border">
            <p className="text-[9px] text-muted-foreground uppercase tracking-tighter font-mono text-center">
              The galaxy keeps no mercy. Manage your flesh, your rounds, your soul.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-2 pb-1 border-b border-border/40">
      {icon} {label}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground uppercase tracking-widest">{label}</span>
      {children}
    </div>
  );
}
