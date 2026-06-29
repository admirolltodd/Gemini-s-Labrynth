import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { useSettingsStore } from './store/useSettingsStore';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Skull, Settings, Play, FolderOpen, Share2, X, Key, ExternalLink, CheckCircle, Music, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import CharacterWizard from './components/wizard/CharacterWizard';
import GameScreen from './components/game/GameScreen';
import LoadGameMenu from './components/menu/LoadGameMenu';
import { startAmbient, stopAmbient, setAmbientVolume } from './lib/ambient';
import { App as CapApp } from '@capacitor/app';

import { cn } from '@/lib/utils';

export default function App() {
  const {
    theme, fontSize, fontFamily, apiKey, musicEnabled, musicVolume,
    setApiKey, setTheme, setFontSize, setFontFamily, setMusicEnabled, setMusicVolume,
  } = useSettingsStore();
  const [view, setView] = useState<'menu' | 'wizard' | 'game' | 'settings' | 'load' | 'onboarding'>(
    apiKey ? 'menu' : 'onboarding'
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [noKeyWarning, setNoKeyWarning] = useState(false);
  const gameInProgress = useGameStore((s) => s.history.length > 0);

  // Keep the latest view available to the (once-registered) back handler.
  const viewRef = React.useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Android hardware back button: sub-screens return to the menu; from the
  // menu it exits the app. (In-game state auto-persists, so this is safe.)
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    CapApp.addListener('backButton', () => {
      const v = viewRef.current;
      if (v === 'menu' || v === 'onboarding') {
        CapApp.exitApp();
      } else {
        setView('menu');
      }
    }).then((h) => { handle = h; }).catch(() => {});
    return () => { handle?.remove(); };
  }, []);

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

  // Procedural ambient music: start/stop with the toggle, track volume live.
  useEffect(() => {
    if (musicEnabled) {
      startAmbient(musicVolume);
    } else {
      stopAmbient();
    }
  }, [musicEnabled]);

  useEffect(() => {
    if (musicEnabled) setAmbientVolume(musicVolume);
  }, [musicVolume, musicEnabled]);

  // Stop audio cleanly if the app unmounts.
  useEffect(() => () => stopAmbient(), []);

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
        "h-[100dvh] w-full flex flex-col overflow-hidden transition-colors duration-500",
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
              {gameInProgress && (
                <MenuButton icon={<Play size={18} />} label="Continue Deployment" onClick={() => setView('game')} primary />
              )}
              <MenuButton icon={<Play size={18} />} label="New Deployment" onClick={() => {
                if (!apiKey) { setNoKeyWarning(true); setTimeout(() => setNoKeyWarning(false), 3000); return; }
                setView('wizard');
              }} primary={!gameInProgress} />
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
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <GameScreen onBack={() => setView('menu')} />
          </motion.div>
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

                {/* Ambient Music */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Music size={14} className="text-primary" /> Ambient Vox-Choir
                    </label>
                    <button
                      role="switch"
                      aria-checked={musicEnabled}
                      onClick={() => setMusicEnabled(!musicEnabled)}
                      className={cn(
                        "relative w-12 h-6 rounded-full transition-colors shrink-0",
                        musicEnabled ? "bg-primary" : "bg-secondary border border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                          musicEnabled && "translate-x-6"
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A procedural grimdark drone, generated on-device. No downloads, no data — pure atmosphere.
                  </p>
                  <div className={cn("flex items-center gap-3 transition-opacity", !musicEnabled && "opacity-40 pointer-events-none")}>
                    <Volume2 size={16} className="text-muted-foreground shrink-0" />
                    <input
                      type="range" min="0" max="100"
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      value={Math.round(musicVolume * 100)}
                      onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                      disabled={!musicEnabled}
                    />
                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
                      {Math.round(musicVolume * 100)}%
                    </span>
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

function OnboardingScreen({ onComplete }: { onComplete: (key: string) => void; key?: React.Key }) {
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
      className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full max-w-lg mx-auto"
    >
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <Skull className="w-14 h-14 text-primary mx-auto mb-3 drop-shadow-[0_0_12px_rgba(200,0,0,0.6)]" />
        </motion.div>
        <h1 className="text-5xl font-bold parchment-text uppercase tracking-widest mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">GRIM ECHOES</h1>
        <p
          className="text-xs font-bold uppercase tracking-[0.35em]"
          style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)' }}
        >
          40K Solo Narrative RPG
        </p>
        <div className="w-24 h-[2px] bg-primary mx-auto mt-3 shadow-[0_0_8px_rgba(200,0,0,0.8)]" />
      </div>

      <Card className="w-full bg-black/85 backdrop-blur-md border border-primary/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary border border-primary/60 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(200,0,0,0.5)]">
              <span className="text-white text-sm font-bold">1</span>
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-widest mb-1 text-white">Get a Vox-Array Key</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This game uses Gemini AI as your Game Master. You need a free API key from Google.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/80 rounded-lg p-4 border border-zinc-700/60">
            <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-3 font-bold">Steps to get your key:</p>
            <ol className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0 w-4">1.</span>
                <span>Visit <span className="font-mono text-primary font-bold">aistudio.google.com</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0 w-4">2.</span>
                <span>Sign in with your Google account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0 w-4">3.</span>
                <span>Click <span className="font-bold text-white">"Get API key"</span> → <span className="font-bold text-white">"Create API key"</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0 w-4">4.</span>
                <span>Copy and paste the key below</span>
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary border border-primary/60 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(200,0,0,0.5)]">
              <span className="text-white text-sm font-bold">2</span>
            </div>
            <div className="text-sm font-bold uppercase tracking-widest text-white">Enter Your Key</div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md pl-9 pr-3 py-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-zinc-600"
                placeholder="AIza..."
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setSaved(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <Button
              className={cn(
                "w-full h-11 uppercase font-bold text-xs tracking-[0.15em] transition-all border-0",
                saved
                  ? "bg-green-700 hover:bg-green-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-white shadow-[0_0_12px_rgba(200,0,0,0.4)]"
              )}
              disabled={!apiKeyInput.trim() || saved}
              onClick={handleSave}
            >
              {saved ? (
                <span className="flex items-center gap-2"><CheckCircle size={15} /> Key Authenticated</span>
              ) : (
                "Authenticate & Enter the Labyrinth"
              )}
            </Button>
            <p className="text-[9px] text-zinc-600 text-center uppercase tracking-wider leading-relaxed">
              Free tier · Stored locally · Never transmitted to third parties
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
