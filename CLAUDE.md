# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce este

Generator de jocuri escape room: un singur fișier HTML (`escape-builder.html`), fără backend, fără build, fără dependențe. Același set de puzzle-uri se exportă în 5 stiluri de joc diferite (clasic/quiz, terminal retro, arcade pixel, story chat, point-and-click).

## Dezvoltare

Nu există build sau lint. Produsul (HTML files) e vanilla HTML/CSS/JS, zero-dependențe.

```bash
# Verificare: deschide direct în browser (merge de pe file://)
# sau servește local:
python3 -m http.server 8000
```

Testarea manuală: deschide `escape-builder.html`, schimbă "Stil joc" și verifică preview-ul live (iframe), apoi exportă și verifică jocul standalone. Testele automate → vezi `## Testing`.

## Arhitectură

Toată aplicația trăiește în `escape-builder.html`, organizată în secțiuni comentate (`stare`, `editor`, `preview`, `template-urile jocului exportat`):

- **Stare**: obiectul `state` (titlu, poveste, culoare, `style`, listă `puzzles`), persistat automat în `localStorage` sub cheia `escape-builder-v1`. Export/import ca JSON.
- **Editor** (stânga): formularele scriu direct în `state` via `data-g`; orice modificare cheamă `onChange()` → persist + refresh preview cu debounce 400ms.
- **Preview** (dreapta): `refreshPreview()` setează `iframe.srcdoc = gameHTML(cleanState())` — preview-ul este exact jocul exportat, jucabil.
- **Generare joc**: `gameHTML(cfg)` face dispatch pe `cfg.style` către cele 5 motoare: `gameClassic`, `gameTerminal`, `gameArcade`, `gameChat`, `gamePoint`. Fiecare motor returnează un string HTML complet, standalone (jocul exportat merge offline).

Cod partajat între motoare (injectat în HTML-ul generat):
- `libJS(cfg)`: `CFG` (config serializat), `norm` (normalizare răspuns: fără diacritice/majuscule, virgulă→punct), `checkAnswer`, `starsFor` (3/2/1 stele după încercări/indiciu), `finalWord` (literele puzzle-urilor formează cuvântul final), `beep` (WebAudio), `confetti`.
- `SNIP.*`: fragmente de template partajate — `baseCss`, modal de întrebare (`modalCss/Html/Js`, folosit de arcade și point) și ecranul final (`finalCss/Html/Js`).

Tipuri de puzzle: `free` (răspuns liber), `tf` (adevărat/fals), `choice` (variante pe linii separate în `choices`, cea corectă prefixată cu `*`).

## Testing

Harness Playwright în `tests/smoke.mjs`. Instalare o singură dată:

```bash
npm install              # instalează @playwright/test (devDependency)
npx playwright install chromium
```

Rulare:

```bash
npm run test:regresie    # regresie — exemplu-*.html rezolvate până la final + edge cases
npm run test:campanie    # campanie E2E — rulează după ce integrator anunță gata
npm test                 # suita completă (regresie + campanie)

# sau direct:
npx playwright test tests/smoke.mjs --grep "@regresie"
npx playwright test tests/smoke.mjs
```

**Baseline curent (pre-campanie):** 13/13 `@regresie` trec. Testele `@campanie` sunt marcate `skip` — se activează după implementarea `gameCampaign`.

## Atenție la editare

- Motoarele de joc sunt template literals mari — backslash-urile din codul generat trebuie dublate (`\\u0300`, `\\n`), iar codul generat folosește `var`/`function` clasic intenționat.
- O schimbare în `libJS`/`SNIP` afectează toate cele 5 motoare; verifică fiecare stil în preview.
- `exemplu-*.html` sunt jocuri demo exportate din builder (câte unul per stil). Nu le edita manual — după modificări la motoare, regenerează-le prin exportul din builder.
- `index.html` e doar pagina de landing care leagă builder-ul și demo-urile.
- `package.json` + `node_modules/` sunt **doar dev tooling** (Playwright). Produsul (fișierele HTML) rămâne zero-dependențe — merge offline de pe `file://`.
