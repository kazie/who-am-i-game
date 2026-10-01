# Who Am I?

A browser party game. Everyone gets a secret identity that the whole table can see, except
you. Ask yes/no questions out loud (in the room or on a video call) until you work out who you are.

## How a game goes

There's no game master: every player has the same buttons, and the group decides together.

1. **Create a room.** Someone picks a theme ("Famous scientists", "Animals", …) and shares the
   5-letter room code or link.
2. **Lobby.** Players join with the code and their name. When everyone is in, anyone starts
   the writing round.
3. **Writing.** Each player writes **one** entry for the theme. Adding a picture link is
   optional but strongly encouraged. Any of these work:
   - a Wikipedia article, e.g. `https://en.wikipedia.org/wiki/Marie_Curie` (its main picture is used)
   - a picture on Wikipedia, i.e. the link you get after clicking an image
     (`…/wiki/Red_fox#/media/File:….jpg`), or a Commons `File:` page
   - a direct image URL, e.g. `https://upload.wikimedia.org/…jpg`
4. **Playing.** Anyone presses **Hand out identities** once all entries are in. Entries are
   shuffled so nobody gets the one they wrote. You see everyone else's card and picture, but
   your own says "Who am I?".
   - The app rotates turns. On your turn, ask one yes/no question out loud, then press
     **Done, next player**.
   - Think you know? Press **I want to guess** and say it out loud. You can't see your own
     card, so the **others vote**: a majority of the players who are around (away players
     don't block it) decides whether it's ✅ correct or ❌ not quite.
   - A correct guess reveals your card and scores points: with N players, the first correct
     guess of the round earns **N-1**, the next N-2, and so on down to 0. A wrong guess just
     passes the turn, and you keep playing.
   - If the active player has gone away, anyone can skip their turn.
5. **Round over.** The round ends when everyone has guessed theirs, or early if a majority votes
   to end it (anyone still guessing gets 0). All cards are revealed.
6. **Again, or finish.** Anyone can start the next round with a new theme. Points add up over
   rounds. When the group has had enough, a majority votes to finish, and the player with the
   most points wins 🏆 (ties share the win).

### The presentation screen

Every room has a **📺 Presentation screen** link (`#/room/<CODE>/screen`). Open it on a TV,
or share that window in your video call. It shows how to join (a QR code that opens the room
on a phone, plus the site's address and the room code for typing in by hand), whose turn it
is, the live vote, the points and, at the end, the winner. It only watches and never joins as
a player.

Everyone can see the screen, including the person whose card it would show, so it **never
shows an unsolved card**. Cards appear there once they are guessed, or when the round ends.
Each player still sees the others' cards on their own device.

### See an example first

The start page links to **👀 See an example game** (`#/example`). Five friends play two rounds
of "Big cats" (lion, tiger, serval, caracal, puma, …) with real Wikipedia pictures. You can
step through it and look at any player's phone next to the presentation screen. The example is
played by the real game rules (`src/example/bigCats.ts`), so it never goes out of date.

## Running it

The game needs [araisan-meme-eventbridge](https://github.com/kazie/araisan-meme-eventbridge)
as its message relay:

```sh
# in ../araisan-meme-eventbridge
./gradlew runDebugExecutableHost            # ws://localhost:8080/ws
```

Then, in this repo:

```sh
pnpm install
cp .env.example .env   # optional: point VITE_BRIDGE_URL somewhere else
pnpm dev
```

Open the app in a few tabs or browsers to play against yourself. Each tab is its own player.

| Script             | What it does                     |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Vite dev server                  |
| `pnpm build`       | Production build into `dist/`    |
| `pnpm test`        | Unit tests (Vitest)              |
| `pnpm lint`        | ESLint + Prettier check          |
| `pnpm typecheck`   | vue-tsc                          |
| `pnpm story:dev`   | Histoire component stories       |
| `pnpm story:build` | Static stories into `.histoire/` |

To play a round over a running bridge as part of the tests:

```sh
BRIDGE_URL=ws://localhost:8080/ws pnpm test
```

### Stories

`pnpm story:dev` opens Histoire with a story for every component and view:

- every state of the room screen (join form, connecting, removed, closed, each phase, warning
  banners), built from fixed states with `src/example/staticRoom.ts`;
- the presentation screen in every phase;
- a live game over an in-memory bridge;
- the whole Big cats walkthrough, step by step.

`src/stories.test.ts` fails if a component or view has no story.

To host the game publicly over `https`, the bridge needs TLS: browsers only let an `https`
page connect to a `wss://` bridge. Build with `VITE_BRIDGE_URL=wss://your-bridge/ws`.

## How it works

- Each room is one bridge topic, `who-am-i/<CODE>`. Nothing else on the bridge is touched.
- The bridge only relays live messages: it has no history, presence or auth. Because of
  that, **the tab that created the room is the relay** and holds the state. It has no extra
  say in the game: it applies the same rules to its own clicks as to everyone else's.
  Players send small messages (`hello`, `submit`, `deal`, `guess`, `vote`, `pass`,
  `endVote`, …). The relay runs them through a pure reducer
  (`src/game/reducer.ts`) and broadcasts a full state snapshot after every change and every
  10 s. Players keep saying `hello` until a snapshot lists them, because the
  bridge drops anything sent before the relay subscribed.
- A player that hasn't been heard from for 75 s shows as _away_ (hidden tabs only get timers about once a minute, so a tab also checks in as soon as it is visible again). Players also see a
  warning when the relay tab goes quiet. Anyone can remove a player who is away (in the
  lobby or while writing) or watching. Removed players stay out unless they join again as a
  new player.
- Seats live in `sessionStorage`. Reloading a tab keeps your seat, and a reloaded relay
  tab resumes the room. If the creator closes their tab for good, the room ends. The app
  reminds them to keep it open.
- Every client receives every assignment and the UI hides your own. Someone could peek
  in devtools, which is fine for a party game.
- **Trust:** the eventbridge has no authentication, so the game trusts everyone who can
  publish on the bridge. Incoming messages are checked for shape and safe links, so a broken
  or malicious message can't crash the page or plant a `javascript:` link. But anyone on the
  bridge can impersonate the room creator's tab: by publishing fake snapshots they can take
  over or freeze a room until everyone reloads. Run the bridge where only your players can
  reach it. Fixing this properly needs publish rights in the bridge (only the creator may
  publish snapshots to its room) or signed snapshots.
- Anyone can join while entries are still being written. Anyone who joins after the cards are dealt watches as a spectator until the next round.

```
src/
  bridge/      BridgeClient (WebSocket, reconnect) and MemoryBridge (tests/stories)
  game/        protocol types, reducer, assignment, Wikipedia lookup, useRoom composable
  components/  UI components plus *.story.vue for Histoire
  views/       Home and Room routes
```

## CI and deployment

`.github/workflows/ci.yml` runs lint, typecheck, tests, the app build and the story build on
every push and pull request. On `master` it publishes the **Histoire stories** to **GitHub
Pages**. The game itself is not deployed: it needs a running eventbridge.

One-time setup in the GitHub repository: **Settings → Pages → Build and deployment →
Source:** choose **GitHub Actions**.

The stories need no server: inside Histoire the bridge module is swapped for one that refuses
to connect (`histoire.config.ts`), and stories use the in-memory `MemoryHub`. Preview the
published site with `pnpm story:build && pnpm story:preview`.
