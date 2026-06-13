# TODOS — Escape Room Builder

Backlog post-PR1 și note tehnice pentru iterațiile viitoare.
Referință plan complet: `~/.gstack/projects/romfast-escape-builder/ceo-plans/2026-06-12-campania-multi-stil.md`

> **Acest fișier e BOARD-UL DE PROGRES (sursa durabilă).** Task list-ul din harness se
> resetează între sesiuni → se uită. Aici nu. La fiecare sesiune: citește board-ul activ
> de mai jos ÎNTÂI, mută `[ ]→[~]→[x]` pe măsură ce avansezi, commit-uiește schimbarea.
> Convenție: `[ ]` neînceput · `[~]` în lucru · `[x]` gata+verificat · `[!]` blocat.

---

## ▶ BOARD ACTIV — Iterația 2 (Adventure Mode / restyle)

Direcția cerută de user (decizii confirmate, vezi `HANDOFF.md`). Model hibrid ca la PR1:
părțile grele se prototipează în PARALEL în `scratch/`, verificate jucabile, apoi integrator le
portează în `escape-builder.html` (un singur fișier, integrare secvențială).

- [ ] **S1 — fix sunet campanie** *(prioritar, rapid)*
      Reinvestighează ÎNTÂI: `beep` E deja definit la `escape-builder.html:1725` în orchestrator
      (devine `window.beep` → `parent.beep` ar trebui să rezolve). Ipoteza veche din HANDOFF
      (beep nedefinit) pare GREȘITĂ. Suspect real: AudioContext `suspended` până la gest user,
      sau context creat înainte de click „Începe aventura". Confirmă cauza în browser înainte de fix.
- [ ] **S2a — prototip Bomberman complet** → `scratch/bomberman-proto.html`
      Standalone jucabil: dușmani cu AI urmărire, bombe plasabile + explozii în lanț, blocuri
      distructibile, pericole, vieți + game-over + respawn fără pierderea progresului puzzle,
      plasare ALEATOARE cufere/uși/blocuri. Păstrează `openPuzzle` pe uși roșii + cufăr auriu = scăpare.
- [ ] **S2b — prototip hartă overworld** → `scratch/overworld-proto.html`
      Personaj top-down care intră pe ușă → încarcă camera → revine pe hartă. Înlocuiește coridorul
      static. Respectă contractul campaniei: iframe per cameră, `parent.nextRoom`/`roomReady`.
- [ ] **S2c — `STYLES.md`** — direcție restyle pentru cele 5 stiluri individuale.
- [!] **S3 — integrare în `escape-builder.html`** *(blocat de S2a+S2b+S2c)*
      Portează prototipurile (template literals → DUBLEAZĂ backslash-urile) + regenerează demo-urile.
- [!] **S4 — extinde `tests/smoke.mjs`** *(blocat de S3)* — bomberman, hartă, audio, regresie.

**Stare la 2026-06-13:** PR1 livrat (`a42c960`, suita 21/21). Iterația 2 = neîncepută;
`scratch/` are doar artefacte PR1, fără proto-uri noi.

---

## Post-PR1 (după ship-ul campaniei)

### Muzică accelerată la timer (PR2 / T10)
- Audio ambient în campanie: track calm → accelerare progresivă sub 1 minut.
- Ownership: părintele deține AudioContext; camerele nu știu de muzică.
- Fallback: zero pedeapsă dacă AudioContext lipsă (webview restricitve).
- Edge: muzica se oprește la `speechSynthesis.cancel()` dacă vocea e activă simultan.
- Legat de: T10 (PR2), timer countdown în bara chrome (§Design pct. 10).

### Edge case-uri voce (SpeechSynthesis) — PR2
- `speechSynthesis.getVoices()` poate fi gol sincron → ascultă `voiceschanged`.
- Fără voce `ro-*` → fallback la vocea default (nu crash, nu tăcere).
- Voce activă mid-cameră → `speechSynthesis.cancel()` la demontare cameră (pater deține).
- `parent.voiceSay(text)` = no-op în jocurile simple (funcția nu există) → guard `typeof parent.voiceSay === 'function'`.
- Referință: D10 din plan; E2 Etapa 2 pct. 3.

### Unificarea `finale()` din terminal pe `SNIP.finalJs` (PR2 primul pas)
- Astăzi terminalul are propria funcție `finale()` (escape-builder.html:863) care NU folosește `SNIP.finalJs`.
- Migrarea pe SNIP.finalJs deblochează ramura `_campaign` uniformă pentru toate cele 5 motoare.
- Prim pas al Etapei 2 (D7): migrarea `gameClassic` pe `libJS+SNIP` → regresie manuală pe classic.
- Referință: planul §Etapa 2 pct. 1; D7.

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
