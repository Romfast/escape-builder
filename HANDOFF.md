# HANDOFF — Escape Room Builder (pentru sesiune nouă)

Data: 2026-06-13. Lucru DIRECT pe `main`, fără branch-uri (preferință user, proiect nou). Squash la merge; `scratch/` + npm sunt gitignored (produs zero-dependențe).

> **Progresul activ trăiește în `TODOS.md` → secțiunea „▶ BOARD ACTIV".** Citește-l ÎNTÂI la
> fiecare sesiune (convenție documentată în AGENTS.md root). Acest HANDOFF e doar context narativ.

## ✅ Iterația 2 — COMPLETĂ (S1+S2+S3+S4), pe `main`, suita 24/24

- **S1** (`52f97af`) — fix sunet campanie: AudioContext deblocat la „Începe aventura" (gestul din
  iframe nu deblochează ctx-ul părintelui). Ipoteza veche „beep nedefinit" era greșită.
- **S2** — prototipuri în `scratch/` (verificate 8/8, 7/7) + `STYLES.md`.
- **S3** (`d67f6dd`+`309103f`+`4454df9`) — integrare în `escape-builder.html`:
  - Pas 1: **Bomberman complet** în `gameArcade` (bombe+explozii lanț, AI BFS, vieți+respawn cu
    progres păstrat, plasare aleatoare). Păstrează openPuzzle/onDoorSolved/showFinal/roomReady.
  - Pas 2: **hartă overworld** (`#overworld`) înlocuiește coridorul static. Jucător top-down →
    intră pe ușă → cameră → revine; steag de ieșire. Contract orchestrator NESCHIMBAT. Cod coridor șters.
  - Pas 3: **restyle 5 stiluri** din STYLES.md (fix WCAG terminal, neon arcade, frosted chat, etc.).
- **S4** (`cead5c5`) — suita extinsă la **24/24**: audio S1, navigare overworld, bomberman gameplay.

**Decizie durabilă:** un singur fișier `escape-builder.html`, fără split/build (vezi gstack-decision-log).

## Context PR1 (referință istorică)

### PR1 — LIVRAT și VERIFICAT pe `main`
- Commits: `a4b0ff4` (campanie multi-stil PR1) + `a42c960` (QA 21/21).
- Suita `tests/smoke.mjs`: **21/21 PASS** (13 regresie + 8 campanie E2E), zero erori consolă.
- Ce conține PR1: al 6-lea mod „Campanie multi-stil" — fiecare puzzle = o cameră într-un stil diferit (rotație classic/terminal/arcade/chat/point), legate prin **coridor static cu ușă** (intro poster → cameră → coridor → cameră → final cu cuvânt magic). Builder: opțiune „Campanie multi-stil" + selector stil per puzzle + `normalizePuzzle()`. Resume (djb2+safeStore), mod cameră per motor, 5 uși CSS/SVG, `DESIGN.md`, mobil.
- Contract montare (verificat la gate T1): `<iframe srcdoc>` per cameră; camerele cheamă `parent.*` pe un nivel; template per stil cu sentinel `__CFG__` injectat prin replace-FUNCȚIE; `roomReady`/`roomError`/timeout 4s→skip; idempotență.

### FEEDBACK USER (post-livrare) — direcția REALĂ dorită (Iterația 2)
Userul NU voia doar modul campanie. A cerut, cu decizii confirmate prin AskUserQuestion:
1. **Sunet** = „doar repar efectele". BUG REAL confirmat: în `gameCampaign` orchestratorul **nu definește `beep`**, dar camerele cheamă `parent.beep()` în mod campanie → înghițit silent de try/catch → nu se aude nimic. Fix: definește `window.beep(ok)` în orchestrator (un AudioContext, creat la click „Începe aventura").
2. **Arcade → Bomberman COMPLET**: dușmani cu AI de urmărire, bombe plasabile + explozii în lanț, blocuri distructibile, pericole, vieți + game-over + respawn fără pierderea progresului puzzle, plasare ALEATOARE cufere/uși/blocuri. (Acum: `var chest` fix în centru-jos, ZERO dușmani — `escape-builder.html:1045`.)
3. **Campanie → HARTĂ TOP-DOWN (overworld)**: personaj care se plimbă pe o hartă văzută de sus, intră într-o ușă → se încarcă camera → revine pe hartă. Înlocuiește coridorul static actual.
4. **Upgrade vizual la TOATE 5 stilurile** individuale.

## Plan Iterația 2 (task-uri create, AGENȚII NOI ÎNCĂ NE-SPAWNAȚI)
Task-uri în task list (pot fi pierdute — storage-ul s-a resetat o dată; recreează dacă lipsesc):
- **S1 (#10)** — fix sunet campanie (integrator, rapid, prioritar)
- **S2a (#11)** — prototip Bomberman complet → `scratch/bomberman-proto.html` (standalone, jucabil, păstrează mecanica openPuzzle pe uși roșii + cufăr auriu = scăpare)
- **S2b (#12)** — prototip hartă overworld → `scratch/overworld-proto.html` (respectă contractul campaniei: iframe per cameră, parent.nextRoom/roomReady)
- **S2c (#13)** — `STYLES.md` direcție restyle pt cele 5 stiluri
- **S3 (#14)** — integrator portează prototipurile în `escape-builder.html` (template literals → DUBLEAZĂ backslash-urile) + regenerează demo-uri. Blocat de S2a/S2b/S2c.
- **S4 (#15)** — qa extinde `tests/smoke.mjs` (bomberman, hartă, audio, regresie). Blocat de S3.

**Strategie:** un singur fișier → integrare secvențială. Prototipurile (părțile grele) se construiesc în PARALEL în `scratch/`, verificate jucabile, apoi integrator le portează. Model hibrid ca la PR1.

**Decompunere agenți sonnet (de spawnat):** integrator (deține `escape-builder.html`) + `arcade-dev` (bomberman proto) + `map-dev` (overworld proto) + designer (STYLES.md) + qa. Echipa `escape-campania` există; agenții vechi pot fi idle/morți la sesiune nouă — verifică și re-spawn dacă e nevoie.

## Mediu
- Server web rulează în fundal: `python3 -m http.server 8000 --bind 0.0.0.0` (IP container 10.0.20.171). Repornește dacă a murit. Port 8080 = ttyd (ocupat).
- Verificare browser: Playwright MCP s-a deconectat de la orchestrator în sesiunea asta; agenții pot folosi `npx playwright`. Test: `npx playwright test tests/smoke.mjs` (fără package.json — gitignored).
- Arhitectură: `escape-builder.html` (~1960 linii) — `gameHTML(cfg)` dispatch la motoare; `libJS(cfg)` + `SNIP.*` partajate; `gameCampaign` orchestrator ~linia 1410. Vezi `CLAUDE.md`, `DESIGN.md`.

## Plan original (referință)
`/home/claude/.claude/plans/home-claude-claude-plans-propune-alte-u-replicated-papert.md` — planul PR1 (NU mai reflectă direcția nouă; bomberman + harta erau amânate/respinse acolo, userul le-a recerut explicit).
