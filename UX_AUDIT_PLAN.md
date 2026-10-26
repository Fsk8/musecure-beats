# MuSecure Beats — UX/UI audit and action plan

**Audience that matters most:** hackathon judges seeing the app for the first time, with about 2 minutes. In that time they must understand **what it is**, **how to start**, and **why it's special**.
**Time box:** about 14 working days to the 14 Nov deadline, with a feature freeze about 5 days before. Every item below is marked **Before freeze** or **After**.

**How this was done:** 16 screenshots (desktop 1280 px and phone 390 px, with mocked NEAR data), then four parallel read-only audits (visual and responsive, flows and copy, states, accessibility) — 60 findings in total. Every high-impact finding and every low-confidence one was checked against the code and the screens. 6 were dropped or corrected (see the end of this file) and 3 of mine were added (`me-*`).

---

## 1. Summary — the 5 biggest problems

1. **The page never says what this is.** A judge lands on a wall of synth controls. The headline is just "MuSecure Beats", and the subtitle describes the open beat ("Classic · C minor pentatonic"). The idea — *a beat that becomes an NFT that earns money and battles* — lives only in a long guide that covers the studio. *(flow-1, flow-2, flow-3)*
2. **Nine equal buttons, no path.** "+ New beat", Save, Register, Gallery, Battles, Tree, Earnings and the guide all look the same, so there is no "start here" and no "this is the special part". The showcase features (Gallery, Battles, Tree) sit after utility buttons. *(visual-3, flow-4, flow-15)*
3. **The good parts are squeezed into a 460 px side drawer.** Gallery and battle covers fill the whole panel, so the first card's information sits below the fold. The royalty tree is clipped on the right. Battle results and the verdict need a lot of scrolling. *(me-2, visual-6, visual-7)*
4. **Account and money moments are fragile.** "Activate your account" shows where there is nothing to press. A signed-in user who is still being set up sees an empty Register panel. A second click on Register mints a duplicate. Paying a remix license, supporting and funding happen without a confirmation. *(states-2, -3, -4, -5, -7, -8, flow-7)*
5. **The sequencer is hard to read.** Empty steps are almost invisible (1.25:1 contrast), on a phone the grid is cut off at step 8, and the mixer strips don't line up. *(a11y-1, visual-1, visual-2)*

---

## 2. Quick wins — high impact, small effort (Before freeze, about 1.5 days)

| # | Change | Files | Resolves | Effort | Verify |
|---|---|---|---|---|---|
| Q1 | **Hero strip** above the studio: a tagline ("Make a beat. Mint it on NEAR. It earns when others remix it — and an AI monk judges weekly battles."), three short pillars (*Owns money* · *Pays its remixers' originals* · *Battles judged by AI*), and two buttons: **▶ Play the example** and **Take the 1-minute tour**. It can be dismissed and stays dismissed. | App.jsx, styles.css | flow-1 | S | Screenshot at 1280 and 390: the value is readable without scrolling or opening anything |
| Q2 | **The guide stops auto-opening.** The hero replaces it; the guide opens from the "tour" button. Put a 3-step **"Quick tour"** at the top of the guide (Play → Register → Battle) and keep the 9 sections below as "Details". | Guide.jsx, App.jsx | flow-2 | S | First visit: the studio is visible and the guide opens only on click |
| Q3 | **Re-order the nav into groups with hierarchy.** Studio (Save) · **Showcase** (Gallery, Battles, Royalty tree — accent style) · Account (Register — primary, My earnings) · Help. Move "+ New beat" next to Play. | App.jsx, styles.css | visual-3, flow-4, flow-15 | S | One row at 1280 px; Register and the showcase buttons stand out |
| Q4 | **Make drawer titles match the buttons** ("Gallery", "Battles"). | App.jsx | flow-5 | S | Click each button; the title matches |
| Q5 | **Make empty steps visible:** an inset border on `.cell` (≥ 3:1 against the panel) in both themes, and a stronger playhead. | styles.css | a11y-1, a11y-13 | S | Contrast check, and a screenshot while playing |
| Q6 | **One message per account state** (signed out → *Sign in*; creating → *Setting up your account…*; inactive → **Activate** button; active), shared by Register, Gallery, Battles and Earnings. Handle `creating` and `error` in Register. | new `AccountGate` in a component, RegisterPanel, Gallery, Battles, Earnings | states-4, states-5, states-14, flow-7, me-3 | S–M | Force each status in dev; every panel says the same thing |
| Q7 | **Confirm before money moves:** paying a remix license at register, support, and fund prize (with the amount on the button). Lock the Register form after success with a "Register another" button. Reject a prize amount of 0. | RegisterPanel, Gallery, Battles | states-2, states-3, states-7, states-8 | S | Try each one; a confirm dialog shows the exact amount; a double-click can't mint twice |
| Q8 | **Fix the Royalty tree fit:** scale the SVG to the drawer width (`viewBox` + `width:100%`, with horizontal scroll only past a minimum), and don't draw coins until their animation starts (stray coin at the top-left). | RoyaltyTree.jsx, styles.css | visual-6, me-1 | S | Screenshot: the whole tree is visible; no coin in the corner |
| Q9 | **Label the prize split** ("1st 1.25 Ⓝ · 2nd 0.75 · 3rd 0.5") and show the battle stats in three columns. | Battles.jsx, styles.css | flow-9, visual-7 | S | Battles screenshot |

---

## 3. Phased roadmap

### Phase A — Foundations (Before freeze, about 0.5 day)
| Change | Files | Resolves | Effort | Verify |
|---|---|---|---|---|
| Add tokens `--accent` (the Monk purple), `--money`, `--on-accent` (dark ink in the dark theme), and a 4-step type scale. Replace the literal `#7a3cff`, `#34a87a` and `#fff`-on-accent values. | styles.css | visual-4, visual-9, visual-10, a11y-2, a11y-6 | M | Check contrast of the selected tab, badges and active cells in both themes |
| Button hierarchy classes: `primary`, `accent`, default, `mini`, `link` — used consistently. Move inline styles into classes. | styles.css, Battles, RegisterPanel, MonkPath | visual-3, visual-11 | S | Visual pass on all drawers |

### Phase B — Shared components (Before freeze, about 1 day)
| Change | Files | Resolves | Effort | Verify |
|---|---|---|---|---|
| **Wider "stage" drawer** for showcase panels (Gallery, Battles, Tree: `min(860px, 100%)`) and **compact cards**: cover at 120–160 px beside the info instead of full width. | Drawer.jsx, App.jsx, Gallery.jsx, Battles.jsx, styles.css | me-2, visual-6 | M | Gallery shows 3–4 beats per screen; the verdict is visible without scrolling |
| **Drawer accessibility:** focus the first control, trap Tab while open, restore focus to the button that opened it, and add a "← Back to studio" button on phones. | Drawer.jsx | a11y-3, a11y-5, visual-15 | S | Keyboard test: open → Tab cycles inside → Esc → focus back on the button |
| **AccountGate** (from Q6) and a shared **`useConfirmPay(amount, what)`** helper. | components/AccountGate.jsx, near/ | states-* | S | As in Q6 and Q7 |
| **IPFS fetch timeout** (8 s per gateway, then the next one) with a "trying another gateway…" message. | near/ipfs.js | states-11 | S | Block one gateway in DevTools; the app recovers |

### Phase C — Flow changes (Before freeze, about 1 day)
| Change | Files | Resolves | Effort | Verify |
|---|---|---|---|---|
| **Move The Monk's Path up** (under Transport, collapsed into a one-line progress bar that expands), and collapse Sound and Mixer by default for first-time visitors. | App.jsx, MonkPath.jsx | flow-3 | S | Full-page screenshot: the path is in the first screen |
| **One term for the parent beat** ("original"; "seed" only for the battle seed, explained once), the unit "NEAR" on the first price, a plain-English Battles intro with the trust details in a "How is this fair?" disclosure, and a better Verify-license placeholder. | Battles, Gallery, Guide, MonkPath, RegisterPanel | flow-6, flow-8, flow-10, flow-14 | S | Copy read-through |
| **Phone grid:** 8 steps per page below 640 px, a sticky track-name column, and a joined ◀ ▶ shift control. | TrackEditor.jsx, styles.css | visual-1, visual-5, a11y-11 | M | Screenshot at 390: a full page of steps with labels |
| **Gallery and Earnings resilience:** a real error summary with Retry; "Distribute all" stops on the first failure and confirms the batch; withdraw shows its error and comes back after new earnings; clear `msb-battle-seed` only after a confirmed open. | Gallery, Earnings, AccountBar, Battles, App | states-1, states-9, states-10, states-12 | S | Simulate an RPC failure; run a claim batch |

### Phase D — Polish (After freeze, or if time allows)
| Change | Files | Resolves | Effort |
|---|---|---|---|
| Mixer: placeholder octave row for Drums so the strips align; themed range tracks; bigger M/S/octave buttons | Mixer.jsx, styles.css | visual-2, visual-8, a11y-12 | S |
| Keyboard step grid (roving tabindex and arrow keys); tabs pattern; native radios in the segmented controls; Space on tree nodes plus a focus ring; a keyboard way to reorder bars; screen-reader states for steps and the path | TrackEditor, RegisterPanel, RoyaltyTree, MonkPath | a11y-4, a11y-7, a11y-8, a11y-9, a11y-10, a11y-14, a11y-15 | M |
| Small copy and state fixes: the Master filter "Open" button → "Reset"; the footer "Save project" hint links to the drawer; human error messages; a title tooltip on long names; "Showing latest 24 of N" | Transport, App, Gallery | flow-11, flow-12, flow-13, states-13, states-15 | S |
| Confirm before "Open project" replaces the beat | App.jsx | states-6 | S |

**Suggested order before freeze:** Quick wins → Phase A → Phase B → Phase C, about 4 days. Re-check the affected screens after each phase (the same screenshot script).

---

## 4. Out of scope / needs a decision

- **Should the studio be the landing page at all?** An alternative is a landing view ("hero + featured battle + top beats") with the studio one click away. That would be stronger for judges, but it's a product decision and about 1 extra day.
- **Merge "Register on NEAR" into Save?** ("Save → locally / on NEAR"). Fewer buttons, but it changes a core flow.
- **Light vs dark default.** The Monk, the tree and the share card look best on dark. Should the app default to dark?
- **Should the guide auto-open?** Q2 proposes no (the hero replaces it). Confirm.
- **How much to invest in phones.** Judges most likely use desktop. Phase C's phone grid is "nice to have" if time is short.

---

## 5. Dropped or corrected findings

| ID | Reason |
|---|---|
| visual-12 ("stray 50" in a step) | Not a bug: it's the example beat's 50 % probability readout. Folded into Phase D as "explain probability in the grid legend". |
| visual-13 (Remix enabled while license disabled) | Intended: remixing needs no account until you register. Only the wording part is kept (→ Q6). |
| visual-14 (header wrapping because of the VITE_ message) | The "VITE_PRIVY_APP_ID missing" text is a local-run artifact; production shows a Sign-in button. The phone-header part is covered by Q1 and Q3. |
| a11y-13 (playhead contrast) | Couldn't be confirmed from static screenshots; the token math (1.5:1) holds, so it's kept inside Q5 at low cost. |
| states-14 (location) | Valid, but it is in Earnings.jsx, not "the gallery card". Merged into Q6. |
| flow-1 suggestion "keep the drawer closed on first load" | Adopted as Q2, together with the hero (Q1), so first-time guidance isn't lost. |

**Added during verification:**
- **me-1:** Royalty tree coins render at the SVG origin (a stray coin at the top-left) before their animation begins (screenshot 08).
- **me-2:** In Gallery and Battles, the 400 px cover takes the whole drawer height, so each card's title, price and actions sit below the fold (screenshots 04, 06).
- **me-3:** `NearProvider` never emits the `'activating'` status (it maps to `'creating'`), so the "Activating…" branches in Register and AccountBar never show, and `'creating'` renders an empty Register panel.
