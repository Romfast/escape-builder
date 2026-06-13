# DESIGN.md — Escape Room Builder: Campania Multi-Stil

Contract de design pentru PR1 (Etapa 1 + Tooling). Aprobat la design review 2026-06-12 (scor 6/10 → 9/10).
Integratorul consultă acest fișier ca sursă unică de adevăr pentru toate deciziile vizuale și de interacțiune.

---

## 1. Tokens de design

Orchestratorul declară o dată în `:root` al `gameCampaign`. **Toate suprafețele de campanie consumă DOAR aceste variabile** — nu hardcodezi culori în coridor sau diplomă.

```css
:root {
  --c-bg:      #0d0620;              /* fundal global campanie */
  --c-surface: #221440;              /* carduri, panouri */
  --c-accent:  <cfg.color>;          /* accentul creatorului — suprascris la runtime */
  --c-gold:    #fbbf24;              /* stele, crescendo, reward */
  --c-line:    rgba(255,255,255,.18);/* borduri subtile */
  --c-ink:     #fff;                 /* text principal */
}
```

**Note intenționate (nu se „repară"):**
- Violetul default (`#6d28d9`) și `system-ui` sunt deliberate — accentul aparține creatorului via `cfg.color`; webfonturile sunt imposibile pe `file://`.
- `@media print` suprascrie tokens pentru diplomă (fundal alb, borduri `--c-accent`).

---

## 2. Intro — Scenă-poster (§Design pct. 1)

**Structură (de sus în jos):**
1. Titlul jocului — cel mai mare element (`font-size: clamp(28px,6vw,48px)`, `font-weight: 900`)
2. „Salut, {nume}!" + povestea — secundar, `max-width: 60ch`, `color: rgba(255,255,255,.8)`
3. Promisiunea: „{N} camere · {S} stiluri · 1 cuvânt magic" — `font-size: 13px`, `color: rgba(255,255,255,.5)`
4. UN singur buton „Începe aventura" — full-width, `background: var(--c-accent)`

**Reguli:**
- Intro necronometrat (timer-ul din E2 pornește la click „Începe aventura").
- Fundalul folosește `--c-bg`; limbajul cardului final existent (fundal închis, accent creator).
- Povestea întreagă se spune O singură dată, aici. Camerele individuale NU repetă povestea.

---

## 3. Coridor — Ierarhie vizuală (§Design pct. 2 + mockup B aprobat)

```
┌──────────────────────────────────────┐
│  CHROME (48px / 40px mobil)          │  ← unica sursă de progres global
│  ● ● ● ● ●  (puncte camere)  0:00   │
├──────────────────────────────────────┤
│                                      │
│  ┌─────────────┐  litera câștigată   │  ← strip compact: recompensa camerei
│  │  ★★★ + L    │  stele camerei      │
│  └─────────────┘                     │
│                                      │
│         ╔═══════════╗                │  ← ușa DOMINĂ ecranul (estetica stilului următor)
│         ║   UȘADOOR ║                │    min-height: 40% din viewport
│         ╚═══════════╝                │
│                                      │
│  ┌──────────────────────────────┐    │  ← buton full-width, activ IMEDIAT
│  │      Deschide ușa  →         │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

**Reguli:**
- Strip-ul (litera + stele) = **doar recompensa camerei curente**.
- Ușa este elementul erou — nu pune text lung lângă ea.
- Butonul „Deschide ușa" este activ **imediat** la montarea coridorului. Copilul deține ritmul.
- Butonul se dezactivează după primul click (idempotență, §T4).

---

## 4. Progres — Un singur owner (§Design pct. 3)

**Bara chrome = UNICA sursă de progres global.**

```
● ● ● ◉ ○   (puncte: parcurse=--c-gold, curentă=--c-accent, viitoare=stinse)
aria-label="Camera 3 din 5"
```

- Motoarele individuale **nu randează** progres de campanie (nu arată numărul camerei sau câte mai sunt).
- Strip-ul coridorului arată **doar** recompensa camerei (litera + stele). Nu total.
- `aria-label` obligatoriu pe containerul cu puncte (§A11y pct. 13).

---

## 5. Tranziția = Ușa (§Design pct. 4)

**Flow la click „Deschide ușa":**

```
click buton
  → ușa primește .opening → animație scale+fade ~250ms (transform-origin: left center)
  → coridorul rămâne pe ecran până la roomReady
  → [>1.5s fără roomReady] → puncte de încărcare discrete PE ușă (nu modal separat)
  → [4s fără roomReady] → skip automat (→ §5 Skip in-fiction)
  → roomReady primit → fade-in camera ~200ms (zero flash)
```

**CSS animație deschidere (din `scratch/doors.html`):**
```css
@keyframes door-open {
  0%   { transform: scale(1) rotateY(0deg);    opacity: 1; }
  50%  { transform: scale(1.06) rotateY(-30deg); opacity: .8; }
  100% { transform: scale(.85) rotateY(-90deg);  opacity: 0; }
}
.door-STIL.opening {
  animation: door-open .25s cubic-bezier(.4,0,1,1) forwards;
  transform-origin: left center; perspective: 600px;
}
```

**`prefers-reduced-motion`:** `.opening { animation: none; opacity: 0; }` — stările finale apar direct.

---

## 6. Skip In-Fiction — Ușa Înțepenită (§Design pct. 5)

**Camera moartă = aceeași compoziție de coridor cu ușa înțepenită.**

Aceeași structură ca §3, dar:
- Ușa primește clasa `.stuck` (grayscale + brightness 0.6) + badge `.door-lock` (🔒)
- Titlu: **„Ușa asta e înțepenită!"** (nu „Eroare" sau text tehnic)
- Buton primar: **„Sari la camera următoare"**
- Cod tehnic (stil·idx) — monospace mic, `color: rgba(255,255,255,.3)` — jos, fotografiabil

```html
<!-- Structura stuck state -->
<div class="corridor-stuck">
  <div class="door-STIL stuck">
    <span class="door-lock">🔒</span>
  </div>
  <h2>Ușa asta e înțepenită!</h2>
  <button class="btn-primary">Sari la camera următoare</button>
  <code class="err-code">terminal·2</code>  <!-- stil·idx -->
</div>
```

**`roomError` post-ready** → același ecran (același handler, aceeași UI).
**Pe final/diplomă** → camera sărită = ușă înțepenită + 0 stele + dală goală (fără literă).

---

## 7. Ritm + Crescendo (§Design pct. 6)

- **Buget total animație per coridor: < 1s** (paralel, nu serial)
- **Butonul activ IMEDIAT** — copilul nu așteaptă animații
- **Ultimul coridor** = crescendo:
  - Ușa finală mai mare (`.crescendo` class — scale 1.2 + glow per stil)
  - Text suplimentar: **„Ultima cameră!"** (`font-weight: 700`, `color: var(--c-gold)`)
  - Buton: „Deschide ultima ușă" (nu just „Deschide ușa")

---

## 8. Cele 5 Uși — Spec CSS/SVG (§Design pct. 7)

**Fișier de referință:** `scratch/doors.html` — vizualizare live cu toate stările.
**3 stări per ușă:** `.normal` (implicit) / `.stuck` (grayscale+lacăt) / `.crescendo` (scale+glow).

### Door 1 — Classic
```
Ușă-card albă · colțuri rotunjite (border-radius: 10px) · „?" auriu centrat
Crescendo: chenar auriu (box-shadow: 0 0 0 3px var(--c-gold))
```

### Door 2 — Terminal
```
Dreptunghi negru · ramă verde fosforescent (border: 2px solid #39ff6e, glow 14px)
Cursor _ clipind (animation: dt-blink 1s step-end infinite)
Scanlines (::before, repeating-linear-gradient)
Stuck: border-color: #444, cursor animation: none
Crescendo: double-ring + glow intensificat
```

### Door 3 — Arcade
```
Pixel-art chunky: border: 4px solid #4ade80 + box-shadow: inset 0 0 0 4px #166534, 0 0 0 4px #0a1606
Mâner galben pătrat (::after, 10×10px, no border-radius)
image-rendering: pixelated
Crescendo: outer ring #4ade80 + glow verde
```

### Door 4 — Chat
```
Siluetă telefon: gradient albastru (#1d4ed8→#1e3a8a), border-radius: 12px
Screen dark cu bule de mesaj (NPC: #1e40af stânga, player: #3b82f6 dreapta)
Home bar (22px, rgba(255,255,255,.3))
Crescendo: box-shadow: 0 0 0 2px #3b82f6 + glow albastru
```

### Door 5 — Point
```
SVG: ușă de scenă din lemn (#7c4f2c), 2 panouri superioare (rgba(0,0,0,.22))
Clanță rotundă (#f3cf6d), lupă (cerc + linie diagonală, stroke: #f3cf6d, width 3)
Crescendo: filter drop-shadow(0 0 12px rgba(243,207,109,.6))
```

---

## 9. Final ≠ Diplomă (§Design pct. 8)

**Ecranul final celebrează DOAR.** Nu afișează diploma.

```
Evadare reușită!
★★★★★  (stele totale)
[D] [A] [N] [C] [E]  ← cuvântul magic, literă-cu-literă, 0.18s delay
Mesajul creatorului
[Joacă din nou]  [Vezi diploma →]  ← buton secundar „Vezi diploma" (Etapa 2)
```

**Camera sărită** = dală goală cu 🔒 (fără literă, fără animație flip).

---

## 10. Diplomă — Certificat A4 Print-First (§Design pct. 9 — Etapa 2 / PR2)

> **LIVRAT** (2026-06-13). Overlay `#diploma`; buton „Vezi diploma →" pe finale + „Joacă din nou".
> `buildDiploma()` citește `roomStars`/`collected`/`skipped`/`MASTER`/`_timerExpired`. Câmp builder nou
> `creator` („Creat de"). `@media print` izolează `#diploma` (rest `visibility:hidden`). Test smoke
> „diploma" (nume/titlu/stele-per-cameră/cuvânt/creator/înapoi). Camere sărite = 🔒 (verificat vizual).

- **Format:** A4 portret, fundal ALB, chenar dublu `var(--c-accent)`
- **Titlu:** „DIPLOMĂ DE EVADARE" — **singurul** element cu font serif (limbajul certificatelor)
- **Ierarhie:** Numele copilului = cel mai mare element pe pagină
- **Rând de stele per cameră** — camerele sărite = 🔒
- **Cuvântul magic** în dăle, aceeași iconografie ca finalul
- **Footer:** dată + „creat de {creator}" + marcaj discret „timpul a expirat" (dacă e cazul)
- **`@media print`:** doar diploma, `margin: 20mm`, `print-color-adjust: exact` pe accente, `background: white`

---

## 11. Timer Calm (§Design pct. 10 — Etapa 2 / PR2)

> **LIVRAT** (2026-06-13). Opt-in din builder (câmp „Timp limită (minute)", default 0 = fără).
> Implementare: `#chrome-timer` în bara chrome; `startTimer/tickTimer/stopTimer`; deadline absolut
> în `sessionStorage` (`_DEADLINE_KEY`). Sub 1 min → `.low` (auriu); expirat → `.expired` (auriu, opac).
> Test smoke „timer calm" (format, gold, freeze, resume păstrează ceasul).

- Pornește **exact** la click „Începe aventura" (intro necronometrat)
- Afișat în chrome: `M:SS`, neutru (`color: var(--c-ink)`)
- **Sub 1 minut** → devine auriu (`color: var(--c-gold)`) — NU roșu pulsant (public copii)
- La **expirare** → îngheață pe `0:00` + marcaj text discret; jocul curge nestingherit (zero penalizare, stelele rămân)
- **Deadline absolut** în `sessionStorage` — resume-ul nu resetează ceasul

---

## 12. Buget Vertical Mobil (§Design pct. 11)

```
Chrome:   48px desktop  /  40px la max-width: 600px  (doar puncte + timer, fără etichete)
Camerele: height = calc(100dvh - <chrome-height>)   (dvh pentru mobile address bar)
Arcade:   max-height pe canvas → scalare automată să încapă în viewport
```

**Assert obligatoriu în `tests/smoke.mjs`:**
```js
// La viewport 320×568, niciun element nu depășește documentElement.scrollWidth
assert(document.documentElement.scrollWidth <= 320, 'overflow orizontal 320px')
```

**Reguli:**
- ZERO scroll orizontal la 320×568 (iPhone SE)
- Fără `overflow-x: auto` pe coridor sau cameră — rezolvă problema, nu o ascunde

---

## 13. Mod Cameră — Regulă Funcțională (§Design pct. 12 — închide D14)

**În campanie, fiecare motor ascunde:** (a) titlul jocului, (b) progresul global propriu, (c) restart-ul propriu.
**Părintele deține** toate acestea (bara chrome). Motoarele **păstrează** HUD-ul de gameplay și identitatea stilului.

| Motor    | Ascunde (în campanie)           | Păstrează                        |
|----------|---------------------------------|----------------------------------|
| Classic  | `h1` + bara de progres + contor | Întrebări, stele per puzzle      |
| Terminal | Titlul mare (linia banner)      | Antetul de 1 linie, comenzi      |
| Arcade   | `h1`                            | HUD chei/stele cameră, canvas    |
| Chat     | Subtitlul jocului               | Header-ul personajului, bule     |
| Point    | `h1`                            | Hint-ul de scenă, obiectele SVG  |

**Implementare:** când `CFG._campaign` există, motorul adaugă clasa `.campaign-mode` pe `body`.
CSS: `.campaign-mode h1, .campaign-mode .game-progress { display: none; }` (specific per motor).

---

## 14. A11y Baseline — Suprafețe Noi (§Design pct. 13)

Aplicabil pe toate suprafețele adăugate în PR1 (coridor, chrome, intro, skip, final).
**Nu este audit al motoarelor existente** — acela e în `TODOS.md`.

| Criteriu | Specificație |
|----------|-------------|
| Ținte tap | Minim 44×44px (buton „Deschide ușa", puncte chrome, buton skip) |
| Contrast text | `rgba(255,255,255,.7)` pe `--c-bg` ≥ 4.5:1 — text secundar |
| Focus | Buton „Deschide ușa" focusabil + activabil cu Enter |
| ARIA | `aria-label="Camera X din Y"` pe containerul punctelor de progres |
| Motion | `@media (prefers-reduced-motion: reduce)` dezactivează: confetti, flipin, animația ușii — stările finale apar direct |

---

## 15. Tabel Stări per Suprafață

| Suprafață | Loading | Empty | Error | Success | Partial |
|-----------|---------|-------|-------|---------|---------|
| Coridor → cameră | ușa .opening; puncte pe ușă >1.5s | — | ușă .stuck + skip (§6) | fade-in cameră 200ms | — |
| Builder (campanie) | — | 0 puzzle: mesaj ghidant, export blocat | stil invalid: avertisment + rotație | preview rulează | — |
| Resume | — | — | hash invalid → restart silențios de la intro | coridorul camerei curente | refresh mid-campanie → coridor |
| Final | — | — | camere sărite: 🔒 + dală goală | stele + cuvânt + confetti | cuvânt cu dăle-lacăt |
| Skip camera | — | — | roomError (oricând) → ecran stuck | — | 0 stele, fără literă, cod eroare |

---

## 16. Storyboard Emoțional

| Pas | Copilul | Simte | Susținut de |
|-----|---------|-------|-------------|
| Intro | vede titlul + promisiunea | curiozitate | §2 (poster) |
| Camera 1 | joacă primul stil | concentrare | §12 (mod cameră discret), chrome neutru |
| Coridor 1 | primește litera, vede ușa nouă | mândrie + anticipare | §3, §5, §8 |
| Camerele 2..N-1 | stil nou de fiecare dată | varietate, „ce urmează?" | rotație + ritual <1s (§7) |
| Ultimul coridor | ușa mai mare, „Ultima cameră!" | crescendo | §7 (crescendo) |
| Final | cuvântul magic se dezvăluie | triumf | §9 (final celebrare pură) |
| Diplomă (E2) | o printează cu părintele | mândrie fizică | §10 (A4 print-first) |

---

## 17. NOT in Scope (cu motiv)

| Funcție | Motiv excludere |
|---------|-----------------|
| Audit a11y motoare existente | Post-PR1, sub harness Playwright — în `TODOS.md` |
| Timer implementare | PR2/Etapa 2 (T10) |
| Diplomă implementare | PR2/Etapa 2 (T10) |
| Auto-advance la coridor | Respins (6C): agenția copilului primează la momentul-recompensă |
| Overlay tehnic de skip | Respins (5B): eșecul rămâne în ficțiune (ușă înțepenită) |
| Diploma pe ecranul final | Respins (3B): one job per section |

---

## 18. Fișiere de Referință

| Artefact | Locație | Conținut |
|----------|---------|---------|
| Uși (cod) | `scratch/doors.html` | 5 uși CSS/SVG × 3 stări, animație deschidere, tokens |
| Mockup aprobat | `~/.gstack/projects/romfast-escape-builder/designs/coridor-campanie-20260612/` | wireframes.html, coridor-3-variante.png (varianta B), approved.json |
| Plan complet | `~/.claude/plans/home-claude-claude-plans-propune-alte-u-replicated-papert.md` | §Design, task-uri, review reports |
