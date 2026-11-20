import { catalog } from "./catalog.mjs";
import { buy, clearancePrice, clearShelf, closeDay, offersToday, openStock, sell, startWeek, storeMatches } from "./market.mjs";
import { readProgress, writeProgress } from "./progress.mjs";
import { playSound } from "./sound.mjs";
import { announce, element, money, nodes, renderAudio, renderBoard, showItem, showResults } from "./view.mjs";
import { FIRST_WEEK, makeWeek, randomSeed } from "./weeks.mjs";

const progress = readProgress();
let { state, soundOn } = progress;
const { scores } = progress;
let week = makeWeek(state.seed);
let activeOfferId = null;
let selectedSlots = new Set();
let selectionEdited = false;
let newPersonalBest = false;

function persist() {
  writeProgress(state, scores, soundOn);
}

function bestScore() {
  return scores.size ? Math.max(...scores.values()) : null;
}

function sound(action) {
  if (soundOn) playSound(action);
}

function displayedOffers() {
  return offersToday(state, week).filter(offer => offer.day === state.day || !state.filled.includes(offer.id));
}

function activeOffer(offers = displayedOffers()) {
  return offers.find(offer => offer.id === activeOfferId && !state.filled.includes(offer.id));
}

function matchingSlots(offer) {
  return state.shelves.flatMap((lot, index) => storeMatches(lot, offer) ? [index] : []);
}

function updateSelection(offer) {
  if (!offer) {
    activeOfferId = null;
    selectedSlots.clear();
    return;
  }
  const matches = matchingSlots(offer);
  selectedSlots = new Set([...selectedSlots].filter(slot => matches.includes(slot)));
  if (!selectionEdited && matches.length <= offer.quantity) selectedSlots = new Set(matches);
}

function render(fallbackFocus) {
  const offers = displayedOffers();
  const offer = activeOffer(offers);
  updateSelection(offer);
  renderBoard({ state, week, offers, offer, selectedSlots, best: bestScore() }, fallbackFocus);
}

function selectOffer(id, toggle = true) {
  const offer = displayedOffers().find(candidate => candidate.id === id && !state.filled.includes(id));
  if (!offer || state.complete) return;
  activeOfferId = toggle && activeOfferId === id ? null : id;
  selectedSlots.clear();
  selectionEdited = false;
  sound("choose");
  render();
  if (activeOfferId) {
    const matchCount = matchingSlots(offer).length;
    if (matchCount < offer.quantity) {
      announce(`Find ${offer.quantity - matchCount} more ${offer.tag} ${offer.quantity - matchCount === 1 ? "item" : "items"} for ${offer.name}.`);
    } else {
      announce(`${offer.name} will pay ${money(offer.payout)} for this order.`);
    }
  } else {
    announce("Choose any open offer to see matches.");
  }
}

function handlePurchase(id) {
  const lot = openStock(state, week).find(candidate => candidate.id === id);
  if (!lot || state.complete) return;
  if (!state.shelves.includes(null)) {
    announce("Your shelves are full. Sell an order or clear a shelf.", "warn");
    return;
  }
  if (state.cash < lot.cost) {
    announce(`You need ${money(lot.cost - state.cash)} more to buy ${catalog[lot.item].name}.`, "warn");
    return;
  }
  if (!buy(state, week, id)) return;
  persist();
  sound("buy");
  render(() => document.querySelector(".sell-button:not(:disabled), .buy-button:not(:disabled):not([aria-disabled])") || nodes.close);
  announce(`Bought ${catalog[lot.item].name} for ${money(lot.cost)}.`);
}

function handleSale() {
  const offer = activeOffer();
  if (!offer || !sell(state, week, offer.id, [...selectedSlots])) return;
  activeOfferId = null;
  selectedSlots.clear();
  persist();
  sound("sell");
  render(() => document.querySelector(".buyer-select:not(:disabled)") || nodes.close);
  announce(`Sold to ${offer.name} for ${money(offer.payout)}. ${offer.quantity === 1 ? "One shelf" : "Two shelves"} free.`, "good");
}

function handleShelf(index) {
  const lot = state.shelves[index];
  if (!lot) return;
  const offer = activeOffer();
  if (!storeMatches(lot, offer)) {
    const matches = displayedOffers().filter(buyer => !state.filled.includes(buyer.id) && storeMatches(lot, buyer));
    showItem(lot, index, matches);
    return;
  }
  if (selectedSlots.has(index)) {
    selectedSlots.delete(index);
  } else {
    if (offer.quantity === 1) selectedSlots.clear();
    if (selectedSlots.size >= offer.quantity) {
      announce("Deselect an item to switch to a different pair.", "warn");
      return;
    }
    selectedSlots.add(index);
  }
  selectionEdited = true;
  sound("choose");
  render();
  announce(`${selectedSlots.size} of ${offer.quantity} selected for ${offer.name}.`);
}

function handleClear(index) {
  const lot = state.shelves[index];
  if (!lot || !clearShelf(state, index)) return;
  if (nodes.inspect.open) nodes.inspect.close();
  persist();
  sound("clear");
  render(() => document.querySelector(".buy-button:not(:disabled):not([aria-disabled])") || nodes.close);
  announce(`Cleared ${catalog[lot.item].name} for ${money(clearancePrice(lot))}.`);
}

function handleClose(event) {
  if (event.detail > 1) return;
  if (state.complete) {
    showResults(state, scores.get(state.seed), newPersonalBest);
    return;
  }
  const previousBest = bestScore();
  const expired = displayedOffers().filter(offer => !state.filled.includes(offer.id) && offer.due === state.day).length;
  closeDay(state);
  activeOfferId = null;
  selectedSlots.clear();
  if (state.complete) {
    newPersonalBest = previousBest === null || state.cash > previousBest;
    scores.set(state.seed, Math.max(state.cash, scores.get(state.seed) ?? 0));
  }
  persist();
  render();
  if (state.complete) {
    sound("finish");
    announce(`Week complete. You finished with ${money(state.cash)}.`, "good");
    showResults(state, scores.get(state.seed), newPersonalBest);
  } else {
    sound("close");
    const departed = expired ? ` ${expired} offer${expired === 1 ? "" : "s"} expired at closing.` : "";
    announce(`Day ${state.day} is open. Fresh finds are on the table.${departed}`);
  }
}

function begin(seed) {
  state = startWeek(seed);
  week = makeWeek(seed);
  activeOfferId = null;
  selectedSlots.clear();
  selectionEdited = false;
  newPersonalBest = false;
  nodes.results.close();
  persist();
  render();
  announce(seed === FIRST_WEEK ? "The first market week is ready to play again." : "A fresh week is open with new buyers and finds.");
  window.scrollTo(0, 0);
  document.querySelector(".buyer-select:not(:disabled)")?.focus({ preventScroll: true });
}

document.addEventListener("click", event => {
  const button = event.target.closest?.("button");
  if (!button) return;
  const { dismiss, action, id, slot } = button.dataset;
  if (dismiss) element(dismiss).close();
  switch (action) {
    case "offer": selectOffer(id); break;
    case "buy": handlePurchase(id); break;
    case "sell": handleSale(); break;
    case "shelf": handleShelf(Number(slot)); break;
    case "clear": handleClear(Number(slot)); break;
    case "inspect-offer":
      nodes.inspect.close();
      selectOffer(id, false);
      document.querySelector(`[data-focus="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
      break;
  }
});

element("sound-button").addEventListener("click", () => {
  soundOn = !soundOn;
  renderAudio(soundOn);
  persist();
  sound("choose");
});
element("help-button").addEventListener("click", () => nodes.help.showModal());
element("new-button").addEventListener("click", () => {
  let seed = randomSeed();
  while (seed === state.seed || scores.has(seed)) seed = randomSeed();
  begin(seed);
});
element("retry-button").addEventListener("click", () => begin(state.seed));
nodes.close.addEventListener("click", handleClose);

renderAudio(soundOn);
render();
if (state.complete) {
  showResults(state, scores.get(state.seed), newPersonalBest);
} else if (state.day === 1 && state.stats.purchases === 0 && state.seed === FIRST_WEEK) {
  announce("Mara is looking for a Vintage find. Choose her offer to see what matches.");
} else {
  announce(`Trading on day ${state.day}.${state.stats.sales ? ` ${state.stats.sales} order${state.stats.sales === 1 ? "" : "s"} filled this week.` : ""}`);
}
