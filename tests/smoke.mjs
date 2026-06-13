// @ts-check
/**
 * tests/smoke.mjs — Escape Room Builder smoke & regression tests
 *
 * Setup (o singura data):
 *   npm install
 *   npx playwright install chromium
 *
 * Rulare:
 *   npx playwright test tests/smoke.mjs                    # suita completa
 *   npx playwright test tests/smoke.mjs --grep @regresie   # regresie (baseline, acum)
 *   npx playwright test tests/smoke.mjs --grep @campanie   # campanie (dupa integrator)
 *   npm test                                               # alias pentru suita completa
 *
 * @see CLAUDE.md § Testing
 */

import { test, expect } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Converteste cale relativa la file:// URL. */
const fileURL = (name) => 'file://' + join(ROOT, name);

/**
 * Ataseaza listeneri de erori si returneaza array-ul de erori.
 * Test-ul trebuie sa asserteze `errors.length === 0` la final.
 */
function trackErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

/**
 * Asteapta si rezolva un puzzle in modalul comun (motoarele arcade / point).
 * Presupune ca modalul e deja vizibil.
 */
async function solveModal(page, puzzle) {
  await expect(page.locator('#mOverlay')).toBeVisible({ timeout: 5000 });
  if (puzzle.type === 'free') {
    await page.locator('#mAnswers input[type=text]').fill(puzzle.answer);
    await page.locator('#mAnswers button:not(.mhint):not(.mclose)').first().click();
  } else if (puzzle.type === 'tf') {
    await page.locator(`#mAnswers button:text("${puzzle.tfAnswer}")`).click();
  } else {
    // choice: gaseste varianta corecta (prefixata cu *)
    const correct = puzzle.choices.split('\n')
      .find(l => l.trim().startsWith('*'))?.replace(/^\*/, '').trim() ?? '';
    await page.locator(`#mAnswers button:text("${correct}")`).click();
  }
  // Modalul se inchide dupa ~750ms animatie de success
  await page.waitForFunction(
    () => document.getElementById('mOverlay')?.style.display !== 'flex',
    { timeout: 3000 }
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTIUNEA 1 — REGRESIE: fiecare exemplu-*.html rezolvat pana la final
//
// Contractul: diff-ul campaniei modifica finalul tuturor celor 5 stiluri
// (ramura _campaign in SNIP.finalJs + finale() terminal + final classic).
// Aceste teste verifica ca finalul existent NU este stricat.
//
// Ruleaza ACUM ca baseline contra exemplu-*.html curente.
// ═══════════════════════════════════════════════════════════════════════

test.describe('Regresie exemplu-*.html @regresie', () => {

  test('exemplu-clasic.html — rezolvat pana la ecranul final', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('exemplu-clasic.html'));

    // Start game
    await page.locator('#btnStart').click();
    await page.waitForSelector('#sGame.on', { timeout: 3000 });

    // Puzzle 1: raspuns liber "56"
    await page.locator('#answers input[type=text]').fill('56');
    await page.locator('#answers button:text("Verifica")').click();
    await page.waitForTimeout(1100); // asteapta animatia si next()

    // Puzzle 2: adevarat/fals "Adevarat"
    await page.locator('#answers button:text("Adevarat")').click();
    await page.waitForTimeout(1100);

    // Puzzle 3: variante "Paris"
    await page.locator('#answers button:text("Paris")').click();
    await page.waitForTimeout(1200);

    // Ecranul final trebuie sa fie vizibil
    await expect(page.locator('#sFinal')).toHaveClass(/on/, { timeout: 3000 });
    // Cuvantul magic "DAR" afişat ca litere individuale
    const bigword = page.locator('#bigword');
    await expect(bigword).toContainText('D');
    await expect(bigword).toContainText('A');
    await expect(bigword).toContainText('R');

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

  test('exemplu-terminal.html — rezolvat pana la ecranul final', async ({ page }) => {
    // Animatia de typing poate fi lenta; marim timeout-ul pentru acest test
    test.setTimeout(120000);
    const errors = trackErrors(page);
    await page.goto(fileURL('exemplu-terminal.html'));

    // Asteapta ca intro-ul sa termine animatia de typing si primul puzzle sa apara.
    // Nota: { timeout } in waitForFunction merge ca al doilea argument FARA arg intermediar.
    await page.waitForFunction(
      () => document.getElementById('out')?.textContent?.includes('[1/'),
      null, { timeout: 20000 }
    );

    // Puzzle 1: raspuns liber "56"
    // Folosim .press() pe locator (nu keyboard global) pentru focus garantat.
    await page.locator('#cmd').fill('56');
    await page.locator('#cmd').press('Enter');
    await page.waitForFunction(
      () => document.getElementById('out')?.textContent?.includes('ACCES PERMIS'),
      null, { timeout: 15000 }
    );

    // Asteapta puzzle 2
    await page.waitForFunction(
      () => document.getElementById('out')?.textContent?.includes('[2/'),
      null, { timeout: 15000 }
    );

    // Puzzle 2: adevarat/fals "Adevarat"
    await page.locator('#cmd').fill('Adevarat');
    await page.locator('#cmd').press('Enter');
    await page.waitForFunction(
      () => (document.getElementById('out')?.textContent?.match(/ACCES PERMIS/g) ?? []).length >= 2,
      null, { timeout: 15000 }
    );

    // Asteapta puzzle 3
    await page.waitForFunction(
      () => document.getElementById('out')?.textContent?.includes('[3/'),
      null, { timeout: 15000 }
    );

    // Puzzle 3: variante - "1" = Paris (prima optiune numerotata)
    await page.locator('#cmd').fill('1');
    await page.locator('#cmd').press('Enter');

    // Asteapta textul de finale.
    // IMPORTANT: textul e "E V A D A R E  R E U S I T A" (litere cu spatii intre ele)!
    await page.waitForFunction(
      () => document.getElementById('out')?.textContent?.includes('E V A D A R E'),
      null, { timeout: 20000 }
    );

    // Cuvantul magic "DAR" apare ca "D A R" (spaced) — verifica fiecare litera
    const outText = await page.locator('#out').innerText();
    expect(outText).toMatch(/D\s+A\s+R/);

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

  test('exemplu-arcade.html — rezolvat pana la ecranul final', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('exemplu-arcade.html'));

    // Asteapta initializarea canvas + API-urilor de puzzle
    await page.waitForFunction(
      () => typeof openPuzzle !== 'undefined' && typeof onDoorSolved !== 'undefined',
      { timeout: 5000 }
    );

    const puzzles = await page.evaluate(() => CFG.puzzles);

    // Rezolva fiecare puzzle prin API-ul modal (simuleaza interactiunea cu usile)
    for (let i = 0; i < puzzles.length; i++) {
      await page.evaluate((idx) => openPuzzle(idx, onDoorSolved), i);
      await solveModal(page, puzzles[i]);
    }

    // Toate puzzle-urile rezolvate → trigger final (simuleaza ajungerea la cufar)
    await page.evaluate(() => showFinal());
    await expect(page.locator('#fOverlay')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#fWord')).toContainText('D');

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

  test('exemplu-chat.html — rezolvat pana la ecranul final', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('exemplu-chat.html'));

    // Asteapta ca intro-ul (Salut + poveste + "Ma ajuti?") sa termine
    // si primul puzzle (free) sa apara cu input in composer
    await page.waitForFunction(
      () => document.getElementById('composer')?.querySelector('input') !== null,
      { timeout: 20000 }
    );

    // Puzzle 1: raspuns liber "56"
    await page.locator('#composer input').fill('56');
    await page.locator('#composer button:not(.chip)').first().click(); // "Trimite"
    // Asteapta confirmarea "Asta era!"
    await page.waitForFunction(
      () => document.getElementById('msgs')?.textContent?.includes('Asta era'),
      { timeout: 12000 }
    );

    // Puzzle 2: tf — asteapta chip-ul "Adevarat"
    await page.waitForFunction(
      () => {
        const c = document.getElementById('composer');
        return c && [...c.querySelectorAll('button.chip')]
          .some(b => b.textContent.trim() === 'Adevarat');
      },
      { timeout: 15000 }
    );
    await page.locator('#composer button.chip:text("Adevarat")').click();
    await page.waitForFunction(
      () => (document.getElementById('msgs')?.textContent?.match(/Asta era/g) ?? []).length >= 2,
      { timeout: 12000 }
    );

    // Puzzle 3: choice — asteapta chip-ul "Paris"
    await page.waitForFunction(
      () => {
        const c = document.getElementById('composer');
        return c && [...c.querySelectorAll('button.chip')]
          .some(b => b.textContent.trim() === 'Paris');
      },
      { timeout: 15000 }
    );
    await page.locator('#composer button.chip:text("Paris")').click();

    // Asteapta overlay-ul final
    await expect(page.locator('#fOverlay')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#fWord')).toContainText('D');

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

  test('exemplu-point.html — rezolvat pana la ecranul final', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('exemplu-point.html'));

    // Asteapta randarea scenei SVG cu obiectele "hot"
    await page.waitForFunction(
      () => typeof openPuzzle !== 'undefined' && document.querySelectorAll('g.hot').length > 0,
      { timeout: 5000 }
    );

    const puzzles = await page.evaluate(() => CFG.puzzles);

    // Click fiecare obiect hot si rezolva puzzle-ul din modal
    for (let i = 0; i < puzzles.length; i++) {
      await page.locator(`g.hot[data-i="${i}"]`).click();
      await solveModal(page, puzzles[i]);
    }

    // Toate rezolvate → usa se deschide → click pe usa → ecranul final
    await expect(page.locator('#door')).toHaveClass(/open/, { timeout: 3000 });
    await page.locator('#door').click();
    await expect(page.locator('#fOverlay')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#fWord')).toContainText('D');

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════
// SECTIUNEA 2 — EDGE CASES (rulabile acum, fara campanie)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Edge cases @regresie', () => {

  test('import JSON corupt — fara crash, builder ramane functional', async ({ page }) => {
    const errors = trackErrors(page);

    // Dismiss alert-ul de eroare
    page.on('dialog', d => d.accept());

    await page.goto(fileURL('escape-builder.html'));

    // Scrie un fisier JSON corupt temporar si incarca-l
    const tmpPath = join(ROOT, 'tests', '.tmp-corrupt-test.json');
    writeFileSync(tmpPath, '{"title":"test","puzzles":[{INVALID_JSON_HERE}]}');

    try {
      await page.locator('#fileLoad').setInputFiles(tmpPath);
      await page.waitForTimeout(600); // asteapta alert + dismiss
    } finally {
      unlinkSync(tmpPath);
    }

    // Builder-ul trebuie sa fie in continuare functional
    await expect(page.locator('#gTitle')).toBeVisible();
    await expect(page.locator('#addPuzzle')).toBeVisible();
    // Starea existenta trebuie pastrata (nu resetata la corupt)
    const title = await page.locator('#gTitle').inputValue();
    expect(title.length).toBeGreaterThan(0);

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

  // Assert 320x568 fara overflow orizontal per stil (§Design pct. 11)
  for (const stil of ['clasic', 'terminal', 'arcade', 'chat', 'point']) {
    test(`320x568 fara overflow orizontal — ${stil}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      const errors = trackErrors(page);

      await page.goto(fileURL(`exemplu-${stil}.html`));
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 1
      );
      expect(overflow, `Overflow orizontal la 320x568 in exemplu-${stil}`).toBe(false);

      expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
    });
  }

  test('regenerare demo-uri via gameHTML — fara erori de consola', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));

    // Verifica ca gameHTML genereaza HTML valid si fara erori pentru fiecare stil
    const styles = ['classic', 'terminal', 'arcade', 'chat', 'point'];
    const singlePuzzle = {
      title: 'Q1', type: 'free', question: 'Test?', answer: 'da',
      tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'T'
    };

    for (const style of styles) {
      const html = await page.evaluate((args) => {
        return gameHTML({
          title: 'Test ' + args.style, player: 'Tester', color: '#6d28d9',
          style: args.style, charName: 'Alex',
          story: 'Poveste test.', finalMessage: 'Bravo!',
          puzzles: [args.puzzle]
        });
      }, { style, puzzle: singlePuzzle });

      // Verificari de baza pe stringul HTML generat
      expect(typeof html, `${style}: gameHTML nu a returnat string`).toBe('string');
      expect(html, `${style}: lipseste doctype`).toContain('<!doctype html');
      expect(html, `${style}: contine "undefined"`).not.toContain('>undefined<');

      // Incarca in pagina noua si verifica absenta erorilor
      const genPage = await page.context().newPage();
      const genErrors = [];
      genPage.on('console', m => { if (m.type() === 'error') genErrors.push(m.text()); });
      genPage.on('pageerror', e => genErrors.push(e.message));

      await genPage.setContent(html, { waitUntil: 'domcontentloaded' });
      await genPage.waitForTimeout(500);

      expect(genErrors, `${style} gameHTML erori:\n${genErrors.join('\n')}`).toHaveLength(0);
      await genPage.close();
    }

    expect(errors, 'Builder erori:\n' + errors.join('\n')).toHaveLength(0);
  });

  test('builder: JSON cu tip puzzle necunoscut → normalizat, fara crash', async ({ page }) => {
    const errors = trackErrors(page);
    page.on('dialog', d => d.accept());

    await page.goto(fileURL('escape-builder.html'));

    // Incarca JSON cu tip invalid si choices non-string
    const tmpPath = join(ROOT, 'tests', '.tmp-invalid-type.json');
    writeFileSync(tmpPath, JSON.stringify({
      title: 'Test normalizare',
      style: 'classic',
      color: '#6d28d9',
      charName: 'X',
      story: 'S',
      finalMessage: 'F',
      puzzles: [
        { title: 'P1', type: 'INVALID_TYPE', question: 'Q?', answer: 'A',
          tfAnswer: 'Adevarat', choices: 42, hint: null, letter: 'X' }
      ]
    }));

    try {
      await page.locator('#fileLoad').setInputFiles(tmpPath);
      await page.waitForTimeout(600);
    } finally {
      unlinkSync(tmpPath);
    }

    // Builder-ul trebuie sa ramana functional (nu crash)
    await expect(page.locator('#gTitle')).toBeVisible();
    await expect(page.locator('#addPuzzle')).toBeVisible();

    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════
// SECTIUNEA 3 — CAMPANIE E2E
//
// *** SKIP pana cand integrator anunta implementarea gata ***
// Dupa: schimba `test.skip(true, ...)` → `test.skip(false)` sau sterge linia.
//
// Contractul documentat in plan:
//   - gameCampaign(cfg) genereaza HTML cu iframe per camera
//   - Fiecare camera apeleaza parent.nextRoom({idx, stars, letter})
//   - parent.roomReady() semnaledaza montarea cu succes
//   - parent.roomError(idx, msg) declanseaza skip cu 0 stele
//   - Timeout 4s fara roomReady → camera moarta → skip
//   - CFG._campaign = {idx, total, stars, letters, deadline} in fiecare camera
//   - Replace token: TPL.replace('__CFG__', () => json) (D1: evita $&)
//   - safeStore (try/catch) pentru resume (D3)
//   - Hash djb2 peste CFG embedat la export (D11)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Campanie E2E @campanie', () => {

  /** Helper: genereaza un cfg de campanie cu N puzzle-uri, stiluri rotite. */
  function campaignCfg(n = 5) {
    const styles = ['classic', 'terminal', 'arcade', 'chat', 'point'];
    return {
      title: 'Test Campanie ' + n, player: 'Tester', color: '#6d28d9',
      style: 'campaign', charName: 'Alex',
      story: 'O campanie de test cu ' + n + ' camere.',
      finalMessage: 'Ai terminat campania!',
      puzzles: Array.from({ length: n }, (_, i) => ({
        title: 'Camera ' + (i + 1),
        type: 'free',
        question: 'Raspunde ' + (i + 1),
        answer: 'r' + (i + 1),
        tfAnswer: 'Adevarat',
        choices: '',
        hint: '',
        letter: String.fromCharCode(65 + (i % 26)),
        style: styles[i % 5]
      }))
    };
  }

  test('campanie E2E — intro → camere cu stiluri rotite → final cu stele+litere+cuvant corect @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta gameCampaign de la integrator — ster skip dupa');
      const errors = trackErrors(page);
      await page.goto(fileURL('escape-builder.html'));

      const cfg = campaignCfg(5);
      const html = await page.evaluate((c) => {
        if (typeof gameCampaign !== 'function') throw new Error('gameCampaign not yet');
        return gameHTML(c);
      }, cfg);

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);
      await gp.setContent(html, { waitUntil: 'domcontentloaded' });

      // Intro campanie
      await gp.locator('button:text("Incepe aventura")').click();

      // Parcurge 5 camere, fiecare in stilul ei rotat
      const styles = ['classic', 'terminal', 'arcade', 'chat', 'point'];
      for (let i = 0; i < 5; i++) {
        const answer = 'r' + (i + 1);
        const style = styles[i % 5];

        // Asteapta roomReady → camera montata
        await gp.waitForFunction(
          () => document.querySelector('[data-room-ready="true"]') !== null ||
                document.querySelector('iframe.room-ready') !== null,
          { timeout: 8000 }
        );

        // Raspunde in camera curenta (prin iframe)
        const iframeLocator = gp.frameLocator('iframe[data-room]').last();

        if (style === 'classic') {
          await iframeLocator.locator('#btnStart').click();
          await iframeLocator.locator('#answers input').fill(answer);
          await iframeLocator.locator('#answers button:text("Verifica")').click();
        } else if (style === 'terminal') {
          await gp.waitForFunction(() => true); // terminal necesita interactiune specifica
          await iframeLocator.locator('#cmd').fill(answer);
          await iframeLocator.locator('#cmd').press('Enter');
        }
        // Alte stiluri: similar

        // Asteapta nextRoom apelat → apare coridorul
        if (i < 4) {
          await gp.waitForSelector('button:text("Deschide usa")', { timeout: 10000 });
          // Verifica stele si litera in coridor
          await expect(gp.locator('[data-stars], .stars, .stele')).toBeVisible({ timeout: 3000 });
          // Click "Deschide usa"
          await gp.locator('button:text("Deschide usa")').click();
        }
      }

      // Ecranul final
      await expect(gp.locator('#fOverlay, [data-final]')).toBeVisible({ timeout: 10000 });
      // Cuvantul magic = ABCDE (primele 5 litere)
      const finalText = await gp.content();
      expect(finalText).toMatch(/A.*B.*C.*D.*E/);

      expect(gameErrors, 'Game errors: ' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, 'Builder errors: ' + errors.join('\n')).toHaveLength(0);
    });

  test('resume — reload mid-campanie returneaza la coridor (safeStore D3+D11) @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta safeStore+hash din T7 de la integrator');
      const errors = trackErrors(page);
      await page.goto(fileURL('escape-builder.html'));

      const cfg = campaignCfg(3);
      const html = await page.evaluate((c) => gameHTML(c), cfg);

      const gp = await page.context().newPage();
      await gp.setContent(html, { waitUntil: 'domcontentloaded' });

      // Start si completa camera 1 (progreseaza dincolo de ea)
      await gp.locator('button:text("Incepe aventura")').click();
      // ... rezolva camera 1 ...
      await gp.waitForSelector('button:text("Deschide usa")', { timeout: 12000 });

      // Reload mid-campanie (inainte de camera 2)
      await gp.reload();

      // Trebuie sa se reia la coridor, NU la intro
      await expect(gp.locator('button:text("Deschide usa")')).toBeVisible({ timeout: 5000 });
      // Intro-ul NU trebuie sa fie vizibil
      const hasIntro = await gp.locator('button:text("Incepe aventura")').isVisible();
      expect(hasIntro).toBe(false);

      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('camera moarta — template stricat → skip 0 stele + cod eroare vizibil @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta roomReady/roomError+timeout T3 de la integrator');
      // Contractul: un template de camera care arunca eroare inainte de roomReady
      // → coridorul afiseaza "usa intepenita" cu:
      //   - 0 stele
      //   - cod eroare "stil·idx" monospace mic
      //   - buton "Sari la camera urmatoare"
      //
      // La export final: litera camerei sarite = dala goala cu lakat.
      const errors = trackErrors(page);
      await page.goto(fileURL('escape-builder.html'));

      const cfg = campaignCfg(3);
      const html = await page.evaluate((c) => gameHTML(c), cfg);

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);
      await gp.setContent(html, { waitUntil: 'domcontentloaded' });

      await gp.locator('button:text("Incepe aventura")').click();

      // Injecteaza o eroare in prima camera dupa montare
      await gp.waitForFunction(
        () => document.querySelector('iframe[data-room]') !== null,
        { timeout: 6000 }
      );
      await gp.evaluate(() => {
        const iframe = document.querySelector('iframe[data-room]');
        if (iframe?.contentWindow) {
          iframe.contentWindow.dispatchEvent(new ErrorEvent('error', {
            message: 'Template stricat', error: new Error('Template stricat')
          }));
        }
      });

      // Coridorul trebuie sa arate "usa intepenita" cu 0 stele si cod eroare
      await expect(gp.locator(':text("intepenita"), :text("Sari")')).toBeVisible({ timeout: 8000 });
      const corridorText = await gp.content();
      expect(corridorText).toMatch(/classic[·.]0|terminal[·.]0|arcade[·.]0/i); // cod eroare

      // Stars = 0 pentru camera sarita
      await expect(gp.locator(':text("0 ★"), :text("0/")').first()).toBeVisible();

      expect(gameErrors.filter(e => !e.includes('Template stricat')), gameErrors.join('\n'))
        .toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('eroare post-ready — acelasi skip ca camera moarta @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta roomError semantic ORICAND T3+D5 de la integrator');
      // Camera apeleaza roomReady() dar arunca o eroare async mai tarziu
      // → acelasi overlay "usa intepenita" ca si camera moarta
      // Specificat in plan: "roomError are semantica ORICAND — si post-ready"
    });

  test('dublu-click "Deschide usa" — idempotent (fara stare corupta) @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta guard idempotenta T4+D5 de la integrator');
      // Doua click-uri rapide pe "Deschide usa" NU trebuie:
      //   - sa monteze doua camere
      //   - sa corupte idx-ul activ
      //   - sa dupleze apelurile nextRoom
      // Specificat in plan: butonul dezactivat dupa primul click; nextRoom ignorat pt idx deja incheiat
    });

  test('intrebare cu $/$& in text — camera se monteaza corect (D1 replace-functie) @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta replace(TOKEN, () => json) D1 de la integrator');
      const errors = trackErrors(page);
      await page.goto(fileURL('escape-builder.html'));

      // Puzzle cu $ si & in intrebare (ar corupe JSON-ul daca replace e string)
      const cfg = {
        ...campaignCfg(1),
        puzzles: [{
          title: 'Dollar test', type: 'free',
          question: 'Costa $10.00 & $& mai mult?',
          answer: 'da', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'X',
          style: 'classic'
        }]
      };

      const html = await page.evaluate((c) => gameHTML(c), cfg);

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);
      await gp.setContent(html, { waitUntil: 'domcontentloaded' });

      // Asteapta montarea camerei (roomReady)
      await gp.waitForFunction(
        () => document.querySelector('iframe[data-room]')?.contentDocument != null,
        { timeout: 5000 }
      );

      // CFG.puzzles[0].question trebuie sa fie intact
      const question = await gp.evaluate(() => {
        const iframe = document.querySelector('iframe[data-room]');
        return iframe?.contentWindow?.CFG?.puzzles?.[0]?.question ?? '';
      });
      expect(question).toContain('$10.00');
      expect(question).toContain('$&');

      expect(gameErrors, gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('campanie 8+ camere — beep functional pana la final @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta gameCampaign + parent.beep D2 de la integrator');
      // Cu 8 camere (peste limita de 5 stiluri), beep() trebuie sa functioneze
      // in toate camerele fara sa depaseasca limita de AudioContext a browser-ului.
      // Specificat in plan: audio detinut de parinte; camerele apeleaza parent.beep(ok).
    });

  test('campanie: 320x568 fara overflow orizontal (chrome 40px + calc(100vh-chrome)) @campanie',
    async ({ page }) => {
      test.skip(true, 'Asteapta chrome bar + buget vertical T6+TD4 de la integrator');
      await page.setViewportSize({ width: 320, height: 568 });
      const errors = trackErrors(page);
      await page.goto(fileURL('escape-builder.html'));

      const cfg = campaignCfg(2);
      const html = await page.evaluate((c) => gameHTML(c), cfg);

      const gp = await page.context().newPage();
      await gp.setViewportSize({ width: 320, height: 568 });
      const gpErrors = trackErrors(gp);
      await gp.setContent(html, { waitUntil: 'domcontentloaded' });
      await gp.waitForTimeout(500);

      // Zero scroll orizontal (§Design pct. 11)
      const overflow = await gp.evaluate(
        () => document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 1
      );
      expect(overflow, 'Overflow orizontal la 320x568 in campanie').toBe(false);

      // Chrome 40px sub 600px (§Design pct. 11)
      const chromeHeight = await gp.evaluate(() => {
        const chrome = document.querySelector('[data-chrome], .campaign-chrome, #chrome');
        return chrome ? chrome.getBoundingClientRect().height : null;
      });
      if (chromeHeight !== null) {
        expect(chromeHeight, 'Chrome > 40px la 320px').toBeLessThanOrEqual(40);
      }

      expect(gpErrors, gpErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

});
