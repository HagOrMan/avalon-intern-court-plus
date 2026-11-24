# Rules: Official Avalon vs. The Intern Court

This compares the official rules of *The Resistance: Avalon* (Indie Boards & Cards, 2012)
with how this app plays them, and lists every deviation. It's the reference for rule
changes and extensions. Keep it current when the engine changes.

**Sources.** Board-game rules come from the rulebook and a BoardGameGeek review of the
retail box. Rules for the variants (Wraith, Lady of the Lake, Excalibur, Lancelot,
Guinevere) come from an online Avalon platform's rules pages, and they're marked as that
platform's version where it says its version differs from the board game. Trapper comes
from *The Resistance: Hostile Intent*. Statements about the app cite the code.

---

## 1. The official game

### 1.1 Players and teams

5–10 players. Allegiance split:

| Players | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|
| Good | 3 | 4 | 4 | 5 | 6 | 6 |
| Evil | 2 | 2 | 3 | 3 | 3 | 4 |

That's Evil = ⌈players / 3⌉ at every official count.

### 1.2 Quest team sizes

| Players | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|
| 5 | 2 | 3 | 2 | 3 | 3 |
| 6 | 2 | 3 | 4 | 3 | 4 |
| 7 | 2 | 3 | 3 | 4\* | 4 |
| 8–10 | 3 | 4 | 4 | 5\* | 5 |

\* At 7+ players the 4th quest needs **two** Fail cards to fail.

### 1.3 Characters

**Standard characters**

| Character | Side | Ability |
|---|---|---|
| Merlin | Good | Knows who all the Evil players are at the start, except Mordred. |
| Assassin | Evil | If Good wins three quests, names one Good player as Merlin. A hit means Evil wins. |
| Loyal Servant of Arthur | Good | No ability. |
| Minion of Mordred | Evil | Knows the other Evil players. |

**Optional characters**

| Character | Side | Ability | Helps |
|---|---|---|---|
| Percival | Good | Knows who Merlin is. | Good |
| Mordred | Evil | Hidden from Merlin. | Evil |
| Morgana | Evil | Appears to Percival as a second Merlin. | Evil |
| Oberon | Evil | Doesn't see the other Evil players, and they don't see him. **Merlin still sees him.** | Good |

Deck-building rules:

- **Fixed deck size.** Each special character takes the place of a plain Servant or
  Minion. The Good/Evil split never changes.
- **Merlin and the Assassin go together.** They are the core of Avalon. Dropping both
  gives plain *Resistance*-style play.
- **Every role is its own card**, so one player holds exactly one character. The
  Assassin and Oberon are never the same person.
- **The group chooses the optional characters**, individually or together. The rulebook
  sets no player-count limits. It recommends playing with just Merlin and the Assassin
  until the group is experienced, then adding characters.
- **Small games are tight.** At 5–6 players there are only 2 Evil cards, and one of them
  is the Assassin. So only one of Mordred / Morgana / Oberon fits.
- **Everyone knows the setup.** Which characters are in the deck is public, even though
  who holds them is secret.

### 1.4 Night phase (who knows what)

| Viewer | Sees |
|---|---|
| Evil (except Oberon) | Each other, Mordred included, Oberon excluded |
| Oberon | No one |
| Merlin | All Evil except Mordred (Oberon included) |
| Percival | Merlin and Morgana, without knowing which is which (only Merlin if Morgana isn't in play) |
| Servants | No one |

### 1.5 Round structure

1. **Leader.** The first leader is chosen at random. Leadership passes clockwise after
   every proposal, whether it's approved or rejected.
2. **Team building.** The leader proposes a team of the size the current quest requires.
   The leader may include themselves.
3. **Team vote.** Everyone votes Approve/Reject at the same time, and the votes are
   shown openly. A strict majority approves; a tie rejects.
4. **Five rejections.** Five rejected teams in a row on the same quest and **Evil wins
   the game**. The vote marker resets after each quest.
5. **Quest.** Each team member secretly plays a Quest card. **Good must play Success.
   Evil may play either.** The cards are shuffled and revealed, so only the number of
   Fails is known. One Fail fails the quest (two on the 4th quest at 7+).
6. **End.** Three failed quests: Evil wins. Three successful quests: go to the
   assassination.

### 1.6 Assassination

If Good wins three quests, Evil may talk it over, and then the Assassin names one Good
player. If that player is Merlin, Evil wins. Otherwise Good wins.

---

## 2. Variants and modules

None of these is implemented except the Wraith (a setting) and the two rule variants in
§3. Section 5 lists what each module needs.

### 2.1 Wraith (Oberon variant, from the online platform)

Wraith is Oberon who is also hidden from **Merlin**, so no one knows him. It isn't a
standard Oberon ability. **In the app:** this is the "Oberon: hidden from Merlin too"
setting (§3).

### 2.2 Lady of the Lake (board game module)

The Lady is a token, not a character. The holder privately checks one player's
*loyalty* (Good/Evil), not their character.

- The first holder is the player to the **right of the first leader**.
- Checks happen **before team selection for missions 3, 4 and 5**, if the game gets
  there. Rejected teams don't create extra checks.
- The holder picks another player who **has never held the Lady**. The starting holder
  counts as a past holder. Nobody can check themselves.
- Only the holder learns the result. They then announce a result to the table, and
  **may lie**.
- The checked player takes the token and becomes the next holder.
- Mordred shows as Evil. Lady sees loyalty, not visibility to Merlin.
- The review recommends it for 7+ players.

### 2.3 Excalibur (Kickstarter promo; rules as the online platform plays it)

Excalibur flips one submitted quest card, Success ↔ Fail. It never changes a role or a
team vote.

- After picking the team and **before the vote**, the leader gives the sword to a team
  member other than themselves. Everyone can see who holds it.
- After the quest cards are in, the holder may flip **another team member's** card, or
  skip. The holder can't target themselves or anyone off the team.
- A new holder is chosen for each proposed team.
- The quest result uses the cards after the flip, with the usual Fail threshold.
- Who used the sword, and on whom, is public. Only the holder and the target know the
  affected card's value.
- With Trapper, the leader's trap happens after the sword, and the leader sees the
  post-flip value.

### 2.4 Lancelot (Kickstarter promo; the online platform's version)

There are two Lancelots, one starting Good and one starting Evil. Each wins with their
**current** side.

- **Switch deck.** Five cards: 2 Switch, 3 blank. One card is drawn before missions 3,
  4 and 5, if play gets there. A Switch swaps both Lancelots' sides; a blank does nothing.
- **Forced cards.** On this platform, the currently Evil Lancelot **must** play Fail and
  the currently Good one **must** play Success. The board-game variants differ.
- **Knowledge.** Neither Lancelot learns the other's identity or the Evil team at setup.
  Merlin sees the *starting* Evil Lancelot as Evil, and that doesn't update after a
  switch.

### 2.5 Guinevere (online platform; needs Lancelot)

Guinevere is Good. She knows which two players are the Lancelots, but not their sides.
On the platform she is "also a possible assassination target". Open question: is she
just a legal target (any Good player already is), or does killing her also win for
Evil? See §5.

### 2.6 Trapper (from *The Resistance: Hostile Intent*)

- The leader nominates **one more player** than the quest requires, and the vote happens
  as usual.
- Each rider holds their card. The leader takes one rider's card, looks at it privately,
  and removes it.
- The remaining cards are shuffled and revealed as usual.

### 2.7 Targeting (rulebook variant)

Quests may be attempted in any order. You weren't keen on it, so it's parked. The exact
constraints would need the rulebook text before it's built.

### 2.8 Out of scope

The *Resistance* Plot cards.

---

## 3. How the app plays it

| Rule | Where | Matches official? |
|---|---|---|
| Good/Evil split, 5–10 players | `evilCount`, `lib/rules.ts` | Yes |
| Quest team sizes, 5–10 players | `MISSION_SIZES`, `lib/rules.ts` | Yes |
| Two-Fail 4th quest at 7+ | `twoFailMission` | Yes |
| First leader random; passes after every proposal | `firstLeaderIndex`, `ackVoteReveal`, `closeMission` in `lib/engine.ts` | Yes (plus the carry-over between games, D10) |
| Majority approves, tie rejects | `vote` (`approve > reject`) | Yes |
| Votes shown openly by name | `tvView.voteReveal` | Yes |
| Good must play Success | `playQuestCard` | Yes, by default (variant below) |
| Quest cards shuffled before reveal | `playQuestCard` | Yes |
| Night-phase knowledge | `knowledgeFor`, `lib/views.ts` | Yes, for every role in §1.4 |
| Percival sees Merlin + Morgana unordered | `knowledgeFor` (alphabetical) | Yes |
| Roles in play are public | `rolesInPlay` | Yes |
| Evil talks before the assassination | Out loud at the table; no in-app channel | Yes (physical) |

### Role names

| Official | App key | App name |
|---|---|---|
| Merlin | `merlin` | Merlin |
| **Percival** | `mistress` | **Merlin's Mistress**: same ability, renamed in all copy |
| Loyal Servant | `servant` | Servant of Arthur |
| Mordred | `mordred` | Mordred |
| Morgana | `morgana` | Morgana |
| Assassin | `assassin` | The Assassin |
| Minion | `minion` | Minion of Mordred |
| Oberon | `oberon` | Oberon |

### Deck building (`OPTIONAL_ROLES`, `deckProblem`, `buildRoleList`)

- **Free choice.** The host picks any of Merlin, Mistress, Mordred, Morgana and Oberon
  at any player count, while that side has a free seat. Servants and Minions fill the
  rest.
- **Defaults** (`DEFAULT_SPECIALS`): Merlin, Mistress, Mordred, Morgana.
- **Mistress needs Merlin.** Resting Merlin also rests the Mistress and removes the
  assassination.
- **Seat checks.** The server checks seats when a role is added and again at deal time,
  so a table that lost players can't deal an overfull deck. Removing roles is always
  allowed.

### The Assassin and the blade (`bladeRole`, `config.assassinFlag`)

The Assassin's *ability* (the blade) is separate from the Assassin *card*:

1. If the host named an Evil special as the blade holder and it's in the deck, it
   carries the blade as an add-on. No Assassin card is dealt.
2. Otherwise, if an Evil seat is free, an **Assassin card** is dealt into it.
3. Otherwise (every Evil seat holds a special), the blade rides on Morgana → Mordred →
   Oberon, in that order (`FLAG_PRIORITY`).

So with the defaults, 5–6 players have Mordred + Morgana, and Morgana carries the blade.
At 7+ the Assassin gets its own card. Oberon can carry the blade. If he does, he can
target anyone, Evil included, because he doesn't know who they are.

### Settings (Setup → Customize)

| Setting | Options | Default |
|---|---|---|
| Rejection rule | **Quest fails**: the 5th rejection forfeits the quest to Evil, and play moves to the next quest · **Evil wins**: official rule · **Unopposed**: the 5th leader's team rides without a vote | Quest fails |
| Assassination | On / off (off = three quests decide) | On |
| Assassin's blade | Assassin card (when a seat is free) or any Evil special in the deck | Assassin |
| Oberon (shown when he's in the deck) | Merlin sees him / hidden from Merlin too (Wraith) | Merlin sees him |
| Quest cards | Good must succeed / anyone may fail | Good must succeed |

When Good must succeed, Good riders still get a green and a red button, and **both play
Success**. Phones look the same to anyone watching (`docs/fairness.md` §6). The server
also refuses a Fail from Good.

---

## 4. Deviations from the official rules

| # | Deviation | Official | App | Where |
|---|---|---|---|---|
| D1 | **Player range** | 5–10 | 5–16. Team sizes and evil counts for 11–16 are a house extension (see §6) | `MISSION_SIZES`, `evilCount`, `MAX_PLAYERS` |
| D2 | **Default deck** | The rulebook recommends Merlin + Assassin only, for new groups | Merlin, Percival (Mistress), Mordred, Morgana, plus the Assassin when a seat is free | `DEFAULT_SPECIALS` |
| D3 | **Blade as an add-on** | The Assassin is always its own card | The blade can ride on another Evil role, including Oberon. At 5–6 with the defaults there's no Assassin card | `bladeRole` |
| D4 | **Merlin's ally is renamed** | Percival | "Merlin's Mistress", same ability | `lib/roles.ts` |
| D5 | **5 rejections lose the quest by default** | 5 rejections lose the game | Default: Evil wins that quest. Official and "unopposed" are settings | `ackVoteReveal`, `isUnopposedProposal` |
| D6 | **Good may fail (setting)** | Never | Off by default | `config.goodMayFail` |
| D7 | **Wraith (setting)** | Merlin sees Oberon | Optionally hidden from Merlin | `config.oberonHiddenFromMerlin` |
| D8 | **Assassination can be turned off** | Always on when Merlin and the Assassin are in play | A setting | `config.assassination` |
| D9 | **Assassin can't target known Evil** | Nothing stops it; it would just be a wasted guess | The engine refuses known-Evil targets. Oberon is targetable unless he holds the blade himself, in which case he can target anyone | `assassinate`; `playerView.assassin` |
| D10 | **First leader carries over between games** | Random every game | Rotation continues from the previous game if the table is unchanged | `nextLeader`, `docs/fairness.md` §3 |
| D11 | **Modules missing** | Lady of the Lake, Excalibur, Lancelot, Targeting | Not implemented. Lady and Excalibur show as v2 in Setup | §5 |

---

## 5. Module implementation notes

Common to every module: add a `Config` flag and a Setup row (replacing the v2
placeholder). Any new `GameState` fields need a deliberate exposure decision in
`lib/views.ts`. Add new private screens to the side-channel audit in `docs/fairness.md`
§8. If a module adds a timed TV beat, its duration goes in `lib/rules.ts` alongside an
`autoAdvance` case.

**Lady of the Lake**
- State: `lady: { holderId, pastHolderIds[] } | null`, plus a private `ladyResult` for the
  current holder.
- Deal: holder = the seat to the right of the first leader. Leadership passes in
  increasing seat index, so "right" is `leaderIndex − 1`. That's an interpretation of
  rotation direction; confirm it.
- Flow: a new `lady` phase. `closeMission` enters it instead of `proposal` when the next
  mission is 3, 4 or 5 (index 2–4) and the game continues, forfeits included. The holder's
  phone picks a target (not self, not a past holder). Only the holder's `playerView` gets
  Good/Evil. The TV shows "A examined B". The token passes, and play goes on to the
  proposal.
- Open: should there be an in-app "announce" step, or is it verbal only? Verbal matches
  the board game.

**Excalibur**
- State: `excaliburHolderId` per proposal; `excaliburUse: { targetId, before, after } | null`.
- `propose` takes a sword holder (team member ≠ leader). It's shown on the TV and the
  vote screens.
- A new `excalibur` phase after the last card, before `questReveal`: the holder flips or
  skips. The flip is applied before the shuffle. Holder and target see the value
  privately; the TV shows who flipped whom.
- With Good-must-succeed, a sword can still turn Good's Success into a Fail. That's
  intended.

**Lancelot (+ Guinevere)**
- This is the most invasive module. `isEvil(role)` is used everywhere and assumes a
  role's side never changes. It needs a state-aware `allegianceOf(s, playerId)` (win
  checks, card enforcement, assassination targets, views, the game-over cast).
- Roles: `lancelotGood`, `lancelotEvil` (starting sides), taking one Good and one Evil
  seat. State: `lancelotSwitched` and a shuffled 5-card switch deck. A draw beat before
  missions 3–5, public on the TV.
- Cards are forced by current side (platform rule), so the phone shows the same
  two-button pattern as Good.
- Open questions: does the Evil team see the Evil Lancelot? Do Lady checks show
  current or starting loyalty (presumably current)? What does "Guinevere is also a
  possible assassination target" mean exactly (§2.5)? Do Lancelots count against
  Mordred/Morgana seats?

**Trapper**
- Team size is `MISSION_SIZES[n][m] + 1` when on (`propose`, the phone picker, TV
  copy).
- A new `trap` phase after cards (and after Excalibur): the leader picks one rider. The
  leader's view privately gets that card. It's removed before the shuffle and the
  fail count.
- Check: at the largest tables, team + 1 must not exceed the player count.

**Discussion timers**: no rules dependency. UI and config only.

---

## 6. Above 10 players

The official game stops at 10. This app allows up to 16 with house tables. Here's how
the official numbers behave, what the current house tables do, and a proposal.

### 6.1 What the official tables do

- **Evil = ⌈n/3⌉** exactly, at every count from 5 to 10. That's 33–43% Evil.
- **Team sizes stop growing at 8.** 8, 9 and 10 players all use 3-4-4-5-5. So as the
  table grows, a smaller share of it goes on quests.
- **The largest team never exceeds the Good count** (a clean team always exists). At
  9–10 it's one below.
- **The two-Fail 4th quest appears at 7+**, when Evil reaches 3 and teams of 4–5 are
  likely to hold two of them.

### 6.2 The measure used here

**Clean-team odds**: the chance that a *random* team of the quest's size contains too
few Evil players to fail it. It's hypergeometric: C(good, k) / C(n, k), or for a two-Fail
quest, the chance of at most one Evil player. Lower odds mean Good needs more real
deduction to field a passing team. This measure ignores Merlin, Percival and voting
reads, so it's a yardstick for *relative* difficulty, not a balance model.

Official counts (Q4 at 7+ is two-Fail):

| n | Evil | Sizes | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|---|---|
| 5 | 2 | 2-3-2-3-3 | .30 | .10 | .30 | .10 | .10 |
| 6 | 2 | 2-3-4-3-4 | .40 | .20 | .07 | .20 | .07 |
| 7 | 3 | 2-3-3-4-4 | .29 | .11 | .11 | .37 | .03 |
| 8 | 3 | 3-4-4-5-5 | .18 | .07 | .07 | .29 | .02 |
| 9 | 3 | 3-4-4-5-5 | .24 | .12 | .12 | .41 | .05 |
| 10 | 4 | 3-4-4-5-5 | .17 | .07 | .07 | .26 | .02 |

### 6.3 Current house tables (11–16)

| n | Evil | Sizes | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|---|---|
| 11 | 4 | 4-5-5-6-6 | .11 | .05 | .05 | .20 | .015 |
| 12 | **5** | 4-5-5-6-6 | .07 | .03 | .03 | .12 | .008 |
| 13 | 5 | 4-5-6-6-7 | .10 | .04 | .02 | .18 | .005 |
| 14 | 5 | 4-5-6-6-7 | .13 | .06 | .03 | .24 | .010 |
| 15 | **6** | 5-6-6-7-7 | .04 | .02 | .02 | .08 | .006 |
| 16 | 6 | 5-6-6-7-7 | .06 | .03 | .03 | .12 | .010 |

Every quest at 11–16 is harder for Good than at official 10 players. Q5 is 2–4× harder,
and 12 and 15 are the outliers. Both of those break the ⌈n/3⌉ pattern with one extra
Evil player.

### 6.4 Proposal

Keep **Evil = ⌈n/3⌉**, and pick team sizes whose clean-team odds sit closest to
10 players (.17 / .07 / .07 / .26 / .02). Keep Q4 as the only two-Fail quest.

| n | Good | Evil | Sizes | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|---|---|---|
| 11 | 7 | 4 | 3-4-5-6-6 | .21 | .11 | .05 | .20 | .015 |
| 12 | 8 | 4 | 4-5-5-6-6 | .14 | .07 | .07 | .27 | .030 |
| 13 | 8 | 5 | 3-4-5-5-6 | .20 | .10 | .04 | .32 | .016 |
| 14 | 9 | 5 | 4-5-5-6-6 | .13 | .06 | .06 | .24 | .028 |
| 15 | 10 | 5 | 4-5-5-6-7 | .15 | .08 | .08 | .29 | .019 |
| 16 | 10 | 6 | 4-5-5-6-6 | .12 | .06 | .06 | .22 | .026 |

Trade-offs to decide on:

- **13 players gets smaller teams than 12.** The jump to 5 Evil makes big teams almost
  never clean. 4-4-5-6-6 is the alternative (.10 / .10 / .04 / .18 / .016): closer in
  feel to 12, slightly harder for Good.
- **Party feel vs. balance.** At 16 players, at most 6 people ride on any quest. To
  involve more of the table, the lever is extra two-Fail quests rather than bigger
  single-Fail teams. For example, a two-Fail Q5 at 13+ with Q5 = 7 gives .09 at
  13 and .12 at 16. That's another option to compare.
- **Choosing roles at this size.** There are only three Evil specials and at least 4
  Evil seats from 10 players up, so the Assassin always gets its own card there. Nothing
  needs a special case.
- These numbers are a starting point. Playtesting at 12+ should decide the final values.
