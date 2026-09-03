/**
 * The Chronicle: the operative's long-term memory as a markdown document.
 *
 * Every turn the GM returns a small `chronicle_update` (a one-line fact, NPC
 * standings, open threads, vows). We merge it into state here and render the
 * whole thing to markdown, which goes into every prompt (so the GM never
 * forgets) and can be exported as a .md file.
 */

import { CampaignLogEntry, Chronicle, GameState } from "../types/game";

export const EMPTY_CHRONICLE: Chronicle = { persons: [], threads: [], vows: [] };

// Shape of the GM's per-turn memory update (see TURN_SCHEMA in gemini.ts).
export interface ChronicleUpdate {
  fact?: string | null;
  persons?: { name: string; note: string }[];
  threads_add?: string[];
  threads_resolve?: string[];
  vows_add?: string[];
}

const MAX_PERSONS = 30;
const MAX_THREADS = 12;
const MAX_VOWS = 10;
// Substring matching for thread resolution only kicks in above this length,
// so a terse resolve text can't wipe unrelated threads.
const FUZZY_MIN_LENGTH = 12;
// Timeline lines sent to the model each turn; the export gets the full log.
export const PROMPT_TIMELINE_LIMIT = 40;

const norm = (s: string) => s.trim().toLowerCase();

function matchesResolve(threadText: string, resolve: string): boolean {
  const a = norm(threadText);
  const b = norm(resolve);
  if (a === b) return true;
  if (b.length < FUZZY_MIN_LENGTH) return false;
  return a.includes(b) || b.includes(a);
}

export function applyChronicleUpdate(
  chronicle: Chronicle | undefined,
  update: ChronicleUpdate | undefined,
  t: number,
): Chronicle {
  const c = chronicle ?? EMPTY_CHRONICLE;
  if (!update) return c;

  let persons = [...c.persons];
  for (const p of update.persons ?? []) {
    const name = p?.name?.trim();
    if (!name) continue;
    const note = (p.note || "").trim();
    const i = persons.findIndex((x) => norm(x.name) === norm(name));
    if (i >= 0) persons[i] = { ...persons[i], note: note || persons[i].note };
    else persons.push({ name, note, t });
  }
  persons = persons.slice(-MAX_PERSONS);

  const resolves = (update.threads_resolve ?? []).filter((r) => r && r.trim());
  let threads = c.threads.filter((th) => !resolves.some((r) => matchesResolve(th.text, r)));
  for (const raw of update.threads_add ?? []) {
    const text = raw?.trim();
    if (!text || threads.some((th) => norm(th.text) === norm(text))) continue;
    threads.push({ text, t });
  }
  threads = threads.slice(-MAX_THREADS);

  let vows = [...c.vows];
  for (const raw of update.vows_add ?? []) {
    const text = raw?.trim();
    if (!text || vows.some((v) => norm(v.text) === norm(text))) continue;
    vows.push({ text, t });
  }
  vows = vows.slice(-MAX_VOWS);

  return { persons, threads, vows };
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function formatTimelineEntry(e: CampaignLogEntry): string {
  const parts = [`T${e.t}`];
  if (e.ch) parts.push(e.ch);
  parts.push(e.act);
  if (e.roll) parts.push(e.roll);
  const deltas: string[] = [];
  if (e.hp) deltas.push(`HP ${signed(e.hp)}`);
  if (e.xp) deltas.push(`XP +${e.xp}`);
  if (e.cor) deltas.push(`Corruption +${e.cor}`);
  if (e.loy) deltas.push(`Loyalty ${signed(e.loy)}`);
  if (e.got?.length) deltas.push(`Got: ${e.got.join(", ")}`);
  if (deltas.length) parts.push(deltas.join(", "));
  let line = `- ${parts.join(" · ")}`;
  if (e.fact) line += ` — ${e.fact}`;
  return line;
}

export interface RenderOptions {
  timelineLimit?: number;   // default: all entries
  includeStatus?: boolean;  // add the operative's current sheet (for export)
}

export function renderChronicle(state: GameState, opts: RenderOptions = {}): string {
  const c = state.chronicle ?? EMPTY_CHRONICLE;
  const log = state.campaignLog ?? [];
  const lines: string[] = [];

  lines.push(`# Chronicle of ${state.name || "the Operative"}`);
  lines.push(
    `${state.archetype || "Unknown archetype"} · Motivation: ${state.motivation || "—"} · ` +
      `Difficulty: ${state.difficulty || "—"} · Chapter: ${state.chapter || "—"}`,
  );

  if (opts.includeStatus) {
    const stats = Object.entries(state.stats).map(([k, v]) => `${k} ${v}`).join(" ");
    const arsenal = (state.weapons || [])
      .map((w) => (w.maxAmmo > 0 ? `${w.name} ${w.ammo}/${w.maxAmmo}` : `${w.name} (melee)`))
      .join(", ");
    lines.push("", "## Operative Status");
    lines.push(
      `- Wounds: ${state.hp.current}/${state.hp.max} · Fatigue: ${state.fatigue ?? 0}/4 · ` +
        `Corruption: ${state.corruption} · Credits: ${state.credits} · ` +
        `XP: ${state.xp.total} (${state.xp.unspent} unspent)`,
    );
    lines.push(`- Stats: ${stats}`);
    lines.push(`- Skills: ${state.skills.join(", ") || "None"} · Talents: ${state.talents.join(", ") || "None"}`);
    lines.push(`- Arsenal: ${arsenal || "Unarmed"} · Gear: ${state.gear.join(", ") || "None"}`);
    lines.push(`- Afflictions: ${(state.afflictions || []).join(", ") || "None"}`);
    if (state.companion.name) {
      lines.push(`- Companion: ${state.companion.name} (Loyalty ${state.companion.loyalty})`);
    }
  }

  lines.push("", "## Timeline");
  if (log.length === 0) {
    lines.push("- (No decisions recorded yet.)");
  } else {
    const shown = opts.timelineLimit ? log.slice(-opts.timelineLimit) : log;
    if (shown.length < log.length) lines.push(`- (${log.length - shown.length} earlier turns omitted)`);
    for (const e of shown) lines.push(formatTimelineEntry(e));
  }

  lines.push("", "## Persons");
  if (c.persons.length === 0) lines.push("- (None recorded.)");
  for (const p of c.persons) lines.push(`- **${p.name}** (T${p.t}): ${p.note || "—"}`);

  lines.push("", "## Open Threads");
  if (c.threads.length === 0) lines.push("- (Nothing unresolved.)");
  for (const th of c.threads) lines.push(`- (T${th.t}) ${th.text}`);

  lines.push("", "## Vows and Debts");
  if (c.vows.length === 0) lines.push("- (None sworn.)");
  for (const v of c.vows) lines.push(`- (T${v.t}) ${v.text}`);

  return lines.join("\n") + "\n";
}

export function chronicleFilename(state: GameState): string {
  const slug = (state.name || "operative").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `chronicle-${slug || "operative"}-${new Date().toISOString().slice(0, 10)}.md`;
}
