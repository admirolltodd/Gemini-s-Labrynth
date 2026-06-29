import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, Trash2, Play, ChevronLeft, Skull, UploadCloud, DownloadCloud } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { useGameStore, listSaves, deleteSave } from '../../store/useGameStore';
import { exportBackup, importBackup, countSaves } from '../../lib/backup';
import { cn } from '@/lib/utils';

interface LoadGameMenuProps {
  onLoad: () => void;
  onBack: () => void;
}

export default function LoadGameMenu({ onLoad, onBack }: LoadGameMenuProps) {
  const [saves, setSaves] = useState<Array<{ name: string; savedAt: string; archetype: string }>>([]);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadGame } = useGameStore();

  const refreshSaves = () => setSaves(listSaves().sort((a, b) => b.savedAt.localeCompare(a.savedAt)));

  useEffect(() => { refreshSaves(); }, []);

  const flash = (kind: 'ok' | 'err', msg: string) => {
    setStatus({ kind, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleBackup = async () => {
    if (countSaves() === 0) { flash('err', 'No saved operatives to back up yet.'); return; }
    try {
      await exportBackup();
    } catch (e) {
      flash('err', `Backup failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    try {
      const res = await importBackup(file);
      refreshSaves();
      flash('ok', `Restored ${res.saveCount} operative${res.saveCount === 1 ? '' : 's'}.`);
    } catch (err) {
      flash('err', err instanceof Error ? err.message : 'Restore failed.');
    }
  };

  const handleLoad = async (name: string) => {
    await loadGame(name);
    onLoad();
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    deleteSave(name);
    refreshSaves();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 w-full max-w-2xl mx-auto"
    >
      <div className="mb-6 text-center">
        <FolderOpen className="w-10 h-10 text-primary mx-auto mb-3" />
        <h2 className="text-3xl sm:text-4xl font-bold parchment-text uppercase tracking-widest">Load Operative</h2>
        <div className="w-24 h-1 bg-primary mx-auto mt-2" />
      </div>

      <Card className="w-full bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="h-[350px] sm:h-[400px] pr-2">
            {saves.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-16">
                <Skull className="w-8 h-8 opacity-20" />
                <p className="italic text-sm">No active operatives found in the archives.</p>
                <p className="text-[10px] uppercase tracking-widest opacity-60">Start a New Deployment and save to create a record.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saves.map((save) => (
                  <div
                    key={save.name}
                    className="group flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/20 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    onClick={() => handleLoad(save.name)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border group-hover:border-primary/50 shrink-0">
                        <Play size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold parchment-text uppercase tracking-tight truncate">{save.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                          {save.archetype || 'Operative'} · {formatDate(save.savedAt)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      )}
                      onClick={(e) => handleDelete(e, save.name)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Backup / Restore */}
      <div className="w-full mt-4 space-y-2">
        {status && (
          <div className={cn(
            "text-[11px] uppercase tracking-widest text-center font-bold px-3 py-2 rounded-lg border",
            status.kind === 'ok'
              ? "text-primary border-primary/40 bg-primary/10"
              : "text-destructive border-destructive/40 bg-destructive/10"
          )}>
            {status.msg}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2 uppercase tracking-widest text-[10px] h-11 border-primary/30 hover:bg-primary/10"
            onClick={handleBackup}
          >
            <UploadCloud size={15} /> Back Up to Drive
          </Button>
          <Button
            variant="outline"
            className="gap-2 uppercase tracking-widest text-[10px] h-11 border-border/60 hover:bg-secondary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <DownloadCloud size={15} /> Restore
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground text-center uppercase tracking-wider leading-relaxed">
          Back Up opens the share sheet — choose Save to Drive. Restore reads a backup file back in.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleRestoreFile}
        />
      </div>

      <Button variant="ghost" className="mt-4 gap-2 uppercase tracking-widest text-xs" onClick={onBack}>
        <ChevronLeft size={16} /> Return to Main Menu
      </Button>
    </motion.div>
  );
}
