import assert from "node:assert/strict";
import test from "node:test";
import { buy, closeDay, offersToday, openStock, sell, startWeek, storeMatches } from "../src/market.mjs";
import { DAYS, FIRST_WEEK, makeWeek } from "../src/weeks.mjs";

test("a walk-in sale lets the stall reinvest and fill a collector order", () => {
  const week = makeWeek(FIRST_WEEK);
  const state = startWeek();

  assert.equal(buy(state, week, "1-4"), true);
  assert.equal(buy(state, week, "1-4"), false);
  assert.equal(sell(state, week, "walk-in1", [0]), true);
  assert.equal(state.cash, 25);

  assert.equal(buy(state, week, "1-0"), true);
  assert.equal(buy(state, week, "1-3"), true);
  assert.equal(sell(state, week, "collector1", [0, 0]), false);
  assert.equal(sell(state, week, "collector1", [0, 1]), true);
  assert.equal(state.cash, 33);
  assert.deepEqual(state.shelves, [null, null, null, null]);
  assert.equal(state.stats.collectorSales, 1);
});

test("closing preserves inventory and the collector until their deadline", () => {
  const week = makeWeek(FIRST_WEEK);
  const state = startWeek();

  assert.equal(buy(state, week, "1-0"), true);
  assert.equal(closeDay(state), true);
  assert.equal(state.day, 2);
  assert.equal(state.shelves[0].item, "kettle");
  assert.deepEqual(offersToday(state, week).map(offer => offer.id), ["walk-in2", "collector2", "collector1"]);
  assert.equal(sell(state, week, "walk-in1", [0]), false);

  assert.equal(buy(state, week, "2-0"), true);
  assert.equal(sell(state, week, "collector1", [0, 1]), true);
  assert.equal(buy(state, week, "2-1"), true);
  for (let day = 2; day <= DAYS; day += 1) assert.equal(closeDay(state), true);

  assert.equal(state.complete, true);
  assert.equal(state.cash, 24);
  assert.equal(state.stats.clearance, 3);
  assert.equal(closeDay(state), false);
});

test("a seed replays the same stock and buyers, with a viable opening every day", () => {
  const first = makeWeek("MARKET");
  assert.deepEqual(makeWeek("MARKET"), first);
  assert.notDeepEqual(makeWeek("STALL"), first);

  for (let number = 0; number < 100; number += 1) {
    const seed = "WEEK" + number;
    const week = makeWeek(seed);
    const state = startWeek(seed);
    for (const day of week) {
      assert.equal(day.stock.length, 5);
      assert.equal(new Set(day.stock.map(lot => lot.item)).size, 5);
      const walkIn = day.offers.find(offer => offer.type === "walk-in");
      assert.ok(openStock(state, week).some(lot => storeMatches(lot, walkIn) && lot.cost < walkIn.payout));
      closeDay(state);
    }
  }
});
