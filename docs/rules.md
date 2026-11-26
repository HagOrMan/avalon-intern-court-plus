# Rules: Official Avalon vs. The Intern Court

This compares the official rules of _The Resistance: Avalon_ (Indie Boards & Cards, 2012)
with how this app plays them, and lists every deviation. It's the reference for rule
changes and extensions. Keep it current when the engine changes.

**Sources.** Board-game rules come from the rulebook and a BoardGameGeek review of the
retail box. Rules for the variants (Wraith, Lady of the Lake, Excalibur, Lancelot,
Guinevere) come from an online Avalon platform's rules pages, and they're marked as that
platform's version where it says its version differs from the board game. Trapper comes
from _The Resistance: Hostile Intent_. Statements about the app cite the code.

---

## 1. The official game

### 1.1 Players and teams

5–10 players. Allegiance split:

| Players | 5   | 6   | 7   | 8   | 9   | 10  |
| ------- | --- | --- | --- | --- | --- | --- |
| Good    | 3   | 4   | 4   | 5   | 6   | 6   |
| Evil    | 2   | 2   | 3   | 3   | 3   | 4   |

That's Evil = ⌈players / 3⌉ at every official count.

### 1.2 Quest team sizes

| Players | Q1  | Q2  | Q3  | Q4  | Q5  |
| ------- | --- | --- | --- | --- | --- |
| 5       | 2   | 3   | 2   | 3   | 3   |
| 6       | 2   | 3   | 4   | 3   | 4   |
| 7       | 2   | 3   | 3   | 4\* | 4   |
| 8–10    | 3   | 4   | 4   | 5\* | 5   |

\* At 7+ players the 4th quest needs **two** Fail cards to fail.

### 1.3 Characters

**Standard characters**

| Character               | Side | Ability                                                                            |
| ----------------------- | ---- | ---------------------------------------------------------------------------------- |
| Merlin                  | Good | Knows who all the Evil players are at the start, except Mordred.                   |
| Assassin                | Evil | If Good wins three quests, names one Good player as Merlin. A hit means Evil wins. |
| Loyal Servant of Arthur | Good | No ability.                                                                        |
| Minion of Mordred       | Evil | Knows the other Evil players.                                                      |

**Optional characters**

| Character | Side | Ability                                                                                | Helps |
| --------- | ---- | -------------------------------------------------------------------------------------- | ----- |
| Percival  | Good | Knows who Merlin is.                                                                   | Good  |
| Mordred   | Evil | Hidden from Merlin.                                                                    | Evil  |
| Morgana   | Evil | Appears to Percival as a second Merlin.                                                | Evil  |
| Oberon    | Evil | Doesn't see the other Evil players, and they don't see him. **Merlin still sees him.** | Good  |

Deck-building rules:

- **Fixed deck size.** Each special character takes the place of a plain Servant or
  Minion. The Good/Evil split never changes.
- **Merlin and the Assassin go together.** They are the core of Avalon. Dropping both
  gives plain _Resistance_-style play.
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

| Viewer               | Sees                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Evil (except Oberon) | Each other, Mordred included, Oberon excluded                                             |
| Oberon               | No one                                                                                    |
| Merlin               | All Evil except Mordred (Oberon included)                                                 |
| Percival             | Merlin and Morgana, without knowing which is which (only Merlin if Morgana isn't in play) |
| Servants             | No one                                                                                    |

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

All built: the Wraith, Lady of the Lake, Excalibur, Trapper, Lancelot + Guinevere,
Targeting, Plot cards and timers (all settings, §3). Lady, Excalibur, Trapper,
Targeting, and Plot cards sit under Setup → Customize → Modules. Section 5 describes how
each is implemented.

**Order at a round's start**, when several modules apply:

1. The Lancelot allegiance card.
2. The Lady.
3. Lead to Victory.
4. The Plot draw.
5. The proposal.

**Order within a quest**, when several modules apply:

1. The cards are played.
2. Excalibur switches a card.
3. The Trapper's trap.
4. The reveal.

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
privately sees one player's _loyalty_ (Good/Evil), never their character.

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

**In the app** (built):

- A setting, off by default.
- With the team, the leader gives Excalibur to a rider other than themselves. That
  includes the unopposed 5th proposal, even though there's no vote.
- The TV and the vote screens show who holds it.
- After the last card, the holder switches one other rider's card or keeps the sword
  sheathed.
- On a switch, the TV names whose card was switched. The holder privately sees the
  original card (hold to read, neutral colours, recallable from the ROLE chip), then
  taps to continue.
- With Good-must-succeed, a switch can still turn a Good Success into a Fail. It changes
  the card, not the player's choice.

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
  Lancelot _may_ play Success.

**Official Variant 2: switches known in advance**

- Allegiance deck: 7 cards, 5 "No Change" and 2 "Switch Allegiance".
- Night: the same as Variant 1 (Evil knows the Evil Lancelot).
- At the start of the game, deal **five** cards face up, in order, above the tableau.
  Card _k_ says whether the Lancelots switch at the start of round _k_.
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
- Merlin sees the _starting_ Evil Lancelot as Evil, and that doesn't update after a
  switch.

One source says the draw happens "starting after Mission 3". The official text and the
platform both put the first draw at the start of round 3, which is after mission 2. The
app follows the official text.

**Decided:**

- The variants become **four independent switches**, not presets:
  1. Draw schedule: none / hidden draws (V1, platform) / known in advance (V2).
  2. Forced quest cards by current side (V2, platform).
  3. Evil sees the Evil Lancelot (V1, V2).
  4. Lancelots see each other (V3).

  Setup notes that officially only one variant is used at a time. Combinations (such as
  V3's night step with switching) are allowed.

- Variant 2 keeps the rule as written: five face-up cards for rounds 1–5, so a switch
  can happen at the start of round 1 or 2.
- Merlin sees the _starting_ Evil Lancelot as Evil in every variant, and that doesn't
  update after a switch.
- Lady checks see current loyalty.
- **A Lancelot never carries the blade.** There's always another Evil role to hold it.
- Lancelots sit within the normal seat limits. Each role row says how many players the
  deck needs, and the game refuses to begin if too few have joined.

**In the app** (built):

- **Setup:**
  - "Lancelot ×2" is one row that adds or removes both cards. Guinevere is locked until
    it's on.
  - When Lancelot is on, Customize shows a "Lancelot variants" row that opens the four
    switches, with the "officially only one at a time" note.
  - Defaults are Variant 1: hidden cards, free choice, Evil sees him, and the Lancelots
    don't meet.
- **The TV** shows the allegiance cards top-left: five face up for a known schedule, or
  three face down for rounds 3–5 that flip as drawn. It also shows SWITCHED while the
  Lancelots are on their opposite sides.
- **A Lancelot's phone** shows his _current_ side on the role chip and the game-over
  plate.
- **Forced cards:** a forced Lancelot still sees two buttons, and both play his side's
  card.
- **Assassination:** the blade can't name the Evil Lancelot when Evil saw him at night.
  Naming Guinevere wins like naming Merlin.
- **Portraits:** Lancelot and Guinevere have none yet. Their plates show their sigils
  (⚜, ♕) until portraits are added to `public/portraits/` and `PORTRAITS` in
  `lib/roles.ts`.

### 2.5 Guinevere (online platform; needs Lancelot)

Guinevere is Good. She knows which two players are the Lancelots, but not their sides.
She is a second assassination target: **if the Assassin names Guinevere, Evil wins**,
just as for Merlin.

### 2.6 Trapper (from _The Resistance: Hostile Intent_)

- The leader nominates **one more player** than the quest requires, and the vote happens
  as usual.
- Each rider holds their card. The leader takes one rider's card, looks at it privately,
  and removes it.
- The remaining cards are shuffled and revealed as usual.

**In the app** (built):

- A setting, off by default.
- The leader picks one extra rider.
- After cards (and Excalibur), the leader traps any rider, themselves included.
- The TV marks the trapped player ⌖ TRAPPED and shows the card to no one. The leader
  privately sees the card (after any Excalibur switch), says what they like, and taps
  "Reveal the rest".
- The remaining cards, exactly the mission's size, are shuffled and revealed against
  the usual Fail threshold.

### 2.7 Targeting (official optional rule)

- In the team phase, the leader picks both the team and **which quest** it attempts. The
  team size is that quest's size. The round marker shows the chosen quest.
- The result goes on the attempted quest's space. **A quest can't be attempted twice.**
- **The 5th quest can't be attempted until at least two other quests have succeeded.**
- At 7+ players the 4th quest still needs two Fails.

Rulebook example: at 8 players, the first leader may open with the 3rd quest. That
needs 4 riders, so they pick 4 and place the round marker on quest 3 before the vote.

**In the app** (built): a setting under Modules, off by default. The leader picks the
quest on their phone along with the team (§5). The two-Fail rule follows the quest,
not the round, including the house two-Fail 5th quest at 13+.

### 2.8 Plot cards (_The Plot Thickens_, from _The Resistance_)

Built as a setting under Modules (§5 has how it plays in the app). These are the full
official rules.

**Contents and use**

- 15 Plot cards, each marked for the player counts it's used at. Games of 5–6 players
  use 7 of them; 7+ players use all 15.
- Plot cards are **not secret**: they stay face up once in play.
- They need the two Loyalty cards. Whenever a Plot card would reveal someone's character
  card, that player shows the Loyalty card matching their character's loyalty instead.
  Passing the wrong one loses the game. In Avalon, Merlin's identity must stay secret
  even when his loyalty is revealed.

**Distribution**

- At the start of each round, the leader draws Plot cards: **1** at 5–6 players, **2** at
  7–8, **3** at 9–10 (and **4** at 11+, house rule).
- The leader hands them to **other players**, never themselves.
- There are only 5 rounds.

**Card types**

- ★ **Star**: used immediately, then discarded.
- ⚔ **Sword**: held until used, then discarded (one use).
- ⛨ **Shield**: stays in play for the rest of the game.

**Timing**

- If several Plot cards could be used at once, the order goes by proximity to the
  leader: the leader first, then clockwise.
- Each player gets one chance to play any applicable cards. A player who passes can't
  then play cards later in the same opportunity.
- Information from a Plot card can be discussed, but **Loyalty and Quest cards may
  never be shown** to other players.

**The cards**

| Avalon name           | Resistance name            | 5–6 | 7+  | Type | Effect                                                                                                                                                                                                                                   |
| --------------------- | -------------------------- | --- | --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| King Returns          | No Confidence              | 1   | 3   | ⚔    | Cancels an **approved** team and passes the leadership. Using it counts as a failed vote.                                                                                                                                                |
| Ambush                | Keeping a Close Eye on You | 2   | 2   | ⚔    | Secretly look at one played Quest card. It needn't be announced before cards are played, and doesn't change the card. Several cards can be checked in one round, but no player's card can be checked by more than one player in a round. |
| Lead to Victory       | Strong Leader              | 2   | 2   | ⚔    | Become the leader before a team is proposed. It must be declared before the leader acts (drawing Plot cards or handing out team cards). After one is played, another can't be played until a vote has been taken.                        |
| Charge                | Opinion Maker              | 1   | 2   | ⛨    | The holder must choose and reveal their vote **first, publicly**, for the rest of the game. If two are in play, those two reveal at the same time.                                                                                       |
| Restore Your Honor    | Take Responsibility        | 1   | 1   | ⚔    | The player given it **must** take one held Plot card from another player.                                                                                                                                                                |
| Are You the One       | Overheard Conversation     | —   | 2   | ★    | The player the leader gives it to must look at the Loyalty card of **one adjacent player** (immediate left or right). They pick the neighbour publicly; the result is private.                                                           |
| Show Your True Nature | Open Up                    | —   | 1   | ★    | The player given it must show their Loyalty card to one player of their choice, the leader included.                                                                                                                                     |
| Show Your Strength    | Establish Confidence       | —   | 1   | ★    | The **leader** must show their Loyalty card to a player of their choice.                                                                                                                                                                 |
| We Found You          | In the Spotlight           | —   | 1   | ⚔    | Force one rider to play their Quest card **face up**. It must be declared, with the target, before any rider picks a card.                                                                                                               |

The deck is **7 cards at 5–6 players** and **15 at 7+**. The Avalon names are the ones
the app will use.

Two sources differ on two cards. The table follows the fuller rules text:

- **Restore Your Honor:** "one-time use" in the rules text, "immediately" in the summary.
  Either way it's mandatory.
- **We Found You:** "another player" in the rules text, "one Quest member" in the
  summary. Only a rider plays a Quest card, so the target has to be a rider. In Avalon, "show their card" means the matching **Loyalty** card,
  never the character card (see above). The online text calls them "Mission cards"; they
  are the Quest cards here.

**Not compatible with Trapper.** Plot cards and Trapper can't both be on; Setup will
enforce this when Plot cards are built.

**Interactions**

- Excalibur resolves before "Keeping a Close Eye on You".
- Excalibur can't switch a card played face up because of "In the Spotlight".

**Above 10 players (house rule):** the leader draws **4** Plot cards per round at 11+
players, with the full 15-card deck.

---

## 3. How the app plays it

| Rule                                             | Where                                                                           | Matches official?                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------- |
| Good/Evil split, 5–10 players                    | `evilCount`, `lib/rules.ts`                                                     | Yes                                          |
| Quest team sizes, 5–10 players                   | `MISSION_SIZES`, `lib/rules.ts`                                                 | Yes                                          |
| Two-Fail 4th quest at 7+                         | `failsNeeded`                                                                   | Yes (plus a two-Fail 5th quest at 13+, §6)   |
| First leader random; passes after every proposal | `firstLeaderIndex`, `ackVoteReveal`, `closeMission` in `lib/engine.ts`          | Yes (plus the carry-over between games, D10) |
| Majority approves, tie rejects                   | `vote` (`approve > reject`)                                                     | Yes                                          |
| Votes shown openly by name                       | `tvView.voteReveal`                                                             | Yes                                          |
| Good must play Success                           | `playQuestCard`                                                                 | Yes, by default (variant below)              |
| Quest cards shuffled before reveal               | `playQuestCard`                                                                 | Yes                                          |
| Night-phase knowledge                            | `knowledgeFor`, `lib/views.ts`                                                  | Yes, for every role in §1.4                  |
| Percival sees Merlin + Morgana unordered         | `knowledgeFor` (alphabetical)                                                   | Yes                                          |
| Roles in play are public                         | `rolesInPlay`                                                                   | Yes                                          |
| Evil talks before the assassination              | Out loud at the table; no in-app channel                                        | Yes (physical)                               |
| Lady of the Lake                                 | `ladyExamine`, `ladyPass`, `closeMission`; `components/phone/Lady.tsx`          | Yes, when on (§2.2)                          |
| Excalibur                                        | `propose`, `wieldExcalibur`, `excaliburDone`; `components/phone/Sword.tsx`      | Yes, when on (§2.3)                          |
| Trapper                                          | `teamSize`, `trapCard`, `trapDone`, `revealQuest`; `components/phone/Sword.tsx` | Yes, when on (§2.6)                          |
| Lancelot                                         | `allegianceOf`, `startRound`, `knowledgeFor`, `knownEvilTo`                     | Yes, per the chosen switches (§2.4)          |
| Targeting                                        | `availableQuests`, `currentQuest`, `propose`                                    | Yes, when on (§2.7)                          |
| Plot cards                                       | `drawPlots`, `plotDeal`, `plotResolve`, `plotPlay`/`plotPass`, `vote` (Charge)  | Yes, when on (§2.8)                          |

### Role names

| Official      | App key    | App name                                                 |
| ------------- | ---------- | -------------------------------------------------------- |
| Merlin        | `merlin`   | Merlin                                                   |
| **Percival**  | `mistress` | **Merlin's Mistress**: same ability, renamed in all copy |
| Loyal Servant | `servant`  | Servant of Arthur                                        |
| Mordred       | `mordred`  | Mordred                                                  |
| Morgana       | `morgana`  | Morgana                                                  |
| Assassin      | `assassin` | The Assassin                                             |
| Minion        | `minion`   | Minion of Mordred                                        |
| Oberon        | `oberon`   | Oberon                                                   |

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

The Assassin's _ability_ (the blade) is separate from the Assassin _card_:

1. If the host named an Evil special as the blade holder and it's in the deck, it
   carries the blade as an add-on. No Assassin card is dealt.
2. Otherwise, if an Evil seat is free, an **Assassin card** is dealt into it.
3. Otherwise (every Evil seat holds a special), the blade rides on Morgana → Mordred →
   Oberon, in that order (`FLAG_PRIORITY`).

So with the defaults, 5–6 players have Mordred + Morgana, and Morgana carries the blade.
At 7+ the Assassin gets its own card. Oberon can carry the blade. If he does, he can
target anyone, Evil included, because he doesn't know who they are.

### Settings (Setup → Customize)

| Setting                              | Options                                                                                                                                                                                    | Default            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Rejection rule                       | **Quest fails**: the 5th rejection forfeits the quest to Evil, and play moves to the next quest · **Evil wins**: official rule · **Unopposed**: the 5th leader's team rides without a vote | Quest fails        |
| Assassination                        | On / off (off = three quests decide)                                                                                                                                                       | On                 |
| Assassin's blade                     | Assassin card (when a seat is free) or any Evil special in the deck                                                                                                                        | Assassin           |
| Oberon (shown when he's in the deck) | Merlin sees him / hidden from Merlin too (Wraith)                                                                                                                                          | Merlin sees him    |
| Quest cards                          | Good must succeed / anyone may fail                                                                                                                                                        | Good must succeed  |
| Lady of the Lake                     | On / off, at any player count                                                                                                                                                              | Off                |
| Excalibur                            | On / off                                                                                                                                                                                   | Off                |
| Trapper                              | On / off                                                                                                                                                                                   | Off                |
| Targeting                            | On / off                                                                                                                                                                                   | Off                |
| Plot cards                           | On / off (switches Trapper off)                                                                                                                                                            | Off                |
| Timers                               | Off / on, a length per decision, and at zero: reminder only / force a random choice                                                                                                        | Off; reminder only |

When Good must succeed, Good riders still get a green and a red button, and **both play
Success**. Phones look the same to anyone watching (`docs/fairness.md` §6). The server
also refuses a Fail from Good.

---

## 4. Deviations from the official rules

| #   | Deviation                                   | Official                                                              | App                                                                                                                               | Where                                                      |
| --- | ------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D1  | **Player range**                            | 5–10                                                                  | 5–16. Team sizes and the two-Fail 5th quest at 13+ are a house extension; Evil keeps the official ⌈n/3⌉ (see §6)                  | `MISSION_SIZES`, `failsNeeded`, `evilCount`, `MAX_PLAYERS` |
| D2  | **Default deck**                            | The rulebook recommends Merlin + Assassin only, for new groups        | Merlin, Percival (Mistress), Mordred, Morgana, plus the Assassin when a seat is free                                              | `DEFAULT_SPECIALS`                                         |
| D3  | **Blade as an add-on**                      | The Assassin is always its own card                                   | The blade can ride on another Evil role, including Oberon. At 5–6 with the defaults there's no Assassin card                      | `bladeRole`                                                |
| D4  | **Merlin's ally is renamed**                | Percival                                                              | "Merlin's Mistress", same ability                                                                                                 | `lib/roles.ts`                                             |
| D5  | **5 rejections lose the quest by default**  | 5 rejections lose the game                                            | Default: Evil wins that quest. Official and "unopposed" are settings                                                              | `ackVoteReveal`, `isUnopposedProposal`                     |
| D6  | **Good may fail (setting)**                 | Never                                                                 | Off by default                                                                                                                    | `config.goodMayFail`                                       |
| D7  | **Wraith (setting)**                        | Merlin sees Oberon                                                    | Optionally hidden from Merlin                                                                                                     | `config.oberonHiddenFromMerlin`                            |
| D8  | **Assassination can be turned off**         | Always on when Merlin and the Assassin are in play                    | A setting                                                                                                                         | `config.assassination`                                     |
| D9  | **Assassin can't target known Evil**        | Nothing stops it; it would just be a wasted guess                     | The engine refuses known-Evil targets. Oberon is targetable unless he holds the blade himself, in which case he can target anyone | `assassinate`; `playerView.assassin`                       |
| D10 | **First leader carries over between games** | Random every game                                                     | Rotation continues from the previous game if the table is unchanged                                                               | `nextLeader`, `docs/fairness.md` §3                        |
| D11 | **Plot cards in Avalon**                    | A _Resistance_ expansion, usable with Avalon's Loyalty cards          | Built, with the Avalon card names. House rules: 4 draws at 11+, discards reshuffled when the deck runs out                        | §2.8, §5                                                   |
| D13 | **Lancelot variants combine**               | One variant at a time                                                 | Four independent switches; Setup notes the official rule                                                                          | `config.lancelot*`                                         |
| D14 | **Guinevere**                               | Not in the board game (online platform role)                          | Good; sees both Lancelots; a second assassination mark                                                                            | `knowledgeFor`, `isAssassinMark`                           |
| D12 | **Lady after a forfeited quest**            | A quest is lost to rejections only under the "quest fails" house rule | A forfeited quest counts as resolved, so the Lady check still follows it                                                          | `closeMission`                                             |

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

**Excalibur and Trapper: built.**

- State:
  - `excaliburHolderId` is set by `propose` and cleared on a rejection or at the end of
    the mission.
  - `excaliburLog` and `trapLog` hold one entry per mission. Originals and trapped cards
    are server-only, and each appears only in the wielder's `excaliburSeen` or the
    leader's `trapsSeen`.
- Flow: last card → `excalibur` → `excaliburReveal` (only on a switch) → `trap` →
  `trapReveal` → `questReveal`. Each step is skipped when its module is off.
- `revealQuest` leaves out the trapped card before the shuffle.
- Phases with no auto-advance: a wielder or leader who disconnects stalls the game until
  timers exist.
- The Trapper's team is the mission size + 1. The largest is 9 + 1 = 10 riders at
  15–16, still within the table.

**Targeting: built.**

- **Two indexes:**
  - `GameState.mission` is the **round**: how many quests have been resolved. The
    Lancelot draws, leader rotation, and the Excalibur and trap logs use it.
  - `GameState.quest` is the quest the current proposal attempts.
  - `currentQuest(s)` reads the quest, falling back to the round. Without Targeting the
    two are always equal.
- **Choosing:**
  - `availableQuests` lists the quests the leader may choose: unattempted ones, and the
    5th only after two successes. Without Targeting, it's just the round's own quest.
  - `propose` takes the chosen quest and refuses anything else. `teamSize`,
    `failsNeeded` and the history record all read the chosen quest.
  - A rejection clears the choice, so the next leader picks again. A forfeit is recorded
    on the last proposal's quest.
- **The Lady** counts resolved quests (`history.length` of 2–4), not quest numbers.
- **UI:**
  - The leader's phone shows Q1–Q5 buttons with team sizes, two-Fail marks, and
    unavailable quests greyed out. The team picker sizes itself to the chosen quest.
  - The TV ringing waits for the choice, and the 5th quest shows "SEALED · 2 WINS"
    until two others succeed.
  - Phones show "ROUND n / 5" in the header.
- **Forced timers** pick a random available quest along with the random team.

**Plot cards: built.** The card data is in `lib/plots.ts`; the state is `GameState.plot`.

- **Round start** (`enterRound` → `toLeaderTurn` → `drawPlots`):
  - First a **Lead to Victory** window, then the leader draws 1/2/3/4 cards.
  - If the deck runs short, the discards are reshuffled under it. That only happens at
    11+, where 4 draws a round outlast 15 cards.
  - The leader hands each drawn card to another player (`plotDeal`).
  - ⚔ cards go face up into that player's hand, and ⛨ Charge stays in play.
  - ★ cards resolve at once, in precedence order (`plotResolve`). Restore Your Honor
    with nothing to take is discarded with no effect.
- **Windows** (`plotWindow`): at each point a held card can be used, its holders are
  asked one at a time, clockwise from the leader (`holdersOf`). Each may play or keep
  it, and a holder who keeps it isn't asked again in the same window.
  - **Lead to Victory:** before every leader's turn (round start and after each
    rejection), except the current leader. Playing it makes the holder leader and closes
    the window. No other can be played until a vote is taken
    (`strongLeaderBlocked`, cleared in `ackVoteReveal`).
  - **King Returns:** after an approved vote, not after an unopposed team. Playing it
    sends the team through `rejectTeam`, which counts it as a rejected vote: the lead
    passes, and the 5th rejection follows the rejection rule.
  - **We Found You:** after approval, before any card is played. The holder targets a
    rider other than themselves. That rider's card shows on the TV and phones as soon as
    it's played, and Excalibur can't switch it.
  - **Ambush:** after cards and Excalibur, before the reveal. The holder privately sees
    one rider's (post-switch) card. Each rider can be checked at most once a round.
- **Charge:** `vote` refuses everyone else until every Charge holder has voted. Their
  votes are public (TV seats, phones) as soon as all Charge holders have voted, so two
  Charges reveal together.
- **Private results:** Are You the One, Show Your True Nature, Show Your Strength and
  Ambush results go only into the viewer's `plotSeen`. They're hidden until the ROLE
  chip is held, and a nudge appears when a new one arrives. Loyalty means current
  loyalty, so a switched Lancelot shows his current side.
- **What's public:** cards drawn, every hand and Charge, who is being asked, and the
  latest action ("Dana played Ambush · Sam").
- **Exclusive with Trapper:** `updateConfig` turns the other off; the last one switched
  on wins.
- **Forced timers** (Plot timer, default 1 minute):
  - The deal hands cards out at random, and ★ choices are random and legal.
  - A window passes, the choice that changes nothing.
  - A forced vote fills Charge holders first.

**Interpretations to know about:**

- "Each round" means each of the five quest rounds, not each proposal. So the draw
  happens once a round, by whoever leads first that round.
- Restore Your Honor takes only held (⚔) cards, never a Charge in play.
- A use-immediately card's choice is made at once by its holder, or by the leader for
  Show Your Strength.

**Lancelot (+ Guinevere): built.**

- `isEvil(role)` is a role's _starting_ side: seat counting and night sight use it.
  `allegianceOf(s, playerId)` in `engine.ts` is the _current_ side: quest-card rules,
  Lady checks, the player's own role chip and the game-over cast use it.
- `startRound` resolves the round's allegiance card. `playerReady` calls it for round 1,
  and `closeMission` calls it before the Lady's turn.
- `knownEvilTo` is the single source for who the blade holder saw at night, and the
  engine and the phone's target list both use it.
- Roles: `lancelotGood` and `lancelotEvil` (starting sides), taking one Good and one Evil
  seat inside the normal limits. Excluded from `FLAG_PRIORITY`: a Lancelot never carries
  the blade.
- State: `lancelotSwitched`, plus either a shuffled draw deck (V1 and the platform
  version) or a five-card schedule dealt face up (V2). A public draw beat on the TV
  before rounds 3–5, resolved before the Lady.
- Settings: the four switches from §2.4, with the "officially only one variant at a
  time" note, plus Guinevere on/off (only with Lancelot).
- V2's face-up schedule is public state. V1's draw deck stays server-only until each
  card is flipped.
- Night views: Merlin always sees the starting Evil Lancelot. Evil sees him when switch
  3 is on. The Lancelots see each other when switch 4 is on. Guinevere sees both,
  without sides.
- Assassination: a hit on Merlin **or Guinevere** wins for Evil (`assassinate`, the
  reveal beat, the game-over copy).

**Timers: built.**

- **Settings** (Customize → Timers):
  - Off by default. When on, the TV shows a countdown for each decision.
  - Lengths step from 10 seconds to 10 minutes. Defaults: proposals 2 minutes,
    everything else 1 minute (votes, quest cards, the assassination, the Lady,
    Excalibur, the trap).
  - The role reveal has **no** timer.
  - **At zero, nothing happens by default.** The game is played in person, and a player
    who idles or disconnects can reconnect. The countdown just reads "TIME".
- **Forcing (opt-in):** with "At zero: force" on, the server decides at random for
  anyone who hasn't (`autoAdvance` → `forceDecision`, through the normal engine moves,
  using `secureRandom`):
  - Proposal: a random team of the right size, plus a random sword holder if Excalibur
    is on.
  - Vote: random Approve/Reject.
  - Quest card: whatever the rider's side forces; Good plays Success; Evil gets a coin
    flip.
  - Assassination: a random legal target.
  - Lady, Excalibur, trap: a random legal choice (Excalibur may also sheathe), then the
    automatic "continue".
- **Clock:** `phaseStartedAt` is stamped by `stampPhase` whenever the phase changes,
  in both write paths (`mutateRoom` and the stream's `autoAdvance`). A module's
  private "reveal" step shares its choice's timer and restarts it.

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

**Clean-team odds**: the chance that a _random_ team of the quest's size contains too
few Evil players to fail it. It's hypergeometric: C(good, k) / C(n, k), or for a two-Fail
quest, the chance of at most one Evil player. Lower odds mean Good needs more real
deduction to field a passing team. This measure ignores Merlin, Percival and voting
reads, so it's a yardstick for _relative_ difficulty, not a balance model.

Official counts (Q4 at 7+ is two-Fail):

| n   | Evil | Sizes     | Q1  | Q2  | Q3  | Q4  | Q5  |
| --- | ---- | --------- | --- | --- | --- | --- | --- |
| 5   | 2    | 2-3-2-3-3 | .30 | .10 | .30 | .10 | .10 |
| 6   | 2    | 2-3-4-3-4 | .40 | .20 | .07 | .20 | .07 |
| 7   | 3    | 2-3-3-4-4 | .29 | .11 | .11 | .37 | .03 |
| 8   | 3    | 3-4-4-5-5 | .18 | .07 | .07 | .29 | .02 |
| 9   | 3    | 3-4-4-5-5 | .24 | .12 | .12 | .41 | .05 |
| 10  | 4    | 3-4-4-5-5 | .17 | .07 | .07 | .26 | .02 |

### 6.3 Why the earlier house tables were replaced

The first house extension used these tables:

| n   | Evil  | Sizes     | Q1  | Q2  | Q3  | Q4  | Q5   |
| --- | ----- | --------- | --- | --- | --- | --- | ---- |
| 11  | 4     | 4-5-5-6-6 | .11 | .05 | .05 | .20 | .015 |
| 12  | **5** | 4-5-5-6-6 | .07 | .03 | .03 | .12 | .008 |
| 13  | 5     | 4-5-6-6-7 | .10 | .04 | .02 | .18 | .005 |
| 14  | 5     | 4-5-6-6-7 | .13 | .06 | .03 | .24 | .010 |
| 15  | **6** | 5-6-6-7-7 | .04 | .02 | .02 | .08 | .006 |
| 16  | 6     | 5-6-6-7-7 | .06 | .03 | .03 | .12 | .010 |

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

| n   | Good | Evil | Sizes (\* = two Fails) | Q1  | Q2  | Q3  | Q4  | Q5   |
| --- | ---- | ---- | ---------------------- | --- | --- | --- | --- | ---- |
| 11  | 7    | 4    | 3-4-5-6\*-6            | .21 | .11 | .05 | .20 | .015 |
| 12  | 8    | 4    | 4-5-5-6\*-6            | .14 | .07 | .07 | .27 | .030 |
| 13  | 8    | 5    | 4-5-5-6\*-8\*          | .10 | .04 | .04 | .18 | .032 |
| 14  | 9    | 5    | 4-5-5-6\*-8\*          | .13 | .06 | .06 | .24 | .063 |
| 15  | 10   | 5    | 4-5-5-6\*-9\*          | .15 | .08 | .08 | .29 | .047 |
| 16  | 10   | 6    | 4-5-5-6\*-9\*          | .12 | .06 | .06 | .22 | .024 |

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
