# Layout improvements guide

A layout and spacing review of every screen at the four target sizes, written after `fix/stable-table-layout`. It covers spacing, consistency across sizes, and which controls to collapse or group. It is not a rebrand: the green felt, brass accents and serif type stay as they are.

**Status:** all 14 changes in §5 are implemented on `fix/stable-table-layout`. Deviations: the menu note sits under the Leave group, which it describes; in landscape the kitty's label sits beside the kitty, the cards are `14dvh`, and the action bar drops its top pad, so the table fits at 750×340.

**Hard constraint.** Every recommendation keeps the table still during a hand. `tests/e2e/layout.spec.ts` must keep passing. Any track size or gap proposed here is static for a given viewport and never depends on game state.

## How this was measured

- The dev server ran at `http://localhost:5173/?seed=127&e2e`. Seed 127 passes through both bidding rounds and ends in a redeal; the second hand was played by ordering up, which gives the play and summary states.
- Script: `uxd/capture.mjs`. For each state it saves a screenshot and records the boxes of every control, card, chip and label. It also lists every pair of neighbours less than 16 px apart, and every control smaller than 44 px.
- Raw numbers: `uxd/shots/report.json` and `.../shots/report-iphone.json`. A second probe (`.../uxd/probe.mjs`) measured font sizes, empty felt, the Home overflow and the menu note gap.
- Screenshots: `uxd/shots/`, named `<size>-<state>.png`. Phones and the iPad were captured at 2x and 1x on WebKit, and the desktop on Chromium.
- Six sizes were captured. Besides the four target sizes, two Safari-in-a-tab sizes were added. Most friends will open a shared link in Safari before they install the PWA, and Safari's toolbars take a lot of height:

| Name | Viewport | What it represents |
|---|---|---|
| `iphone` | 390×844 | iPhone portrait, installed PWA |
| `iphone-safari` | 390×664 | iPhone portrait in a Safari tab (Playwright "iPhone 14") |
| `iphone-landscape` | 844×390 | iPhone landscape, installed PWA |
| `iphone-landscape-safari` | 750×340 | iPhone landscape in Safari (Playwright "iPhone 14 landscape") |
| `ipad` | 810×1080 | iPad portrait |
| `desktop` | 1280×720 | Laptop browser |

Headless WebKit reports `env(safe-area-inset-*)` as 0. On a real iPhone in landscape the notch adds about 47 px on each side and the home indicator about 21 px at the bottom. The padding already uses `max(8px, env(...))`, so plan the landscape budget with that loss in mind.

---

## 1. Assessment per screen and size

Shorthand: "gap" means the clear space between two boxes, as measured. "Hit" means the height of the tappable box.

### 1.1 Table: iPhone portrait (390×844 and 390×664)

Screenshots: `.../shots/iphone-table-round1.png`, `iphone-table-round2-hint.png`, `iphone-table-play.png`, `iphone-safari-table-play.png`.

**What works**
- Every track is fixed and the hand fits with no horizontal scroll. Cards are 66 px wide, the largest the width allows.
- The round-two suit buttons are icon-only, so the whole bid fits on one row (331 px of 374).
- The side seats reserve two lines for their status chips, so a wrapping "CALLED SPADES" never moves the backs.

**What doesn't**
- **The score jumps inside the bar.** `.score` is `flex: 1; justify-content: space-between`. "Them 0" sits at x≈218 while bidding, then moves to x≈52 when Trump and Tricks appear. That is a shift during a hand. `layout.spec.ts` misses it because `.score-bar`'s own box stays the same.
- **The score bar is crowded.** "Them" is 7 px from the Sound button (8 px when "Tricks 1–0" shows). Sound and Menu are 8 px apart. The score labels are only 10.9 px, and the Sound button is 38×36.
- **The felt corner controls are crowded against the partner and float in the felt.** Rules and Hint are 6 px below the partner's backs. They sit in the center column, between the side columns, at x=100 and x=237. They line up with neither the score bar nor the seats.
- **There is a large dead zone.** The center is 449 px tall, but its content is bottom-aligned, which leaves **323 px of empty felt** above the kitty (143 px in Safari). Meanwhile the side seats' backs are centred in their column at y≈300–450, while the trick is at y≈426–601. The opponents don't line up with the trick slots they play into.
- **Things touch along the bottom.** The trick's bottom card is 5 px above the prompt, and the "Upcard" label is 5 px above it. In the bid row, "Pick it up" is 5 px from the "Go alone" label, and "Go alone" is 7 px from Pass. The bid row is 6 px above the "You" name. When the hint text wraps to two lines it sits 5 px above every bid button.
- **The hand cards are 4 px apart** (`clamp(2px, 1vw, 10px)`).
- **The dealer "D" disc overlaps the fifth hand card**, or the left opponent's backs during play.
- A seat name is 2 px above its status chip, so the two read as one blob.
- Every felt and score-bar control is 36 px tall (Sound, Menu, Rules, Hint, Last trick), below the 44 px minimum.

### 1.2 Table: iPhone landscape (844×390 and 750×340)

Screenshots: `.../shots/iphone-landscape-table-round1.png`, `iphone-landscape-table-round2-hint.png`, `iphone-landscape-table-play.png`, `iphone-landscape-safari-table-round2-hint.png`.

**What works**
- Names sit beside the partner's and the human's cards, so the center keeps 151 px of height (111 px in Safari). The trick fits in it (110 px and 96 px tall).
- All four suit buttons and Pass fit on one row, with their names.

**What doesn't**
- **The bid buttons sit on the hand: a 2 px gap** between Spades, Hearts, Diamonds, Pass or Go alone and the cards below. The bower badge (`top: -0.55rem`) and the dealer disc reach into that gap, and the dealer disc overlaps the Go alone label. This is the worst crowding in the app.
- **Hint jumps when play starts.** `.center-corner` is a bottom-anchored column, so the arrival of Last trick pushes Hint up from y=206 to y=170. A control moving during a hand breaks the stable-table principle, and `layout.spec.ts` doesn't check it.
- In Safari, the Rules chip is **1 px** from the prompt.
- Partner's name is 3 px below the score, and the partner's backs are 4 px below it.
- Score-bar and felt buttons are **30 px** tall; bid buttons are 36 px.
- The side columns are mostly empty: 128 px wide, with 251 px between the left seat and the kitty. Height, not width, is what landscape lacks.

### 1.3 Table: iPad (810×1080)

Screenshots: `.../shots/ipad-table-round2.png`, `ipad-table-play.png`.

**What works**
- The cards are at their 118 px cap and the trick is generous.

**What doesn't**
- **The chrome never scales up.** The score labels are 12.8 px, seat names 13.6 px, chips 11.2 px, the prompt 14.4 px and the buttons 36 px, all beside 118 px cards. Against cards that size the text looks like a footnote, and the score is hard to read at arm's length.
- 197 px of felt sits empty above the kitty and 219 px below it. The side seats are 204 px from the kitty.
- Hint and Last trick sit in the bottom-right corner of the center, about 70 px from the trick. Rules is 5 px above the prompt.
- Hint jumps when Last trick appears, as in landscape.

### 1.4 Table: desktop (1280×720)

Screenshots: `.../shots/desktop-table-round2-hint.png`, `desktop-table-play.png`.

**What works**
- The layout is clear and uncluttered, and the bid row has 8 px gaps.

**What doesn't**
- **The table is spread too wide.** The side seats are pinned to the window edges, **453 px** from the kitty. Your eye travels 900 px to follow one trick.
- The cards are height-limited to 90 px (`12.5dvh`) while 66 px of felt sits empty above the kitty and 88 px below it.
- Chrome is the same small size as on the iPad, and Hint jumps as in landscape.

### 1.5 Hand summary dialog

Screenshots: `.../shots/iphone-hand-summary.png`, `iphone-hand-summary-redeal.png`, `iphone-landscape-hand-summary.png`, `desktop-hand-summary.png`.

- **Works:** it is short (219 px), with one primary action and a clear result line.
- **Doesn't:** it is centred, so on a portrait phone it covers the final trick, which the spec deliberately leaves on the table for the summary. Meanwhile the area it could use is empty: once the hand is played out, the hand row and action bar give 223 px of free space at the bottom.
- **Doesn't:** the "redealt" summary shows "LEAD" in the center behind the dialog (`iphone-hand-summary-redeal.png`), which is a stray label.

### 1.6 Game menu

Screenshots: `.../shots/iphone-game-menu.png`, `iphone-landscape-safari-game-menu.png`.

- **Works:** large full-width buttons, and the safe choice takes focus.
- **Doesn't:** the note "Your game is saved when you leave it." sits **0 px** below Concede. `.menu-note { margin-top: 12px }` is overridden by `.dialog-body p { margin: 0 0 8px }`, which has higher specificity.
- **Doesn't:** destructive actions (New game, Concede) are stacked with neutral ones (Settings, Home) and get the same treatment and spacing.
- **Doesn't:** in Safari landscape the menu is 314 px tall in a 340 px viewport, and `.dialog` has no `max-height` or `overflow`. Adding a single item (as §4 proposes) would push it off screen with no way to scroll.

### 1.7 Home

Screenshots: `.../shots/iphone-home.png`, `iphone-home-continue.png`, `iphone-landscape-safari-home-continue.png`, `ipad-home.png`.

- **Works:** a clear hierarchy in portrait. The primary button is brass, the 44 px stack has 12 px gaps, and the secondary links sit 20 px below.
- **Doesn't, and this is a bug:** in Safari landscape with a saved game, the content runs from y=−14 to y=355 in a 340 px viewport. The title is clipped at the top and **About is cut off and cannot be reached**, because `body { overflow: hidden }` and `.home` doesn't scroll. At 844×390 it fits with 10 px to spare.
- **Doesn't:** Settings is styled as a primary-size button, while the related reading screens are 36 px "small" links. There are two tiers for what is really one group of secondary destinations.
- **Doesn't:** the secondary links are 36 px tall (30 px in landscape), and their wrapped row leaves About alone on a second line.
- **Doesn't:** on the iPad, Home is a small island: the buttons are 200 px wide, at 13.6 px text.

### 1.8 Settings (long, with the house-rules fieldset)

Screenshots: `.../shots/iphone-settings-top.png`, `iphone-settings-1.png`, `iphone-settings-2.png`, `iphone-landscape-safari-settings-top.png`, `desktop-settings-top.png`.

- **Works:** fieldsets with brass legends, 44 px radio and checkbox rows, readable detail text, and the four-color deck preview.
- **Doesn't:** **every `<select>` is 27 px tall on WebKit** (iPhone and iPad), against 40 px on Chromium. iOS ignores `min-height` on a native select unless `appearance` is reset.
- **Doesn't:** **Done scrolls away.** The page scrolls 1060 px on an iPhone, 1240 px in Safari and 1361 px in Safari landscape, and the only way out is at the top.
- **Doesn't, on proximity:** in Opponents, each detail line is 4 px below its select but only 8 px above the next row, so it reads as belonging to either.
- **Doesn't:** "A loner who takes all five scores" depends on Loners, but it sits at the same indent as an independent row, so the dependency isn't visible.
- **Doesn't:** groups are 12 px apart with 12–14 px padding, which is tight for a page this long. One-tap play sits directly under the deck preview with no separation.

### 1.9 Rules, Partner conventions, Stats, About

Screenshots: `.../shots/iphone-rules-top.png`, `iphone-conventions-top.png`, `iphone-stats-top.png`, `iphone-about-top.png`, plus the `-landscape-` and `-ipad-` variants.

- **Works:** good line length and line height (1.45), and consistent section cards.
- **Doesn't:** the same scrolling Done problem. "How your partner plays" scrolls 1366 px on an iPhone and 1546 px in Safari.
- **Doesn't (Stats):** the footnote sits 2 px above "Reset stats", and a destructive action deserves clear separation. The four numeric columns are cramped at 390 px: "0/0 0/0" sit about 20 px apart.

---

## 2. Spacing system to adopt

Today the stylesheet uses 2, 4, 5, 6, 7, 8, 10, 12, 14, 16 and 20 px, picked locally. The proposal is one 4 px-based scale, plus a small set of semantic tokens that name the relationships the owner asked about. Put them on `:root` at the top of `src/styles.css`. They are layout, not palette, so they don't belong in `themes/cardRoom.ts`.

```css
:root {
  /* Scale */
  --space-0: 2px;   /* hairline: landscape table only */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Touch */
  --tap: 44px;              /* minimum hit area, everywhere */
  --pill-h: 36px;           /* compact visual pill; hit area extended to --tap */

  /* Screen edges */
  --gutter: 12px;           /* phones; 16px roomy (see §3) */

  /* Relationships (minimums) */
  --gap-controls: var(--space-2);        /* button ↔ button, in any row */
  --gap-control-card: var(--space-3);    /* button ↔ card / hand / trick */
  --gap-control-text: var(--space-2);    /* button ↔ prompt or label */
  --gap-label-chip: var(--space-1);      /* seat name ↔ status chip */
  --gap-chip-cards: var(--space-2);      /* status chip ↔ backs */
  --gap-hand: clamp(6px, 1.5vw, 12px);   /* between hand cards */
  --gap-region: var(--space-2);          /* table grid row/column gap */
  --gap-group: var(--space-4);           /* settings groups, dialog sections */
  --gap-danger: var(--space-4);          /* before destructive actions */
}

@media (max-height: 500px) {
  :root {
    --gap-region: var(--space-0);
    --gap-control-card: var(--space-2);  /* the 2 px → 8 px fix (§1.2) */
    --gap-control-text: var(--space-1);
  }
}
```

**Where each step is used**

| Token | Value | Use |
|---|---|---|
| `--space-0` | 2 | Only the landscape table's grid gap, where height is the binding constraint. |
| `--space-1` | 4 | Name ↔ chip; detail line ↔ its control; icon ↔ label inside a button. |
| `--space-2` | 8 | Default gap between controls; chip ↔ backs; table regions; button ↔ prompt. |
| `--space-3` | 12 | Control ↔ card or trick; phone screen gutter; Home stack. |
| `--space-4` | 16 | Between settings groups; dialog actions ↔ body; before destructive actions; roomy gutter. |
| `--space-5` | 24 | Dialog padding at the roomy size; Home sections; section headers on reading pages. |
| `--space-6` | 32 | Home hero ↔ actions at the roomy size. |

**Minimum gaps (hard rules)**

| Between | Minimum | Measured today (worst) |
|---|---|---|
| Two buttons in a row | 8 px | 5 px (portrait bid row) |
| A button and any card (hand, trick, backs, kitty) | 12 px (8 px landscape) | 2 px (landscape bid row ↔ hand) |
| A button and text (prompt, seat name) | 8 px (4 px landscape) | 1 px (Safari landscape Rules ↔ prompt) |
| A seat name and its chip | 4 px | 2 px |
| A chip and the seat's cards | 8 px | 4 px (partner) |
| Hand cards | 6 px | 4 px |
| A hit area and the screen edge | the gutter (12 px) | 8 px |
| Score values and the controls | 12 px | 7 px |

**Hit-slop for compact pills.** Felt and score-bar controls should stay visually compact, at 36 px. They should still be 44 px to the finger. Extend the hit area vertically only, so neighbours 8 px apart never have overlapping targets:

```css
.button-small {
  position: relative;
  min-height: var(--pill-h);
}

.button-small::after {
  content: '';
  position: absolute;
  inset: calc((var(--pill-h) - var(--tap)) / 2) 0;  /* -4px 0 */
}
```

The pseudo-element is out of flow, so it changes no box and is safe for the no-shift test. In landscape, raise `--pill-h` from today's 30 px to 36 px only in the felt corners. In the score bar, keep 30 px visual height with `inset: -7px 0`. The 8 px table padding above and the 2 px gap below absorb it.

---

## 3. Responsive layout spec for the table

There are four tiers. The first three already exist as media queries. **Roomy** is new and covers both the iPad and the desktop, so those two share one structure.

| Tier | Query | Devices |
|---|---|---|
| Portrait phone | `(max-width: 520px)` | 390×844, 390×664 |
| Landscape phone | `(max-height: 500px)` | 844×390, 750×340 |
| Default | (none) | 521–767 px wide, taller than 500 px: split view, small tablets |
| Roomy (new) | `(min-width: 768px) and (min-height: 700px)` | 810×1080, 1280×720 |

Every value below is static per tier. "Now" is what was measured; "Proposed" is the target.

### 3.1 iPhone portrait (390×844; the Safari 390×664 row heights in brackets)

| Region | Now | Proposed |
|---|---|---|
| Padding | 8 px all round (safe area) | top `max(8px, env)`, sides and bottom `max(var(--gutter), env)` = 12 px |
| Columns | 86 / 190 / 86 | unchanged (`--side-w: 22vw`): 83 / 184 / 83 after the wider gutter |
| Grid gap | 6 px | `--gap-region` 8 px |
| Score bar | 36 px: Us · Them · [Trump] · [Tricks] · Sound · Menu | 44 px: **Us · Them · Trump · Tricks (all four slots always present)** · Menu. Sound moves into the menu (§4). |
| Top seat | 96 px: name, 2 px, chip, 4 px, backs | about 104 px: name, 4 px, chip, 8 px, backs |
| Center | 449 [269] px; trick and kitty bottom-aligned; Rules top-left, Hint/Last trick stacked top-right | same 1fr track. Trick stays bottom-aligned. **Hint and Last trick in one horizontal row, top-right** (Hint outermost). Rules moves to the menu. |
| Side seats | content centred in a 449 px column | `justify-content: flex-end` with `padding-bottom` equal to half a trick row, so the backs sit level with the trick's left and right slots |
| Action bar | 86 px = 2 prompt lines + 6 + 44 | 96 px = 8 px top pad + 2 lines + 8 + 44 |
| Bottom seat | 137 px | about 141 px (name ↔ chip 4 px); the dealer disc moves to the name row |
| Card size | `--card-w` 66 px (width-limited) | 66 px; the hand is 5×66 + 4×6 = 354 px within 366 px |
| Controls | 36 px pills | 36 px visual, 44 px hit (§2) |

Height check at 390×664: 12 + 44 + 104 + 96 + 141 + 4×8 + 12 = 441, leaving a 223 px center. The trick needs 175 px, plus 44 px for the Hint/Last-trick row above it = 219. It fits.

### 3.2 iPhone landscape (844×390; the Safari 750×340 values in brackets)

| Region | Now | Proposed |
|---|---|---|
| Padding | 8 px (headless); about 47 px sides on a real notched phone | unchanged |
| Columns | 128 / 1fr / 128 | unchanged |
| Grid gap | 2 px | `--gap-region` 2 px, except **8 px between the action bar and the bottom seat** (`margin-bottom` on `.action-bar`, counted in its fixed height) |
| Score bar | 30 px: Brand · score · Sound · Menu | 30 px visual, 44 px hit: Brand · Us · Them · Trump · Tricks · **Game to 10** · Sound · Menu |
| Top seat | 44 px, name beside the backs | unchanged; 4 px clearance below the score bar comes from `--space-1` padding |
| Center | 151 [111] px | about 145 [105] px. The trick needs 110 [96]. |
| Felt controls | Rules bottom-left; Hint and Last trick stacked bottom-right (Hint moves) | **Hint and Last trick in one row, bottom-right, with Hint outermost and fixed.** Rules moves to the menu, so nothing sits next to the prompt. |
| Action bar | 60 px = 1 line + 6 + 36 | 66 px = 1 line + 4 + 36 + 8 px bottom gap to the hand. The bid buttons stay at 36 px visual, with the hit area extended upward only (`inset: -8px 0 0`) so it never reaches the hand. |
| Bottom seat | 82 [71] px, name beside the hand | unchanged; the dealer disc moves to the name |
| Card size | 59 [51] px (`15dvh`) | unchanged |

### 3.3 iPad portrait (810×1080), roomy tier

| Region | Now | Proposed |
|---|---|---|
| Padding | 8 px | 16 px (`--gutter: 16px`) |
| Columns | 128 / 526 / 128 | `--side-w: 160px` |
| Grid gap | 6 px | 12 px |
| Score bar | 36 px; labels 12.8 / values 20 px | 48 px; labels 0.9 rem / values 1.5 rem; Brand · score · Game to 10 · Sound · Menu |
| Seats | name 13.6 px, chip 11.2 px | name 1 rem, chip 0.8 rem, monogram 1.6 rem |
| Center | trick centred; controls bottom corners | trick centred. The Hint/Last-trick row is bottom-right, 44 px tall. |
| Action bar | 1 line at 14.4 px + 44 | 1 line at 1.05 rem + 8 + 48 px buttons |
| Card size | 118 px (cap) | `clamp(46px, min(17vw, 14dvh), 128px)` = 128 px; the hand is 5×128 + 4×12 = 688 px within 778 px |
| Controls | 36 px | 44 px pills (`--pill-h: 44px`) |

### 3.4 Desktop (1280×720), roomy tier

| Region | Now | Proposed |
|---|---|---|
| Table width | full window, 1264 px | `max-inline-size: 1040px; margin-inline: auto` on `.table`. The felt stays full-bleed on `.app`, and the side seats come about 120 px closer to the trick. |
| `--reach-x` | `38vw` | `min(38vw, 400px)`, so flights stay matched to the narrower table (animation only) |
| Card size | 90 px (`12.5dvh`) | `14dvh` = 101 px. The center then loses about 30 px of its 154 px of slack. |
| Everything else | — | as on the iPad (roomy tokens) |

### 3.5 Fixed-size rules for every tier

1. Only change **static** values: `grid-template-*`, `gap`, `padding`, `--side-w`, `--card-w`, `--button-h`, `--prompt-lines`. Never size a track from content that changes in a hand.
2. Controls that come and go during a hand (Hint, Last trick, chips, the prompt) are either absolutely positioned or have reserved space. A control that is always present must never be pushed by one that appears (§1.2 Hint).
3. Extend `layout.spec.ts`'s `PARTS` with `.score` and the Hint button's box, so the two shifts found here (§1.1, §1.2) stay fixed.

---

## 4. Menu and grouping plan

### 4.1 What stays one tap away during play, and why

| Control | One tap? | Reason |
|---|---|---|
| Your hand, the bid buttons | Yes | They are the game (GF-2, GF-3). |
| Score, trump, tricks | Always visible | VP-1 and UI-4 require them to be on screen; they are information, not controls. |
| **Hint** | Yes, on the felt | You need it at the moment of decision, in the context of your cards. Its reason replaces the prompt. A menu would cost two taps plus a modal that hides the cards it talks about. |
| **Last trick** | Yes, on the felt | GF-5 says "at any time during a hand". It is a mid-hand glance ("who led that?"), and it is meaningless once you've left the table. |
| **Menu** | Yes | It is the single way out, to everything else. |
| Sound | One tap at ≥ 521 px; in the menu on portrait phones | Muting is occasionally urgent, but on an iPhone the ring/silent switch (or Action button) already silences Web Audio's default "ambient" session. That makes the hardware switch the one-tap mute, and it frees 46 px in the tightest bar. Verify on a device before committing. If the switch does not silence it, keep Sound in the bar and instead shorten the labels to "Us/Th". |
| Rules for this game | In the menu at every size | It is reference, read once per game. Today it takes the felt's second corner and collides with the prompt (1 px in Safari landscape, 5 px on iPad). The target score, the one fact worth seeing at a glance, moves into the score bar as "Game to 10" where it fits (≥ 521 px). |

### 4.2 Score bar per tier

| Tier | Left | Middle | Right |
|---|---|---|---|
| Portrait | — (brand hidden, as now) | Us · Them · Trump · Tricks: four fixed-width slots, `justify-content: space-between`, slots reserved from the deal with an em dash | **Menu** (44 px) |
| Landscape | Brand | Us · Them · Trump · Tricks · Game to 10 | Sound · Menu |
| Default and roomy | Brand | the same as landscape | Sound · Menu |

To reserve the slots, always render the Trump and Tricks `<div>`s. Before trump is set, the `dd` shows "—", with `aria-label="Trump: not named yet"` and `aria-label="Tricks: none yet"`. Give each slot a `min-width` in `ch` so a "1–0" never widens it. That ends the in-bar jump without a new fixed height.

### 4.3 Felt controls

- There is one cluster, `.center-corner`, laid out as `flex-direction: row-reverse` with `gap: var(--gap-controls)`. **Hint is always the outermost item, Last trick sits inside it.** When Last trick appears at the start of play, it grows inward, so Hint never moves.
- Portrait: top-right of the center. Landscape, default and roomy: bottom-right.
- Keep `.center-rules` only until the Rules dialog moves to the menu, then delete it.

### 4.4 The game menu

At every size the menu opens from the same "Menu" button. That is the "hamburger", and it is deliberately labelled with a word, not three lines. It is one consistent structure at every size. Groups are separated by `--gap-group` with a 1 px brass rule at 25% opacity:

```
Menu
─ This game ─────────────────────
  [ Sound ]                 portrait phones only; aria-pressed, same name "Sound"
  [ Rules · to 10 ]         opens the existing Rules dialog; same accessible name as today's chip
  [ How to play ]
─ Leave ─────────────────────────
  [ Settings ]   [ Home ]
─ End the game ──────────────────   (--gap-danger above, muted heading)
  [ New game ]   [ Concede ]
  Your game is saved when you leave it.   ← margin-top fixed (§1.6)
                       [ Back to the game ]  (primary, first focus as now)
```

- **Landscape** (`max-height: 500px`): lay the groups out on a two-column grid so the menu is no taller than about 230 px. Always add `.dialog { max-height: calc(100dvh - 2 * var(--space-4)); overflow-y: auto; }`.
- **Touch:** every menu item is a full `.button` at 44 px (36 px only in landscape, with hit-slop), with 8 px gaps inside a group and 16 px between groups.
- **Accessible names:** keep "Sound", "Rules · to 10" / "House rules · to 10", "Settings", "Home", "New game" and "Concede" exactly. Group headings are `<h3>` elements inside `role="group"` with `aria-labelledby`, so screen readers announce "This game, group".
- **Keyboard and focus:** opening the menu focuses "Back to the game", the safe default, as now. Tab order runs from the top group to the bottom. Escape closes and returns focus to the Menu button. Today `Dialog` has no Escape handler and does not restore focus; add both. A sub-dialog (Rules) returns focus to its menu item and then to the menu. Trap focus inside the dialog while it is open. `aria-modal` alone does not stop Tab from reaching the table on WebKit.
- **Sound in the menu:** render both copies and hide one with CSS (`display: none` in the other tier). Only one is ever in the accessibility tree, so `getByRole('button', { name: 'Sound' })` stays unique.

### 4.5 Home grouping

Home has spare height at every size except landscape (portrait content uses 371 of 844 px), so **do not hide anything behind a menu on Home**: that adds a tap and saves nothing. Instead, regroup:

- **Primary stack:** Continue (when saved) and New game, 44 px, 12 px apart, width `min(100%, 280px)`.
- **Secondary nav** (`<nav aria-label="More">`, already present): Settings, How to play, How your partner plays, Stats and About, all at the same tier. That means 44 px pills with 8 px gaps, wrapped and centred, 24 px below the primary stack. Settings leaves the primary stack, because it is a destination like the others.
- **Landscape** (`max-height: 500px`): two columns. The title and tagline go on the left, the primary stack and the nav on the right. The title shrinks to `clamp(2rem, 12dvh, 3rem)`. Add `overflow-y: auto` and `justify-content: safe center` to `.home` as a safety net, so nothing is ever unreachable (§1.7).
- **Roomy:** buttons at 48 px, a 320 px column, and the title up to 5 rem.

---

## 5. Prioritized changes

Effort: S is under 1 h, M is half a day, and L is a day or more. "Shift risk" is the risk to the no-shift constraint and `layout.spec.ts`. "Test risk" lists E2E or component tests that find elements by role and name and would need to change.

| # | Change | Files and selectors | Effort | Shift risk | Test risk |
|---|---|---|---|---|---|
| 1 | **Reserve the Trump and Tricks slots** in the score bar from the deal (em dash placeholders, `min-width` in `ch`), ending the in-bar jump. Add `.score` to `PARTS`. | `TableScreen.tsx` (score `<dl>`); `styles.css` `.score div`, `.score dd`; `tests/e2e/layout.spec.ts` | S | Removes a shift | Low. `dev.spec` filters `dd` by `/^\d+$/` and `houseRules.spec` reads the first two `dd`s, and both still work if placeholders are "—" and come after Us/Them. `aria-label`s change from absent to "Trump: not named yet", so check `TableScreen.test.tsx`. |
| 2 | **Hint/Last trick as one row-reverse cluster**, Hint outermost: it no longer jumps when play starts. | `styles.css` `.center-corner` (both blocks); markup order in `TableScreen.tsx` stays the same with `row-reverse` | S | Removes a shift; add the Hint box to `layout.spec` | None: names unchanged |
| 3 | **Add the spacing tokens** (§2) and apply them to the table: grid gap, name↔chip 4 px, chip↔backs 8 px, hand gap 6 px, the action bar's 8 px top pad, and **landscape 8 px action-bar↔hand**. | `styles.css` `:root`, `.table`, `.seat-label`, `.seat`, `.hand`, `.hand-card` (width formula uses `--gap-hand`), `.action-bar` height calc, `@media (max-height: 500px)` | M | Static changes only. Every box in `PARTS` changes **once** per viewport and then stays still. Re-run `layout.spec` on all four projects. | None |
| 4 | **Touch targets:** vertical hit-slop on `.button-small`; bid buttons in landscape get upward-only slop; `.alone-toggle` gets `padding-inline: var(--space-2)` and a 44 px box. | `styles.css` `.button-small`, `.button-small::after`, `.bid-panel .button` in landscape, `.alone-toggle` | S | None (pseudo-elements are out of flow) | None |
| 5 | **Dialog hygiene:** `max-height` and `overflow-y: auto` on `.dialog`; fix `.dialog-body .menu-note { margin-top: var(--space-3) }`; `.dialog-actions` margin-top 16 px; Escape to close, focus restore and focus trap in `Dialog`. | `styles.css` `.dialog`, `.menu-note`, `.dialog-actions`; `Dialog.tsx` (needs an optional `onClose` prop) | S–M | None | Low. Add component tests for Escape and focus return. |
| 6 | **Home landscape overflow:** two-column layout under `max-height: 500px`; `overflow-y: auto` and `safe center` everywhere. | `styles.css` `.home`, `.home-title`, `.home-links`; maybe a wrapper `div` in `HomeScreen.tsx` | S–M | None (not the table) | None, unless the `main` landmark changes (keep `aria-label="Home"`) |
| 7 | **Settings and reading pages:** sticky header so Done stays visible; `appearance: none` selects at 44 px with an inline SVG chevron; detail-to-row proximity (row `margin-bottom: 16px`); indent the loner-points row under Loners; groups 16 px apart with 16 px padding; Stats footnote ↔ Reset 16 px. | `styles.css` `.settings-header` (sticky, felt background), `.settings-row select`, `.settings-row`, `.settings-group`, a new `.settings-row-dependent`; `SettingsScreen.tsx` (class on the loner row); `StatsScreen.tsx` spacing | S–M | None | None: labels unchanged. `getByLabel('Game to').selectOption` still works with `appearance: none`. |
| 8 | **Move the dealer disc to the seat's name row** (a 1.35 rem disc after the name), off the cards, which ends its overlap with the hand, the backs and the Go alone label. | `TableScreen.tsx` `SeatLabel` / `DealerButton`; `styles.css` `.dealer-button` (drop absolute positioning) | S–M | Low. The name row's width changes between hands, not during one, and its height is unchanged if the disc is no taller than the monogram. | Low. `getByTitle('Dealer')` is scoped to the seat region in `TableScreen.test.tsx:45` and `game.spec.ts:45`, and the disc stays inside that region. |
| 9 | **Portrait: align the side seats with the trick** (`justify-content: flex-end` plus a bottom pad of half a trick row). | `styles.css` in `@media (max-width: 520px)`: `.seat-left`, `.seat-right` | S | The seat boxes are unchanged; only their content moves, once and statically | None |
| 10 | **Hand summary as a bottom sheet on portrait phones**, over the emptied hand and action bar, so the final trick and the score stay visible; also drop the stray "Lead" label behind a redeal summary. | `styles.css` a new `.dialog-backdrop-sheet` (`align-items: end`) under `max-width: 520px`; `Dialog.tsx` `placement` prop; `HandSummary.tsx`; `TableScreen.tsx` `CenterContents` | S–M | None (overlay) | None: the dialog's name "Hand N" is unchanged |
| 11 | **Roomy tier** for the iPad and desktop: scale the chrome (score, names, chips, prompt, 44 px pills, 48 px buttons), `--side-w: 160px`, `--card-w` up to 128 px / 14dvh, 16 px gutter, 12 px gap. | `styles.css` a new `@media (min-width: 768px) and (min-height: 700px)` block | M | Static per viewport; `layout.spec` on `ipad` and `desktop-chrome` gets new, still-constant boxes | None |
| 12 | **Desktop table width cap** at 1040 px, with `--reach-x: min(38vw, 400px)`. | `styles.css` `.table`; check `.app-dev .table` (the dev panel) still fills its column | S | Static | `dev.spec` layout is unaffected if the cap applies only outside `.app-dev` |
| 13 | **Menu consolidation:** Rules moves from the felt to the menu at all sizes (same accessible name); Sound moves into the menu on portrait phones; menu groups and a two-column landscape grid; "Game to 10" in the score bar at ≥ 521 px. | `GameMenu.tsx` (new props: `rules`, `soundOn`, `onToggleSound`); `GameScreen.tsx`; `RulesChip.tsx` (split it into a dialog plus a menu-item trigger); `TableScreen.tsx` (drop `.center-rules`); `styles.css` `.menu-list` and groups | M–L | Removing a felt control can only reduce risk | **Yes: flag.** `houseRules.spec.ts:62` clicks `button "Rules · to 5"` on the table, so it must open Menu first. `animation.spec.ts:91–98` expects `button "Sound"` on the table, so on the `iphone` project it must open Menu first (or the test asserts on whichever copy is visible). `houseRules.test.tsx:185,225` render `TableScreen` and expect `button "Rules · to 10"`, so they move to a `GameMenu` test. No name is renamed, only relocated. |
| 14 | **Home regrouping:** Settings joins the secondary nav; all secondary items at 44 px. | `HomeScreen.tsx` (move the Settings button into `LINKS`, or render it first inside the `nav`); `styles.css` `.home-links .button` | S | None | Low. `getByRole('button', { name: 'Settings' })` (`houseRules.spec.ts:16`, `resume.spec.ts:95+`) is unchanged; it is still a button with the same name. |

**Suggested order:** 1, 2, 5 and 6 first (each S, and three of them fix real defects: a shift, a shift, and unreachable content). Then 3, 4, 8 and 9 together, as one "table rhythm" change verified by `layout.spec`. Then 7, 10, 11 and 12. Last comes 13, which is the only item that needs E2E edits. Do 14 alongside 6.

**Names to protect.** None of these changes renames the buttons "Menu", "Hint", "Last trick", "Sound", "Settings", "Home", "New game", "Concede", "Continue", "Close" or "Done", the group "Your bid", the region "Your hand", the main landmarks "Euchre table" and "Home", or the dialogs "Hand N" and "Trick N". Item 13 is the only one that **moves** named controls ("Rules · to N", and "Sound" on portrait phones) behind the Menu button.

---

## 6. Before references

All paths are under `uxd/shots/`.

**Table**
- `uxd/shots/iphone-table-round1.png`: portrait round one: corner controls 6 px under the partner, 323 px of empty felt, D over a card.
- `uxd/shots/iphone-table-round2-hint.png`: wrapped hint 5 px above the suit buttons.
- `uxd/shots/iphone-table-play.png`: the score spread and stacked Hint/Last trick; compare with round one for the jump of "Them".
- `uxd/shots/iphone-safari-table-play.png`: the same at 390×664.
- `uxd/shots/iphone-landscape-table-round1.png`: the bid row 2 px above the hand.
- `uxd/shots/iphone-landscape-table-round2-hint.png`: suit buttons on the cards, the D over Go alone.
- `uxd/shots/iphone-landscape-table-play.png`: Hint pushed up by Last trick (compare with round one).
- `uxd/shots/iphone-landscape-safari-table-round2-hint.png`: 750×340, Rules against the prompt.
- `uxd/shots/ipad-table-round2.png` and `uxd/shots/ipad-table-play.png`: the chrome far too small for 118 px cards.
- `uxd/shots/desktop-table-round2-hint.png` and `uxd/shots/desktop-table-play.png`: seats 453 px from the center.

**Dialogs**
- `uxd/shots/iphone-hand-summary.png`: the summary covering the final trick.
- `uxd/shots/iphone-hand-summary-redeal.png`: the stray "Lead" label.
- `uxd/shots/iphone-game-menu.png`: the menu note flush against Concede.
- `uxd/shots/iphone-landscape-safari-game-menu.png`: the menu at 314 of 340 px.
- `uxd/shots/iphone-rules-chip-dialog.png`, `uxd/shots/iphone-last-trick-dialog.png` and `uxd/shots/iphone-landscape-last-trick-dialog.png`: these are fine; for reference.

**Home**
- `uxd/shots/iphone-home-continue.png`: the two-tier secondary links.
- `uxd/shots/iphone-landscape-safari-home-continue.png`: the title clipped and About unreachable.
- `uxd/shots/ipad-home.png`: a small island on a large screen.

**Settings and reading screens**
- `uxd/shots/iphone-settings-top.png`: 27 px selects, ambiguous detail lines.
- `uxd/shots/iphone-settings-1.png`: the house-rules fieldset; the loner-points row not indented.
- `uxd/shots/iphone-settings-2.png`: the end of the page; Done far off-screen.
- `uxd/shots/iphone-landscape-safari-settings-top.png` and `uxd/shots/desktop-settings-top.png`: the same structure at other sizes.
- `uxd/shots/iphone-stats-top.png`: the footnote 2 px from Reset stats.
- `uxd/shots/iphone-rules-top.png`, `uxd/shots/iphone-conventions-top.png` and `uxd/shots/iphone-about-top.png`: reading screens.

Every other screen and size follows the same naming, `<size>-<state>.png`. The sizes are `iphone`, `iphone-safari`, `iphone-landscape`, `iphone-landscape-safari`, `ipad` and `desktop`. The states are `home`, `home-continue`, `settings-top`/`-N`, `rules-top`/`-N`, `conventions-top`/`-N`, `stats-top`, `about-top`, `table-round1`, `table-round1-hint`, `table-round2`, `table-round2-hint`, `table-play`, `table-play-raised`, `last-trick-dialog`, `rules-chip-dialog`, `game-menu`, `hand-summary-redeal` and `hand-summary`.
