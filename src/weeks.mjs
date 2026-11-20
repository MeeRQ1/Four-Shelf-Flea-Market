import { catalog } from "./catalog.mjs";

export const DAYS = 7;
export const FIRST_WEEK = "FIRST";

const buyers = [
  { name: "Mara Moss", portrait: "mara", color: "mint" },
  { name: "Kit Vale", portrait: "kit", color: "lilac" },
  { name: "Dottie Ray", portrait: "dottie", color: "gold" },
  { name: "Ivo Finch", portrait: "ivo", color: "peach" },
  { name: "Penny Pike", portrait: "penny", color: "rose" },
  { name: "Ren Park", portrait: "ren", color: "mint" },
];

const introStock = [
  ["kettle:5", "robot:6", "clock:4", "mug:4", "postcard:3"],
  ["pan:5", "radio:6", "vase:5", "rocket:4", "bell:5"],
  ["lamp:6", "key:3", "print:4", "duck:5", "radio:5"],
  ["bell:4", "book:4", "vase:5", "bowl:5", "camera:7"],
  ["rocket:5", "marbles:4", "plate:5", "camera:7", "cactus:5"],
  ["robot:6", "plate:4", "lamp:6", "postcard:3", "clock:5"],
  ["vase:4", "print:4", "duck:4", "bell:5", "key:3"],
];

const introWalkIns = [
  ["Vintage", 8, 0], ["Metal", 10, 2], ["Décor", 10, 3], ["Vintage", 11, 4],
  ["Vintage", 11, 2], ["Ceramic", 10, 5], ["Brass", 10, 0],
];

const introCollectors = {
  1: ["Kitchen", 17, 1],
  2: ["Metal", 19, 5],
  3: ["Brass", 19, 4],
  5: ["Toys", 21, 1],
  7: ["Décor", 19, 3],
};

function makeOffer(day, type, tag, payout, buyerIndex) {
  return {
    ...buyers[buyerIndex], id: type + day, day,
    due: type === "collector" ? Math.min(DAYS, day + 1) : day,
    type, tag, payout, quantity: type === "collector" ? 2 : 1,
  };
}

function makeStock(day, idsAndCosts) {
  return idsAndCosts.map(([item, cost], index) => ({ id: day + "-" + index, item, cost }));
}

function firstWeek() {
  return introStock.map((lots, index) => {
    const day = index + 1;
    const offers = [makeOffer(day, "walk-in", ...introWalkIns[index])];
    if (introCollectors[day]) offers.push(makeOffer(day, "collector", ...introCollectors[day]));
    const stock = makeStock(day, lots.map(lot => {
      const [item, cost] = lot.split(":");
      return [item, Number(cost)];
    }));
    return { stock, offers };
  });
}

function seededRandom(seed) {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, random) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

const items = Object.values(catalog);
const itemsWithTag = tag => items.filter(item => item.tags.includes(tag));

export function makeWeek(seed) {
  if (seed === FIRST_WEEK) return firstWeek();
  const random = seededRandom(seed);
  const pick = options => options[Math.floor(random() * options.length)];
  const cost = item => Math.max(2, item.cost + Math.floor(random() * 3) - 1);
  const plans = Array.from({ length: DAYS }, () => ({ required: [], forbidden: null, offers: [] }));
  const usedPivots = new Set();

  function stockPlan(day, required, forbidden) {
    const plan = plans[day - 1];
    plan.required = required;
    plan.forbidden = forbidden;
  }

  for (let day = 1; day <= DAYS; day += 2) {
    const pivot = pick(items.filter(item => !usedPivots.has(item.id)));
    usedPivots.add(pivot.id);
    const collectorTag = pick(pivot.tags);
    const walkTag = pivot.tags.find(tag => tag !== collectorTag);
    const pair = pick(itemsWithTag(collectorTag).filter(item => item.id !== pivot.id));
    const alternative = pick(itemsWithTag(walkTag).filter(item => !item.tags.includes(collectorTag)));
    const waitForPair = day < DAYS && random() < 0.58;
    const pivotCost = cost(pivot);
    const pairCost = cost(pair);
    const walkStock = alternative && (random() < 0.73 || day === 1) ? [[alternative, cost(alternative)]] : [];
    const todayStock = [[pivot, pivotCost], ...walkStock];
    if (!waitForPair) todayStock.push([pair, pairCost]);
    stockPlan(day, shuffled(todayStock, random), waitForPair ? collectorTag : null);

    const buyerOrder = shuffled([0, 1, 2, 3, 4, 5], random);
    const walkPayout = Math.max(pivotCost, ...walkStock.map(([, price]) => price)) + 2 + Math.floor(random() * 4);
    const collectorPayout = pivotCost + pairCost + 6 + Math.floor(random() * 6);
    plans[day - 1].offers.push(
      makeOffer(day, "walk-in", walkTag, walkPayout, buyerOrder[0]),
      makeOffer(day, "collector", collectorTag, collectorPayout, buyerOrder[1]),
    );

    if (day === DAYS) continue;
    const preview = waitForPair ? pair : pick(items.filter(item => item.id !== pivot.id));
    const previewCost = waitForPair ? pairCost : cost(preview);
    const eveningTag = random() < 0.62 ? pick(preview.tags) : pick(items).tags[0];
    const eveningFind = pick(itemsWithTag(eveningTag).filter(item => item.id !== preview.id));
    const eveningCost = cost(eveningFind);
    stockPlan(day + 1, [[preview, previewCost], [eveningFind, eveningCost]], null);
    const eveningPayout = Math.max(preview.tags.includes(eveningTag) ? previewCost : 0, eveningCost)
      + 3 + Math.floor(random() * 5);
    plans[day].offers.push(makeOffer(day + 1, "walk-in", eveningTag, eveningPayout, buyerOrder[2]));
  }

  return plans.map(({ required, forbidden, offers }, index) => {
    const requiredIds = new Set(required.map(([item]) => item.id));
    const fillers = shuffled(items.filter(item => !requiredIds.has(item.id) && !item.tags.includes(forbidden)), random);
    const lots = [...required, ...fillers.slice(0, 5 - required.length).map(item => [item, cost(item)])];
    return {
      offers,
      stock: makeStock(index + 1, lots.map(([item, price]) => [item.id, price])),
    };
  });
}

export function randomSeed() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const numbers = new Uint8Array(6);
  globalThis.crypto.getRandomValues(numbers);
  return Array.from(numbers, value => letters[value % letters.length]).join("");
}
