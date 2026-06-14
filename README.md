# Escape Room Builder

**[▶ Demo live](https://romfast.github.io/escape-builder/escape-builder.html)** · **[Player universal](https://romfast.github.io/escape-builder/play.html)**

Generator de jocuri escape room intr-un singur fisier HTML, fara backend, fara build. Acelasi set de puzzle-uri poate fi exportat in 5 stiluri de joc diferite sau ca **campanie** multi-camera cu harta.

## Distribuie prin link + QR

Builder-ul poate comprima jocul intr-un URL scurt si genera un cod QR printabil:

1. Adauga puzzle-uri in editor
2. Apasa **„Generează QR / link"** — apare QR-ul + URL-ul complet
3. Trimite URL-ul sau printeaza cardul QR (buton „Printează cardul QR")
4. Jucatorul deschide link-ul pe telefon — campania porneste instant

URL-ul pointeaza spre player-ul universal hostat pe GitHub Pages:
`https://romfast.github.io/escape-builder/play.html#<joc-comprimat>`

Jocul calatoreste comprimat in URL (deflate-raw + base64url); playerul il decodeaza local,
fara server, fara baza de date. 12+ puzzle-uri incap in ~636 bytes.

## Folosire

Deschide `escape-builder.html` in browser (dublu-click, merge si de pe `file://`).

Pe un mediu fara desktop (container/server remote), serveste fisierele static si deschide din browserul tau:

```bash
cd /workspace/escape-builder
python3 -m http.server 8000
```

- **Stanga**: editor — titlu, poveste, culoare, **stil joc**, puzzle-uri (raspuns liber / adevarat-fals / variante), indiciu si litera per puzzle.
- **Dreapta**: preview live — jocul exact cum va arata, jucabil direct in pagina.
- **Exporta jocul HTML**: descarca un joc standalone pe care il trimiti pe telefon/email; merge offline.
- **Salveaza / Incarca JSON**: pastreaza proiectul ca fisier ca sa-l reiei mai tarziu.
- **Generează QR / link**: comprima jocul intr-un URL + afiseaza cod QR printabil.

Proiectul curent se salveaza automat in `localStorage` la fiecare modificare.

## Stiluri de joc

| Stil | Mecanica | Exemplu |
|------|----------|---------|
| Clasic (quiz) | Carduri secventiale cu progres si litere | `exemplu-clasic.html` |
| Terminal retro | Text adventure pe ecran CRT verde; scrii comenzi (INDICIU, LITERE) si raspunsuri | `exemplu-terminal.html` |
| Arcade pixel | Te misti cu sagetile/WASD prin camere; usile incuiate pun intrebari, cufarul final e scaparea | `exemplu-arcade.html` |
| Story chat | Un personaj blocat iti scrie mesaje (typing...); il ajuti raspunzand din composer | `exemplu-chat.html` |
| Point-and-click | Camera ilustrata SVG; dai click pe obiecte (ceas, tablou, seif...), le rezolvi si deschizi usa | `exemplu-point.html` |

## Mecanici comune

- Stele: 3 la prima incercare, 2 la a doua, 1 daca folosesti indiciul sau gresesti de mai multe ori.
- Fiecare puzzle poate da o litera; literele formeaza cuvantul final, dezvaluit la castig (cu confetti, in functie de stil).
- Sunete WebAudio la corect/gresit; raspunsurile se compara fara diacritice si fara majuscule.
- Toate motoarele de joc impart aceeasi biblioteca (config, scor, verificare raspuns, modal, ecran final) generata din builder.

## Testare

Suita de teste Playwright (smoke + campanie + share), fara server, direct pe `file://`:

```bash
npx playwright test tests/smoke.mjs              # toata suita (41/41)
npx playwright test tests/smoke.mjs --grep @regresie
npx playwright test tests/smoke.mjs --grep @campanie
npx playwright test tests/smoke.mjs --grep @share
```

Detalii harness in `tests/AGENTS.md`.
