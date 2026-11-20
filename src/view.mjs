import { catalog } from "./catalog.mjs";
import { clearancePrice, openStock, SHELVES, START_CASH, storeMatches } from "./market.mjs";
import { DAYS, FIRST_WEEK } from "./weeks.mjs";

export const element = id => document.getElementById(id);
export const money = value => "$" + value;
const icon = name => `<img src="assets/${name}.png" alt="" draggable="false">`;
const tagClass = tag => tag === "Décor" ? "decor" : tag.toLowerCase();
const tagBadge = tag => `<span class="tag tag-${tagClass(tag)}">${tag}</span>`;
const tags = item => `<span class="tags">${item.tags.map(tagBadge).join("")}</span>`;

export const nodes = {
  day: element("day-label"), track: element("day-track"), cash: element("cash-value"), best: element("best-value"),
  close: element("close-button"), offers: element("buyer-list"), offerCount: element("offer-count"),
  shelves: element("shelf-grid"), shelfCount: element("shelf-count"), shelfHint: element("shelf-hint"),
  stock: element("stock-grid"), stockCount: element("stock-count"), stockHint: element("stock-hint"),
  preview: element("preview-content"), note: element("market-note"), weekName: element("week-name"),
  help: element("help-dialog"), inspect: element("inspect-dialog"), results: element("results-dialog"),
};

export function announce(message, tone = "") {
  nodes.note.textContent = message;
  nodes.note.dataset.tone = tone;
}

function renderStatus(state, best) {
  nodes.day.textContent = state.complete ? "Week complete" : `Day ${state.day} of ${DAYS}`;
  nodes.track.innerHTML = Array.from({ length: DAYS }, (_, index) => {
    const day = index + 1;
    const style = state.complete || day < state.day ? "past" : day === state.day ? "current" : "";
    return `<span class="day-pip ${style}"></span>`;
  }).join("");
  nodes.cash.textContent = money(state.cash);
  nodes.best.textContent = best === null ? "—" : money(best);
  nodes.close.innerHTML = state.complete
    ? icon("trophy") + "<span>Week results</span>"
    : icon("moon") + `<span>${state.day === DAYS ? "Finish week" : "Close stall"}</span>`;
  nodes.weekName.textContent = state.seed === FIRST_WEEK ? "First market week" : "Week " + state.seed;
}

function renderBuyers(state, offers, chosen, selectedSlots) {
  const count = state.complete ? 0 : offers.filter(offer => !state.filled.includes(offer.id)).length;
  nodes.offerCount.textContent = count + " open";
  nodes.offers.innerHTML = offers.map(offer => {
    const filled = state.filled.includes(offer.id);
    const deadline = filled ? "Sold" : state.complete ? "Closed" : offer.due === state.day ? "Due today" : "Due tomorrow";
    const deadlineStyle = filled ? "filled" : offer.due > state.day ? "tomorrow" : "";
    const selected = offer.id === chosen?.id;
    const ready = selectedSlots.size === offer.quantity;
    const stocked = filled || selected || state.complete ? 0 : state.shelves.filter(lot => storeMatches(lot, offer)).length;
    const readiness = stocked >= offer.quantity ? "Ready to sell" : `${stocked} of ${offer.quantity} stocked`;
    return `<article class="buyer-card ${filled ? "fulfilled" : ""} ${selected ? "active" : ""}">
      <button class="buyer-select" type="button" data-action="offer" data-id="${offer.id}" data-focus="${offer.id}"
        aria-pressed="${selected}" ${filled || state.complete ? "disabled" : ""}
        aria-label="${offer.name}, ${offer.quantity} × ${offer.tag}, pays ${money(offer.payout)}, ${deadline}${stocked ? ", " + readiness : ""}">
        <span class="buyer-top">
          <span class="portrait swatch-${offer.color}">${icon(offer.portrait)}</span>
          <span class="buyer-identity">
            <span class="buyer-role">${offer.type === "collector" ? "Collector" : "Walk-in"}</span>
            <strong class="buyer-name">${offer.name}</strong>
            ${stocked ? `<span class="buyer-supply">${readiness}</span>` : ""}
          </span>
          <strong class="offer-payout">${money(offer.payout)}</strong>
        </span>
        <span class="buyer-request">
          <span>${offer.quantity} ×</span>${tagBadge(offer.tag)}
          <span class="deadline ${deadlineStyle}">${deadline}</span>
        </span>
      </button>
      ${selected ? `<div class="buyer-actions">
        <span>${selectedSlots.size} / ${offer.quantity} selected</span>
        <button class="pixel-button sell-button" type="button" data-action="sell" data-focus="sell" ${ready ? "" : "disabled"}>
          Sell for ${money(offer.payout)}
        </button>
      </div>` : ""}
    </article>`;
  }).join("");
}

function renderShelves(state, offer, selectedSlots) {
  const filled = state.shelves.filter(Boolean).length;
  nodes.shelfCount.textContent = `${filled} / ${SHELVES} stocked`;
  nodes.shelves.innerHTML = state.shelves.map((lot, index) => {
    if (lot === null) {
      return `<div class="shelf-slot empty"><div class="empty-slot">
        ${icon("crate")}<span>Empty shelf</span></div></div>`;
    }
    const item = catalog[lot.item];
    const match = storeMatches(lot, offer);
    const picked = selectedSlots.has(index);
    const clearance = clearancePrice(lot);
    return `<div class="shelf-slot ${match ? "matches" : ""} ${picked ? "picked" : ""}">
      <button class="shelf-item" type="button" data-action="shelf" data-slot="${index}" data-focus="shelf${index}"
        ${match ? `aria-pressed="${picked}" aria-label="Select ${item.name} for ${offer.name}"` : `aria-label="Inspect ${item.name}"`}>
        ${icon(item.id)}
        <span class="shelf-item-copy"><strong>${item.name}</strong>${tags(item)}</span>
      </button>
      <div class="shelf-meta">
        <span class="shelf-status">${picked ? "Selected" : match ? "Matches" : ""}</span>
        <button class="shelf-clear" type="button" data-action="clear" data-slot="${index}" data-focus="clear${index}"
          aria-label="Clear ${item.name} for ${money(clearance)}">Clear ${money(clearance)}</button>
      </div>
    </div>`;
  }).join("");

  nodes.shelfHint.textContent = state.complete
    ? "Leftover finds have been sold at clearance prices."
    : offer ? `Choose ${offer.quantity} ${offer.tag} ${offer.quantity === 1 ? "item" : "items"} for ${offer.name}.`
    : "Pick a buyer to highlight matching items.";
}

function renderStock(state, week, offer) {
  const available = openStock(state, week);
  const availableIds = new Set(available.map(lot => lot.id));
  const full = !state.shelves.includes(null);
  nodes.stockCount.textContent = state.complete ? "Market closed" : `${available.length} available`;
  nodes.stock.innerHTML = week[state.day - 1].stock.map(lot => {
    const item = catalog[lot.item];
    const sold = !availableIds.has(lot.id);
    const matching = !sold && storeMatches(lot, offer);
    const blocked = !sold && !state.complete && (full || lot.cost > state.cash);
    const buttonLabel = sold ? "Sold" : state.complete ? "Closed" : "Buy";
    const title = full ? "Free a shelf to buy" : lot.cost > state.cash ? "You need more cash" : "";
    return `<article class="stock-card ${sold ? "sold" : ""} ${matching ? "matches" : ""}">
      <div class="item-display swatch-${item.color}">
        ${icon(item.id)}<span class="lot-price">${money(lot.cost)}</span>
      </div>
      <div class="stock-copy"><h3>${item.name}</h3>${tags(item)}</div>
      <button class="pixel-button positive-button buy-button" type="button" data-action="buy" data-id="${lot.id}"
        data-focus="buy${lot.id}" aria-label="${sold || state.complete ? buttonLabel + " " + item.name : "Buy " + item.name + " for " + money(lot.cost)}"
        ${sold || state.complete ? "disabled" : ""} ${blocked ? `aria-disabled="true" title="${title}"` : ""}>
        ${buttonLabel}
      </button>
    </article>`;
  }).join("");
  nodes.stockHint.textContent = full ? "Sell an order or clear a shelf to make room." : "Sell from your shelves to raise cash.";
  nodes.stockHint.hidden = state.complete || !available.length || (!full && available.some(lot => lot.cost <= state.cash));
}

function renderPreview(state, week) {
  const lot = week[state.day]?.stock[0];
  if (!lot) {
    nodes.preview.innerHTML = `<p class="empty-preview">${state.complete ? "This market week is over." : "This is the last market day."}</p>`;
    return;
  }
  const item = catalog[lot.item];
  nodes.preview.innerHTML = `<div class="preview-item">
    <div class="preview-art swatch-${item.color}">${icon(item.id)}</div>
    <div class="preview-copy"><strong>${item.name}</strong>${tags(item)}</div>
    <strong class="preview-cost">${money(lot.cost)}</strong>
  </div>`;
}

export function renderBoard({ state, week, offers, offer, selectedSlots, best }, fallbackFocus) {
  const focusKey = document.activeElement?.dataset.focus;
  renderStatus(state, best);
  renderBuyers(state, offers, offer, selectedSlots);
  renderShelves(state, offer, selectedSlots);
  renderStock(state, week, offer);
  renderPreview(state, week);
  if (focusKey) {
    const previous = document.querySelector(`[data-focus="${CSS.escape(focusKey)}"]:not(:disabled)`);
    (previous ?? fallbackFocus?.())?.focus({ preventScroll: true });
  }
}

export function showItem(lot, index, matches) {
  const item = catalog[lot.item];
  element("inspect-content").innerHTML = `<div class="inspect-item">
    <div class="inspect-art swatch-${item.color}">${icon(item.id)}</div>
    <div class="inspect-copy"><h3>${item.name}</h3>${tags(item)}
      <p>${item.detail}</p><p>Bought for ${money(lot.cost)}</p>
    </div>
  </div>
  <div class="inspect-matches">${matches.map(offer => `<button type="button" class="pixel-button quiet-button"
    data-action="inspect-offer" data-id="${offer.id}">Offer from ${offer.name}</button>`).join("")}</div>
  <div class="dialog-actions">
    <button type="button" class="pixel-button clear-button" data-action="clear" data-slot="${index}">
      Clear shelf for ${money(clearancePrice(lot))}
    </button>
  </div>`;
  nodes.inspect.showModal();
}

export function showResults(state, weekBest, newPersonalBest) {
  const profit = state.cash - START_CASH;
  element("result-score").textContent = money(state.cash);
  element("result-subtitle").textContent = newPersonalBest ? "New personal best!" : `This week’s best is ${money(weekBest ?? state.cash)}.`;
  const summary = [
    ["Net profit", (profit < 0 ? "−" : "+") + money(Math.abs(profit))],
    ["Orders filled", state.stats.sales],
    ["Collector orders", state.stats.collectorSales],
  ];
  element("week-summary").innerHTML = summary.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  if (!nodes.results.open) nodes.results.showModal();
}

export function renderAudio(soundOn) {
  element("sound-button").setAttribute("aria-pressed", String(soundOn));
  element("sound-button").title = soundOn ? "Mute sounds" : "Enable sounds";
  element("sound-icon").src = soundOn ? "assets/sound.png" : "assets/mute.png";
}
