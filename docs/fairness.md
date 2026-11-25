# Randomness & Fairness

This document records every place the game relies on chance or ordering, what the code
does there, why, and the analysis behind it. Update it when you add or change anything
random, anything ordered by seat, or anything that could let a player infer hidden
information from how the UI behaves.

Contents:

1. [Random source](#1-random-source)
2. [Seat order](#2-seat-order)
3. [Leader selection and rotation](#3-leader-selection-and-rotation)
4. [Role deal](#4-role-deal)
5. [Quest cards](#5-quest-cards)
6. [Phone button order](#6-phone-button-order)
7. [Deterministic by design](#7-deterministic-by-design)
8. [Information side channels](#8-information-side-channels)
9. [Known limits](#9-known-limits)

---

## 1. Random source

**Decision.** Every game draw defaults to `secureRandom()` (`lib/rules.ts`). It builds a
53-bit float in [0, 1) from `crypto.getRandomValues`. That covers the deal, the first
leader, the seat shuffle, the quest-card shuffle, room codes and the phone button order.
Engine functions still take an `rng` parameter so a test can pass in a deterministic one.

**Rationale.**

- `Math.random` in V8 is xorshift128+. Its *statistics* are fine for a card game. The
  problem is that it's *predictable*: one generator state is shared by everything in the
  server process, and that state can be worked out from enough of its outputs. Room codes
  are random outputs that anyone can see. In principle, then, someone could create rooms
  to learn the generator state and predict the next deal on the same server instance.
  That's far-fetched, but the CSPRNG removes the risk for free.
- Turning a float into an integer with `Math.floor(u * k)` is not perfectly uniform. With
  a 53-bit `u`, though, each outcome's probability differs from `1/k` by at most
  `2^-53 ≈ 1.1 × 10^-16`. No number of games could ever detect that. Exact rejection
  sampling would add code without making any difference you could measure.

**Not a bug fix.** No bias was ever found under `Math.random`. This change hardens the
game; it doesn't correct anything.

---

## 2. Seat order

**What it is.** `players` is an array, and its order *is* the seat order
(`players[i].seat === i`). Two things depend on that order: leader rotation
(`leader()` indexes into the array) and the role deal (dealt card `i` goes to
`players[i]`). The TV circle, the proposal list and the vote reveal all display it.

**Default.** Players are seated in the order they join. Leaving or being kicked closes up
the gap.

**Decision.** The host can press **⟳ Shuffle seats** on the Court Setup screen
(`shuffleSeats` in `lib/engine.ts`, host action `shuffleSeats`). It runs a uniform
Fisher–Yates permutation of the circle. Setup lists the current order
("LEADERSHIP PASSES A → B → … ↺") so everyone can see the result before the court
begins. The button is available whenever Setup is open, which includes right after
**Play again** and **Restart**.

**Rationale.**

- Join order isn't random. Friends who join together end up next to each other, and the
  same people tend to join first or last every night. Seat order doesn't affect the
  *deal* (§4), but it does fix who leads after whom. That's a social pattern players can
  notice, and some groups will want to break it up.
- It's a button, not something that happens automatically. Some groups match the TV
  circle to where people physically sit, and an automatic shuffle would break that.
- The shuffle keeps `nextLeader` (§3). The person who was owed the lead from the last
  game still leads first; only the order after them changes. Clearing it would let a
  random draw skip that person again, which is the exact complaint §3 exists to fix.

---

## 3. Leader selection and rotation

**Rules (unchanged).** The lead passes one seat clockwise after every rejected proposal
and after every completed mission.

**First leader of a game.** `firstLeaderIndex` in `lib/engine.ts`:

- If `state.nextLeader` is set, the player count is the same as when it was recorded, and
  that player is still seated, they lead first.
- Otherwise the first leader is uniformly random among the seated players.

**Setting `nextLeader`.** `playAgain` (used by both Play again and Restart) records the
player one seat after the last leader who actually *picked a team*. If the game was
restarted during the role reveal or the proposal phase, the current leader hasn't picked
yet, so they're recorded instead.

**Rationale.** A game has at most 5 missions. With no rejections it can end after 3, 4 or
5 leaders. At 9 players that means at least 4 seats never lead in that game. If every game
picks its first leader at random, which seats miss out is random each time, and
some player can go game after game without leading.

Concrete case, 9 players, no rejections: a random start leaves a given player out of
the lead with probability 4/9 in a 5-mission game and 6/9 in a 3-mission game. Over
4 games in a row that's somewhere between (4/9)^4 ≈ 4% and (6/9)^4 ≈ 20% per
player. Across 9 players, the chance that at least one person never leads all night is
roughly `1 − (1 − p)^9`, about 30–85% depending on how long the games run.
Continuing the rotation means everyone leads in turn. The longest anyone waits is
`n` proposals counted across games.

**Why the player count has to match.** If someone joins or leaves, the circle changes
and "who comes next" stops meaning anything, so a random start is the fair fallback.
The check uses the player id, not the seat number. If the count is the same but the
remembered player is gone (one left, one joined), it also falls back to random.

**Leader alignment is still random.** The first leader is chosen without looking at the
deal, and the deal is uniform (§4). So P(first leader is Evil) = evil/n, exactly as with
a fresh random start.

---

## 4. Role deal

**What it does.** `buildRoleList` builds the deck from the host's chosen specials: good
specials, then Servants, then evil specials (plus an Assassin card when `bladeRole` gives
it a free Evil seat), then Minions. `beginCourt` shuffles the *whole* deck with Fisher–Yates
and gives card `i` to `players[i]`. Nobody "draws" in sequence. The deck is fully
shuffled on the server before anyone gets a card.

**The concern that came up.** At a 9-player table, the last person seemed to be Evil
unusually often. The theory was that earlier players "take" the 6 Good cards, so the
last seat is more often left holding Evil.

**Analysis: there is no positional bias.**

1. Fisher–Yates with `j ∈ [0, i]` makes all `n!` orderings of the deck equally likely.
   (Every step `i` picks one of `i + 1` options independently, so there are
   `n · (n-1) · … · 2 = n!` equally likely paths, and each path gives a different
   ordering.) The implementation in `lib/rules.ts` uses exactly these bounds. The two
   classic off-by-one mistakes both produce bias:
   - `j ∈ [0, i)` (Sattolo's algorithm): no card can end up where it started.
   - `j ∈ [0, n)` (the "naive" shuffle): `n^n` paths spread over `n!` orderings. Some
     orderings get more paths than others.
2. If the deck is ordered uniformly at random, then for any seat `k` and any card `c`,
   the number of orderings with `c` in position `k` is `(n-1)!`. So
   P(seat `k` gets card `c`) = `(n-1)!/n! = 1/n`. There are `e` evil cards, so
   **P(seat `k` is Evil) = e/n for every seat**: first, last or anywhere in between.
3. The intuition about "earlier players taking good cards" mixes up *conditional* and
   *unconditional* probability. If you already *knew* the first 6 seats were Good, the
   last seat would certainly be Evil. But that's no more likely beforehand than knowing
   the first 6 were all the evil cards plus three Good. The two cases balance out. This
   symmetry, called exchangeability, holds even for a physical deck dealt one card at a
   time, and the server doesn't even deal one at a time.
4. The deal doesn't use names at all. Seat order is join order (§2), not alphabetical.

P(any given seat is Evil), by player count:

| Players | Evil | P(Evil) |   | Players | Evil | P(Evil) |
|--------:|-----:|--------:|---|--------:|-----:|--------:|
| 5  | 2 | 40.0% |   | 11 | 4 | 36.4% |
| 6  | 2 | 33.3% |   | 12 | 4 | 33.3% |
| 7  | 3 | 42.9% |   | 13 | 5 | 38.5% |
| 8  | 3 | 37.5% |   | 14 | 5 | 35.7% |
| 9  | 3 | 33.3% |   | 15 | 5 | 33.3% |
| 10 | 4 | 40.0% |   | 16 | 6 | 37.5% |

**Why the streak still happens by chance.** At 9 players, P(Evil) = 1/3 for each seat in
each game, independently across games. The number of times the last seat is Evil in `G`
games follows Binomial(`G`, 1/3). For `G = 8`:

| Last seat Evil in at least… | Probability |
|---|---:|
| 3 of 8 (expected ≈ 2.7) | 53.2% |
| 4 of 8 | 25.9% |
| 5 of 8 | 8.8% |
| 6 of 8 | 2.0% |

Two effects make a streak like this more likely to be *noticed* than these numbers
suggest:

- **Many places to look.** There are 9 seats (and 9 people) where a streak could show
  up. Treating seats as roughly independent, the chance that *some* seat is Evil in at
  least 5 of 8 games is about `1 − (1 − 0.088)^9 ≈ 56%`. That's more likely than not.
- **Memorable outcomes stick.** "The last person was Evil again" is a story people
  remember. "The last person was a Servant" isn't.

**Decision.** No change to the dealing algorithm. It's provably uniform by seat. The
random source moved to the CSPRNG (§1) for the separate reason given there.

**How to check empirically.** Not part of the repo's tooling. Run `beginCourt` many
times with `secureRandom` and count Evil per seat; each seat should land within normal
binomial noise of `e/n`. You can also check exhaustively: drive `shuffle` with an `rng`
that walks every index choice, `n!` paths in total (362,880 at 9 players). Every seat
should come out exactly `e/n`.

---

## 5. Quest cards

**What it does.** Once every rider has played, `playQuestCard` shuffles the cards
(Fisher–Yates, `secureRandom`) and saves them in `questMeta.cards`. The TV flips them in
that order.

**Rationale.** `questCards` is keyed by player and stored in the order cards were
*played*. Revealing them in that order would match each card to the order people
tapped, which observers can see. Shuffling first breaks that link. The only other things
anyone sees are the count of cards in (`cardsIn`) and, after the reveal, the number of
Fails.

---

## 6. Phone button order

**Mission screen (Success / Fail).** Every phone flips its own coin
(`secureRandom() < 0.5`) when the screen mounts, to decide whether Fail goes on top
(`components/phone/VoteQuest.tsx`).

**Rationale.** With a fixed layout, someone watching which half of the screen a thumb
went to could read the card. Randomized, the position gives no information. The coin is
per player and per mount, so knowing one rider's layout tells you nothing about
another's. A reload mid-mission may flip it again; that's harmless.

**Good riders keep both buttons.** Unless the "anyone may fail" variant is on, Good can
only play Success. Good still sees a green and a red button. Both play Success, and the
red one is labelled SUCCESS. If Good saw one button, the layout and thumb travel alone
would mark the rider as Good. The red button's label does differ from an Evil rider's
(FAIL). That is only visible by reading the screen itself, which is already out of
scope (§9).

**Vote screen (Approve / Reject) is deliberately fixed.** Votes are public under the
rules (the TV shows every name with their vote), so nothing is hidden and a stable
layout avoids mis-taps.

---

## 7. Deterministic by design

These aren't random, and that's correct. They're listed here so nobody "fixes" them:

- **Team sizes, evil count, two-Fail missions**: fixed tables in `lib/rules.ts`, from the
  official rules up to 10 players and the house extension above that.
- **Deck contents**: fixed by player count and the specials the host chose.
  Randomness only decides *who* gets each card.
- **Assassin's blade**: `bladeRole` decides from the config alone. A configured add-on
  holder in the deck takes it. Otherwise an Assassin card takes a free Evil seat, and
  failing that the blade follows `FLAG_PRIORITY`. It's tied to a role, not a seat, so
  it's exactly as random as the deal.
- **Rotation direction**: always increasing seat index.
- **Plot deck**: fixed contents per player count (`plotDeck`), shuffled at the deal; the
  discards are reshuffled with `shuffle`/`secureRandom` only if the deck runs short.
- **Lancelot allegiance decks**: fixed contents (`LANCELOT_HIDDEN_DECK`,
  `LANCELOT_KNOWN_DECK`), shuffled with `shuffle` and `secureRandom` at the deal.
  Randomness decides only the order.
- **Lady of the Lake start**: the seat before the first leader (their "right", given the
  rotation direction). It's as random as the first leader, no more.

---

## 8. Information side channels

Ordering and timing can leak information even when the random draws are fair. Audited:

| Surface | What leaks | Verdict |
|---|---|---|
| `rolesInPlay` | The set of roles at the table, sorted alphabetically | No seat link. Fine. |
| Knowledge lists (Merlin, evil) | Names in seat order | Order comes from seats, not roles. Fine. |
| Mistress's pair (Merlin + Morgana) | Two names, alphabetical | Order says nothing about which one is Merlin. Fine. |
| `votedIds` during voting | *Who* has voted | Not *how*. Votes are public at reveal anyway. Fine. |
| `cardsIn` during a quest | How many riders have played | Not which card. Matches the physical game. Fine. |
| Quest reveal order | Card sequence | Shuffled (§5). Fine. |
| Phone after casting a quest card | "Your card is cast" | Identical for Success and Fail. Fine. |
| Phone mission button position | Thumb high or low | Randomized (§6). Fine. |
| Lady of the Lake holder, past holders, whom they examine | Names on TV and phones | Open information under the rules. Fine. |
| Lady result | Good/Evil, only in the holder's own `playerView` | Hidden until held, shown in neutral colours, never on the TV. Fine. |
| Excalibur holder; whose card was switched | Names on TV and phones | Public under the rules. Fine. |
| Excalibur's original card | Only in the wielder's `excaliburSeen` | Hidden until held, neutral colours. Fine. |
| Trapped rider | Name on TV and phones | Public by design; the card isn't. Fine. |
| Trapped card | Only in the leader's `trapsSeen` | Hidden until held, neutral colours. Removed before the shuffle, so the reveal order can't hint at it. Fine. |
| Lancelot allegiance cards | Known schedule: all five; hidden: each card once flipped | Public under the rules. The hidden deck's unflipped cards never leave the server. Fine. |
| A Lancelot's current side | His own role chip and quest buttons | Only his view. Everyone's view changes at the same moment when a card flips, so view updates don't single him out. Fine. |
| Forced Lancelot's mission buttons | Both play his side's card | Same layout and colours as everyone else (§6). Fine. |
| Forced timer choices (opt-in) | A random team, vote, card or target for whoever timed out | `secureRandom` via `pick`/`shuffle` in `forceDecision`. A timed-out Good rider plays Success, and a forced Lancelot his side's card, so a timeout can't create a Fail the rules forbid. An Evil rider's coin flip can produce one, as their own choice could. Fine. |
| Plot cards drawn, hands, Charges, who is asked, latest action | Names and card names on TV and phones | Plot cards are face up under the rules. Fine. |
| Plot draw deck | Nothing; only its count | Unflipped order never leaves the server. Fine. |
| Charge votes | Each Charge holder's vote, once all have voted | Public by the card's rule. Nobody else can vote until then, so no vote is cast after seeing a partial Charge reveal. Fine. |
| We Found You card | The spotlit rider's card once played | Public by the card's rule; only that rider's. Fine. |
| Plot private results (loyalty, Ambush) | Only in the viewer's `plotSeen` | Hidden until held, neutral colours, never on the TV. Fine. |
| Good rider's mission buttons | Both play Success; red is labelled SUCCESS | Same layout and colours as Evil (§6). Only the label differs, which needs a look at the screen. Fine. |
| Game-over cast list | Every role, in seat order | Game is over. Fine. |

---

## 9. Known limits

- **Within a single game**, the seats right after the first leader get the lead and the
  seats furthest from it may not. That's the rotation rule itself. §3 evens it out across
  games, not within one.
- **The first game in a room** has a random first leader, because there's no previous
  game to continue from.
- **Physical side channels** (watching someone's screen, how long they hesitate) are out
  of scope.
