import assert from "node:assert/strict";
import test from "node:test";
import { buy, closeDay, startWeek } from "../src/market.mjs";
import { readProgress, writeProgress } from "../src/progress.mjs";
import { makeWeek } from "../src/weeks.mjs";

const key = "four-shelf-flea-market-v1";

function memoryStorage(initial = null) {
  const values = new Map([[key, initial]]);
  return {
    getItem: name => values.get(name),
    setItem: (name, value) => values.set(name, value),
  };
}

test("the v1 save resumes its day, inventory, score, and sound preference", () => {
  const state = startWeek();
  const week = makeWeek(state.seed);
  buy(state, week, "1-2");
  closeDay(state);
  const storage = memoryStorage(JSON.stringify({ state, scores: { FIRST: 47 }, sound: true }));

  const loaded = readProgress(storage);
  assert.deepEqual(loaded.state, state);
  assert.equal(loaded.scores.get("FIRST"), 47);
  assert.equal(loaded.soundOn, true);

  buy(loaded.state, week, "2-0");
  writeProgress(loaded.state, loaded.scores, false, storage);
  assert.deepEqual(readProgress(storage).state, loaded.state);
  assert.equal(readProgress(storage).soundOn, false);
});

test("a malformed run starts fresh while preserving valid score records", () => {
  const state = startWeek();
  state.shelves[0] = { id: "1-0", item: "__proto__", cost: 5 };
  const storage = memoryStorage(JSON.stringify({ state, scores: { FIRST: 47, BAD: -1 } }));

  const loaded = readProgress(storage);
  assert.deepEqual(loaded.state, startWeek());
  assert.deepEqual([...loaded.scores], [["FIRST", 47]]);
});

test("unavailable or unreadable browser storage still allows a game to start", () => {
  const restricted = {
    getItem() { throw new Error("Storage disabled"); },
    setItem() { throw new Error("Storage disabled"); },
  };

  const { state, scores, soundOn } = readProgress(restricted);
  assert.deepEqual(state, startWeek());
  assert.equal(scores.size, 0);
  assert.equal(soundOn, false);
  assert.doesNotThrow(() => writeProgress(state, scores, soundOn, restricted));
  assert.deepEqual(readProgress(memoryStorage("{")).state, startWeek());
});
