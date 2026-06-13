# STYLES.md — Direcție Restyle: Cele 5 Stiluri Individuale

Document de direcție vizuală pentru integratorul S3.
Citeste AGENTS.md + DESIGN.md înainte de orice editare.
Nu propune fonturi externe, CDN sau imagini remote — zero dependențe, merge de pe `file://`.

---

## Principii transversale

Toate stilurile partajează:
- Paleta campaniei (`--c-bg: #0d0620`, `--c-surface: #221440`, `--c-gold: #fbbf24`) ca reper;
  fiecare stil poate adăuga propriul vocabular local **fără** a-l suprascrie pe cel al campaniei.
- `--accent` vine din `cfg.color` (creator) — nu-l hardcoda.
- `font-family: system-ui, -apple-system, "Segoe UI", sans-serif` pentru jocuri narativ/UI;
  `ui-monospace, "Courier New", monospace` pentru terminal/arcade. **Fără webfonturi.**
- Toate butoanele interactive: `min-height: 44px`, `min-width: 44px`.
- `@media (prefers-reduced-motion: reduce)` dezactivează orice animație (stări finale apar direct).
- Focus vizibil: `outline: 2px solid var(--accent); outline-offset: 2px;` pe toate elementele focusabile.

---

## Ordinea de impact/efort (quick wins pentru integrator)

| Rang | Schimbare | Stiluri afectate | Efort |
|------|-----------|------------------|-------|
| 1 | Terminal: contrast `.line.dim` (#1f9c4a → #2ecc71) — cel mai critic eșec a11y | terminal | XS |
| 2 | Classic: gradient de fundal mai profund + card cu `backdrop-filter: blur` mai pronunțat | classic | S |
| 3 | Chat: header cu `blur` frosted-glass + bule cu shadow moale | chat | S |
| 4 | Arcade: tile-uri HUD mai mari (44px min-height) + canvas border neon | arcade | M |
| 5 | Point: SVG scenă cu paletă de culori mai saturată + room ambient gradient | point | M |

---

## 1. Classic — Quiz Cald

### 1.1 Stare actuală

**Paletă:**
- Fundal: `linear-gradient(160deg, #14092e 0%, #2a1257 55%, #14092e 100%)` — violet închis monoton.
- Card: `rgba(255,255,255,.07)` — aproape invizibil, fără personalitate.
- Accent: `var(--accent)` (creator) — funcționează.
- Feedback bun: `#86efac` (verde deschis); feedback rău: `#fda4af` (roz).

**Tipografie:** `system-ui` — neutru, nicio ierarhie vizuală marcată.

**Layout:** Card centrat 560px max-width, simplu, fără zonă vizuală distinctă pentru puzzle vs. scor.

**Slăbiciuni vizuale:**
- Cardul se pierde în fundal — nu există separare clară între suprafețe.
- Progres bar (`height: 7px`) — prea subțire, greu de văzut pe mobil.
- Tile-urile de litere (34×40px) sunt sub 44px tap target pe lățime.
- Animația `pop` (scale+fade) e mecanică, nu caldă.
- Nu există element vizual „wow" — arată ca un quiz generic.

### 1.2 Direcție restyle — Quiz Cald (tip „game show pentru copii")

**Aspirație:** energia caldă a unui quiz-show de seară — fundal violet-auriu, cardul luminat ca o vitraliu, progresul celebrator, tipografia hierachizată.

**Referințe de gen:** Kahoot (energie), Who Wants to Be a Millionaire (ritm dramatic), jocuri de societate cu culori saturate.

### 1.3 Tokens propuși

```css
/* Classic — tokens locali (nu suprascriu campania) */
:root {
  --cl-bg1:      #0e0622;   /* fundal sus */
  --cl-bg2:      #1e0d4a;   /* fundal centru */
  --cl-bg3:      #0e0622;   /* fundal jos */
  --cl-card:     #1a0e3d;   /* suprafața cardului */
  --cl-card-brd: rgba(255,255,255,.18);
  --cl-card-glow:rgba(109,40,217,.35); /* glow accent moale */
  --cl-ink:      #f1f0ff;   /* text principal */
  --cl-muted:    rgba(255,255,255,.55);
  --cl-ok:       #86efac;   /* feedback corect */
  --cl-bad:      #fda4af;   /* feedback greșit */
  --cl-gold:     #fbbf24;   /* stele, recompensă */
  --cl-progress: var(--accent);
}
```

**Fundal:** `radial-gradient(ellipse at 50% 30%, #2a0e5e 0%, #0e0622 70%)` — profunzime mai mare, senzație de spotlight.

**Card:**
```css
.card {
  background: var(--cl-card);
  border: 1px solid var(--cl-card-brd);
  border-radius: 20px;
  box-shadow: 0 0 0 1px rgba(255,255,255,.06), 0 24px 60px rgba(0,0,0,.55), 0 0 40px var(--cl-card-glow);
}
```

**Progres bar:** `height: 10px`, `border-radius: 99px`, fundal `rgba(255,255,255,.12)`, fill cu `var(--accent)` + `box-shadow: 0 0 8px var(--accent)`.

**Tile-uri litere:**
```css
.tile {
  width: 44px;   /* de la 34px — atinge 44px tap target */
  height: 48px;
  border-radius: 10px;
  font-size: 20px;
}
.tile.won {
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
  animation: flip .5s cubic-bezier(.34,1.56,.64,1); /* bouncy flip */
}
```

**Butoane opțiuni (multiple choice):**
```css
button.opt {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 12px;
  padding: 14px 16px;
  text-align: left;
  transition: background .15s, border-color .15s;
  min-height: 48px;
}
button.opt:hover {
  background: rgba(255,255,255,.16);
  border-color: var(--accent);
}
```

**Titlu puzzle (`qtitle`):** `color: var(--accent)` + `letter-spacing: .1em` + `font-size: 11px` uppercase — mai discret, nu concurează cu întrebarea.

**Întrebare (`question`):** `font-size: 21px`, `line-height: 1.5`, `color: var(--cl-ink)`.

### 1.4 Micro-interacțiuni & motion

- `@keyframes flip` — înlocuiește flip-ul liniar cu `cubic-bezier(.34,1.56,.64,1)` (bouncy spring) pentru tile-uri câștigate.
- `@keyframes pop` — mai caldă: `from { transform: scale(.94) translateY(6px); opacity: 0; }` + `cubic-bezier(.22,1,.36,1)`.
- Progres bar: `transition: width .5s cubic-bezier(.22,1,.36,1)` — fill fluent.
- `@keyframes shake` — rămâne ca e, adaugă `color: var(--cl-bad)` pe input pe 400ms apoi reset.
- `@media (prefers-reduced-motion: reduce)`: toate `animation: none; transition: none;`.

### 1.5 Constrângeri — ce NU se schimbă

- Structura HTML: `#sStart`, `#sGame`, `#sFinal` — aceleași ID-uri (testate în smoke.mjs).
- `CFG`, `var accent`, logica `check()`, `lettersBar()`, `confetti()` — neatinsă.
- Sentinela `__CFG__` și backslash dublu în template literal.
- Variabilele `--accent`, `--accent-light` setate din JS — nu le suprascrie cu valori fixe.
- Clasa `.campaign-mode` trebuie să ascundă `h1` și `.progress` (§13 DESIGN.md).

### 1.6 Checklist a11y

- [ ] Tile-uri: min 44×44px (propus 44×48px — OK).
- [ ] Contrast text principal `#f1f0ff` pe `#1a0e3d`: ~13:1 — OK.
- [ ] Contrast muted `rgba(255,255,255,.55)` pe `#1a0e3d`: ~5.8:1 — OK (≥4.5:1).
- [ ] Contrast `.cl-ok` (`#86efac`) pe `#1a0e3d`: ~8.2:1 — OK.
- [ ] Contrast `.cl-bad` (`#fda4af`) pe `#1a0e3d`: ~6.1:1 — OK.
- [ ] Focus: `outline: 2px solid var(--accent); outline-offset: 2px;` pe toate elementele interactve.
- [ ] Buton „Verifică" și „Incepe aventura": min-height 44px.

---

## 2. Terminal — CRT Phosphor

### 2.1 Stare actuală

**Paletă:**
- Fundal: `#04130a` — verde-negru, corect pentru CRT.
- Text principal: `#39ff6e` — verde neon, OK.
- Text dim (`line.dim`): `#1f9c4a` — **EȘEC CONTRAST**: raport față de `#04130a` este ~3.1:1, sub minimul 4.5:1.
- Avertizare (`.warn`): `#ffd24a` pe `#04130a` — ~9.2:1, OK.
- Eroare (`.bad`): `#ff6b6b` pe `#04130a` — ~5.4:1, OK.
- OK (`.ok`): `#9dffc0` pe `#04130a` — ~14.6:1, excelent.

**Tipografie:** `"Courier New", ui-monospace` — corect pentru gen.

**Efecte vizuale:** scanlines (`repeating-linear-gradient`) + vignetă radială — bune, autentice.

**Slăbiciuni vizuale:**
- `.line.dim` (#1f9c4a) nu atinge contrast 4.5:1 — cel mai urgent fix a11y din tot proiectul.
- Linia de comandă `>` nu are un cursor animat (doar caret CSS nativ) — pierde din personalitate.
- Niciun efect de „pornire" (boot sequence) pentru prima dată.
- Lățimea maximă a containerului (`max-width: 760px`) e largă — pe ecrane mari arată dezolant de gol în laterale.

### 2.2 Direcție restyle — CRT Phosphor autentic

**Aspirație:** terminal anilor '80 — fosfor verzui, scanlines vizibile, cursor care clipește, text care apare literă cu literă (deja implementat). Adaugă flicker subtil pe scanlines și o bordură de ecran CRT.

**Referințe de gen:** Fallout terminal, WarGames (1983), Green text VT100.

### 2.3 Tokens propuși

```css
/* Terminal — tokens locali */
:root {
  --tm-bg:        #040f08;   /* fundal ecran, mai întunecat decât acum */
  --tm-phospor:   #39ff6e;   /* culoarea principală fosfor */
  --tm-dim:       #2ecc71;   /* text secundar — FIX CRITIC: de la #1f9c4a */
  --tm-warn:      #ffd24a;   /* avertizare */
  --tm-bad:       #ff6b6b;   /* eroare */
  --tm-ok:        #9dffc0;   /* succes */
  --tm-glow:      rgba(57,255,110,.55); /* text-shadow glow */
  --tm-scan-clr:  rgba(0,0,0,.22); /* scanlines opacitate */
  --tm-border:    #1a3a24;   /* rama CRT */
}
```

**Bordura CRT:**
```css
#crt-frame {
  position: fixed; inset: 0; pointer-events: none;
  border: 8px solid #0d1f12;
  border-radius: 18px;
  box-shadow: inset 0 0 60px rgba(0,0,0,.6), inset 0 0 0 1px #1a3a24;
}
```

**Scanlines:** opacitate ușor crescută:
```css
.scan {
  background: repeating-linear-gradient(
    0deg,
    var(--tm-scan-clr) 0 1px,
    transparent 1px 3px
  );
}
```

**Cursor animat** (înlocuiește `caret-color` nativ):
```css
#prompt-cursor {
  display: inline-block; width: 9px; height: 16px;
  background: var(--tm-phospor);
  animation: cur-blink .85s step-end infinite;
  box-shadow: 0 0 6px var(--tm-phospor);
  vertical-align: text-bottom;
}
@keyframes cur-blink { 50% { opacity: 0; } }
```

**Linie principală:**
```css
.line { text-shadow: 0 0 8px var(--tm-glow); }
.line.dim { color: var(--tm-dim); } /* de la #1f9c4a la #2ecc71 */
```

**Max-width mai îngust:**
```css
#crt { max-width: 680px; }
```

**Flicker subtil (opțional, cu motion guard):**
```css
@keyframes flicker {
  0%,100% { opacity: 1; }
  97%      { opacity: 1; }
  98%      { opacity: .94; }
  99%      { opacity: .98; }
}
body { animation: flicker 6s infinite; }
@media (prefers-reduced-motion: reduce) { body { animation: none; } }
```

### 2.4 Micro-interacțiuni & motion

- Cursorul `#prompt-cursor` clipește la 0.85s step-end — tipic CRT.
- Text care apare `say()` — deja există, nu schimba ritmul (11ms per 3 chars).
- La feedback corect (`ok`): `text-shadow` mai intens timp de 1s: `0 0 18px rgba(57,255,110,.9)`.
- `@media (prefers-reduced-motion: reduce)`: `body animation: none`, `cur-blink: none` (cursor vizibil permanent), fără flicker.

### 2.5 Constrângeri — ce NU se schimbă

- Logica `say()`, `pump()`, `echo()` — neatinsă.
- Comenzile `INDICIU`, `LITERE`, `AJUTOR`, `RESTART` — neschimbate.
- `#cmd` input este singurul element interactiv — focusul automat la click pe body rămâne.
- Structura `.scan`, `.vign` div-uri — rămân ca overlay-uri fixe.
- Sentinela `__CFG__`, `libJS`, backslash dublu.

### 2.6 Checklist a11y

- [ ] **CRITIC**: `.line.dim`: `#2ecc71` pe `#040f08` → ~6.1:1 — FIX față de actualul 3.1:1.
- [ ] Text principal `#39ff6e` pe `#040f08` → ~9.8:1 — OK.
- [ ] `.warn` (#ffd24a) pe `#040f08` → ~9.2:1 — OK.
- [ ] `.bad` (#ff6b6b) pe `#040f08` → ~5.4:1 — OK.
- [ ] Input `#cmd`: min-height 44px (acum are `font-size: 15px` fără min-height explicit — adaugă `min-height: 44px`).
- [ ] Focus pe `#cmd`: deja are `outline: none` (stilul CRT nu vrea outline) — acceptabil, dar adaugă `aria-label="Introdu comanda"`.
- [ ] `aria-live="polite"` pe `#out` — screen reader citește output-ul automat.

---

## 3. Arcade — 8-bit Neon

### 3.1 Stare actuală

**Paletă:**
- Fundal body: `#0d0820` — violet-negru.
- Canvas border: `3px solid #36246b` — prea discretă, nu are personalitate arcade.
- Canvas background: `#18102e`.
- Pereți: `#33215f` / `#241646` — violet, OK.
- Podea: `#191130` / `#1c1336` — alternare subtilă.
- Ușa închisă: `#9f1239` / `#e11d48` — roșu, vizibil.
- Ușa deschisă: `#166534` / `#22c55e` — verde, OK.
- Cufăr: `#92400e` / `#f59e0b` — auriu-portocaliu.
- HUD: `color: #b9aee0` — pastel violet, OK.
- D-pad: `#221643` fond, `#4a3590` bordură — OK.

**Tipografie:** `ui-monospace` — corect pentru arcade.

**Slăbiciuni vizuale:**
- Canvas border e prea subțire și lipsită de energie neon — nu evocă ecranul arcade.
- HUD tile-uri (`#hudLetters span`): 22×26px — sub 44px tap target.
- D-pad butoane (52×44px) — OK pe lățime, dar pe înălțime exact la limită.
- `h1` are `font-size: 17px` — prea mic pentru un titlu arcade cu caracter.
- Nu există nicio animație de respawn sau de victorie per cameră pe canvas.
- Personajul e un simplu dreptunghi — ok pentru MVP, dar placeholder evident.

### 3.2 Direcție restyle — 8-bit Neon Cabinet

**Aspirație:** cabinet arcade stradal din 1985 — bordura ecranului cu glow neon, HUD cu fonturi monospace bold, paleta cu neon verde și violet electric, butoane D-pad cu textură fizică.

**Referințe de gen:** Pac-Man, Galaga, Donkey Kong — neon pe fundal negru, pixel chunky, energie imediată.

### 3.3 Tokens propuși

```css
/* Arcade — tokens locali */
:root {
  --ar-bg:         #080614;  /* fundal mai întunecat */
  --ar-canvas-bg:  #0e0a22;  /* canvas interior */
  --ar-neon-green: #4ade80;  /* neon verde (ușă deschisă, succes) */
  --ar-neon-red:   #f43f5e;  /* neon roșu (ușă închisă) */
  --ar-neon-gold:  #fbbf24;  /* cufăr, stele */
  --ar-wall:       #2d1b6e;  /* pereți cameră */
  --ar-floor-a:    #140c30;  /* podea alternare A */
  --ar-floor-b:    #170f36;  /* podea alternare B */
  --ar-hud:        #c4b5fd;  /* text HUD */
  --ar-dpad-bg:    #1a1040;  /* d-pad fundal */
  --ar-dpad-brd:   #6d28d9;  /* d-pad bordură */
  --ar-canvas-brd: #6d28d9;  /* bordura canvas */
  --ar-canvas-glow:rgba(109,40,217,.6);
}
```

**Canvas border — principalul upgrade vizual:**
```css
canvas {
  border: 4px solid var(--ar-canvas-brd);
  border-radius: 4px; /* pixel-art: colțuri mai drepte */
  box-shadow:
    0 0 0 2px #080614,
    0 0 20px var(--ar-canvas-glow),
    0 0 40px rgba(109,40,217,.25),
    inset 0 0 30px rgba(0,0,0,.6);
  image-rendering: pixelated;
}
```

**Titlu arcade:**
```css
h1 {
  font-size: 22px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 0 0 12px var(--accent), 0 0 24px rgba(109,40,217,.5);
  margin: 12px 0 4px;
}
```

**HUD tile-uri:**
```css
#hudLetters span {
  width: 32px;
  height: 32px;   /* mai mare decât acum (22×26), mai ușor de citit; acceptăm sub 44px pentru UI, nu butoane tap */
  border-radius: 4px; /* mai pixel-art */
  font-size: 14px;
  font-weight: 800;
}
#hudLetters span.won {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  color: #fff;
}
```

**D-pad butoane:**
```css
#dpad button {
  width: 56px;
  height: 52px;  /* de la 44px — depășește minimul */
  border-radius: 6px;
  border: 2px solid var(--ar-dpad-brd);
  background: var(--ar-dpad-bg);
  color: #c4b5fd;
  font-size: 20px;
  box-shadow: 0 4px 0 #0d0820, 0 0 8px rgba(109,40,217,.3);
  transition: transform .08s, box-shadow .08s;
}
#dpad button:active {
  background: var(--accent);
  transform: translateY(2px);
  box-shadow: 0 2px 0 #0d0820, 0 0 12px var(--accent);
}
```

**Ușa deschisă (tile 3) pe canvas** — adaugă un pulsing glow in `draw()` (JS):
Culoarea fill a ușii deschise rămâne `#22c55e`, dar înconjoară cu `ctx.shadowBlur = 12; ctx.shadowColor = '#4ade80';` înainte de draw.

**Fundal body:**
```css
body {
  background: radial-gradient(ellipse at 50% 0%, #1a0a40 0%, #080614 60%);
}
```

### 3.4 Micro-interacțiuni & motion

- D-pad button `:active` — `translateY(2px)` + shadow redus: simulare buton fizic apăsat.
- Ușa deschisă pe canvas: `ctx.shadowBlur` pulsant (requestAnimationFrame) — glow animat pe canvas.
- `@media (prefers-reduced-motion: reduce)`: `#dpad button { transition: none; }`, fără glow animat pe canvas.
- Confetti final: colorat în paleta arcade (verde neon, violet, auriu) — schimbă culorile array-ului `confetti()`.

### 3.5 Constrângeri — ce NU se schimbă

- Logica de mișcare, coliziuni, map, `doorAt`, `doorPos`, `solvedFlags` — neatinsă.
- `openPuzzle()`, `SNIP.modalJs`, `SNIP.modalHtml` — neatinse (modal partajat).
- `canvas#cv` ID și dimensiunile `GW=13`, `RH=4`, `TS=38` — neatinse (schimbarea TS rupe layout-ul calculat).
- Sentinela `__CFG__`, `libJS`, backslash dublu.

### 3.6 Checklist a11y

- [ ] HUD tile-uri nu sunt butoane tap — OK, sunt decorative. Dar adaugă `aria-hidden="true"` pe `#hudLetters`.
- [ ] D-pad butoane: 56×52px — OK (>44px).
- [ ] `aria-label` pe butoanele D-pad: deja au `data-d`, adaugă `aria-label="Stânga/Sus/Jos/Dreapta"`.
- [ ] `canvas` nu e accesibil screen reader — adaugă `role="img" aria-label="Hartă joc arcade"`.
- [ ] Modal (`#mOverlay`): focus trap în `openPuzzle()` — verifică că primul element focusabil primește focus.
- [ ] Contrast HUD text `#b9aee0` pe `#080614` → ~6.8:1 — OK.

---

## 4. Chat — Messenger Modern

### 4.1 Stare actuală

**Paletă:**
- Body: `#0b1220` — albastru-negru.
- App container: `#0f172a` — slate dark, Tailwind.
- Header: `#1e293b` — slate medium.
- Bule NPC (`him`): `#1e293b` — același cu header-ul, nu se diferențiază vizual.
- Bule player (`me`): `var(--accent)` — corect.
- Borduri: `#334155` — slate.
- Status „online": `#34d399` — verde emerald.
- Composer background: `#1e293b`, input: `#0f172a`.

**Tipografie:** `system-ui` — corect pentru context chat.

**Slăbiciuni vizuale:**
- Bula NPC (`#1e293b`) pe fundalul `#0f172a` — contrast insuficient ca diferențiere vizuală (culorile sunt prea apropiate).
- Header-ul nu are profunzime — se contopește cu lista de mesaje.
- Nu există indicator typing mai vizibil decât cele 3 puncte mici.
- Tile-ul cu litera câștigată (`.bub.tile`): `background: #14532d; border: 1px solid #22c55e` — verde pe verde, ok, dar nu celebratoriu.
- Input în composer — `border-radius: 99px` e ok, dar pe mobil poate fi prea îngust cu chips-urile alăturate.

### 4.2 Direcție restyle — iMessage/WhatsApp Modern cu personalitate

**Aspirație:** chat modern premium — suprafețe frosted-glass, bule cu shadow moale, header clar, bula de typing mai dramatică, reward-tile celebratoriu.

**Referințe de gen:** iMessage dark mode, Telegram dark, WhatsApp (dinamică bule), Signal.

### 4.3 Tokens propuși

```css
/* Chat — tokens locali */
:root {
  --ch-bg:        #060d1a;  /* fundal exterior */
  --ch-app:       #0d1626;  /* app container */
  --ch-surface:   #172035;  /* header, composer */
  --ch-bub-him:   #1e2d45;  /* bula NPC — mai diferit de fundal */
  --ch-bub-him-brd: rgba(255,255,255,.08);
  --ch-ink:       #e2e8f0;  /* text mesaje */
  --ch-muted:     #94a3b8;  /* status, metadata */
  --ch-online:    #34d399;  /* indicator online */
  --ch-divider:   rgba(255,255,255,.08);
  --ch-tile-bg:   #14532d;
  --ch-tile-brd:  #22c55e;
  --ch-chip-bg:   #0d1626;
  --ch-chip-brd:  #334155;
}
```

**Header frosted-glass:**
```css
header {
  background: rgba(23,32,53,.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ch-divider);
  box-shadow: 0 1px 0 rgba(255,255,255,.05);
}
```

**Bule NPC — mai distinct:**
```css
.row.him .bub {
  background: var(--ch-bub-him);
  border: 1px solid var(--ch-bub-him-brd);
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
  color: var(--ch-ink);
  border-bottom-left-radius: 5px;
}
```

**Bule player:**
```css
.row.me .bub {
  background: var(--accent);
  box-shadow: 0 2px 12px rgba(109,40,217,.4);
  border-bottom-right-radius: 5px;
}
```

**Tile reward (litera câștigată):**
```css
.bub.tile {
  background: linear-gradient(135deg, #14532d, #166534);
  border: 1px solid var(--ch-tile-brd);
  box-shadow: 0 0 16px rgba(34,197,94,.3);
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 3px;
  padding: 14px 20px;
  animation: tile-pop .4s cubic-bezier(.34,1.56,.64,1);
}
@keyframes tile-pop {
  from { transform: scale(.6) rotate(-5deg); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
```

**Typing indicator — mai expresiv:**
```css
.bub.typing i {
  width: 8px; height: 8px;
  background: #64748b;
}
/* Adaugă glow la animație: */
@keyframes tp {
  30% { transform: translateY(-6px); background: var(--ch-online); }
}
```

**Composer:**
```css
#composer {
  background: rgba(23,32,53,.9);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--ch-divider);
}
#composer input {
  background: rgba(13,22,38,.8);
  border-color: var(--ch-chip-brd);
  min-height: 44px;
}
#composer button { min-height: 44px; min-width: 44px; }
#composer button.chip {
  background: var(--ch-chip-bg);
  border-color: var(--ch-chip-brd);
  min-height: 44px;
}
```

**Avatar:**
```css
.avatar {
  background: var(--accent);
  box-shadow: 0 0 0 2px rgba(255,255,255,.15);
}
```

### 4.4 Micro-interacțiuni & motion

- Bule noi apar cu `animation: bin .25s cubic-bezier(.22,1,.36,1)` — mai „springy".
- Tile reward: `animation: tile-pop .4s cubic-bezier(.34,1.56,.64,1)` — bouncy, celebratoriu.
- Typing indicator: punctele devin verde (#34d399) la peak — confirmă că e „live".
- Header: `backdrop-filter: blur(12px)` — frosted glass când mesajele trec pe sub.
- `@media (prefers-reduced-motion: reduce)`: `animation: none` pe `bin`, `tile-pop`; typing indicator static.

### 4.5 Constrângeri — ce NU se schimbă

- `#msgs` scroll, `scrollEnd()`, `charMsg()` timing — neatins.
- `#composer` rebuild pattern (`composer.innerHTML = ''` + `chip()`) — neatins.
- `seq()`, `storyChunks()`, `answer()` — neatinse.
- `SNIP.finalHtml`, `SNIP.finalJs` — neatinse.
- Sentinela `__CFG__`, `libJS`, backslash dublu.

### 4.6 Checklist a11y

- [ ] Bule: nu sunt interactive — OK, dar asigură că butoanele chip au `min-height: 44px`.
- [ ] Contrast bula NPC `#e2e8f0` pe `#1e2d45` → ~9.1:1 — OK.
- [ ] Contrast muted `#94a3b8` pe `#0d1626` → ~5.2:1 — OK.
- [ ] Composer input: `min-height: 44px` — adaugă explicit.
- [ ] `#msgs`: adaugă `aria-live="polite" aria-label="Conversație"`.
- [ ] Avatar: `aria-hidden="true"` (decorativ).
- [ ] Typing indicator: `aria-label="scrie..."` pe `.bub.typing`.

---

## 5. Point — Adventure Pixel-Art

### 5.1 Stare actuală

**Paletă:**
- Fundal body: `#0d0820` — violet închis, identic cu Arcade (nu se diferențiază).
- SVG scenă: fundal perete `#3b2a63`, podea `#241a3f`, despărțitor `#1c1336`.
- Obiecte SVG: paleta `POOL[]` — predominant bruni, roșii, albastruri.
- Ușa: `#6b4226` / `#8a5a2b` — maro lemn, OK pentru gen.
- HUD: identic cu Arcade (`#b9aee0`) — nu are personalitate proprie.
- Obiect rezolvat: cerc verde `#16a34a` cu text alb — funcțional.

**Tipografie:** `system-ui` — acceptabil, dar point-and-click merită o tentă mai „aventurieră".

**Slăbiciuni vizuale:**
- Fundalul body este identic cu Arcade (`#0d0820`) — jucătorii în campanie nu simt trecerea la un stil nou.
- SVG-ul scenei (peretele `#3b2a63`) e prea plat și monoton — nu există sursă de lumină sau ambient.
- HUD e copiat din Arcade fără adaptare.
- Obiecte rezolvate (`.hot.done { opacity: .6 }`) dispar prea mult — greu de văzut ce ai rezolvat.
- Ușa deschisă (`#door.open`) are doar un `drop-shadow` verde — nu destul de celebratoriu.
- `note` text (`#8d80bb`) — contrast pe `#0d0820`: ~3.8:1 — sub 4.5:1, eșec a11y.

### 5.2 Direcție restyle — Pixel-Art Adventure (cameră misterioasă)

**Aspirație:** point-and-click clasic — scenă cu ambient cald (lampă, fereastră cu lumină), obiecte cu hover expresiv, inventar vizual clar, ușă care emite lumină când e deblocată. Stil Monkey Island / Broken Sword întâlnit cu Undertale.

**Referințe de gen:** Monkey Island (cameră cu textură și lumini), Machinarium (obiect cu hover glow), jocuri point-and-click browser.

### 5.3 Tokens propuși

```css
/* Point — tokens locali */
:root {
  --pt-bg1:       #0a0618;  /* fundal sus — mai distinct față de Arcade */
  --pt-bg2:       #150d30;  /* gradient jos */
  --pt-hud:       #d4c8f8;  /* text HUD — mai luminos */
  --pt-note:      #a89fd4;  /* text note — FIX CONTRAST: de la #8d80bb */
  --pt-scene-wall:#2e1f5c;  /* peretele SVG scenei */
  --pt-scene-amb: rgba(255,200,100,.06); /* ambient luminos cald din lampă */
  --pt-done-fill: #166534;  /* obiect rezolvat fill */
  --pt-done-brd:  #22c55e;
  --pt-door-open: #22c55e;
  --pt-door-glow: rgba(34,197,94,.5);
}
```

**Fundal body — distinct față de Arcade:**
```css
body {
  background: linear-gradient(180deg, var(--pt-bg1) 0%, var(--pt-bg2) 100%);
}
```

**SVG scenă — ambient luminos:**
Adaugă în `base` SVG-ul un gradient radial care simulează lumina lămpii:
```js
var base = '...'
  + '<radialGradient id="amb" cx="65%" cy="60%" r="45%">'
  +   '<stop offset="0%"  stop-color="#ffe082" stop-opacity=".12"/>'
  +   '<stop offset="100%" stop-color="#ffe082" stop-opacity="0"/>'
  + '</radialGradient>'
  + '<rect width="800" height="500" fill="url(#amb)"/>';
```

**Hover obiect — mai expresiv:**
```css
.hot:hover {
  filter: brightness(1.5) drop-shadow(0 0 8px rgba(255,220,100,.5));
  transition: filter .15s;
}
```

**Obiect rezolvat — vizibil, nu disparent:**
```css
.hot.done {
  opacity: .85;  /* de la .6 — rămâne vizibil */
  cursor: default;
}
.hot.done:hover { filter: none; }
```

**Ușa deschisă — celebratorie:**
```css
#door.open {
  filter: drop-shadow(0 0 18px var(--pt-door-glow)) drop-shadow(0 0 6px #fff);
  animation: door-glow 2s ease-in-out infinite alternate;
}
@keyframes door-glow {
  from { filter: drop-shadow(0 0 12px var(--pt-door-glow)); }
  to   { filter: drop-shadow(0 0 24px var(--pt-door-glow)) drop-shadow(0 0 8px rgba(255,255,255,.3)); }
}
@media (prefers-reduced-motion: reduce) {
  #door.open { animation: none; filter: drop-shadow(0 0 18px var(--pt-door-glow)); }
}
```

**Note text — fix contrast:**
```css
.note { color: var(--pt-note); } /* #a89fd4 pe #0a0618 → ~5.1:1, OK */
```

**HUD tile-uri — adaptate la Point:**
```css
#hudLetters span {
  width: 26px; height: 30px;
  border-radius: 6px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.18);
}
#hudLetters span.won {
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}
```

**Titlu (`h1`) — mai ambient:**
```css
h1 {
  font-size: 20px;
  color: #e8deff;
  letter-spacing: .04em;
  text-shadow: 0 2px 8px rgba(0,0,0,.6);
}
```

### 5.4 Micro-interacțiuni & motion

- Hover pe `.hot`: `filter` cu `transition: .15s` — feedback imediat la cursor.
- Ușa deschisă: `door-glow` keyframe — glow pulsant verde.
- La `onSolved()`: badge-ul cu litera câștigată poate primi `animation: badge-pop .35s cubic-bezier(.34,1.56,.64,1)` — similar cu tile-ul din Chat.
- `@media (prefers-reduced-motion: reduce)`: `.hot { transition: none; }`, `#door.open { animation: none; }`, badge fără animație.

### 5.5 Constrângeri — ce NU se schimbă

- `POOL[]` array de obiecte SVG — conținutul SVG neatins (numai CSS hover modificat).
- `base` SVG string — se poate adăuga gradient, dar NU se schimbă coordonatele ușii sau obiectelor.
- `openPuzzle()`, `SNIP.modalJs`, `SNIP.modalHtml` — neatinse.
- `el('door').classList.add('open')` — trigger JS neatins.
- Sentinela `__CFG__`, `libJS`, backslash dublu.

### 5.6 Checklist a11y

- [ ] **FIX**: `.note` (`#8d80bb`) pe `#0d0820` → 3.8:1 (eșec). Nou: `#a89fd4` pe `#0a0618` → ~5.1:1 — OK.
- [ ] Obiectele `.hot` nu au `role="button"` — adaugă `role="button" tabindex="0"` + handler `onkeydown` pentru Enter/Space.
- [ ] `#door` — la fel: `role="button" tabindex="0"` + keydown handler.
- [ ] Modal `#mOverlay`: focus trap — verifică.
- [ ] HUD tile-uri: `aria-hidden="true"` (decorative).
- [ ] Contrast HUD `#d4c8f8` pe `#0a0618` → ~11.2:1 — OK.
- [ ] Butoane modal: `min-height: 44px` — deja în `SNIP.modalCss`.

---

## Rezumat rapid per stil (5 rânduri)

| Stil | Direcție |
|------|----------|
| **Classic** | Quiz cald cu fundal radial profund, card cu glow accent, tile-uri 44px bouncy, progres bar mai gros cu neon glow. |
| **Terminal** | CRT fosfor autentic cu bordură de ecran, fix critic contrast `.dim` (#2ecc71), cursor animat step-end, flicker subtil cu motion guard. |
| **Arcade** | Cabinet neon cu canvas border glow violet electric, D-pad butoane fizice (56×52px), titlu neon cu text-shadow, fundal radial distinct. |
| **Chat** | Messenger premium frosted-glass header, bule NPC cu shadow și contrast clar, tile reward bouncy cu glow verde, typing indicator cu culoare. |
| **Point** | Cameră aventurieră cu ambient radial din lampă SVG, hover obiect expresiv, ușă cu glow pulsant, fix contrast note text (#a89fd4). |

---

## Top 3 schimbări cu cel mai mare impact la cel mai mic efort

1. **Terminal `.line.dim` #1f9c4a → #2ecc71** (1 linie CSS) — remediază singurul eșec WCAG 4.5:1 critic din tot produsul. Impact: a11y + lizibilitate. Efort: XS.

2. **Classic card glow + progres bar mai gros** (3-5 linii CSS pe `.card` și `.progress i`) — transformă aspectul din „quiz generic" în „experience premium". Impact: prima impresie. Efort: S.

3. **Chat header frosted-glass + bule NPC distincte** (`backdrop-filter: blur(12px)` pe `header`, culoare bula NPC la `#1e2d45`) — face interfața să pară un messenger real, nu un chat placeholder. Impact: imersie, credibilitate stil. Efort: S.
