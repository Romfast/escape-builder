# tests/ — Harness Playwright

## Purpose
Smoke + regresie + campanie E2E pentru jocurile generate. Verifică faptic: fiecare stil se rezolvă
până la ecranul final, fără erori de consolă.

## Ownership
- `tests/smoke.mjs` — unicul fișier de teste (~29 teste).
- `playwright.config.mjs` (la root, **gitignored**) — config dev.

## Local Contracts
- **NU commita `package.json` / `package-lock.json` / `playwright.config.mjs`** — produsul rămâne
  zero-dependențe. Instalarea dev e o singură dată: `npm i -D @playwright/test && npx playwright install chromium`.
- **Fără npm scripts** — se rulează direct cu `npx`.
- **Teste pe `file://`** — helper-ul `fileURL(name)` mapează cale relativă la `file://`; campania scrie
  HTML temp generat via builder (`gameHTML`) și-l încarcă de pe `file://`.
- **Zero erori consolă = invariant.** `trackErrors(page)` colectează `console.error` + `pageerror`;
  fiecare test asertează `errors.length === 0` la final.
- **Tag-uri:** `@regresie` (16 — exemplu-*.html + edge cases + mobil 320px + regenerare via gameHTML +
  stil top-level invalid la import + bomberman gameplay + bomberman rază/powerup-uri) și `@campanie`
  (15 — intro→hartă→camere→final, resume, cameră moartă, idempotență ușă, `$`/`$&`, beep, mobil,
  audio S1, voce/narațiune D10, a11y tap/aria/reduced-motion, navigare overworld, timer calm T10).
- **Status țintă: 29/29 PASS.**

## Work Guidance
- După modificări la motoare (`escape-builder.html`): rulează suita completă; extinde `@regresie` dacă
  adaugi/schimbi un stil, `@campanie` pentru contractul de montare.
- Nu testa pe screenshot-uri de pixeli — asertează stare/text/erori.

## Verification
```bash
npx playwright test tests/smoke.mjs                    # 29/29
npx playwright test tests/smoke.mjs --grep @regresie
npx playwright test tests/smoke.mjs --grep @campanie
```

## Child DOX Index
(none — leaf)
