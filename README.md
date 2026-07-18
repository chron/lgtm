# Backlog

A bright, chunky roguelike deckbuilder about shipping software without shipping your sanity.

Build a squad, play Work cards, survive startup chaos, and somehow make it through the Final Release with morale intact.

## Run locally

The game lives in `game/` and uses Bun, React, TypeScript, and Vite.

```sh
cd game
bun install
bun run dev
```

The Portless development URL is `https://backlog.localhost/`. To run plain Vite instead, use `bun run dev:plain`.

## Design contracts

- [Vertical Slice Gameplay Contract](docs/vertical-slice-contract.md)
- [Character Kits and Deck Archetypes](docs/character-kits-and-archetypes.md)
- [Visual Design](DESIGN.md)
- [Product Direction](PRODUCT.md)

## Checks

```sh
cd game
bun run check
bun run build
```

## Deployment

Production is hosted on [Cloudflare Pages](https://backlog-edr.pages.dev/) and deployed from `main` by [GitHub Actions](.github/workflows/deploy.yml).

The workflow requires two GitHub Actions repository secrets:

- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account containing the `backlog` Pages project.
- `CLOUDFLARE_API_TOKEN` — a token restricted to that account with only **Cloudflare Pages: Edit** permission.

The token must never be committed. Create it in Cloudflare under **Account API tokens**, then add both values under **GitHub repository settings → Secrets and variables → Actions**.
