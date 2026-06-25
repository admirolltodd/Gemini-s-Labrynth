import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { useSettingsStore } from './store/useSettingsStore';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Skull, Settings, Play, FolderOpen, Share2, X, Key, ExternalLink, CheckCircle } from 'lucide-react';
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
  const [view, setView] = useState<'menu' | 'wizard' | 'game' | 'settings' | 'load' | 'onboarding'>(
    apiKey ? 'menu' : 'onboarding'
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [noKeyWarning, setNoKeyWarning] = useState(false);

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
        {view === 'onboarding' && (
          <OnboardingScreen
            key="onboarding"
            onComplete={(key) => {
              setApiKey(key);
              setView('menu');
            }}
          />
        )}

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

            {noKeyWarning && (
              <div className="w-full max-w-xs mb-2 px-4 py-2 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-xs uppercase tracking-widest text-center font-bold">
                Vox-Array Key required — open Settings first
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 w-full max-w-xs bg-card/80 backdrop-blur-md p-5 rounded-xl border border-border/50 shadow-xl gothic-border relative">
              <div className="gothic-corner-tl" />
              <div className="gothic-corner-tr" />
              <div className="gothic-corner-bl" />
              <div className="gothic-corner-br" />
              <MenuButton icon={<Play size={18} />} label="New Deployment" onClick={() => {
                if (!apiKey) { setNoKeyWarning(true); setTimeout(() => setNoKeyWarning(false), 3000); return; }
                setView('wizard');
              }} primary />
              <MenuButton icon={<FolderOpen size={18} />} label="Load Dataslate" onClick={() => {
                if (!apiKey) { setNoKeyWarning(true); setTimeout(() => setNoKeyWarning(false), 3000); return; }
                setView('load');
              }} />
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
            onAnimationComplete={() => { if (!draftApiKey) setDraftApiKey(apiKey); setApiKeySaved(false); }}
            className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
          >
            <Card className="w-full max-w-2xl bg-card border-border my-auto">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <CardTitle className="text-2xl parchment-text">Imperial Archives: Settings</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setView(apiKey ? 'menu' : 'onboarding')}>
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

function OnboardingScreen({ onComplete }: { onComplete: (key: string) => void }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setSaved(true);
    setTimeout(() => onComplete(trimmed), 800);
  };

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 w-full max-w-lg mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <Skull className="w-16 h-16 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="text-4xl font-bold parchment-text uppercase tracking-widest mb-2">GRIM ECHOES</h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">40K Solo Narrative RPG</p>
        <div className="w-24 h-1 bg-primary mx-auto mt-3" />
      </div>

      <Card className="w-full bg-card/80 backdrop-blur-md border-border/60 shadow-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-sm font-bold">1</span>
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-widest mb-0.5">Get a Vox-Array Key</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This game uses the Gemini AI as your Game Master. You need a free API key from Google.
              </p>
            </div>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4 border border-border/40">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 font-bold">Steps to get your key:</p>
            <ol className="space-y-2 text-xs text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>Visit <span className="font-mono text-primary">aistudio.google.com</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>Sign in with your Google account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>Click <span className="font-bold">"Get API key"</span> → <span className="font-bold">"Create API key"</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">4.</span>
                <span>Copy and paste the key below</span>
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-sm font-bold">2</span>
            </div>
            <div className="text-sm font-bold uppercase tracking-widest">Enter Your Key</div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder="AIza..."
                  value={apiKeyInput}
                  onChange={(e) => { setApiKeyInput(e.target.value); setSaved(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
            </div>
            <Button
              className={cn(
                "w-full h-12 uppercase tracking-widest font-bold text-sm transition-all",
                saved && "bg-green-600 hover:bg-green-600"
              )}
              disabled={!apiKeyInput.trim() || saved}
              onClick={handleSave}
            >
              {saved ? (
                <span className="flex items-center gap-2"><CheckCircle size={16} /> Key Authenticated</span>
              ) : (
                "Authenticate & Enter the Labyrinth"
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">
              Free tier · Key stored locally on device · Never transmitted to third parties
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
