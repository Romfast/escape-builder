# AGENTS.md — Escape Room Builder (root)

Generator de jocuri escape room: un singur fișier HTML, fără backend/build/dependențe.
Același set de puzzle-uri se exportă în 6 motoare de joc. Acest arbore `AGENTS.md` e
sursa de adevăr tehnică pentru agenți.

## Protocol DOX

- **Citire** — înainte de a edita un path, cobori din rădăcină citind fiecare `AGENTS.md`
  întâlnit; dacă un părinte indexează un copil al cărui scope conține path-ul, citești copilul.
- **Editare** — `AGENTS.md`-ul cel mai apropiat = contract local; părinții = reguli globale.
  Un copil NU poate slăbi o constrângere a unui părinte.
- **Update** — după orice schimbare semnificativă, actualizezi `AGENTS.md`-ul care deține zona
  + indexul părintelui; ștergi textul învechit.

## Quick Reference

```bash
# Rulare/verificare — deschide direct în browser (merge de pe file://) sau servește local:
python3 -m http.server 8000

# Teste (Playwright; fără package.json commitat — vezi tests/AGENTS.md):
npx playwright test tests/smoke.mjs                    # suita completă: 41/41
npx playwright test tests/smoke.mjs --grep @regresie   # regresie: 16
npx playwright test tests/smoke.mjs --grep @campanie   # campanie E2E: 21
npx playwright test tests/smoke.mjs --grep @share      # Iterația 3: 6
```

## Durable Rules (repo-wide)

- **Zero dependențe.** Produsul (fișierele `*.html`) e vanilla HTML/CSS/JS, merge offline de pe
  `file://`. `node_modules/`, `package.json`, `playwright.config.mjs`, `scratch/`, `test-results/`
  sunt **gitignored** — doar dev tooling, nu fac parte din produs.
- **Un singur fișier.** Toată aplicația trăiește în `escape-builder.html` (~3200 linii), pe secțiuni
  comentate: `stare` · `editor` · `preview` · `template-urile jocului exportat`.
- **Dispatch.** `gameHTML(cfg)` rutează pe `cfg.style` către 6 motoare:
  `gameClassic · gameTerminal · gameArcade · gameChat · gamePoint · gameCampaign`. Fiecare returnează
  un string HTML complet, standalone. `playerHTML()` generează player universal (hash-mode, toate 5
  motoare inline, MASTER din `location.hash` comprimat deflate-raw+base64url).
- **Cod partajat = blast radius global.** `libJS(cfg)` (`CFG`, `norm`, `checkAnswer`, `starsFor`,
  `finalWord`, `beep`, `confetti`) și `SNIP.*` (`baseCss`, modal, ecran final) sunt injectate în
  TOATE motoarele. O schimbare aici → verifică fiecare stil în preview înainte de commit.
- **Backslash dublu.** Motoarele sunt template literals mari: backslash-urile din codul GENERAT se
  dublează (`\\u0300`, `\\n`). Codul generat folosește `var`/`function` clasic — intenționat.
- **Sentinel `__CFG__`.** Templatele per stil emit `__CFG__` (la `cfg === '__TEMPLATE__'`) și se
  injectează prin **replace-FUNCȚIE**, nu string — protejează `$`/`$&` din config (D1).
- **Demo-urile sunt generate.** `exemplu-*.html` = jocuri exportate din builder, unul per stil.
  **NU le edita manual** — după modificări la motoare, regenerează prin export. `index.html` = doar
  landing care leagă builder-ul + demo-urile.
- **`play.html` este generat.** Player universal (toate 5 motoare inline, boot din hash). Generat cu
  `playerHTML()` din builder și commitat în repo pentru GitHub Pages. **Regenerează după orice
  modificare la motoare:** `node --input-type=module < /tmp/gen-player.mjs` (sau echivalent Playwright)
  → `git add play.html && git commit && git push github main`.
- **Stare.** Obiectul `state` (titlu, poveste, culoare, `style`, `puzzles`) se persistă în
  `localStorage` sub cheia `escape-builder-v1`; export/import ca JSON. Editorul scrie via `data-g` →
  `onChange()` → persist + `refreshPreview()` (debounce 400ms) care setează `iframe.srcdoc`.
- **Design = `DESIGN.md`.** Sursă unică de adevăr vizual pentru campanie (tokens `:root`, intro-poster,
  coridor, diplomă). Note „nu se repară" (violet default, `system-ui`, lipsa webfonturilor pe `file://`)
  sunt deliberate — consultă fișierul înainte de schimbări vizuale.

## Documente conexe (conținut, nu contracte)

- `DESIGN.md` — contract de design campanie (vizual/interacțiune).
- `TODOS.md` — **board de progres durabil** + backlog. Secțiunea „▶ BOARD ACTIV" sus = sursa de
  adevăr pentru ce e în lucru; harness task list-ul se resetează între sesiuni, ăsta nu. La
  START de sesiune citește board-ul; mută `[ ]→[~]→[x]→[!]` pe măsură ce avansezi și commit.
- `HANDOFF.md` — handoff de sesiune (efemer; direcția curentă de lucru).
- `README.md` — descriere pentru utilizatorul final.

## Child DOX Index

- `tests/` → [tests/AGENTS.md](tests/AGENTS.md) — harness Playwright (smoke/regresie/campanie E2E).
- `scratch/` → scratch/AGENTS.md — zonă de prototipuri & QA (gitignored, efemer).
