# TODOS — Escape Room Builder

Backlog post-PR1 și note tehnice pentru iterațiile viitoare.
Referință plan complet: `~/.gstack/projects/romfast-escape-builder/ceo-plans/2026-06-12-campania-multi-stil.md`

> **Acest fișier e BOARD-UL DE PROGRES (sursa durabilă).** Task list-ul din harness se
> resetează între sesiuni → se uită. Aici nu. La fiecare sesiune: citește board-ul activ
> de mai jos ÎNTÂI, mută `[ ]→[~]→[x]` pe măsură ce avansezi, commit-uiește schimbarea.
> Convenție: `[ ]` neînceput · `[~]` în lucru · `[x]` gata+verificat · `[!]` blocat.

---

## ▶ PR2 în curs (le iau pe rând, cerere user 2026-06-13)
- [x] **Audio camere** — fix REAL (vezi S1 mai jos, commit `651025b`): unlock pe primul gest global
  (acoperă resume), nu doar btn-start; test rescris (headless crea ctx `running` trivial).
- [x] **Narațiune vocală (D10)** — LIVRAT (vezi §„Narațiune vocală" mai jos). Smoke 25/25.
- [x] **Unificare contract `_campaign` la final** — `libJS.campaignDone()` (vezi §dedicată mai jos).
- [ ] **Audit a11y motoare** (vezi §dedicată mai jos).

---

## ▶ BOARD ACTIV — Iterația 2 (Adventure Mode / restyle)

Direcția cerută de user (decizii confirmate, vezi `HANDOFF.md`). Model hibrid ca la PR1:
părțile grele se prototipează în PARALEL în `scratch/`, verificate jucabile, apoi integrator le
portează în `escape-builder.html` (un singur fișier, integrare secvențială).

- [x] **S1 — fix sunet campanie** *(GATA — REVENIT: fix-ul inițial era incomplet, user raporta tăcere)*
      Cauză reală: gestul din iframe NU deblochează AudioContext-ul părintelui → ctx `suspended` → tăcere.
      Fix v1 (incomplet): deblocare DOAR în handler-ul `btn-start`. Lacună: calea de **resume**
      (reload mid-campanie, `escape-builder.html:2199`) intră direct pe hartă FĂRĂ btn-start → ctx
      nedeblocat → camere mute. Plus `resume()` singur nu ajunge pe iOS Safari.
      Fix v2 (real): `unlockAudio()` + listener GLOBAL one-time pe primul gest (`pointerdown`+`keydown`,
      capture) — acoperă fresh ȘI resume (mers pe hartă = keydown pe părinte); buffer silențios
      iOS-safe; `beep()` se auto-vindecă dacă ctx redevine `suspended`. `escape-builder.html:1893`.
      **Lecție testare:** headless Chromium creează ctx direct `running` (ignoră autoplay policy) →
      vechiul test „ctx running" trecea trivial, NU putea prinde tăcerea. Test nou (smoke #9):
      gest tastatură FĂRĂ btn-start → running (cale resume) + beep self-heal din ctx suspendat.
      Verificat: smoke 24/24 + live MCP (ArrowDown singur deblochează). Demo-uri regenerate.
- [x] **S2a — prototip Bomberman complet** → `scratch/bomberman-proto.html` (GATA, 8/8 verificat de mine)
      Grid 15×13, bombe timer 2.4s + explozii lanț, cutii distructibile, AI dușmani BFS urmărire,
      3 vieți + respawn cu progres puzzle PĂSTRAT (stare separată), PRNG seedat (`window.__seed`),
      uși roșii `openPuzzle(id,cb)` + cufăr = scăpare. Hooks `window.__game`.
      Test: `scratch/verify-bomberman.mjs` (+ `pw-bomberman.config.mjs`). Am corectat testul AI:
      dușmanii merg DOAR pe podea → cei închiși în cutii nu se mișcă (corect); testul curăță cutiile.
      Note S3: dușmanii confinați de cutii e intenționat — la integrare asigură căi sau acceptă.
- [x] **S2b — prototip hartă overworld** → `scratch/overworld-proto.html` (GATA, 7/7 verificat de mine)
      Hartă tile 20×18, player top-down (săgeți/WASD/dpad), 4 uși + exit deblocat după toate.
      Orchestrator identic cu `gameCampaign`: `mountRoom`/`roomReady`/`nextRoom`/`roomError`/timeout 4s,
      resume localStorage, idempotență. Hooks test `window.__map`. Test: `scratch/test-overworld.mjs`.
      Note S3: stub `makeSrcdoc` → `TPL[style].replace('__CFG__', fn)`; DOOR_TILES paralel cu puzzles;
      backslash dublu la portare. Ordine rezolvare LIBERĂ.
- [x] **S2c — `STYLES.md`** — direcție restyle pentru cele 5 stiluri (GATA, 775 linii).
      Top 3 impact/efort: terminal `.line.dim` fix WCAG (3.1:1→6.1:1); classic card glow +
      progres bar; chat header `backdrop-filter` + bulă NPC distinctă. Consumat de S3.
- [x] **S3 — integrare în `escape-builder.html`** *(GATA — toate 3 pas-urile; smoke 21/21)*
      Portează prototipurile (template literals → DUBLEAZĂ backslash-urile) + regenerează demo-urile.
      Pas 1: Bomberman → `gameArcade`. Pas 2: Overworld → `gameCampaign`. Pas 3: restyle 5 stiluri.
      - [x] Pas 1 — Bomberman în `gameArcade` (GATA). Păstrează `openPuzzle`/`onDoorSolved`/`showFinal`/
        `modalOpen()`/`roomReady`; uși=N puzzle-uri, cufăr=scăpare. Demo regenerat. Smoke 21/21 +
        verificare gameplay 6/6 (`scratch/verify-arcade-integrated.mjs`) + captură.
      - [x] Pas 2 — Overworld în `gameCampaign` (GATA). Hartă top-down `#overworld` înlocuiește
        coridorul; intro→`showOverworld(0)`, nextRoom/skip/resume→`showOverworld`. Contractul
        (mountRoom/nextRoom/roomReady/roomError/timeout/finale) NESCHIMBAT. Cod coridor șters.
        Cele 8 teste campanie rescrise (`enterRoom`/`waitOverworld`/`__ow`). Smoke 21/21 + captură.
      - [x] Pas 3 — restyle 5 stiluri din `STYLES.md` (GATA, toate 5). Classic spotlight+card glow+
        tile 44px; Terminal fix WCAG `.dim` #2ecc71 + bordură CRT + flicker; Arcade canvas neon +
        dpad fizic; Chat header frosted + bule distincte + tile reward; Point fundal distinct +
        fix contrast `.note` + ușă glow. `prefers-reduced-motion` peste tot. Toate 5 demo-uri
        regenerate. Smoke 21/21 + capturi pe fiecare stil.
- [x] **S4 — extinde `tests/smoke.mjs`** *(GATA — 24/24)* — 3 teste noi: audio S1 (ctx running),
      navigare overworld (mers tastatură + ieșire blocată), bomberman gameplay (bombă/AI/respawn).
      Arbore AGENTS.md actualizat 21→24.

**Stare la 2026-06-13:** PR1 livrat (`a42c960`). **Iterația 2 COMPLETĂ** — S1+S2+S3+S4 livrate
și verificate. Suita 24/24. Comituri: S1 `52f97af`, S2c `a9f3065`, S3 `4454df9` (+pas1/pas2).

---

## Post-PR1 (după ship-ul campaniei)

### Muzică accelerată la timer (PR2 / T10)
- Audio ambient în campanie: track calm → accelerare progresivă sub 1 minut.
- Ownership: părintele deține AudioContext; camerele nu știu de muzică.
- Fallback: zero pedeapsă dacă AudioContext lipsă (webview restricitve).
- Edge: muzica se oprește la `speechSynthesis.cancel()` dacă vocea e activă simultan.
- Legat de: T10 (PR2), timer countdown în bara chrome (§Design pct. 10).

### [x] Narațiune vocală (SpeechSynthesis, D10) — LIVRAT (PR2)
Feature NOU (nu doar edge-cases — voce nu exista deloc). Opt-in din builder (checkbox
`voice`, off implicit), buton 🔊/🔇 în bara chrome a campaniei (părinte deține). Orchestrator-only
voicing (uniform pe toate 5 motoarele, fără dublu-citit): poveste la „Începe aventura", întrebarea
camerei la `roomReady`, mesajul final la `showFinale`. Toate edge-case-urile tratate:
- `getVoices()` gol sincron → re-citire la `onvoiceschanged` (`_pickVoice`).
- Fără voce `ro-*` → vocea default (nu setăm `u.voice`, doar `u.lang='ro-RO'`).
- `speechSynthesis.cancel()` în `hideAll()` → fără replici fantomă la schimbarea scenei.
- Fără `speechSynthesis` în window → buton ascuns, tot devine no-op.
- `window.voiceSay` expus pe părinte (pt. viitor: replici din motoare cu guard `typeof`).
Bug prins de test: `#btn-voice{display:inline-flex}` bătea UA `[hidden]` → adăugat `[hidden]{display:none}`.
Verificat: smoke 25/25 (test nou „voce — naratiune opt-in") + live MCP (buton, toggle, checkbox builder).
NOTĂ scope: motoarele NU cheamă încă `parent.voiceSay` (am evitat dublu-citit cu roomReady); dacă
pe viitor vrei replici chat citite individual, adaugă în `charMsg` cu guard `typeof parent.voiceSay`.

### [x] Unificarea contractului `_campaign` la final — `libJS.campaignDone()` (LIVRAT)
**Decizie de design (abatere de la formularea inițială):** NU am pus terminalul pe `showFinal()`
din `SNIP.finalJs`. Motiv: `showFinal()` randează un modal mov `#fOverlay`, iar terminalul are
finale stilizat în CRT (ASCII „EVADARE REUSITA" + comandă `RESTART`) — e on-theme intenționat;
forțarea modalului ar fi o **regresie vizuală** pe terminalul standalone.
Ce am unificat în schimb (adevărata duplicare): payload-ul `parent.nextRoom({idx,stars,letter})`
era scris identic în 3 locuri (terminal `finale()`, `SNIP.finalJs showFinal()`, classic `next()`).
Acum trăiește o singură dată în `libJS.campaignDone()` (lângă `roomReady`/`beep`/`onerror`).
- terminal `finale()` ramura `_campaign` → `say([... CAMERA REZOLVATA ...], 'ok', campaignDone)`.
- `SNIP.finalJs showFinal()` ramura `_campaign` → `campaignDone()`.
- arcade/chat/point folosesc `showFinal` → primesc automat `campaignDone`.
- **classic rămâne bespoke** (nu folosește `libJS`) → contractul lui e încă inline. Pliere completă
  = D7 (migrarea `gameClassic` pe `libJS+SNIP`, cu regresie manuală pe classic). RĂMAs DE FĂCUT.
Verificat: smoke 25/25 (terminal standalone test 2 + camere terminal în campanie E2E test 1).
Referință: planul §Etapa 2 pct. 1; D7.

### [ ] D7 rămas: migrarea `gameClassic` pe `libJS+SNIP`
- Classic (escape-builder.html:451) e singurul motor bespoke: propriul `totalStars`, `beep`,
  inline `finalWord` (dublat de 2 ori în `next()`), propriul modal final `#sFinal`.
- După migrare: classic folosește `libJS.campaignDone()` + `SNIP` ca celelalte 4 → 5/5 uniform.
- Necesită regresie manuală pe classic standalone (e demo-ul implicit, cel mai vizibil).

### Audit a11y motoare existente (post-PR1, sub harness Playwright)
- **Ținte tap ≥ 44px**: dpad arcade, butoane tf/choice, butonul "Trimite" din chat.
- **Contrast ≥ 4.5:1**: text terminal dim (`#1f9c4a` pe `#04130a` — verifică), hint text clasic.
- **`@media (prefers-reduced-motion: reduce)`**: dezactivează `pop`, `flip`, `flipin`, `shake`, `confetti`, `bin` — stările finale apar direct.
- **Focus & Enter**: "Deschide ușa" (campanie) focusabil + Enter; dpad arcade accesibil cu keyboard.
- **`aria-label` pe progres**: bara chrome din campanie (`aria-label="Camera X din Y"`).
- Referință: §Design pct. 13 (TD5, PR2); D19 din plan.

---

## Iterația 2 — Adventure Mode v0
*(decizie office-hours: fundația contractului de azi e infrastructura directă)*

- Contract de montare (`nextRoom`, `roomReady`, `roomError`) se refolosesc as-is.
- Motoarele noi (orice stil) implementează aceleași 3 puncte + `parent.beep`.
- `gameCampaign` se extinde cu ramificare: `if (answer === 'left') nextRoom({dir: 'left'})`.
- Builder UI: adaugă câmpul "ramificare" per puzzle; drag & drop între camere.
- Referință: design doc §NOT in scope "Adventure Mode v0".

## Iterația 3 — Joc-în-URL + QR
*(depinde de măsurarea dimensiunii JSON comprimate)*

- `gameHTML(cfg)` → URL data: sau LZW/gzip → QR code printabil.
- Open Question 2 din design doc: câte puzzle-uri încap în 2KB (URL QR L)?
- Alternative: GitHub Pages export automat; sau link scurt cu backend minimal.
- Referință: design doc §NOT in scope "Joc-în-URL + QR".

---

## Known improvements (oricând)

- **`updateHud` duplicat**: arcade linia 1003 și point linia 1283 au funcții identice → consolidat în `SNIP` (T8 din plan, igienă PR1).
- **`persist()` fără try/catch**: builder-ul poate crăpa pe storage plin → guard (D12, T8).
- **`esc(L)` la inserția innerHTML din point** (:1274): un `<` în câmpul `letter` strică scena SVG (D13, T8).
- **Validare 0 puzzle-uri**: export și preview blocate cu mesaj ghidant (T5).
- **Stil invalid la import JSON**: avertisment în builder + rotație automată (T5, D8).
