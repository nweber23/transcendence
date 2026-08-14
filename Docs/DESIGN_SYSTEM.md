# ft_casino Design System

**Source of truth:** [`Frontend/tailwind.config.ts`](../Frontend/tailwind.config.ts) and [`Frontend/src/styles/globals.css`](../Frontend/src/styles/globals.css) define every token below as CSS custom properties / Tailwind theme values. This document describes what already exists in code — nothing here is aspirational or unimplemented.

## Philosophy

ft_casino is a dark, felt-and-gold casino floor rendered as a web UI: low-glare surfaces, a single warm accent (gold) reserved for calls to action and emphasis, and motion that mimics a dealer's hands — cards deal in, chips pop, banners settle — rather than generic UI easing. Every screen shares the same four surface tones, the same two typefaces, and the same interaction timing so that Blackjack, Poker, and account screens read as one product.

---

## Color palette

Defined as CSS variables in `globals.css:6-27`, exposed to Tailwind via `tailwind.config.ts`. All values are dark-mode-only by design (the product does not ship a light theme).

| Token | Hex | Tailwind class | Role |
|---|---|---|---|
| `--base` | `#0f1419` | `bg-base` | App background — the felt |
| `--surface` | `#131c24` | `bg-surface` | Card / panel body |
| `--surface-2` | `#192430` | `bg-surface-2` | Raised panel (dropdowns, modals) |
| `--surface-3` | `#1e2d3c` | `bg-surface-3` | Highest elevation (active table seat, hover fill) |
| `--gold` | `#d4af37` | `bg-gold` / `text-gold` | Primary accent — CTAs, focus rings, active nav, chip highlight |
| `--emerald` | `#2d7a63` | `bg-emerald` | Positive / win state, secondary accent (table felt hints) |
| `--red` | `#8b2635` | `bg-red` | Negative / loss / destructive state |
| `--text` | `#e8e0cc` | `text-text` | Primary text (warm off-white, not pure white) |
| `--text-2` | `#a2b0bc` | `text-text-2` | Secondary text |
| `--text-3` | `#56687a` | `text-text-3` | Tertiary / disabled text |
| `--border` | `#1e2e3c` | `border-border` | Default hairline |
| `--border-2` | `#253340` | `border-border-2` | Emphasized hairline (input focus, active card) |

**Rule:** gold is the only saturated accent used for interactive emphasis. Emerald and red are reserved for game-outcome semantics (win/loss, chip stacks), never for generic UI state — that keeps the accent from competing with itself.

---

## Typography

Declared in `tailwind.config.ts:29-32` (`fontFamily`) and `:33-41` (`fontSize`).

| Role | Family | Fallback stack |
|---|---|---|
| Display / headings | **Playfair Display** | `Georgia, serif` |
| Body / UI | **Plus Jakarta Sans** | `system-ui, -apple-system, sans-serif` |

Playfair carries the brand voice — used sparingly for the wordmark, page titles, and hero numerals (chip values, pot totals) — everything else, including all interactive controls, is set in Plus Jakarta Sans for legibility at small sizes.

**Type scale** (`tailwind.config.ts:33-41`):

| Class | Size | Line height | Typical use |
|---|---|---|---|
| `text-xs` | 0.6875rem (11px) | 1.15 | Eyebrows, badges, timestamps |
| `text-sm` | 0.875rem (14px) | 1.65 | Secondary body text, form hints |
| `text-base` | 1rem (16px) | 1.65 | Default body |
| `text-lg` | 1.0625rem (17px) | 1.72 | Emphasized body / lead paragraphs |
| `text-xl` | 1.25rem (20px) | 1.25 | Card titles, section headers |
| `text-2xl` | 1.625rem (26px) | 1.15 | Page titles |

The `.eyebrow` utility (`globals.css:75-77`) standardizes the small-caps label pattern (`text-xs`, uppercase, `0.14em` tracking, gold) used above every section heading site-wide.

---

## Spacing, radius, elevation, motion

| Token | Value | Source |
|---|---|---|
| Default radius | `var(--radius)` | `tailwind.config.ts:44` |
| Large radius | `var(--radius-lg)` | `tailwind.config.ts:45` |
| Card outer radius | `2rem` | `Card.tsx` |
| Shadow `md` | `0 4px 12px rgba(0,0,0,.15)` | `tailwind.config.ts:20-23` |
| Shadow `lg` | `0 8px 24px rgba(0,0,0,.2)` | `tailwind.config.ts:20-23` |
| Ease (standard) | `cubic-bezier(0.23, 1, 0.32, 1)` — `--ease-out` | `globals.css:25` |
| Ease (in-out) | `cubic-bezier(0.77, 0, 0.175, 1)` — `--ease-in-out` | `globals.css:26` |
| Interaction timing | 150–200ms micro-transitions, 350–420ms entrance animations (card deal, modal scale-in), 500ms+ ambient drift | `globals.css:101-567` |

All motion respects `prefers-reduced-motion: reduce` — durations collapse to `0.01ms` and transform-based effects are stripped while color/opacity feedback is preserved (`globals.css:38-54`, `559-566`).

---

## Iconography

`Frontend/src/components/icons/GameIcons.tsx` — a set of hand-built SVG icons for the three games, sharing a single `GameIconProps` interface (`size`, `className`, `strokeWidth`) so they drop in anywhere at any scale without raster artifacts:

- `BlackjackIcon`
- `PokerIcon`
- `SlotsIcon`

The brand mark (`Logo.tsx`) is likewise a hand-authored SVG — a four-tone gold diamond tuned for the dark surface, sized via a single `size` prop — paired with the Playfair wordmark "FT_CASINO" in the header.

---

## Component library

11 components in `Frontend/src/components/ui/` form the base kit; feature areas (`components/layout/`, `components/games/`) build on top of them using the same tokens. All accept a `className` escape hatch and forward refs where interactive.

| Component | Path | Purpose | Variants / key props |
|---|---|---|---|
| **Button** | `ui/Button.tsx` | Primary interactive control | `variant`: gold · outline · ghost · nav-ghost · nav-primary — `size`: sm · md · lg |
| **Card** | `ui/Card.tsx` | Elevated content container (double-shell: outer border frame + inner surface) | `hoverable` toggles lift/glow on hover |
| **Modal** | `ui/Modal.tsx` | Dialog overlay, native `@starting-style` scale-in transition | `size`: sm · md · lg — `closeButton` |
| **Avatar** | `ui/Avatar.tsx` | User avatar with upload/loading state and default-image fallback | `size` (px), `isUploading` |
| **Toast** / **ToastContainer** | `ui/Toast.tsx`, `ui/ToastContainer.tsx` | Transient notification stack, ARIA `role="alert"` region | `type`, `duration`, optional `head`/`imageUrl` |
| **Spinner** | `ui/Spinner.tsx` | Loading indicator | `size`: sm · md · lg — `variant`: default · minimal |
| **Logo** | `ui/Logo.tsx` | Brand mark SVG | `size` |
| **GlassSurface** | `ui/GlassSurface.tsx` | Frosted/glass panel effect (backdrop blur + displacement) | `width`, `height`, `borderRadius`, `blur`, `brightness`, `opacity` |
| **Beams** | `ui/Beams.tsx` | Ambient WebGL light-beam background | `beamNumber`, `lightColor`, `speed`, `noiseIntensity` |
| **CasinoBackground** | `ui/CasinoBackground.tsx` | Ambient radial-glow backdrop layer used behind hero/landing content | — |
| **PlayingCard**, **Chip** | `games/PlayingCard.tsx`, `games/Chip.tsx` | Card and chip primitives shared by Blackjack, Poker, and Slots tables | rank/suit props, chip denomination |

Feature-level composites reusing the above (not double-counted toward the 10-component minimum, but evidence the system scales): `layout/Header.tsx`, `layout/Footer.tsx`, `layout/ProfileDropdown.tsx`, `layout/FriendsDropdown.tsx`, `layout/NotificationsDropdown.tsx`, `games/GameTopBar.tsx`, `games/GameInfoModal.tsx`, `games/BlackjackRulesModal.tsx`, `games/PokerRulesModal.tsx`, `games/SlotPaytableModal.tsx`.

---

## Accessibility notes

- Focus rings use `focus-visible:outline-2 outline-[var(--gold)]` consistently across interactive components (`Button.tsx`) — never suppressed.
- `prefers-reduced-motion` is honored globally (`globals.css:38-54`) and specifically for the hero card/chip loop (`globals.css:559-566`).
- Toasts are exposed via `role="alert"`; the toast region via `role="region" aria-label="Notifications"` (`ToastContainer.tsx`).

---

## Maintenance

When adding a new color, font size, radius, or shadow: add the token to `tailwind.config.ts` / `globals.css` first, then to the tables above in the same change — this file must stay a description of shipped tokens, not a separate spec that can drift from the code.
