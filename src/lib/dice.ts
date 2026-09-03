/**
 * Client-side dice. The GM tags each choice with a check (stat, skill, DC);
 * the engine rolls it here with the platform CSPRNG and hands the resolved
 * outcome to the model to narrate. The model never rolls.
 */

import { Check, Difficulty, RollOutcome, RollResult, StatKey, Stats } from "../types/game";

export const SKILL_BONUS = 2;
// Exhaustion (fatigue tier 3+) penalises physical checks. Mirrors the
// "Exhausted — physical checks penalised" modifier in the Session Manifest.
export const FATIGUE_PENALTY = 2;
export const FATIGUE_PENALTY_TIER = 3;
const PHYSICAL_STATS: readonly StatKey[] = ["STR", "DEX", "TGH"];

// Easy / Standard / Hard / Lethal, per the v2.0 mechanics reference.
export const DC_TIERS: Record<Difficulty, readonly [number, number, number, number]> = {
  Narrative: [8, 12, 16, 20],
  Balanced: [10, 14, 18, 22],
  Grimdark: [12, 16, 20, 24],
};

export interface RollContext {
  stats: Stats;
  skills: string[];
  fatigue: number;
  difficulty: Difficulty | "";
}

// Unbiased 1–20 from the platform CSPRNG (rejection sampling avoids modulo bias).
export function rollD20(): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / 20) * 20;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return (buf[0] % 20) + 1;
}

// Clamp a GM-proposed DC into the active difficulty's Easy..Lethal band so the
// model cannot hand out a DC 3 or a DC 40.
export function clampDc(dc: number, difficulty: Difficulty | ""): number {
  const tier = DC_TIERS[difficulty || "Balanced"];
  const n = Number.isFinite(dc) ? Math.round(dc) : tier[1];
  return Math.max(tier[0], Math.min(tier[3], n));
}

export function resolveCheck(check: Check, ctx: RollContext, die: number = rollD20()): RollResult {
  const statValue = ctx.stats[check.stat] ?? 0;
  const skill = check.skill?.trim() || null;
  const trained = !!skill && ctx.skills.some((s) => s.toLowerCase() === skill.toLowerCase());
  const skillBonus = trained ? SKILL_BONUS : 0;
  const fatiguePenalty =
    (ctx.fatigue ?? 0) >= FATIGUE_PENALTY_TIER && PHYSICAL_STATS.includes(check.stat) ? FATIGUE_PENALTY : 0;
  const dc = clampDc(check.dc, ctx.difficulty);
  const total = die + statValue + skillBonus - fatiguePenalty;

  const outcome: RollOutcome =
    die === 20 ? "crit-success" : die === 1 ? "crit-failure" : total >= dc ? "success" : "failure";

  return { die, stat: check.stat, statValue, skill, skillBonus, fatiguePenalty, total, dc, outcome };
}

export function isSuccess(outcome: RollOutcome): boolean {
  return outcome === "success" || outcome === "crit-success";
}

export function outcomeLabel(outcome: RollOutcome): string {
  switch (outcome) {
    case "crit-success": return "Critical Success";
    case "success": return "Success";
    case "failure": return "Failure";
    case "crit-failure": return "Critical Failure";
  }
}

function checkText(r: RollResult): string {
  const skill = r.skill ? ` + ${r.skill}${r.skillBonus ? "" : " (untrained)"}` : "";
  return `${r.stat}${skill} vs DC ${r.dc}`;
}

function modifiersText(r: RollResult): string {
  let s = ` + ${r.statValue}`;
  if (r.skill) s += ` + ${r.skillBonus}`;
  if (r.fatiguePenalty) s += ` - ${r.fatiguePenalty}`;
  return s;
}

// Same line shape the GameScreen RollLog component parses:
// "[ROLL] Check: DEX + Stealth vs DC 16 Roll: 1d20 (14) + 4 + 2 = 20 → Success"
export function formatRollLog(r: RollResult): string {
  return `[ROLL] Check: ${checkText(r)} Roll: 1d20 (${r.die})${modifiersText(r)} = ${r.total} → ${outcomeLabel(r.outcome)}`;
}

// What the GM is told about a roll it must narrate but may not alter.
export function formatRollForModel(r: RollResult): string {
  const mods = [`+${r.statValue} ${r.stat}`];
  if (r.skill) mods.push(`+${r.skillBonus} ${r.skill}${r.skillBonus ? "" : " (untrained)"}`);
  if (r.fatiguePenalty) mods.push(`-${r.fatiguePenalty} exhaustion`);
  const verdict =
    r.outcome === "crit-success"
      ? "CRITICAL SUCCESS (natural 20): the attempt succeeds spectacularly; grant a tangible bonus."
      : r.outcome === "crit-failure"
        ? "CRITICAL FAILURE (natural 1): the attempt fails badly; add a complication."
        : r.outcome === "success"
          ? "SUCCESS: the operative achieves what they attempted."
          : "FAILURE: the operative does not achieve it, and it costs them.";
  return (
    `ENGINE-RESOLVED CHECK (already rolled by the game engine; do not re-roll, alter, or contradict it): ` +
    `${checkText(r)} — 1d20 rolled ${r.die}, ${mods.join(", ")} = ${r.total}. ${verdict}`
  );
}
