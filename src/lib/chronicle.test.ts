import { test } from "node:test";
import assert from "node:assert/strict";
import { applyChronicleUpdate, EMPTY_CHRONICLE, renderChronicle } from "./chronicle";
import { GameState } from "../types/game";

test("persons upsert by name, threads resolve verbatim or by long substring, vows dedupe", () => {
  let c = applyChronicleUpdate(EMPTY_CHRONICLE, {
    persons: [{ name: "Inquisitor Vail", note: "offered a bribe" }],
    threads_add: ["Vail's agents are hunting you through the hive", "A locked vault door in Sector 9"],
    vows_add: ["Bring Sergeant Kell's tags to his widow"],
  }, 3);
  assert.equal(c.persons.length, 1);
  assert.equal(c.threads.length, 2);

  c = applyChronicleUpdate(c, {
    persons: [{ name: "inquisitor vail", note: "hostile since you refused her" }],
    threads_resolve: ["vail's agents are hunting you"],
    threads_add: ["A locked vault door in Sector 9"],
    vows_add: ["bring sergeant kell's tags to his widow"],
  }, 7);
  assert.equal(c.persons.length, 1);
  assert.equal(c.persons[0].name, "Inquisitor Vail");
  assert.equal(c.persons[0].note, "hostile since you refused her");
  assert.equal(c.persons[0].t, 3);
  assert.deepEqual(c.threads.map((t) => t.text), ["A locked vault door in Sector 9"]);
  assert.equal(c.vows.length, 1);
});

test("a terse resolve text cannot wipe unrelated threads", () => {
  const c = applyChronicleUpdate(EMPTY_CHRONICLE, { threads_add: ["The gang leader wants payment", "Find the missing relic"] }, 1);
  const after = applyChronicleUpdate(c, { threads_resolve: ["the"] }, 2);
  assert.equal(after.threads.length, 2);
});

test("renders every section and caps the prompt timeline", () => {
  const state = {
    name: "Kaelen Voss", archetype: "Hive Ganger", motivation: "Survival", difficulty: "Balanced", chapter: "Chapter II",
    stats: { STR: 3, DEX: 4, TGH: 3, INT: 1, WIL: 2, AWA: 2, INF: 1 },
    hp: { current: 8, max: 13 }, fatigue: 1, afflictions: ["Bleeding"], weapons: [{ name: "Stub gun", ammo: 4, maxAmmo: 6 }],
    skills: ["Stealth"], talents: ["Street Survivor"], gear: ["Medkit"], credits: 50, xp: { total: 30, unspent: 10 }, corruption: 2,
    companion: { name: "Rook", description: "", loyalty: 62 },
    campaignLog: Array.from({ length: 45 }, (_, i) => ({ t: i + 1, act: `Action ${i + 1}`, roll: "✓" as const, hp: -1, fact: i === 44 ? "Refused Vail's bribe" : undefined })),
    chronicle: applyChronicleUpdate(EMPTY_CHRONICLE, { persons: [{ name: "Vail", note: "hostile" }], threads_add: ["Hunted"], vows_add: ["Kell's tags"] }, 12),
    history: [],
  } as unknown as GameState;

  const prompt = renderChronicle(state, { timelineLimit: 40 });
  assert.match(prompt, /^# Chronicle of Kaelen Voss/);
  assert.match(prompt, /\(5 earlier turns omitted\)/);
  assert.ok(!prompt.includes("T5 · Action 5"));
  assert.ok(prompt.includes("T45 · Action 45 · ✓ · HP -1 — Refused Vail's bribe"));
  assert.match(prompt, /## Persons\n- \*\*Vail\*\* \(T12\): hostile/);
  assert.match(prompt, /## Open Threads\n- \(T12\) Hunted/);
  assert.match(prompt, /## Vows and Debts\n- \(T12\) Kell's tags/);
  assert.ok(!prompt.includes("## Operative Status"));

  const full = renderChronicle(state, { includeStatus: true });
  assert.ok(full.includes("T5 · Action 5"));
  assert.match(full, /## Operative Status\n- Wounds: 8\/13 · Fatigue: 1\/4/);
  assert.ok(full.includes("Companion: Rook (Loyalty 62)"));
});
