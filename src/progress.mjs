import { catalog } from "./catalog.mjs";
import { SHELVES, startWeek } from "./market.mjs";
import { DAYS } from "./weeks.mjs";

const SAVE_KEY = "four-shelf-flea-market-v1";
const STAT_KEYS = ["purchases", "sales", "collectorSales", "clearance"];
const isWeekCode = value => typeof value === "string" && /^[A-Z0-9]{1,16}$/.test(value);
const isAmount = value => Number.isSafeInteger(value) && value >= 0;
const isIdList = value => Array.isArray(value) && value.every(id => typeof id === "string");

function validShelf(lot) {
  return lot === null || Boolean(lot && typeof lot.item === "string" && Object.hasOwn(catalog, lot.item)
    && typeof lot.id === "string" && isAmount(lot.cost) && lot.cost >= 2);
}

function validRun(run) {
  if (!run || !isWeekCode(run.seed) || !isAmount(run.cash)
      || !Number.isInteger(run.day) || run.day < 1 || run.day > DAYS
      || typeof run.complete !== "boolean" || !Array.isArray(run.shelves) || run.shelves.length !== SHELVES) {
    return false;
  }
  if (run.complete && (run.day !== DAYS || run.shelves.some(lot => lot !== null))) return false;
  return run.shelves.every(validShelf) && isIdList(run.bought) && isIdList(run.filled)
    && Boolean(run.stats && STAT_KEYS.every(key => isAmount(run.stats[key])));
}

export function readProgress(storage) {
  let saved;
  try {
    saved = JSON.parse((storage ?? globalThis.localStorage).getItem(SAVE_KEY));
  } catch {
    // A blocked or unreadable save opens a fresh stall.
  }

  const scores = new Map(Object.entries(saved?.scores ?? {}).filter(([seed, score]) =>
    isWeekCode(seed) && isAmount(score)));
  return {
    state: validRun(saved?.state) ? saved.state : startWeek(),
    scores,
    soundOn: saved?.sound === true,
  };
}

export function writeProgress(state, scores, soundOn, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify({
      state,
      scores: Object.fromEntries(scores),
      sound: soundOn,
    }));
  } catch {
    // The game can still run in the current tab if browser storage is restricted.
  }
}
