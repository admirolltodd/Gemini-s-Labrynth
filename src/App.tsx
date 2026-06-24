import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { useSettingsStore } from './store/useSettingsStore';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Skull, Settings, Play, FolderOpen, Share2, X } from 'lucide-react';
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
    setApiKey, setTheme, setFontSize, setFontFamily,
  } = useSettingsStore();
  const [view, setView] = useState<'menu' | 'wizard' | 'game' | 'settings' | 'load'>('menu');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [draftApiKey, setDraftApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    const isDark = theme === 'dark' || theme === 'grimdark';
    document.documentElement.className = `theme-${theme} ${isDark ? 'dark' : ''}`;
    
    // Set data-theme for certain components
    document.documentElement.setAttribute('data-theme', theme);
    
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
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="mb-8 text-center bg-card/60 backdrop-blur-md p-6 sm:p-8 rounded-xl border border-border/50 shadow-2xl gothic-border w-fit relative mx-auto">
              <div className="gothic-corner-tl" />
              <div className="gothic-corner-tr" />
              <div className="gothic-corner-bl" />
              <div className="gothic-corner-br" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-block mb-4"
              >
                <Skull className="w-16 h-16 sm:w-24 sm:h-24 text-primary drop-shadow-md" />
              </motion.div>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter parchment-text mb-2">
                GRIM ECHOES
              </h1>
              <p className="text-base sm:text-xl text-foreground font-bold tracking-widest uppercase">
                40K Epic Narrative RPG
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-xs bg-card/80 backdrop-blur-md p-5 rounded-xl border border-border/50 shadow-xl gothic-border relative">
              <div className="gothic-corner-tl" />
              <div className="gothic-corner-tr" />
              <div className="gothic-corner-bl" />
              <div className="gothic-corner-br" />
              <MenuButton icon={<Play size={18} />} label="New Deployment" onClick={() => setView('wizard')} primary />
              <MenuButton icon={<FolderOpen size={18} />} label="Load Dataslate" onClick={() => setView('load')} />
              <MenuButton icon={<Settings size={18} />} label="Settings" onClick={() => setView('settings')} />
              <MenuButton icon={<Share2 size={18} />} label="Share Dataslate" onClick={handleShare} />
            </div>

            <div className="mt-6 text-xs text-foreground font-semibold opacity-70 uppercase tracking-tighter max-w-lg text-center bg-card/40 backdrop-blur-sm p-3 rounded">
              "Amidst the towering gothic ruins and fire-scorched skies, the Emperor's Angels wage eternal war. In the grim darkness of the far future, there is only war."
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
          <GameScreen key="game" onBack={() => setView('menu')} />
        )}

        {view === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onAnimationComplete={() => { setDraftApiKey(apiKey); setApiKeySaved(false); }}
            className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
          >
            <Card className="w-full max-w-2xl bg-card border-border my-auto">
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
                  {apiKey && !apiKeySaved && (
                    <p className="text-[10px] text-primary uppercase tracking-widest">Key active — paste a new one to replace it</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="password"
                      className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder={apiKey ? "••••••••••••••••" : "Paste your Gemini API key..."}
                      value={draftApiKey}
                      onChange={(e) => { setDraftApiKey(e.target.value); setApiKeySaved(false); }}
                    />
                    <Button
                      variant={apiKeySaved ? "default" : "outline"}
                      className={cn("shrink-0 uppercase text-xs tracking-widest", apiKeySaved && "bg-primary text-white")}
                      onClick={() => {
                        if (draftApiKey.trim()) {
                          setApiKey(draftApiKey.trim());
                          setApiKeySaved(true);
                        }
                      }}
                      disabled={!draftApiKey.trim() || apiKeySaved}
                    >
                      {apiKeySaved ? "Saved ✓" : "Save Key"}
                    </Button>
                  </div>
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
