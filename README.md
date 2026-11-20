# Four-Shelf Flea Market

A pixel-art browser trading game. Start with $20 and four shelves. Buy finds, trade with buyers, and see how much you can earn in seven market days.

## Play locally

Run a static server from this directory.

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser. Pick a buyer to highlight matching items. At the end of the week, retry the same market or generate a new one. Your progress and personal best save in your browser.

## Hosting

The game uses static HTML, CSS, and JavaScript with its art and fonts included. For GitHub Pages, use the `main` branch and its root folder as the source.

## Development

Edit the browser modules in `src/`. `catalog.mjs` holds the finds, `weeks.mjs` generates repeatable markets, and `market.mjs` handles trades and day changes. `game.mjs` connects those rules to `view.mjs`, with browser saves in `progress.mjs` and sound in `sound.mjs`.

Run the trading, seeded replay, and save checks with Node.js 20 or newer.

```sh
node --test
```
