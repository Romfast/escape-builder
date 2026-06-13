# tests/ — Harness Playwright

## Purpose
Smoke + regresie + campanie E2E pentru jocurile generate. Verifică faptic: fiecare stil se rezolvă
până la ecranul final, fără erori de consolă.

## Ownership
- `tests/smoke.mjs` — unicul fișier de teste (~25 teste).
- `playwright.config.mjs` (la root, **gitignored**) — config dev.

## Local Contracts
- **NU commita `package.json` / `package-lock.json` / `playwright.config.mjs`** — produsul rămâne
  zero-dependențe. Instalarea dev e o singură dată: `npm i -D @playwright/test && npx playwright install chromium`.
- **Fără npm scripts** — se rulează direct cu `npx`.
- **Teste pe `file://`** — helper-ul `fileURL(name)` mapează cale relativă la `file://`; campania scrie
  HTML temp generat via builder (`gameHTML`) și-l încarcă de pe `file://`.
- **Zero erori consolă = invariant.** `trackErrors(page)` colectează `console.error` + `pageerror`;
  fiecare test asertează `errors.length === 0` la final.
- **Tag-uri:** `@regresie` (14 — exemplu-*.html + edge cases + mobil 320px + regenerare via gameHTML +
  bomberman gameplay) și `@campanie` (11 — intro→hartă→camere→final, resume, cameră moartă,
  idempotență ușă, `$`/`$&`, beep, mobil, audio S1, voce/narațiune D10, navigare overworld).
- **Status țintă: 25/25 PASS.**

## Work Guidance
- După modificări la motoare (`escape-builder.html`): rulează suita completă; extinde `@regresie` dacă
  adaugi/schimbi un stil, `@campanie` pentru contractul de montare.
- Nu testa pe screenshot-uri de pixeli — asertează stare/text/erori.

## Verification
```bash
npx playwright test tests/smoke.mjs                    # 25/25
npx playwright test tests/smoke.mjs --grep @regresie
npx playwright test tests/smoke.mjs --grep @campanie
```

## Child DOX Index
(none — leaf)
