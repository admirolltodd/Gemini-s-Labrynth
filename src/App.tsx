import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { useSettingsStore } from './store/useSettingsStore';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Skull, Settings, Play, FolderOpen, Share2, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import CharacterWizard from './components/wizard/CharacterWizard';
import GameScreen from './components/game/GameScreen';
import LoadGameMenu from './components/menu/LoadGameMenu';

import { cn } from '@/lib/utils';

export default function App() {
  const { 
    theme, fontSize, fontFamily, apiKey, 
    audioEnabled, narratorVoice, 
    setApiKey, setTheme, setFontSize, setFontFamily, 
    setAudioEnabled, setNarratorVoice 
  } = useSettingsStore();
  const [view, setView] = useState<'menu' | 'wizard' | 'game' | 'settings' | 'load'>('menu');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [theme]);

  const handleShare = () => {
    const gameState = useGameStore.getState();
    // Extract only data
    const { setGameState, addHistory, resetGame, saveGame, loadGame, ...data } = gameState;
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    alert("Operative data copied to clipboard. You can share this JSON with others.");
  };

  return (
    <div 
      className={cn(
        "min-h-screen w-full flex flex-col overflow-hidden transition-colors duration-500",
        theme === 'grimdark' ? 'grimdark-gradient' : ''
      )}
      style={{ fontSize: `${fontSize}px`, fontFamily }}
    >
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground text-[10px] uppercase tracking-[0.3em] py-1 text-center font-bold z-[100]">
          Vox-Array Offline: Internet Connection Required for Game Master
        </div>
      )}
      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <div className="mb-12 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-block mb-4"
              >
                <Skull className="w-24 h-24 text-primary" />
              </motion.div>
              <h1 className="text-6xl font-bold tracking-tighter parchment-text mb-2">
                GRIM ECHOES
              </h1>
              <p className="text-xl text-muted-foreground tracking-widest uppercase">
                40K Solo Narrative RPG
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
              <MenuButton icon={<Play size={18} />} label="New Game" onClick={() => setView('wizard')} primary />
              <MenuButton icon={<FolderOpen size={18} />} label="Load Game" onClick={() => setView('load')} />
              <MenuButton icon={<Settings size={18} />} label="Settings" onClick={() => setView('settings')} />
              <MenuButton icon={<Share2 size={18} />} label="Share Game" onClick={handleShare} />
              <MenuButton icon={<RefreshCw size={18} />} label="Check for Updates" onClick={() => {}} />
              <MenuButton icon={<X size={18} />} label="Exit" onClick={() => {}} />
            </div>

            <div className="mt-12 text-xs text-muted-foreground opacity-50 uppercase tracking-tighter">
              In the grim darkness of the far future, there is only war.
            </div>
          </motion.div>
        )}

        {view === 'load' && (
          <LoadGameMenu 
            onLoad={() => setView('game')} 
            onBack={() => setView('menu')} 
          />
        )}

        {view === 'wizard' && (
          <CharacterWizard 
            onComplete={() => setView('game')} 
            onCancel={() => setView('menu')} 
          />
        )}

        {view === 'game' && (
          <GameScreen key="game" />
        )}

        {view === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex items-center justify-center p-8"
          >
            <Card className="w-full max-w-2xl bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <CardTitle className="text-2xl parchment-text">Imperial Archives: Settings</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setView('menu')}>
                  <X size={20} />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Pict-Feed Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ThemeOption label="Light" theme="light" />
                    <ThemeOption label="Dark" theme="dark" />
                    <ThemeOption label="Grimdark" theme="grimdark" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Vox-Array Key (Gemini API)</label>
                  <input 
                    type="password" 
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Enter your API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Script Size</label>
                    <input 
                      type="range" min="12" max="24" 
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Script Family</label>
                    <select 
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                    >
                      <option value="Inter">Standard (Inter)</option>
                      <option value="Playfair Display">High Gothic (Serif)</option>
                      <option value="JetBrains Mono">Cogitator (Mono)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold parchment-text uppercase">Vox-Array Narrative (TTS)</h4>
                      <p className="text-xs text-muted-foreground">Enable audio read-aloud for narrative and dialogues.</p>
                    </div>
                    <Button 
                      variant={audioEnabled ? "default" : "outline"}
                      className={cn("w-24 uppercase tracking-[0.2em] text-[10px]", audioEnabled && "bg-primary text-white")}
                      onClick={() => setAudioEnabled(!audioEnabled)}
                    >
                      {audioEnabled ? 'Active' : 'Disabled'}
                    </Button>
                  </div>
                </div>

                {audioEnabled && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Narrator Vox-Profile</label>
                    <select 
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none"
                      value={narratorVoice}
                      onChange={(e) => setNarratorVoice(e.target.value)}
                    >
                      <option value="Kore">Kore (Balanced)</option>
                      <option value="Puck">Puck (Agile)</option>
                      <option value="Charon">Charon (Ancient)</option>
                      <option value="Fenrir">Fenrir (Combat)</option>
                      <option value="Zephyr">Zephyr (Ethereal)</option>
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ icon, label, onClick, primary = false }: { icon: React.ReactNode, label: string, onClick: () => void, primary?: boolean }) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      className={cn(
        "h-12 justify-start gap-4 px-6 text-sm uppercase tracking-widest font-semibold transition-all duration-300",
        !primary && "border-border hover:bg-primary hover:text-white hover:border-primary"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

function ThemeOption({ label, theme }: { label: string, theme: 'light' | 'dark' | 'grimdark' }) {
  const currentTheme = useSettingsStore(s => s.theme);
  const setTheme = useSettingsStore(s => s.setTheme);
  const active = currentTheme === theme;

  return (
    <Button
      variant={active ? "default" : "outline"}
      className={cn(
        "w-full text-xs uppercase tracking-tighter",
        active && "bg-primary text-white"
      )}
      onClick={() => setTheme(theme)}
    >
      {label}
    </Button>
  );
}
