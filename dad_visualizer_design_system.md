# DAD.ai Visualizer Design System (v0.1)
*A brand-forward, DAD architecture visual language with glassmorphism + animated flows.*

## 0) Goals
- **Readable at a glance** (hierarchy + consistent card anatomy).
- **Brand-consistent**: **Icicle blue→green gradients**, white accents, subtle glow.
- **Glassmorphic** UI: translucent surfaces, blurred background, soft borders.
- **Flow-first storytelling**: animated connectors + step labels.

---

## 1) Brand palette (Icicle)
### 1.1 Core tokens (CSS variables)
> Use these as your single source of truth.

- `--bg-0` (canvas): `#070B10`
- `--bg-1` (panel): `#0B1220`
- `--glass` (surface fill): `rgba(255,255,255,0.06)`
- `--glass-strong`: `rgba(255,255,255,0.10)`
- `--stroke` (borders): `rgba(255,255,255,0.14)`
- `--stroke-strong`: `rgba(255,255,255,0.22)`
- `--text-0`: `rgba(255,255,255,0.92)`
- `--text-1`: `rgba(255,255,255,0.72)`
- `--text-2`: `rgba(255,255,255,0.52)`

**Brand gradient (Icicle)**
- `--icicle-a`: `#4FE9FF` (icy cyan)
- `--icicle-b`: `#2FF7C7` (mint)
- `--icicle-c`: `#B8FFF2` (frost highlight)

**Semantic accents (optional)**
- Info: `#4FE9FF`
- Success: `#2FF7C7`
- Warning: `#FFD166`
- Danger: `#FF5C8A`
- Neutral: `rgba(255,255,255,0.35)`

### 1.2 Gradients
- Primary: `linear-gradient(135deg, var(--icicle-a), var(--icicle-b))`
- Glow: `radial-gradient(60% 60% at 50% 0%, rgba(79,233,255,0.20), transparent 60%)`
- Canvas: `radial-gradient(1200px 800px at 20% -10%, rgba(79,233,255,0.18), transparent 60%), radial-gradient(900px 600px at 90% 20%, rgba(47,247,199,0.14), transparent 55%), linear-gradient(180deg, #05070A, var(--bg-0))`

---

## 2) Typography
**Font family**
- UI: `Inter` (fallback: `system-ui, -apple-system, Segoe UI, Roboto`)
- Mono (for IDs/keys): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`

**Type scale**
- `H1`: 44/1.05/700
- `H2`: 28/1.15/650
- `Node Title`: 18/1.2/650
- `Node Meta`: 12/1.3/600
- `Node Body`: 13/1.35/500
- `Chip`: 11/1.2/600

**Rules**
- Titles: **Title Case** for node titles; sentence case for descriptions.
- Keep descriptions to **<= 2 lines**. If longer, truncate with ellipsis.

---

## 3) Layout taxonomy
### 3.1 Canvas
- Dark, low-noise background + faint grid dots.
- Snap-to-grid: 8px.
- Recommended canvas zoom presets: `50% / 75% / 100% / 125%`.

### 3.2 Diagram structure (C4-friendly)
- **Top entry**: Actor/Client → Gateway
- **Core services**: middle band
- **Data stores**: bottom band
- **External systems**: right rail

### 3.3 Spacing & sizing
- Spacing scale: `4, 8, 12, 16, 24, 32, 48`
- Card size guidance:
  - Small (Actor/External): `240×110`
  - Standard (Service): `300×140`
  - Wide (System/Gateway): `340×150`
  - Store (DB/Cache): `320×120` (with cylinder icon)

---

## 4) Card taxonomy (node types)
All cards share the same anatomy; variants change icon, badge, border, and highlight behavior.

### 4.1 Shared anatomy (Card = Node)
**Slots**
1. **Badge/Type chip (top-left)**: `Actor`, `Service`, `Store`, `External`, `Gateway`
2. **Provider icon (right)**: small (24–28px)
3. **Title** (primary)
4. **Description** (secondary)
5. **Meta row** (bottom): `App: React`, `Runtime: EC2`, `Store: Redis`, etc.
6. **Ports** (optional): 4–6 subtle connection dots at edges (for visual clarity)

**Default styling**
- Glass surface: `backdrop-filter: blur(14px)`
- Border: 1px `--stroke`
- Radius: 18px
- Shadow: subtle + ambient glow

### 4.2 Card variants
- **Actor Card**: smaller, minimal meta
- **Service Card**: default, icicle glow on hover
- **Gateway Card**: stronger gradient underline
- **Store Card**: “Store:” meta + storage icon
- **External Card**: optional dashed border

### 4.3 States
- Hover: lift + border brighten + soft glow
- Selected: gradient ring + stronger glow
- Focus: visible outline (not only glow)
- Muted: opacity 0.55

---

## 5) Connector taxonomy (edges)
### 5.1 Edge types
- **Request/Sync**: solid
- **Async/Event**: dashed
- **Streaming**: animated pulse

### 5.2 Edge anatomy
- Line + arrowhead
- Label chip (short verb)
- Optional step pill (1,2,3…)

### 5.3 Labels
- Background: `rgba(10,16,26,0.62)`
- Border: `rgba(255,255,255,0.16)`
- Text: `--text-0`

---

## 6) Flow animation
- Idle: static, low contrast
- Active: animated dash offset + glow
- Step: sequential node highlight

**Dash pattern**: `6 10`  
**Loop**: 1.4–2.2s linear

---

## 7) Tokens (starter)
```css
:root{
  --bg-0:#070B10;
  --bg-1:#0B1220;
  --glass:rgba(255,255,255,.06);
  --glass-strong:rgba(255,255,255,.10);
  --stroke:rgba(255,255,255,.14);
  --stroke-strong:rgba(255,255,255,.22);
  --text-0:rgba(255,255,255,.92);
  --text-1:rgba(255,255,255,.72);
  --text-2:rgba(255,255,255,.52);
  --icicle-a:#4FE9FF;
  --icicle-b:#2FF7C7;
  --icicle-c:#B8FFF2;
}
```
