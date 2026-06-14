# tests/ — Harness Playwright

## Purpose
Smoke + regresie + campanie E2E pentru jocurile generate. Verifică faptic: fiecare stil se rezolvă
până la ecranul final, fără erori de consolă.

## Ownership
- `tests/smoke.mjs` — unicul fișier de teste (~41 teste).
- `playwright.config.mjs` (la root, **gitignored**) — config dev.

## Local Contracts
- **NU commita `package.json` / `package-lock.json` / `playwright.config.mjs`** — produsul rămâne
  zero-dependențe. Instalarea dev e o singură dată: `npm i -D @playwright/test && npx playwright install chromium`.
- **Fără npm scripts** — se rulează direct cu `npx`.
- **Teste pe `file://`** — helper-ul `fileURL(name)` mapează cale relativă la `file://`; campania scrie
  HTML temp generat via builder (`gameHTML`) și-l încarcă de pe `file://`. Testele `@share` scriu
  player HTML temp în `tests/.tmp-player*.html` (deleted în `finally`).
- **Zero erori consolă = invariant.** `trackErrors(page)` colectează `console.error` + `pageerror`;
  fiecare test asertează `errors.length === 0` la final.
- **Tag-uri:** `@regresie` (16), `@campanie` (21), `@share` (6 — Iterația 3):
  - `@share compresie round-trip` — deflate/inflate builder
  - `@share QR structural` — makeQrSvg SVG valid
  - `@share playerHTML()` — structura HTML player
  - `@share player porneste din hash` — campanie 1 cameră din URL hash; folosește `__ow.enterDoor(0)`
  - `@share player fara hash` — mesaj „Niciun joc"
  - `@share share UI` — butoane disabled fără CompressionStream
- **Status țintă: 41/41 PASS.**

## Work Guidance
- După modificări la motoare (`escape-builder.html`): rulează suita completă; extinde `@regresie` dacă
  adaugi/schimbi un stil, `@campanie` pentru contractul de montare, `@share` pentru Iterația 3.
- Nu testa pe screenshot-uri de pixeli — asertează stare/text/erori.

## Verification
```bash
npx playwright test tests/smoke.mjs                    # 41/41
npx playwright test tests/smoke.mjs --grep @regresie   # 16
npx playwright test tests/smoke.mjs --grep @campanie   # 21
npx playwright test tests/smoke.mjs --grep @share      # 6
```

## Child DOX Index
(none — leaf)
