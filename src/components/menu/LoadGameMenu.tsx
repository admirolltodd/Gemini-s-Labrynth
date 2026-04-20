import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, Trash2, Play, ChevronLeft, Skull } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '@/lib/utils';

interface LoadGameMenuProps {
  onLoad: () => void;
  onBack: () => void;
}

export default function LoadGameMenu({ onLoad, onBack }: LoadGameMenuProps) {
  const [saves, setSaves] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadGame } = useGameStore();

  useEffect(() => {
    refreshSaves();
  }, []);

  const refreshSaves = async () => {
    setLoading(true);
    try {
      const list = await window.electronAPI.listSaves();
      setSaves(list);
    } catch (error) {
      console.error("Failed to list saves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (name: string) => {
    await loadGame(name);
    onLoad();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-2xl mx-auto"
    >
      <div className="mb-8 text-center">
        <FolderOpen className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-4xl font-bold parchment-text uppercase tracking-widest">Load Operative</h2>
        <div className="w-24 h-1 bg-primary mx-auto mt-2" />
      </div>

      <Card className="w-full bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground italic">
                Scanning vox-channels for saved data...
              </div>
            ) : saves.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <Skull className="w-8 h-8 opacity-20" />
                <p className="italic">No active operatives found in the archives.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saves.map((save) => (
                  <div 
                    key={save}
                    className="group flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/20 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    onClick={() => handleLoad(save)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border group-hover:border-primary/50">
                        <Play size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-bold parchment-text uppercase tracking-tight">{save.replace('.json', '')}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Data File: {save}</div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Delete logic could go here
                      }}
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

      <Button variant="ghost" className="mt-8 gap-2 uppercase tracking-widest text-xs" onClick={onBack}>
        <ChevronLeft size={16} /> Return to Main Menu
      </Button>
    </motion.div>
  );
}
