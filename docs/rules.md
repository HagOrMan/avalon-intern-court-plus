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

Built so far: the Wraith and Lady of the Lake (both settings, §3). Section 5 lists what
the rest need, with the decisions already made.

**Order at the end of a mission**, when several modules apply:

1. The Lancelot allegiance draw (before rounds 3, 4 and 5).
2. The Lady of the Lake check (after quests 2, 3 and 4).

The draw resolves first, so a Lady check on the same round sees a Lancelot's new
loyalty.

### 2.1 Wraith (Oberon variant, from the online platform)

Wraith is Oberon who is also hidden from **Merlin**, so no one knows him. It isn't a
standard Oberon ability. **In the app:** this is the "Oberon: hidden from Merlin too"
setting (§3).

### 2.2 Lady of the Lake (official optional rule)

The Lady is a token, not a character, and who holds it is open information. The holder
privately sees one player's *loyalty* (Good/Evil), never their character.

Official rules:

- At the start of the game, the token goes to the player on the **first leader's right**.
- **Immediately after the 2nd, 3rd and 4th quests are resolved**, the holder chooses one
  player to examine. So at most three uses per game. Rejected teams don't create extra
  checks.
- The examined player gets the two Loyalty cards and passes the holder the one matching
  their character's loyalty. Passing the wrong card loses the game.
- The holder may discuss the result but **can't show the card**. They may lie about it.
- The examined player takes the token.
- **A player who has used the Lady can't be examined.** In practice that covers every
  past holder, the starting holder included, and nobody can examine themselves.
- Mordred shows as Evil. The Lady sees loyalty, not visibility to Merlin.
- The rulebook advises keeping it for 7+ players, because it makes Good stronger and
  win more often.

Rulebook example: Don (Evil) starts with the Lady. After quest 2 he examines Margaret
(Good), is passed the Good card, and announces she's Evil. Margaret takes the token,
examines someone after quest 3, and can't examine Don.

**In the app** (built):

- A setting, off by default, available at every player count.
- The app replaces the Loyalty cards: the server reads the target's loyalty, so nobody
  can pass the wrong card.
- The announcement stays **verbal**; there's no in-app claim.
- The result shows on the holder's phone only, hidden until held, in neutral colours
  (not Good/Evil colours), and can be recalled later from the ROLE chip.
- A quest lost to five rejections counts as resolved, so a check still follows it.

### 2.3 Excalibur (promo)

Excalibur makes one played quest card switch, Success ↔ Fail. It never changes a role
or a team vote.

Official rules:

- During team building, the leader gives Excalibur to one team member along with their
  team token. **The leader can't give it to themselves.**
- Riders play their quest cards face down in front of themselves, so it's clear who
  played what.
- Before the cards are collected, the holder may tell **one other rider** to switch their
  card: the unplayed card becomes the played one.
- The holder then **looks at the card that was originally played**. So they know what
  that player chose, and whether the switch helped or hurt.
- The leader collects and shuffles the cards and reveals them as normal.
- With Plot cards: Excalibur resolves before "Keeping a close eye on you", and can't
  switch a card played face up by "In the Spotlight".

Rulebook example: Ron leads and gives Sarah Excalibur on a team of Ron, Pat and Sarah.
Sarah switches Pat's card, looks at the original (Success), and knows she has doomed
the quest. The reveal shows two Successes and one Fail.

The online platform adds:

- The holder may skip.
- A new holder is chosen for each proposed team.
- Who used the sword and on whom is public.
- With Trapper, the trap resolves after the sword, and the leader sees the post-flip
  value.

**Decided:** under the "unopposed" rejection rule, the 5th leader still hands out the
sword, even though there's no vote.

### 2.4 Lancelot (promo)

There are two Lancelot cards, Good and Evil, replacing one Good and one Evil character.
Each Lancelot wins with their **current** side. A switch applies to everything: victory
conditions and quest-card rules. The players never swap or show their character cards.

**Official Variant 1: hidden switches**
- Allegiance deck: 5 cards, 3 "No Change" and 2 "Switch Allegiance", shuffled face down.
- Night: the Evil Lancelot doesn't open his eyes. He holds out his thumb, so **Evil
  knows him, but he doesn't know Evil**.
- At the beginning of round 3 and of every later round, flip one card. On a Switch, the
  two Lancelots secretly swap sides. Lancelot can switch zero, one or two times.
- Quest cards follow the player's current side under normal rules. The currently Evil
  Lancelot *may* play Success.

**Official Variant 2: switches known in advance**
- Allegiance deck: 7 cards, 5 "No Change" and 2 "Switch Allegiance".
- Night: the same as Variant 1 (Evil knows the Evil Lancelot).
- At the start of the game, deal **five** cards face up, in order, above the tableau.
  Card *k* says whether the Lancelots switch at the start of round *k*.
- **The currently Evil Lancelot must play Fail. The currently Good one must play
  Success.**

**Official Variant 3: Lancelots know each other**
- Night: an extra step lets the two Lancelots see each other. Recommended for larger
  groups only.
- The rulebook only adds this night step. It doesn't say whether the allegiance deck is
  used.

**Online platform version**
- 5-card deck (2 Switch, 3 blank), drawn before missions 3, 4 and 5, as in Variant 1.
- Cards are forced by current side, as in Variant 2.
- **Neither Lancelot learns the other's identity or the Evil team**, and Evil isn't told
  about the Evil Lancelot.
- Merlin sees the *starting* Evil Lancelot as Evil, and that doesn't update after a
  switch.

One source says the draw happens "starting after Mission 3". The official text and the
platform both put the first draw at the start of round 3, which is after mission 2. The
app follows the official text.

**Decided:**
- Every variant above is available as a setting.
- Lady checks see current loyalty.
- **A Lancelot never carries the blade.** There's always another Evil role to hold it.
- Lancelots sit within the normal seat limits. Each role row says how many players the
  deck needs, and the game refuses to begin if too few have joined.

### 2.5 Guinevere (online platform; needs Lancelot)

Guinevere is Good. She knows which two players are the Lancelots, but not their sides.
She is a second assassination target: **if the Assassin names Guinevere, Evil wins**,
just as for Merlin.

### 2.6 Trapper (from *The Resistance: Hostile Intent*)

- The leader nominates **one more player** than the quest requires, and the vote happens
  as usual.
- Each rider holds their card. The leader takes one rider's card, looks at it privately,
  and removes it.
- The remaining cards are shuffled and revealed as usual.

**Decided:**
- The leader may trap their own card.
- The TV shows **who** was trapped but not the card. The trapped player stays highlighted
  until the leader taps continue and the remaining cards are revealed.
- The leader delivers the verdict verbally, or not at all.

### 2.7 Targeting (official optional rule)

- In the team phase, the leader picks both the team and **which quest** it attempts. The
  team size is that quest's size. The round marker shows the chosen quest.
- The result goes on the attempted quest's space. **A quest can't be attempted twice.**
- **The 5th quest can't be attempted until at least two other quests have succeeded.**
- At 7+ players the 4th quest still needs two Fails.

Parked: you weren't keen on it.

### 2.8 Plot cards (*The Plot Thickens*, from *The Resistance*): out of scope

These are recorded so they aren't mistaken for Avalon rules:

- 15 public Plot cards (7 used at 5–6 players). Each round the leader draws 1 (5–6
  players), 2 (7–8) or 3 (9–10) and hands them to other players.
- Star cards are used at once, Sword cards are held until used, and the Shield card
  stays in play.
- Ties in timing go clockwise from the leader.
- Cards: Overheard Conversation, Opinion Maker, Establish Confidence, Open Up, No
  Confidence, Keeping a Close Eye on You, Strong Leader, In the Spotlight, Take
  Responsibility.
- They use the two Loyalty cards. In Avalon, Merlin's identity stays secret even when
  his loyalty is revealed.

---

## 3. How the app plays it

| Rule | Where | Matches official? |
|---|---|---|
| Good/Evil split, 5–10 players | `evilCount`, `lib/rules.ts` | Yes |
| Quest team sizes, 5–10 players | `MISSION_SIZES`, `lib/rules.ts` | Yes |
| Two-Fail 4th quest at 7+ | `failsNeeded` | Yes (plus a two-Fail 5th quest at 13+, §6) |
| First leader random; passes after every proposal | `firstLeaderIndex`, `ackVoteReveal`, `closeMission` in `lib/engine.ts` | Yes (plus the carry-over between games, D10) |
| Majority approves, tie rejects | `vote` (`approve > reject`) | Yes |
| Votes shown openly by name | `tvView.voteReveal` | Yes |
| Good must play Success | `playQuestCard` | Yes, by default (variant below) |
| Quest cards shuffled before reveal | `playQuestCard` | Yes |
| Night-phase knowledge | `knowledgeFor`, `lib/views.ts` | Yes, for every role in §1.4 |
| Percival sees Merlin + Morgana unordered | `knowledgeFor` (alphabetical) | Yes |
| Roles in play are public | `rolesInPlay` | Yes |
| Evil talks before the assassination | Out loud at the table; no in-app channel | Yes (physical) |
| Lady of the Lake | `ladyExamine`, `ladyPass`, `closeMission`; `components/phone/Lady.tsx` | Yes, when on (§2.2) |

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
  at any player count. Servants and Minions fill the rest.
- **Defaults** (`DEFAULT_SPECIALS`): Merlin, Mistress, Mordred, Morgana.
- **Mistress needs Merlin.** Resting Merlin also rests the Mistress and removes the
  assassination.
- **Seat checks.**
  - Players can still join during setup, so a deck larger than the current table is
    allowed.
  - Each role row shows "needs N+ players" whenever the deck with that role needs more
    players than are seated (`minPlayersFor`).
  - The advisory line turns red with the same message.
  - Begin is refused with an error toast until enough players have joined
    (`deckProblem`).

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
| Lady of the Lake | On / off, at any player count | Off |

When Good must succeed, Good riders still get a green and a red button, and **both play
Success**. Phones look the same to anyone watching (`docs/fairness.md` §6). The server
also refuses a Fail from Good.

---

## 4. Deviations from the official rules

| # | Deviation | Official | App | Where |
|---|---|---|---|---|
| D1 | **Player range** | 5–10 | 5–16. Team sizes and the two-Fail 5th quest at 13+ are a house extension; Evil keeps the official ⌈n/3⌉ (see §6) | `MISSION_SIZES`, `failsNeeded`, `evilCount`, `MAX_PLAYERS` |
| D2 | **Default deck** | The rulebook recommends Merlin + Assassin only, for new groups | Merlin, Percival (Mistress), Mordred, Morgana, plus the Assassin when a seat is free | `DEFAULT_SPECIALS` |
| D3 | **Blade as an add-on** | The Assassin is always its own card | The blade can ride on another Evil role, including Oberon. At 5–6 with the defaults there's no Assassin card | `bladeRole` |
| D4 | **Merlin's ally is renamed** | Percival | "Merlin's Mistress", same ability | `lib/roles.ts` |
| D5 | **5 rejections lose the quest by default** | 5 rejections lose the game | Default: Evil wins that quest. Official and "unopposed" are settings | `ackVoteReveal`, `isUnopposedProposal` |
| D6 | **Good may fail (setting)** | Never | Off by default | `config.goodMayFail` |
| D7 | **Wraith (setting)** | Merlin sees Oberon | Optionally hidden from Merlin | `config.oberonHiddenFromMerlin` |
| D8 | **Assassination can be turned off** | Always on when Merlin and the Assassin are in play | A setting | `config.assassination` |
| D9 | **Assassin can't target known Evil** | Nothing stops it; it would just be a wasted guess | The engine refuses known-Evil targets. Oberon is targetable unless he holds the blade himself, in which case he can target anyone | `assassinate`; `playerView.assassin` |
| D10 | **First leader carries over between games** | Random every game | Rotation continues from the previous game if the table is unchanged | `nextLeader`, `docs/fairness.md` §3 |
| D11 | **Modules missing** | Excalibur, Lancelot, Targeting (Trapper is from *Hostile Intent*) | Not implemented yet. Excalibur shows as v2 in Setup. Targeting is parked | §5 |
| D12 | **Lady after a forfeited quest** | A quest is lost to rejections only under the "quest fails" house rule | A forfeited quest counts as resolved, so the Lady check still follows it | `closeMission` |

---

## 5. Module implementation notes

Common to every module: add a `Config` flag and a Setup row (replacing the v2
placeholder). Any new `GameState` fields need a deliberate exposure decision in
`lib/views.ts`. Add new private screens to the side-channel audit in `docs/fairness.md`
§8. If a module adds a timed TV beat, its duration goes in `lib/rules.ts` alongside an
`autoAdvance` case.

**Lady of the Lake: built.**
- `GameState.lady` holds the holder, past holders, and the checks. Each check's loyalty
  is server-only.
- `closeMission` enters the `lady` phase after quests 2–4. `ladyExamine` moves to
  `ladyReveal`, and `ladyPass` hands over the token and continues to `proposal`.
- Views: who holds the Lady, who has held it, and whom they're examining are public.
  Each player's own result appears only in their `playerView.ladyResult`.
- There's no auto-advance: a holder who disconnects stalls the game, the same as the
  assassination. Timers (below) will cover this.

**Excalibur** (next)
- State: `excaliburHolderId` per proposal, and
  `excaliburUse: { targetId, original } | null`.
- `propose` also takes a sword holder (a team member, not the leader), including the
  unopposed 5th proposal. The holder is shown on the TV and the vote screens.
- A new `excalibur` phase after the last card, before `questReveal`: the holder switches
  one other rider's card or skips. The switch is applied before the shuffle.
- The holder privately sees the original card. The TV shows who switched whom.
- With Good-must-succeed, a switch can still turn Good's Success into a Fail. That's
  intended: Excalibur changes the card, not the player's choice.

**Trapper**
- The team is `MISSION_SIZES[n][m] + 1` riders when on (`propose`, the phone picker,
  TV copy). It never exceeds the table: the largest is 9 + 1 = 10 riders at 15–16.
- A new `trap` phase after cards (and after Excalibur): the leader picks any rider,
  themselves included. That card goes privately to the leader's view and is removed
  before the shuffle and the fail count.
- The TV marks the trapped player until the leader taps continue, which starts the
  quest reveal.

**Lancelot (+ Guinevere)**
- This is the most invasive module. `isEvil(role)` is used everywhere and assumes a
  role's side never changes. It needs a state-aware `allegianceOf(s, playerId)` for win
  checks, card enforcement, assassination targets, Lady checks, views and the
  game-over cast.
- Roles: `lancelotGood` and `lancelotEvil` (starting sides), taking one Good and one Evil
  seat inside the normal limits. Excluded from `FLAG_PRIORITY`: a Lancelot never carries
  the blade.
- State: `lancelotSwitched`, plus either a shuffled draw deck (V1 and the platform
  version) or a five-card schedule dealt face up (V2). A public draw beat on the TV
  before rounds 3–5, resolved before the Lady.
- Settings (per §2.4): which variant, and Guinevere on/off (Lancelot only).
- Assassination: a hit on Merlin **or Guinevere** wins for Evil (`assassinate`, the
  reveal beat, the game-over copy).
- Open questions:
  1. Should the variants be presets, or independent switches? The underlying choices
     are: draw schedule (none / hidden draws / known in advance), forced quest cards
     (on/off), Evil sees the Evil Lancelot (on/off), and Lancelots see each other
     (on/off). Switches would allow combinations the rulebook doesn't describe, such as
     Variant 3's night step with switching.
  2. Variant 2 deals five cards for rounds 1–5. As written, a switch can happen at the
     start of round 1 or 2. Keep that, or only count rounds 3–5?
  3. Merlin's view: every version seems to have Merlin see the *starting* Evil Lancelot
     (the platform says so explicitly). Confirm for the official variants.

**Discussion timers**
- **Decided:**
  - Every decision gets a timer: 2 minutes for proposals, 1 minute for votes and the
    assassination.
  - Each timer is adjustable from 10 seconds to 10 minutes.
  - A soft countdown shows on the TV.
  - A setting can force the game on at zero, picking at random for anyone who hasn't
    decided.
- Random fallbacks go through `secureRandom` (`docs/fairness.md` §1), and each has a
  natural choice:
  - Proposal: a random team of the right size.
  - Vote: random Approve/Reject.
  - Quest card: Good plays Success; Evil gets a coin flip.
  - Assassination: a random legal target.
  - Lady: a random eligible player, then an automatic pass.
  - Excalibur: skip or a random rider.
  - Trap: a random rider.
- Open questions:
  - What are the default lengths for quest cards, the Lady, Excalibur and the trap?
  - Does the role reveal ("Take up your sigil") get a timer too?

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

### 6.3 Why the earlier house tables were replaced

The first house extension used these tables:

| n | Evil | Sizes | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|---|---|
| 11 | 4 | 4-5-5-6-6 | .11 | .05 | .05 | .20 | .015 |
| 12 | **5** | 4-5-5-6-6 | .07 | .03 | .03 | .12 | .008 |
| 13 | 5 | 4-5-6-6-7 | .10 | .04 | .02 | .18 | .005 |
| 14 | 5 | 4-5-6-6-7 | .13 | .06 | .03 | .24 | .010 |
| 15 | **6** | 5-6-6-7-7 | .04 | .02 | .02 | .08 | .006 |
| 16 | 6 | 5-6-6-7-7 | .06 | .03 | .03 | .12 | .010 |

Under them, every quest at 11–16 was harder for Good than at official 10 players, and
Q5 was 2–4× harder. The worst were 12 and 15, which each had one more Evil player than
the ⌈n/3⌉ pattern.

### 6.4 The tables in use (`MISSION_SIZES`, `failsNeeded`, `evilCount`)

- **Evil = ⌈n/3⌉** at every count.
- **11–12:** team sizes chosen so each quest's clean-team odds sit closest to 10
  players (.17 / .07 / .07 / .26 / .02). Q4 is the only two-Fail quest, as in the
  official game.
- **13+:** Q4 **and Q5** need two Fails. This puts more of the table on the final
  quests. Q1–Q3 are sized as for 11–12. The two-Fail quests are sized against 10
  players' Q4 (.26) and Q5 (.02).

| n | Good | Evil | Sizes (\* = two Fails) | Q1 | Q2 | Q3 | Q4 | Q5 |
|---|---|---|---|---|---|---|---|---|
| 11 | 7 | 4 | 3-4-5-6\*-6 | .21 | .11 | .05 | .20 | .015 |
| 12 | 8 | 4 | 4-5-5-6\*-6 | .14 | .07 | .07 | .27 | .030 |
| 13 | 8 | 5 | 4-5-5-6\*-8\* | .10 | .04 | .04 | .18 | .032 |
| 14 | 9 | 5 | 4-5-5-6\*-8\* | .13 | .06 | .06 | .24 | .063 |
| 15 | 10 | 5 | 4-5-5-6\*-9\* | .15 | .08 | .08 | .29 | .047 |
| 16 | 10 | 6 | 4-5-5-6\*-9\* | .12 | .06 | .06 | .22 | .024 |

Notes:

- **Total riders across the five quests:** 24 at 11 and 26 at 12. From 13 up it's 28–29,
  where the best-fit single-Fail tables would put 23–27.
- **The jump from Q4 to Q5** (6 → 8 or 9) is the cost of the two-Fail final quest.
  Smaller Q5 teams make the finale much easier for Good. For example, Q5 = 7 at 13
  gives .09.
- **The final quest never needs more riders than there are Good players**, so a clean
  team always exists. At 13, Q5 equals the Good count, which matches official 5–8.
- **Every Evil special fits.** There are only three Evil specials and at least 4 Evil
  seats from 10 players up, so the Assassin always gets its own card there.
- These numbers are a yardstick, not a balance proof. Playtesting at 12+ should confirm
  them.
