import { test } from "node:test";
import assert from "node:assert/strict";
import { clampDc, formatRollLog, resolveCheck, rollD20 } from "./dice";

const ctx = {
  stats: { STR: 3, DEX: 4, TGH: 3, INT: 1, WIL: 2, AWA: 2, INF: 1 },
  skills: ["Stealth", "Athletics"],
  fatigue: 0,
  difficulty: "Balanced" as const,
};

test("adds the stat and a trained skill bonus", () => {
  const r = resolveCheck({ stat: "DEX", skill: "Stealth", dc: 16 }, ctx, 10);
  assert.equal(r.total, 16);
  assert.equal(r.skillBonus, 2);
  assert.equal(r.outcome, "success");
});

test("an untrained skill adds nothing (case-insensitive match for trained ones)", () => {
  const untrained = resolveCheck({ stat: "INT", skill: "Tech-Use", dc: 12 }, ctx, 10);
  assert.equal(untrained.skillBonus, 0);
  assert.equal(untrained.total, 11);
  assert.equal(untrained.outcome, "failure");
  const trained = resolveCheck({ stat: "DEX", skill: "stealth", dc: 12 }, ctx, 10);
  assert.equal(trained.skillBonus, 2);
});

test("natural 20 and natural 1 are criticals regardless of the total", () => {
  assert.equal(resolveCheck({ stat: "INF", skill: null, dc: 22 }, ctx, 20).outcome, "crit-success");
  assert.equal(resolveCheck({ stat: "DEX", skill: "Stealth", dc: 10 }, ctx, 1).outcome, "crit-failure");
});

test("exhaustion penalises physical stats only", () => {
  const tired = { ...ctx, fatigue: 3 };
  assert.equal(resolveCheck({ stat: "STR", skill: null, dc: 14 }, tired, 10).total, 11);
  assert.equal(resolveCheck({ stat: "WIL", skill: null, dc: 14 }, tired, 10).total, 12);
  assert.equal(resolveCheck({ stat: "STR", skill: null, dc: 14 }, { ...ctx, fatigue: 2 }, 10).total, 13);
});

test("the DC is clamped into the active difficulty band", () => {
  assert.equal(clampDc(3, "Balanced"), 10);
  assert.equal(clampDc(40, "Balanced"), 22);
  assert.equal(clampDc(16, "Grimdark"), 16);
  assert.equal(clampDc(NaN, "Narrative"), 12);
  assert.equal(clampDc(14, ""), 14);
  assert.equal(resolveCheck({ stat: "DEX", skill: null, dc: 99 }, ctx, 19).dc, 22);
});

test("rollD20 stays within 1..20", () => {
  for (let i = 0; i < 2000; i++) {
    const d = rollD20();
    assert.ok(Number.isInteger(d) && d >= 1 && d <= 20, `bad die ${d}`);
  }
});

test("the roll log matches the regexes the RollLog component parses", () => {
  const text = formatRollLog(resolveCheck({ stat: "DEX", skill: "Stealth", dc: 16 }, { ...ctx, fatigue: 4 }, 14));
  assert.equal(text, "[ROLL] Check: DEX + Stealth vs DC 16 Roll: 1d20 (14) + 4 + 2 - 2 = 18 → Success");
  assert.match(text, /→\s*(Critical\s+)?(\w+)\s*$/i);
  assert.match(text, /=\s*(\d+)\s*→/);
  assert.match(text, /Check:\s*(.+?)\s*Roll:/);
  assert.match(text, /Roll:\s*(.+?)\s*→/);
  const crit = formatRollLog(resolveCheck({ stat: "WIL", skill: null, dc: 14 }, ctx, 1));
  assert.match(crit, /→ Critical Failure$/);
});
