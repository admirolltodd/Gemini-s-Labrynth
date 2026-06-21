import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useGameStore } from "../../store/useGameStore";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  Book,
  Users,
  Sword,
  Crosshair,
  Brain,
  Heart,
  Dice5,
  Loader2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Archetype, Difficulty, Stats } from "../../types/game";
import {
  generatePrebuiltCharacters,
  QuickStartCharacter,
} from "../../lib/gemini";
import { useSettingsStore } from "../../store/useSettingsStore";

const ARCHETYPES: {
  id: Archetype;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  activeClass: string;
}[] = [
  {
    id: "Guardsman Veteran",
    description: "A hardened survivor of a hundred meat-grinder campaigns, clinging to their lasgun and faith in the God-Emperor amidst the slaughter.",
    icon: <Shield size={20} />,
    colorClass: "text-emerald-500",
    bgClass:
      "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50",
    activeClass: "border-emerald-500 bg-emerald-500/10",
  },
  {
    id: "Exiled Psyker",
    description: "A dangerous mutant wielding the very fabric of the Warp. Untrained, hunted, and constantly walking the precipice of daemonic possession.",
    icon: <Zap size={20} />,
    colorClass: "text-purple-500",
    bgClass: "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/50",
    activeClass: "border-purple-500 bg-purple-500/10",
  },
  {
    id: "Hive Ganger",
    description: "Scum born in the toxic, lightless underhive sumps. Ruthless, quick with a blade, and accustomed to a life where only the strong survive.",
    icon: <Users size={20} />,
    colorClass: "text-yellow-500",
    bgClass: "bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/50",
    activeClass: "border-yellow-500 bg-yellow-500/10",
  },
  {
    id: "Rogue Trader Scion",
    description: "An arrogant noble given a Warrant of Trade to explore the dark stars. Bound by honor, driven by wealth, armed with ancient relics.",
    icon: <Book size={20} />,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/50",
    activeClass: "border-blue-500 bg-blue-500/10",
  },
  {
    id: "Penitent Sister",
    description: "A disgraced warrior of the Adepta Sororitas, seeking redemption in the fire of battle. Her faith is her armor, her bolter her absolution.",
    icon: <Sword size={20} />,
    colorClass: "text-orange-500",
    bgClass: "bg-orange-500/5 border-orange-500/20 hover:border-orange-500/50",
    activeClass: "border-orange-500 bg-orange-500/10",
  },
  {
    id: "Tech-Priest Initiate",
    description: "A low-ranking acolyte of the Machine Cult heavily augmented with cybernetics, obsessed with recovering lost archeotech from the dark age.",
    icon: <Brain size={20} />,
    colorClass: "text-red-500",
    bgClass: "bg-red-500/5 border-red-500/20 hover:border-red-500/50",
    activeClass: "border-red-500 bg-red-500/10",
  },
  {
    id: "Criminal Conscript",
    description: "A murderer or thief given the choice between the executioner's bolt and a penal legion. Highly expendable, highly dangerous.",
    icon: <Crosshair size={20} />,
    colorClass: "text-zinc-400",
    bgClass: "bg-zinc-500/5 border-zinc-500/20 hover:border-zinc-500/50",
    activeClass: "border-zinc-500 bg-zinc-500/10",
  },
  {
    id: "Civilian Survivor",
    description: "An ordinary Administratum clerk, hab-worker, or merchant caught in the wrong place at the wrong time. Armed only with grit and desperation.",
    icon: <Heart size={20} />,
    colorClass: "text-teal-500",
    bgClass: "bg-teal-500/5 border-teal-500/20 hover:border-teal-500/50",
    activeClass: "border-teal-500 bg-teal-500/10",
  },
];

const STAT_ARRAYS: { name: string; stats: Stats }[] = [
  {
    name: "Warrior",
    stats: { STR: 4, DEX: 3, TGH: 4, INT: 1, WIL: 2, AWA: 1, INF: 1 },
  },
  {
    name: "Operative",
    stats: { STR: 2, DEX: 4, TGH: 2, INT: 3, WIL: 1, AWA: 3, INF: 1 },
  },
  {
    name: "Scholar",
    stats: { STR: 1, DEX: 2, TGH: 2, INT: 4, WIL: 3, AWA: 3, INF: 1 },
  },
  {
    name: "Face",
    stats: { STR: 1, DEX: 2, TGH: 2, INT: 2, WIL: 2, AWA: 3, INF: 4 },
  },
];

const TALENT_DETAILS: { name: string; description: string }[] = [
  {
    name: "Duelist's Flourish",
    description:
      "A master of the blade. Bypass crude flak armor and parry chainswords using elegant, deadly finesse over brute strength.",
  },
  {
    name: "Relentless Advance",
    description:
      "Walk through the fire. Ignore difficult terrain, shrug off suppressing fire from heavy bolters, and continuously press the attack.",
  },
  {
    name: "Deadeye",
    description:
      "Blessed with the Emperor's sight. Incredibly precise with las-rifles and sniper weaponry, hitting vital organs through ceramite plating.",
  },
  {
    name: "Brutal Swing",
    description:
      "The fury of the primarchs. Unleash devastating melee attacks that can cleave through multiple weak foes or shatter carapace armor.",
  },
  {
    name: "Silver Tongue",
    description:
      "A master of political maneuvering within the Administratum. Talk your way out of inquisitorial purges or secure lucrative void-charters.",
  },
  {
    name: "Intimidating Presence",
    description:
      "You carry the aura of the Emperor's wrath. Your grim demeanor breaks cultist morale and forces enemies to flinch before striking.",
  },
  {
    name: "Black Market Savvy",
    description:
      "Deep ties to the Underhive syndicates. Always knows where to find restricted xenotech, illegal combat-stimms, or a reliable cold-trade fence.",
  },
  {
    name: "Mechanicus Adept",
    description:
      "To you, the Machine Spirit speaks. Rapidly repair damaged augmetics, bypass complex cogitator tech-locks, and soothe angry engines.",
  },
  {
    name: "Tough as Nails",
    description:
      "Flesh forged in the crucible of war. Withstand punishing amounts of physical trauma that would vaporize a lesser human.",
  },
  {
    name: "Street Survivor",
    description:
      "Uncanny intuition honed in the lower hab-blocks. Sense mutant ambushes before they spring and scavenge rations from the grim ruins.",
  },
];

const SKILLS = [
  "Athletics",
  "Intimidation",
  "Stealth",
  "Piloting",
  "Sleight of Hand",
  "Tech-Use",
  "Medicae",
  "Lore",
  "Coercion",
  "Scrutiny",
  "Survival",
  "Investigation",
  "Perception",
  "Barter",
  "Deception",
  "Charm",
];

export default function CharacterWizard({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0); // 0 is Quick Start Selection
  const { setGameState, resetGame } = useGameStore();
  const { apiKey } = useSettingsStore();

  // Local wizard state
  const [name, setName] = useState("");
  const [backstory, setBackstory] = useState("");
  const [archetype, setArchetype] = useState<Archetype | "">("");
  const [stats, setStats] = useState<Stats>({
    STR: 1,
    DEX: 1,
    TGH: 1,
    INT: 1,
    WIL: 1,
    AWA: 1,
    INF: 1,
  });
  const [pointsLeft, setPointsLeft] = useState(16 - 7);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTalent, setSelectedTalent] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Balanced");
  const [motivation, setMotivation] = useState("Survival");

  // Quick Start State
  const [prebuilds, setPrebuilds] = useState<QuickStartCharacter[]>([]);
  const [isLoadingPrebuilds, setIsLoadingPrebuilds] = useState(false);

  React.useEffect(() => {
    loadPrebuilds();
  }, [apiKey]);

  const loadPrebuilds = async () => {
    setIsLoadingPrebuilds(true);
    const results = await generatePrebuiltCharacters(apiKey);
    setPrebuilds(results);
    setIsLoadingPrebuilds(false);
  };

  const handleSelectQuickStart = (char: QuickStartCharacter) => {
    setName(char.name);
    setBackstory(char.backstory);
    setArchetype(char.archetype as Archetype);
    setStats(char.stats);
    setSelectedSkills(char.skills);
    setSelectedTalent(char.talents[0]);
    setMotivation(char.motivation);
    setStep(6); // Go to final review
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 6));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleStatChange = (stat: keyof Stats, delta: number) => {
    if (delta > 0 && pointsLeft <= 0) return;
    if (delta < 0 && stats[stat] <= 1) return;

    setStats((prev) => ({ ...prev, [stat]: prev[stat] + delta }));
    setPointsLeft((p) => p - delta);
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => prev.filter((s) => s !== skill));
    } else if (selectedSkills.length < 3) {
      setSelectedSkills((prev) => [...prev, skill]);
    }
  };

  const finalize = () => {
    setGameState({
      archetype,
      difficulty,
      motivation,
      stats,
      hp: { current: 10 + stats.TGH, max: 10 + stats.TGH },
      skills: selectedSkills,
      talents: [selectedTalent],
      chapter: "Prologue",
      history: [
        {
          role: "ai",
          content: `Character Created: ${name}, the ${archetype}.`,
        },
      ],
    });
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepWrapper key="quickstart" title="Choose Your Destiny">
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground italic">
                    "From the billions of souls in the Imperium, fate pulls
                    three into the light..."
                  </p>
                </div>

                {!apiKey && (
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-md text-center max-w-md mx-auto">
                    <p className="text-destructive font-bold text-xs uppercase mb-1">
                      Vox-Link Key Missing
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Please enter your Gemini API Key in the{" "}
                      <span
                        className="font-bold text-primary cursor-pointer hover:underline"
                        onClick={onCancel}
                      >
                        Settings
                      </span>{" "}
                      menu to enable AI character generation.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLoadingPrebuilds
                    ? Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <Card
                            key={i}
                            className="bg-secondary/20 border-dashed animate-pulse h-[300px] flex items-center justify-center"
                          >
                            <Loader2 className="animate-spin text-muted-foreground" />
                          </Card>
                        ))
                    : prebuilds.map((char, i) => (
                        <Card
                          key={i}
                          className="group cursor-pointer hover:border-primary transition-all bg-secondary/10 hover:bg-primary/5 flex flex-col"
                          onClick={() => handleSelectQuickStart(char)}
                        >
                          <CardHeader className="p-4 border-b border-border/50">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="parchment-text text-xl">
                                  {char.name}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase"
                                >
                                  {char.archetype}
                                </Badge>
                              </div>
                              <Sparkles className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 flex-1 flex flex-col">
                            <p className="text-xs italic text-muted-foreground leading-relaxed mb-4 flex-1">
                              {char.backstory}
                            </p>
                            <div className="grid grid-cols-3 gap-1 text-[10px] uppercase font-mono mb-4 text-center">
                              <div className="bg-background/50 p-1 rounded">
                                STR {char.stats.STR}
                              </div>
                              <div className="bg-background/50 p-1 rounded">
                                DEX {char.stats.DEX}
                              </div>
                              <div className="bg-background/50 p-1 rounded">
                                TGH {char.stats.TGH}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                Key Talent
                              </div>
                              <Badge className="bg-primary/20 text-primary hover:bg-primary/20 w-full justify-center text-[10px]">
                                {char.talents[0]}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                </div>

                <div className="flex flex-col items-center gap-4 pt-8">
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="gap-2 border-primary/30 hover:bg-primary/5 uppercase tracking-widest text-xs h-12 px-6"
                      onClick={loadPrebuilds}
                    >
                      <Dice5 size={16} /> Consult the Imperial Tarot
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-border hover:bg-secondary/50 uppercase tracking-widest text-xs h-12 px-6"
                      onClick={() => setStep(1)}
                    >
                      <UserPlus size={16} /> Forge Custom Operative
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase opacity-70 tracking-widest">
                    Submit to fate's design or craft your own destiny in the dark stars.
                  </p>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 1 && (
            <StepWrapper key="step1" title="Identity & Origins">
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Designation (Name)
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Operative Designation..."
                    className="h-12 text-lg bg-secondary/50 font-serif"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Inquisitorial Record (Backstory)
                  </label>
                  <textarea
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value)}
                    placeholder="Record your prior service to the God-Emperor in 2-3 sentences..."
                    className="w-full h-32 bg-secondary/50 border border-border rounded-md p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none font-serif leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block mb-2">
                    Core Drive (Motivation)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Faith", "Vengeance", "Curiosity", "Survival", "Power"].map(
                      (m) => (
                        <Button
                          key={m}
                          variant={motivation === m ? "default" : "outline"}
                          onClick={() => setMotivation(m)}
                          className="text-xs uppercase tracking-widest"
                        >
                          {m}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper key="step2" title="Select Doctrine (Archetype)">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                {ARCHETYPES.map((a) => (
                  <Card
                    key={a.id}
                    className={cn(
                      "cursor-pointer transition-all duration-300 border",
                      a.bgClass,
                      archetype === a.id && a.activeClass,
                    )}
                    onClick={() => setArchetype(a.id)}
                  >
                    <CardHeader className="p-4 flex flex-row items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          a.colorClass,
                          archetype === a.id
                            ? "bg-background shadow-sm"
                            : "bg-background/50",
                        )}
                      >
                        {a.icon}
                      </div>
                      <CardTitle
                        className={cn(
                          "text-sm uppercase tracking-tighter",
                          archetype === a.id ? "font-bold" : "",
                        )}
                      >
                        {a.id}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs text-muted-foreground leading-relaxed">
                      {a.description}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper key="step3" title="Assess Bio-Metrics (Attributes)">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center bg-secondary/30 p-4 rounded-lg border border-border">
                  <span className="text-sm uppercase tracking-widest font-bold">
                    Geneseed Purity Remaining: {pointsLeft}
                  </span>
                  <div className="flex gap-2">
                    {STAT_ARRAYS.map((arr) => (
                      <Button
                        key={arr.name}
                        variant="outline"
                        size="sm"
                        className="text-[10px] uppercase"
                        onClick={() => {
                          setStats(arr.stats);
                          setPointsLeft(0);
                        }}
                      >
                        {arr.name} Pattern
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(Object.keys(stats) as Array<keyof Stats>).map((s) => (
                    <div
                      key={s}
                      className="flex items-center justify-between p-4 bg-secondary/20 rounded-md border border-border/50"
                    >
                      <div>
                        <div className="text-lg font-bold parchment-text">
                          {s}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                          {s === "STR" && "Strength & Athletics"}
                          {s === "DEX" && "Agility & Reflexes"}
                          {s === "TGH" && "Endurance & Health"}
                          {s === "INT" && "Logic & Knowledge"}
                          {s === "WIL" && "Resolve & Warp Resistance"}
                          {s === "AWA" && "Perception & Insight"}
                          {s === "INF" && "Social Standing & Charm"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStatChange(s, -1)}
                        >
                          -
                        </Button>
                        <span className="text-2xl font-mono w-8 text-center">
                          {stats[s]}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStatChange(s, 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 4 && (
            <StepWrapper key="step4" title="Sanctioned Skills & Talents">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto h-full">
                <div className="space-y-4 flex flex-col h-full">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Select 3 Sanctioned Skills
                  </label>
                  <ScrollArea className="flex-1 border border-border rounded-md p-4 bg-secondary/10">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {SKILLS.map((s) => (
                        <Button
                          key={s}
                          variant={
                            selectedSkills.includes(s) ? "default" : "outline"
                          }
                          className={cn("justify-start text-[10px] uppercase tracking-widest h-10 border-border/50", selectedSkills.includes(s) && "border-primary text-primary-foreground font-bold")}
                          onClick={() => toggleSkill(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="space-y-4 flex flex-col h-full">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Acquire 1 Unique Talent
                  </label>
                  <ScrollArea className="flex-1 border border-border rounded-md p-4 bg-secondary/10">
                    <div className="space-y-3 mt-2 pr-4">
                      {TALENT_DETAILS.map((t) => (
                        <Card
                          key={t.name}
                          className={cn(
                            "cursor-pointer transition-colors border",
                            selectedTalent === t.name
                              ? "border-primary bg-primary/10 shadow-md shadow-primary/10 scale-[1.01]"
                              : "border-border/50 bg-background hover:bg-secondary/40",
                          )}
                          onClick={() => setSelectedTalent(t.name)}
                        >
                          <div className="p-4">
                            <div className="font-bold text-xs uppercase tracking-widest mb-1 text-primary flex justify-between items-center">
                              {t.name}
                              {selectedTalent === t.name && <Sparkles size={14} />}
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-relaxed font-serif">
                              {t.description}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 5 && (
            <StepWrapper key="step5" title="Declare Threat Level (Difficulty)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {(["Narrative", "Balanced", "Grimdark"] as Difficulty[]).map(
                  (d) => (
                    <Card
                      key={d}
                      className={cn(
                        "cursor-pointer transition-all duration-300 hover:border-primary",
                        difficulty === d
                          ? "border-primary bg-primary/5"
                          : "border-border",
                      )}
                      onClick={() => setDifficulty(d)}
                    >
                      <CardHeader>
                        <CardTitle className="text-center parchment-text">
                          {d}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-center text-muted-foreground">
                        {d === "Narrative" &&
                          "The Emperor protects. Forgiving, story-focused. DC 8-16."}
                        {d === "Balanced" && "Standard combat conditions in the 41st Millennium. DC 10-22."}
                        {d === "Grimdark" &&
                          "There is only war. Brutal, lethal, unforgiving. DC 12-24."}
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            </StepWrapper>
          )}

          {step === 6 && (
            <StepWrapper key="step6" title="Confirm Requisition (Review)">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="bg-secondary/20 border-primary/30">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-3xl font-bold parchment-text">
                          {name || "Unnamed Operative"}
                        </h2>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest">
                          {archetype} | {difficulty}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-primary border-primary"
                      >
                        {motivation}
                      </Badge>
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {(Object.keys(stats) as Array<keyof Stats>).map((s) => (
                        <div key={s}>
                          <div className="text-[10px] text-muted-foreground">
                            {s}
                          </div>
                          <div className="text-lg font-bold">{stats[s]}</div>
                        </div>
                      ))}
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        Approved Sanctioned Skills
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="border border-border/80 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        Unique Augment/Talent
                      </div>
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border border-primary/30 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5">
                        {selectedTalent || "None"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <p className="text-center text-xs text-muted-foreground italic font-serif opacity-80">
                  "By the Emperor's will, your service begins. Report to the drop pods."
                </p>
              </div>
            </StepWrapper>
          )}
        </AnimatePresence>
      </div>

      <div className="h-20 border-t border-border flex items-center justify-between px-8 bg-card/50">
        <Button variant="ghost" onClick={step === 0 ? onCancel : prevStep}>
          <ChevronLeft className="mr-2" size={18} />
          {step === 0 ? "Cancel" : "Previous"}
        </Button>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={cn(
                "w-1 h-1 rounded-full transition-all",
                s === step ? "bg-primary w-3 h-1.5" : "bg-border",
              )}
            />
          ))}
        </div>
        <Button
          disabled={
            step === 0 ||
            (step === 1 && (!name || !backstory)) ||
            (step === 2 && !archetype) ||
            (step === 3 && pointsLeft > 0) ||
            (step === 4 && (selectedSkills.length < 3 || !selectedTalent))
          }
          onClick={step === 6 ? finalize : nextStep}
          className={cn(step === 0 && "opacity-0 pointer-events-none")}
        >
          {step === 6 ? "Confirm Operative" : "Next"}
          <ChevronRight className="ml-2" size={18} />
        </Button>
      </div>
    </div>
  );
}

interface StepWrapperProps {
  children: React.ReactNode;
  title: string;
  key?: string; // Explicitly allow key if needed, though React handles it
}

function StepWrapper({ children, title }: StepWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 flex flex-col p-8 overflow-y-auto"
    >
      <div className="mb-12 text-center bg-card/60 backdrop-blur-md py-6 px-12 rounded-xl border border-border/50 shadow-lg mx-auto w-fit gothic-border">
        <div className="gothic-corner-tl" />
        <div className="gothic-corner-tr" />
        <div className="gothic-corner-bl" />
        <div className="gothic-corner-br" />
        <h2 className="text-4xl font-bold parchment-text uppercase tracking-tighter drop-shadow">
          {title}
        </h2>
        <div className="w-24 h-1 bg-primary mx-auto mt-2" />
      </div>
      <div className="flex-1 bg-card/80 backdrop-blur-xl p-8 rounded-xl border border-border/50 shadow-2xl overflow-y-auto w-full max-w-5xl mx-auto gothic-border relative">
        <div className="gothic-corner-tl" />
        <div className="gothic-corner-tr" />
        <div className="gothic-corner-bl" />
        <div className="gothic-corner-br" />
        {children}
      </div>
    </motion.div>
  );
}
