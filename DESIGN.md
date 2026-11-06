# Design

The game should look like a board game on a kitchen table, not like a generic web app.
These rules keep it that way. `src/design.test.ts` checks the ones a machine can check.

## One shape: the index card

A ruled index card is the game's signature. It is paper with the player's name typed on the
header line, a red rule under it, and faint blue rules below. Whenever the screen shows an
identity or a player's slot, it is an `IndexCard.vue` (its look is `.index-card` in
`src/style.css`):

- `IdentityCard.vue`: each player's card, with the picture laid on it like a print. Your own
  card shows `???`.
- The presentation screen: unsolved cards (`???`, "still guessing"), and the small name cards
  in the lobby and while writing.
- `NotesPanel.vue`: your notes are written on a card.
- The logo is a card with a `?`.

Cards lie a little crooked (`--tilt` from `components/tilt.ts`, stable per player). Only
cards cast a shadow. The card whose turn it is gets picked up: it straightens and gets an
accent outline.

Everything else is flat. A page section is a heading under a 2px ink rule (`.panel`), not
a box. The only boxed area is `.callout`, for what needs you right now (whose turn it is,
the vote). Lists such as Points and Players are ledgers with dashed rules (`.ledger`).

## Two typefaces, one job each

- **Atkinson Hyperlegible Next** (`--font-text`): all UI text. It is easy to read across a
  room on a TV.
- **Courier Prime** (`--font-typed`): only what's typed on a card (names on the header line,
  identity labels, notes, `???`, stamps) and room codes.

Both are self-hosted through `@fontsource`, so the game never depends on a font CDN. Don't add
a third face. The card header line is the only uppercase text.

## Colour

Tokens live in `src/style.css`, with a dark theme alongside.

- The base is a cream table (`--bg`), warm ink (`--text`) and paper cards (`--card`).
- There is one accent, a burnt orange (`--accent`), for the primary button, links, and
  "it's your turn".
- `--ok` green marks solved cards and correct answers.
- The red and blue card rules are decoration on cards only.

Every text colour passes WCAG AA against the background it sits on, in both themes.
Re-check the contrast when you change a token.

## Don't

- Emoji as icons. Use words, or the few drawn icons in `AppIcon.vue` (always with text or
  an `aria-label` next to them). The only emoji left are in the background-tab title
  (`useAlerts.ts`), where they help you spot the tab.
- Decorative gradients, glows, coloured box-shadows, frosted glass. The card rules are the
  only gradients, and they draw paper lines.
- Coloured stripes down the left side of cards or banners.
- Pills everywhere: buttons and chips have a 4px radius.
- A centred hero with a badge above the headline.
- Identical feature boxes with an icon on top.
