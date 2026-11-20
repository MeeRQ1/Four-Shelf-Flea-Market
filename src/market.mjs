import { catalog } from "./catalog.mjs";
import { DAYS, FIRST_WEEK } from "./weeks.mjs";

export const SHELVES = 4;
export const START_CASH = 20;

export function startWeek(seed = FIRST_WEEK) {
  return {
    seed, day: 1, cash: START_CASH,
    shelves: Array(SHELVES).fill(null), bought: [], filled: [],
    stats: { purchases: 0, sales: 0, collectorSales: 0, clearance: 0 },
    complete: false,
  };
}

export function offersToday(state, week) {
  const previous = week[state.day - 2]?.offers.filter(offer => offer.due >= state.day) ?? [];
  return [...week[state.day - 1].offers, ...previous];
}

export function storeMatches(item, offer) {
  return Boolean(item && offer && catalog[item.item].tags.includes(offer.tag));
}

export function openStock(state, week) {
  return week[state.day - 1].stock.filter(lot => !state.bought.includes(lot.id));
}

export function clearancePrice(lot) {
  return Math.floor(lot.cost / 2);
}

export function buy(state, week, id) {
  const lot = openStock(state, week).find(item => item.id === id);
  const space = state.shelves.indexOf(null);
  if (state.complete || !lot || space < 0 || state.cash < lot.cost) return false;
  state.cash -= lot.cost;
  state.bought.push(lot.id);
  state.shelves[space] = lot;
  state.stats.purchases += 1;
  return true;
}

export function sell(state, week, id, slots) {
  const offer = offersToday(state, week).find(buyer => buyer.id === id);
  const distinct = new Set(slots);
  if (state.complete || !offer || state.filled.includes(id) || distinct.size !== offer.quantity
      || slots.length !== distinct.size || !slots.every(slot => storeMatches(state.shelves[slot], offer))) {
    return false;
  }
  for (const slot of slots) state.shelves[slot] = null;
  state.cash += offer.payout;
  state.filled.push(id);
  state.stats.sales += 1;
  if (offer.type === "collector") state.stats.collectorSales += 1;
  return true;
}

export function clearShelf(state, index) {
  const lot = state.shelves[index];
  if (state.complete || !lot) return false;
  const payment = clearancePrice(lot);
  state.cash += payment;
  state.stats.clearance += payment;
  state.shelves[index] = null;
  return true;
}

export function closeDay(state) {
  if (state.complete) return false;
  if (state.day === DAYS) {
    state.shelves.forEach((lot, index) => {
      if (lot) clearShelf(state, index);
    });
    state.complete = true;
  } else {
    state.day += 1;
    state.bought = [];
  }
  return true;
}
