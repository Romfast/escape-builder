# Escape Room Builder

Generator de jocuri escape room intr-un singur fisier HTML, fara backend, fara build. Acelasi set de puzzle-uri poate fi exportat in 5 stiluri de joc diferite.

## Folosire

Deschide `escape-builder.html` in browser (dublu-click, merge si de pe `file://`).

- **Stanga**: editor — titlu, poveste, culoare, **stil joc**, puzzle-uri (raspuns liber / adevarat-fals / variante), indiciu si litera per puzzle.
- **Dreapta**: preview live — jocul exact cum va arata, jucabil direct in pagina.
- **Exporta jocul HTML**: descarca un joc standalone pe care il trimiti pe telefon/email; merge offline.
- **Salveaza / Incarca JSON**: pastreaza proiectul ca fisier ca sa-l reiei mai tarziu.

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
