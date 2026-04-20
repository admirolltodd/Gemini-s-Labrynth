import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Trash2, Zap, Heart, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useGameStore } from '../../store/useGameStore';
import { cn } from '@/lib/utils';

interface InventoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUseItem: (itemName: string) => void;
}

export default function InventoryPanel({ isOpen, onClose, onUseItem }: InventoryPanelProps) {
  const { gear, setGameState } = useGameStore();

  const handleDiscard = (itemName: string) => {
    const newGear = gear.filter(item => item !== itemName);
    setGameState({ gear: newGear });
  };

  const handleUse = (itemName: string) => {
    onUseItem(itemName);
  };

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
              <Package className="text-primary w-5 h-5" />
              <h2 className="text-lg font-bold parchment-text uppercase tracking-widest">Inventory</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
              <X size={20} />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {gear.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4 py-20">
                <Package size={48} strokeWidth={1} />
                <p className="text-xs uppercase tracking-widest italic font-mono">Archive Empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gear.map((item, index) => (
                  <motion.div
                    key={`${item}-${index}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-secondary/30 border border-border/50 rounded-lg p-3 hover:bg-secondary/50 transition-all hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold parchment-text uppercase tracking-tight">{item}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDiscard(item)}
                          title="Discard"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-7 text-[10px] uppercase tracking-widest bg-primary/5 hover:bg-primary/20 border-primary/20"
                        onClick={() => handleUse(item)}
                      >
                        <Zap size={12} className="mr-1" /> Use
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 bg-secondary/20 border-t border-border">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              <span>Encumbrance</span>
              <span>{gear.length} / 20</span>
            </div>
            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                    "h-full transition-all duration-500",
                    gear.length > 15 ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${(gear.length / 20) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
