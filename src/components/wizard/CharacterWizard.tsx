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
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Archetype, Difficulty, Stats, Companion } from "../../types/game";
import { QuickStartCharacter } from "../../lib/gemini";
import { useSettingsStore } from "../../store/useSettingsStore";

// Every operative deploys with a thematic companion so loyalty actually
// matters and the GM has someone concrete to write into the story.
const STARTING_COMPANIONS: Record<string, Companion> = {
  "Guardsman Veteran": { name: "Corporal Vane", description: "A grizzled squadmate who has bled beside you on a dozen worlds.", loyalty: 55 },
  "Exiled Psyker": { name: "Sef", description: "A mute, warp-touched waif who trails you, sensing a kindred damnation.", loyalty: 50 },
  "Hive Ganger": { name: "Rat", description: "A wiry underhive scav with quick fingers and quicker instincts.", loyalty: 50 },
  "Rogue Trader Scion": { name: "Vex Carthault", description: "A void-hardened house retainer sworn to keep you alive — and watched.", loyalty: 50 },
  "Penitent Sister": { name: "Sister Auceline", description: "A fellow penitent who shares your road of ash and absolution.", loyalty: 55 },
  "Tech-Priest Initiate": { name: "Servo-skull XV-2", description: "A chattering brass servo-skull bound to your service, heavy with cant and data.", loyalty: 60 },
  "Criminal Conscript": { name: "Dolan", description: "A fellow penal legionnaire with a shared sentence and a shared grudge.", loyalty: 45 },
  "Civilian Survivor": { name: "Mira", description: "A fellow refugee you pulled from the rubble; she has not left your side.", loyalty: 55 },
};

const DEFAULT_COMPANION: Companion = {
  name: "Kell",
  description: "A wary drifter drawn to your cause, watching to see what you become.",
  loyalty: 50,
};

const LOCAL_QUICK_STARTS: QuickStartCharacter[] = [
  {
    name: "Cade Stryker",
    archetype: "Guardsman Veteran",
    backstory: "A hardened survivor of Cadia's fall. Cade lost his regiment and his world keeping only his lasgun and a burning hatred for the Ruinous Powers that consumed everything he loved.",
    motivation: "Vengeance",
    stats: { STR: 3, DEX: 3, TGH: 4, INT: 2, WIL: 2, AWA: 1, INF: 1 },
    skills: ["Athletics", "Survival", "Perception"],
    talents: ["Deadeye"],
  },
  {
    name: "Mira Ven",
    archetype: "Guardsman Veteran",
    backstory: "Thirty campaigns on Armageddon turned Mira into something more scar than soldier. She took an ork choppa to the jaw and still held the line alone for six hours.",
    motivation: "Survival",
    stats: { STR: 2, DEX: 3, TGH: 5, INT: 2, WIL: 2, AWA: 1, INF: 1 },
    skills: ["Athletics", "Intimidation", "Medicae"],
    talents: ["Tough as Nails"],
  },
  {
    name: "Vaelia",
    archetype: "Exiled Psyker",
    backstory: "Vaelia's powers manifested late, and she narrowly escaped the Black Ships. She now lives in hiding among the underhive, struggling to control the whispers bleeding through from the Warp.",
    motivation: "Survival",
    stats: { STR: 1, DEX: 2, TGH: 1, INT: 3, WIL: 5, AWA: 3, INF: 1 },
    skills: ["Coercion", "Scrutiny", "Stealth"],
    talents: ["Intimidating Presence"],
  },
  {
    name: "Aldric Mourne",
    archetype: "Exiled Psyker",
    backstory: "A sanctioned Astropath who transmitted a forbidden message from a daemon-touched admiral. The Inquisition burned his choir. He alone walked out of the ash.",
    motivation: "Vengeance",
    stats: { STR: 1, DEX: 1, TGH: 2, INT: 4, WIL: 5, AWA: 2, INF: 1 },
    skills: ["Lore", "Scrutiny", "Investigation"],
    talents: ["Intimidating Presence"],
  },
  {
    name: "Kaelen Voss",
    archetype: "Hive Ganger",
    backstory: "Born in the toxic sumps of Necromunda, Kaelen learned that a blade speaks louder than words. He escaped the underhive after a gang war left him its sole survivor.",
    motivation: "Survival",
    stats: { STR: 3, DEX: 4, TGH: 3, INT: 1, WIL: 2, AWA: 2, INF: 1 },
    skills: ["Stealth", "Athletics", "Intimidation"],
    talents: ["Street Survivor"],
  },
  {
    name: "Thrax",
    archetype: "Hive Ganger",
    backstory: "Pit fighter. Executioner. Legend of the Sump Pits. Thrax killed his gang boss in front of three hundred witnesses and walked out with a murder-bounty and nothing else.",
    motivation: "Power",
    stats: { STR: 5, DEX: 3, TGH: 4, INT: 1, WIL: 1, AWA: 1, INF: 1 },
    skills: ["Intimidation", "Athletics", "Coercion"],
    talents: ["Brutal Swing"],
  },
  {
    name: "Orellius Tyche",
    archetype: "Rogue Trader Scion",
    backstory: "The disgraced third son of a wealthy trading dynasty. Orellius was exiled after a bad deal with a xenos corsair cost the family a lucrative charter worth three star systems.",
    motivation: "Power",
    stats: { STR: 1, DEX: 2, TGH: 1, INT: 3, WIL: 3, AWA: 2, INF: 4 },
    skills: ["Charm", "Barter", "Deception"],
    talents: ["Silver Tongue"],
  },
  {
    name: "Lyranthe Vel",
    archetype: "Rogue Trader Scion",
    backstory: "Her Warrant of Trade arrived the same day her father's flagship was destroyed. Lyranthe inherited ruin — a name, a debt, and one rusting frigate with a mutinous crew.",
    motivation: "Survival",
    stats: { STR: 1, DEX: 2, TGH: 2, INT: 3, WIL: 2, AWA: 2, INF: 4 },
    skills: ["Barter", "Deception", "Piloting"],
    talents: ["Black Market Savvy"],
  },
  {
    name: "Sister Ignatia",
    archetype: "Penitent Sister",
    backstory: "Once a proud Retributor, Ignatia's squad was wiped out because of her tactical hesitation. She now seeks redemption through holy fire and unwavering conviction in the Emperor's light.",
    motivation: "Faith",
    stats: { STR: 2, DEX: 2, TGH: 3, INT: 2, WIL: 5, AWA: 1, INF: 1 },
    skills: ["Lore", "Medicae", "Intimidation"],
    talents: ["Tough as Nails"],
  },
  {
    name: "Sister Maevia",
    archetype: "Penitent Sister",
    backstory: "The only survivor of a daemon incursion that consumed her entire convent. The Ecclesiarchy named her blessed. She named herself damned. Now she fights until the Emperor disagrees.",
    motivation: "Faith",
    stats: { STR: 3, DEX: 2, TGH: 3, INT: 1, WIL: 4, AWA: 2, INF: 1 },
    skills: ["Intimidation", "Athletics", "Survival"],
    talents: ["Relentless Advance"],
  },
  {
    name: "Xerxas-9",
    archetype: "Tech-Priest Initiate",
    backstory: "A low-ranking Enginseer who uncovered a dangerous scrapcode fragment inside a forge-world cogitator core. His superiors ordered him silenced. He disagreed, violently.",
    motivation: "Curiosity",
    stats: { STR: 2, DEX: 1, TGH: 2, INT: 5, WIL: 4, AWA: 1, INF: 1 },
    skills: ["Tech-Use", "Lore", "Investigation"],
    talents: ["Mechanicus Adept"],
  },
  {
    name: "Fervus-17",
    archetype: "Tech-Priest Initiate",
    backstory: "Excommunicated by the Mechanicus for pursuing forbidden cognition patterns, Fervus carries three classified STC fragments in a lead-sealed dataslate sewn into his chest cavity.",
    motivation: "Curiosity",
    stats: { STR: 1, DEX: 2, TGH: 3, INT: 5, WIL: 3, AWA: 1, INF: 1 },
    skills: ["Tech-Use", "Investigation", "Stealth"],
    talents: ["Mechanicus Adept"],
  },
  {
    name: "Jolrek Dun",
    archetype: "Criminal Conscript",
    backstory: "Convicted for twelve counts of murder aboard a void-station — most of them deserved. The Commissar gave him a choice: the firing squad or a lasgun pointed at the enemy instead.",
    motivation: "Survival",
    stats: { STR: 4, DEX: 3, TGH: 4, INT: 1, WIL: 2, AWA: 1, INF: 1 },
    skills: ["Intimidation", "Athletics", "Stealth"],
    talents: ["Brutal Swing"],
  },
  {
    name: "Sable Crix",
    archetype: "Criminal Conscript",
    backstory: "A former Arbitrator who ran a protection racket for three years before Internal Affairs caught up. She knows every trick the law uses, because she invented half of them.",
    motivation: "Power",
    stats: { STR: 2, DEX: 4, TGH: 2, INT: 2, WIL: 2, AWA: 3, INF: 1 },
    skills: ["Investigation", "Coercion", "Sleight of Hand"],
    talents: ["Street Survivor"],
  },
  {
    name: "Emmett Praet",
    archetype: "Civilian Survivor",
    backstory: "An Administratum data-clerk who happened to be filing manifests when the Chaos warband breached the compound walls. He survived by hiding under a pile of requisition forms for nine hours.",
    motivation: "Survival",
    stats: { STR: 1, DEX: 2, TGH: 2, INT: 4, WIL: 2, AWA: 3, INF: 2 },
    skills: ["Investigation", "Scrutiny", "Deception"],
    talents: ["Street Survivor"],
  },
  {
    name: "Yeva Mors",
    archetype: "Civilian Survivor",
    backstory: "A field medicae orderly who watched an Inquisitor purge her entire hospital ward on suspicion of heresy. She dragged seven patients into the sewer. Three survived.",
    motivation: "Vengeance",
    stats: { STR: 1, DEX: 2, TGH: 3, INT: 3, WIL: 3, AWA: 2, INF: 2 },
    skills: ["Medicae", "Survival", "Stealth"],
    talents: ["Tough as Nails"],
  },
];

function getRandomCharacters(): QuickStartCharacter[] {
  return [...LOCAL_QUICK_STARTS].sort(() => 0.5 - Math.random()).slice(0, 3);
}

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
    bgClass: "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50",
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
  { name: "Warrior", stats: { STR: 4, DEX: 3, TGH: 4, INT: 1, WIL: 2, AWA: 1, INF: 1 } },
  { name: "Operative", stats: { STR: 2, DEX: 4, TGH: 2, INT: 3, WIL: 1, AWA: 3, INF: 1 } },
  { name: "Scholar", stats: { STR: 1, DEX: 2, TGH: 2, INT: 4, WIL: 3, AWA: 3, INF: 1 } },
  { name: "Face", stats: { STR: 1, DEX: 2, TGH: 2, INT: 2, WIL: 2, AWA: 3, INF: 4 } },
];

const TALENT_DETAILS: { name: string; description: string }[] = [
  { name: "Duelist's Flourish", description: "A master of the blade. Bypass crude flak armor and parry chainswords using elegant, deadly finesse over brute strength." },
  { name: "Relentless Advance", description: "Walk through the fire. Ignore difficult terrain, shrug off suppressing fire from heavy bolters, and continuously press the attack." },
  { name: "Deadeye", description: "Blessed with the Emperor's sight. Incredibly precise with las-rifles and sniper weaponry, hitting vital organs through ceramite plating." },
  { name: "Brutal Swing", description: "The fury of the primarchs. Unleash devastating melee attacks that can cleave through multiple weak foes or shatter carapace armor." },
  { name: "Silver Tongue", description: "A master of political maneuvering within the Administratum. Talk your way out of inquisitorial purges or secure lucrative void-charters." },
  { name: "Intimidating Presence", description: "You carry the aura of the Emperor's wrath. Your grim demeanor breaks cultist morale and forces enemies to flinch before striking." },
  { name: "Black Market Savvy", description: "Deep ties to the Underhive syndicates. Always knows where to find restricted xenotech, illegal combat-stimms, or a reliable cold-trade fence." },
  { name: "Mechanicus Adept", description: "To you, the Machine Spirit speaks. Rapidly repair damaged augmetics, bypass complex cogitator tech-locks, and soothe angry engines." },
  { name: "Tough as Nails", description: "Flesh forged in the crucible of war. Withstand punishing amounts of physical trauma that would vaporize a lesser human." },
  { name: "Street Survivor", description: "Uncanny intuition honed in the lower hab-blocks. Sense mutant ambushes before they spring and scavenge rations from the grim ruins." },
];

const SKILLS = [
  "Athletics", "Intimidation", "Stealth", "Piloting",
  "Sleight of Hand", "Tech-Use", "Medicae", "Lore",
  "Coercion", "Scrutiny", "Survival", "Investigation",
  "Perception", "Barter", "Deception", "Charm",
];

// Step map:
// 0 = Quick Start
// 1 = Identity & Origins
// 2 = Archetype
// 3 = Stats
// 4 = Skills (3 picks)
// 5 = Talent (1 pick)
// 6 = Difficulty
// 7 = Review

export default function CharacterWizard({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const { setGameState } = useGameStore();
  const { apiKey } = useSettingsStore();

  const [name, setName] = useState("");
  const [backstory, setBackstory] = useState("");
  const [archetype, setArchetype] = useState<Archetype | "">("");
  const [stats, setStats] = useState<Stats>({ STR: 1, DEX: 1, TGH: 1, INT: 1, WIL: 1, AWA: 1, INF: 1 });
  const [pointsLeft, setPointsLeft] = useState(16 - 7);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTalent, setSelectedTalent] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Balanced");
  const [motivation, setMotivation] = useState("Survival");

  const [prebuilds, setPrebuilds] = useState<QuickStartCharacter[]>(() => getRandomCharacters());

  const loadPrebuilds = () => setPrebuilds(getRandomCharacters());

  const handleSelectQuickStart = (char: QuickStartCharacter) => {
    setName(char.name);
    setBackstory(char.backstory);
    setArchetype(char.archetype as Archetype);
    setStats(char.stats);
    setSelectedSkills(char.skills);
    setSelectedTalent(char.talents[0]);
    setMotivation(char.motivation);
    setStep(7); // Skip to final review
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 7));
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
      name,
      archetype,
      difficulty,
      motivation,
      stats,
      hp: { current: 10 + stats.TGH, max: 10 + stats.TGH },
      skills: selectedSkills,
      talents: [selectedTalent],
      chapter: "Prologue",
      companion: archetype ? (STARTING_COMPANIONS[archetype] ?? DEFAULT_COMPANION) : DEFAULT_COMPANION,
      history: [],
      campaignLog: [],
    });
    onComplete();
  };

  const isNextDisabled =
    step === 0 ||
    (step === 1 && (!name || !backstory)) ||
    (step === 2 && !archetype) ||
    (step === 3 && pointsLeft > 0) ||
    (step === 4 && selectedSkills.length < 3) ||
    (step === 5 && !selectedTalent);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {step === 0 && (
            <StepWrapper key="quickstart" title="Choose Your Destiny">
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground italic text-sm">
                    "From the billions of souls in the Imperium, fate pulls three into the light..."
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {prebuilds.map((char, i) => (
                        <Card key={i} className="group cursor-pointer hover:border-primary transition-all bg-secondary/10 hover:bg-primary/5 flex flex-col" onClick={() => handleSelectQuickStart(char)}>
                          <CardHeader className="p-4 border-b border-border/50">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="parchment-text text-xl">{char.name}</CardTitle>
                                <Badge variant="outline" className="text-[10px] uppercase">{char.archetype}</Badge>
                              </div>
                              <Sparkles className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 flex-1 flex flex-col">
                            <p className="text-xs italic text-muted-foreground leading-relaxed mb-4 flex-1">{char.backstory}</p>
                            <div className="grid grid-cols-3 gap-1 text-[10px] uppercase font-mono mb-4 text-center">
                              <div className="bg-background/50 p-1 rounded">STR {char.stats.STR}</div>
                              <div className="bg-background/50 p-1 rounded">DEX {char.stats.DEX}</div>
                              <div className="bg-background/50 p-1 rounded">TGH {char.stats.TGH}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Key Talent</div>
                              <Badge className="bg-primary/20 text-primary hover:bg-primary/20 w-full justify-center text-[10px]">{char.talents[0]}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3 pt-4">
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/5 uppercase tracking-widest text-xs h-12 px-5" onClick={loadPrebuilds}>
                      <Dice5 size={16} /> Consult the Imperial Tarot
                    </Button>
                    <Button variant="outline" className="gap-2 border-border hover:bg-secondary/50 uppercase tracking-widest text-xs h-12 px-5" onClick={() => setStep(1)}>
                      <UserPlus size={16} /> Forge Custom Operative
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase opacity-70 tracking-widest text-center">
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
                    {["Faith", "Vengeance", "Curiosity", "Survival", "Power"].map((m) => (
                      <Button key={m} variant={motivation === m ? "default" : "outline"} onClick={() => setMotivation(m)} className="text-xs uppercase tracking-widest">
                        {m}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper key="step2" title="Select Doctrine">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-6xl mx-auto">
                {ARCHETYPES.map((a) => (
                  <Card
                    key={a.id}
                    className={cn("cursor-pointer transition-all duration-300 border", a.bgClass, archetype === a.id && a.activeClass)}
                    onClick={() => setArchetype(a.id)}
                  >
                    <CardHeader className="p-3 flex flex-row items-center gap-3">
                      <div className={cn("p-2 rounded-md transition-colors", a.colorClass, archetype === a.id ? "bg-background shadow-sm" : "bg-background/50")}>
                        {a.icon}
                      </div>
                      <CardTitle className={cn("text-xs uppercase tracking-tighter", archetype === a.id ? "font-bold" : "")}>
                        {a.id}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-xs text-muted-foreground leading-relaxed">
                      {a.description}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper key="step3" title="Assess Bio-Metrics">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-secondary/30 p-4 rounded-lg border border-border">
                  <span className="text-sm uppercase tracking-widest font-bold whitespace-nowrap">
                    Points Remaining: <span className={cn("font-mono", pointsLeft === 0 ? "text-primary" : "text-amber-400")}>{pointsLeft}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {STAT_ARRAYS.map((arr) => (
                      <Button key={arr.name} variant="outline" size="sm" className="text-[10px] uppercase h-8"
                        onClick={() => { setStats(arr.stats); setPointsLeft(0); }}>
                        {arr.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(stats) as Array<keyof Stats>).map((s) => (
                    <div key={s} className="flex items-center justify-between p-3 bg-secondary/20 rounded-md border border-border/50">
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold parchment-text">{s}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter leading-tight">
                          {s === "STR" && "Strength & Athletics"}
                          {s === "DEX" && "Agility & Reflexes"}
                          {s === "TGH" && "Endurance & Health"}
                          {s === "INT" && "Logic & Knowledge"}
                          {s === "WIL" && "Resolve & Warp Resistance"}
                          {s === "AWA" && "Perception & Insight"}
                          {s === "INF" && "Social Standing & Charm"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleStatChange(s, -1)}>-</Button>
                        <span className="text-xl font-mono w-7 text-center">{stats[s]}</span>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleStatChange(s, 1)}>+</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 4 && (
            <StepWrapper key="step4" title="Sanctioned Skills">
              <div className="max-w-2xl mx-auto flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Select 3 Skills
                  </label>
                  <Badge variant="outline" className={cn("text-xs", selectedSkills.length === 3 ? "text-primary border-primary" : "text-muted-foreground")}>
                    {selectedSkills.length} / 3
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS.map((s) => (
                    <Button
                      key={s}
                      variant={selectedSkills.includes(s) ? "default" : "outline"}
                      className={cn("justify-start text-[11px] uppercase tracking-widest h-11 border-border/50", selectedSkills.includes(s) && "border-primary font-bold")}
                      onClick={() => toggleSkill(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 5 && (
            <StepWrapper key="step5" title="Unique Talent">
              <div className="max-w-2xl mx-auto space-y-3">
                <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground block mb-2">
                  Acquire 1 Talent
                </label>
                <div className="space-y-3">
                  {TALENT_DETAILS.map((t) => (
                    <Card
                      key={t.name}
                      className={cn(
                        "cursor-pointer transition-colors border",
                        selectedTalent === t.name
                          ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                          : "border-border/50 bg-background hover:bg-secondary/40",
                      )}
                      onClick={() => setSelectedTalent(t.name)}
                    >
                      <div className="p-4">
                        <div className="font-bold text-xs uppercase tracking-widest mb-1 text-primary flex justify-between items-center">
                          {t.name}
                          {selectedTalent === t.name && <Sparkles size={14} />}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed font-serif">
                          {t.description}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 6 && (
            <StepWrapper key="step6" title="Declare Threat Level">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
                {(["Narrative", "Balanced", "Grimdark"] as Difficulty[]).map((d) => (
                  <Card
                    key={d}
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:border-primary",
                      difficulty === d ? "border-primary bg-primary/5" : "border-border",
                    )}
                    onClick={() => setDifficulty(d)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-center parchment-text">{d}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-center text-muted-foreground pb-6">
                      {d === "Narrative" && "The Emperor protects. Forgiving, story-focused. DC 8–16."}
                      {d === "Balanced" && "Standard combat conditions in the 41st Millennium. DC 10–22."}
                      {d === "Grimdark" && "There is only war. Brutal, lethal, unforgiving. DC 12–24."}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 7 && (
            <StepWrapper key="step7" title="Confirm Requisition">
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="bg-secondary/20 border-primary/30">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold parchment-text">{name || "Unnamed Operative"}</h2>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest">{archetype} | {difficulty}</p>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary self-start sm:self-auto">{motivation}</Badge>
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(Object.keys(stats) as Array<keyof Stats>).map((s) => (
                        <div key={s}>
                          <div className="text-[9px] text-muted-foreground">{s}</div>
                          <div className="text-base font-bold">{stats[s]}</div>
                        </div>
                      ))}
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Approved Sanctioned Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="border border-border/80 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Unique Augment / Talent</div>
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

      {/* Bottom navigation */}
      <div className="min-h-16 border-t border-border flex items-center justify-between px-4 sm:px-8 py-3 bg-card/50 gap-2">
        <Button variant="ghost" onClick={step === 0 ? onCancel : prevStep} className="gap-1 text-sm">
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">{step === 0 ? "Cancel" : "Previous"}</span>
        </Button>

        <div className="flex gap-1.5 items-center">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
            <div key={s} className={cn("h-1.5 rounded-full transition-all", s === step ? "bg-primary w-4" : "bg-border w-1.5")} />
          ))}
        </div>

        <Button
          disabled={isNextDisabled}
          onClick={step === 7 ? finalize : nextStep}
          className={cn("gap-1 text-sm", step === 0 && "opacity-0 pointer-events-none")}
        >
          <span>{step === 7 ? "Confirm Operative" : "Next"}</span>
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

interface StepWrapperProps {
  children: React.ReactNode;
  title: string;
  key?: string;
}

function StepWrapper({ children, title }: StepWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="absolute inset-0 flex flex-col p-3 sm:p-6 overflow-y-auto"
    >
      <div className="mb-6 text-center bg-card/60 backdrop-blur-md py-4 px-6 sm:py-6 sm:px-12 rounded-xl border border-border/50 shadow-lg mx-auto w-fit gothic-border">
        <div className="gothic-corner-tl" />
        <div className="gothic-corner-tr" />
        <div className="gothic-corner-bl" />
        <div className="gothic-corner-br" />
        <h2 className="text-2xl sm:text-4xl font-bold parchment-text uppercase tracking-tighter drop-shadow">
          {title}
        </h2>
        <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mt-2" />
      </div>
      <div className="flex-1 bg-card/80 backdrop-blur-xl p-4 sm:p-8 rounded-xl border border-border/50 shadow-2xl overflow-y-auto w-full max-w-5xl mx-auto gothic-border relative">
        <div className="gothic-corner-tl" />
        <div className="gothic-corner-tr" />
        <div className="gothic-corner-bl" />
        <div className="gothic-corner-br" />
        {children}
      </div>
    </motion.div>
  );
}
