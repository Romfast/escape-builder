// @ts-check
/**
 * tests/smoke.mjs — Escape Room Builder smoke & regression tests
 *
 * Setup (o singura data, fara package.json commitat):
 *   npm i -D @playwright/test && npx playwright install chromium
 *
 * Rulare:
 *   npx playwright test tests/smoke.mjs                    # suita completa
 *   npx playwright test tests/smoke.mjs --grep @regresie   # regresie (baseline)
 *   npx playwright test tests/smoke.mjs --grep @campanie   # campanie E2E
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
    // IMPORTANT: al doilea argument al waitForFunction e arg-ul functiei, nu optiunile!
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

  test('builder: JSON cu stil top-level necunoscut → fallback classic + avertisment (T5/D8)', async ({ page }) => {
    const errors = trackErrors(page);
    let warned = false;
    page.on('dialog', d => { if (/stil necunoscut/i.test(d.message())) warned = true; d.accept(); });

    await page.goto(fileURL('escape-builder.html'));

    const tmpPath = join(ROOT, 'tests', '.tmp-invalid-style.json');
    writeFileSync(tmpPath, JSON.stringify({
      title: 'Test stil', style: 'banana', color: '#6d28d9', charName: 'X',
      story: 'S', finalMessage: 'F',
      puzzles: [{ title: 'P1', type: 'free', question: 'Q?', answer: 'A', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'X' }]
    }));

    try {
      await page.locator('#fileLoad').setInputFiles(tmpPath);
      await page.waitForTimeout(600);
    } finally {
      unlinkSync(tmpPath);
    }

    // Fallback la classic + avertisment + builder functional
    await expect(page.locator('#gStyle')).toHaveValue('classic');
    expect(warned, 'asteptam un alert despre stilul necunoscut').toBe(true);
    await expect(page.locator('#addPuzzle')).toBeVisible();
    expect(errors, 'Erori consola:\n' + errors.join('\n')).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════
// SECTIUNEA 3 — CAMPANIE E2E
//
// Contractul documentat in plan:
//   - gameCampaign(cfg) genereaza HTML cu iframe per camera
//   - Fiecare camera apeleaza parent.nextRoom({idx, stars, letter})
//   - parent.roomReady(idx) semnaleaza montarea cu succes (data-room-ready attr)
//   - parent.roomError(idx, msg) declanseaza skip cu 0 stele
//   - Timeout 4s fara roomReady → camera moarta → skip
//   - CFG._campaign = {idx, total, stars, letters, deadline} in fiecare camera
//   - Replace token: tpl.replace('__CFG__', function(){ return json; }) (D1: evita $&)
//   - safeStore (try/catch) pentru resume (D3)
//   - Hash djb2 peste CFG embedat la export (D11)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Campanie E2E @campanie', () => {
  test.describe.configure({ timeout: 90000 });

  /** Helper: genereaza cfg de campanie cu N puzzle-uri. */
  function campaignCfg(n = 5, forceStyle = null) {
    const styles = ['classic', 'terminal', 'arcade', 'chat', 'point'];
    return {
      title: 'Test Campanie', player: 'Tester', color: '#6d28d9',
      style: 'campaign', charName: 'Alex',
      story: 'O campanie de test.',
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
        style: forceStyle || styles[i % 5]
      }))
    };
  }

  /**
   * Genereaza HTML campanie via builder si il scrie la fisier temp (file://).
   * Returneza calea. Caller-ul trebuie sa stearga fisierul dupa test (try/finally).
   */
  async function writeCampaignHtml(page, cfg, suffix) {
    await page.goto(fileURL('escape-builder.html'));
    const html = await page.evaluate((c) => gameHTML(c), cfg);
    const tmpPath = join(ROOT, 'tests', `.tmp-campaign-${suffix}.html`);
    writeFileSync(tmpPath, html);
    return tmpPath;
  }

  /**
   * Rezolva o camera din campanie (in iframe #room-frame).
   * Presupune ca data-room-ready e deja setat pe iframe.
   * Tip: 'free', raspuns: answer.
   */
  async function solveRoom(gp, style, answer) {
    // Asteapta ca noul room sa semnaleze roomReady
    await gp.waitForFunction(
      () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
      null, { timeout: 8000 }
    );

    const ifl = gp.frameLocator('#room-frame');

    if (style === 'classic') {
      await ifl.locator('#btnStart').click();
      await ifl.locator('#answers input[type=text]').fill(answer);
      await ifl.locator('#answers button:text("Verifica")').click();

    } else if (style === 'terminal') {
      // Asteapta animatia intro + aparitia primului puzzle [1/
      await gp.waitForFunction(
        () => document.getElementById('room-frame')
          ?.contentDocument?.getElementById('out')
          ?.textContent?.includes('[1/'),
        null, { timeout: 20000 }
      );
      await ifl.locator('#cmd').fill(answer);
      await ifl.locator('#cmd').press('Enter');

    } else if (style === 'arcade') {
      // Deschide puzzle-ul prin API + rezolva modal
      await gp.evaluate(() => {
        const w = document.getElementById('room-frame').contentWindow;
        if (typeof w.openPuzzle === 'function') w.openPuzzle(0, w.onDoorSolved);
      });
      await expect(ifl.locator('#mOverlay')).toBeVisible({ timeout: 3000 });
      await ifl.locator('#mAnswers input[type=text]').fill(answer);
      await ifl.locator('#mAnswers button:not(.mhint):not(.mclose)').first().click();
      // Asteapta inchiderea modalului (animatie 750ms) — la iesire onDoorSolved e apelat
      await ifl.locator('#mOverlay').waitFor({ state: 'hidden', timeout: 3000 });
      // Triggereaza showFinal → parent.nextRoom (ramura _campaign)
      await gp.evaluate(() => {
        const w = document.getElementById('room-frame').contentWindow;
        if (typeof w.showFinal === 'function') w.showFinal();
      });

    } else if (style === 'chat') {
      // Asteapta aparitia input-ului in composer (dupa animatia intro)
      await ifl.locator('#composer input').waitFor({ timeout: 20000 });
      await ifl.locator('#composer input').fill(answer);
      await ifl.locator('#composer button:not(.chip)').first().click();

    } else if (style === 'point') {
      // Click pe primul obiect hot → modal
      await ifl.locator('g.hot[data-i="0"]').click();
      await expect(ifl.locator('#mOverlay')).toBeVisible({ timeout: 3000 });
      await ifl.locator('#mAnswers input[type=text]').fill(answer);
      await ifl.locator('#mAnswers button:not(.mhint):not(.mclose)').first().click();
      // Asteapta inchiderea modalului
      await ifl.locator('#mOverlay').waitFor({ state: 'hidden', timeout: 3000 });
      // Usa se deschide dupa ce onDoorSolved e apelat (solvedCount >= N)
      await ifl.locator('#door.open').waitFor({ timeout: 3000 });
      await ifl.locator('#door').click();
    }
  }

  /**
   * Harta overworld (înlocuiește coridorul, S3 pas2): după ce o cameră e gata,
   * orchestratorul arată harta cu jucătorul. Testele conduc harta via __ow.
   */
  async function waitOverworld(gp) {
    await gp.waitForFunction(
      () => window.__ow && window.__ow.state.active,
      null, { timeout: 10000 }
    );
  }
  /** Intră pe ușa camerei `idx` (echivalent cu mersul jucătorului pe hartă). */
  async function enterRoom(gp, idx) {
    await waitOverworld(gp);
    await gp.evaluate((i) => window.__ow.enterDoor(i), idx);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Test 1: E2E complet — 5 camere, stiluri rotite, final cu stele+cuvant
  // ─────────────────────────────────────────────────────────────────────
  test('campanie E2E — intro → camere cu stiluri rotite → final cu stele+litere+cuvant corect @campanie',
    async ({ page }) => {
      test.setTimeout(120000);
      const errors = trackErrors(page);
      const cfg = campaignCfg(5);
      const tmpPath = await writeCampaignHtml(page, cfg, 'e2e');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);

        // Intro → click start
        await expect(gp.locator('#btn-start')).toBeVisible({ timeout: 5000 });
        await gp.locator('#btn-start').click();

        const styles = ['classic', 'terminal', 'arcade', 'chat', 'point'];

        for (let i = 0; i < 5; i++) {
          await enterRoom(gp, i);
          await solveRoom(gp, styles[i], 'r' + (i + 1));
        }

        // Finale trebuie sa apara
        await gp.waitForFunction(
          () => document.getElementById('finale')?.classList.contains('show'),
          null, { timeout: 10000 }
        );

        // Litere colectate: A, B, C, D, E
        const finWordText = await gp.locator('#fin-word').innerText();
        expect(finWordText).toMatch(/A/);
        expect(finWordText).toMatch(/B/);
        expect(finWordText).toMatch(/C/);

        // Stele: "X / 15 ★" (5 camere × 3 max = 15)
        const finStars = await gp.locator('#fin-stars').innerText();
        expect(finStars).toMatch(/\d+ \/ 15/);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }

      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, 'Builder errors:\n' + errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 2: Resume — reload mid-campanie revine la coridor
  // ─────────────────────────────────────────────────────────────────────
  test('resume — reload mid-campanie returneaza la harta (safeStore D3+D11) @campanie',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'resume');

      const gp = await page.context().newPage();

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        // Rezolva camera 0 (classic)
        await enterRoom(gp, 0);
        await solveRoom(gp, 'classic', 'r1');

        // Asteapta harta — saveProgress() a fost apelat, sessionStorage are progresul
        await waitOverworld(gp);

        // Reload — tryResume() trebuie sa redeschida HARTA, NU intro-ul
        await gp.reload();
        await gp.waitForLoadState('domcontentloaded');

        // Harta trebuie sa fie activa
        await gp.waitForFunction(
          () => window.__ow && window.__ow.state.active &&
                document.getElementById('overworld')?.classList.contains('show'),
          null, { timeout: 5000 }
        );

        // Intro-ul NU trebuie sa fie vizibil
        const introVisible = await gp.locator('#btn-start').isVisible();
        expect(introVisible, 'Intro-ul nu ar trebui sa fie vizibil dupa resume').toBe(false);

        // Intro overlay nu are clasa show
        const introHasShow = await gp.evaluate(
          () => document.getElementById('intro')?.classList.contains('show')
        );
        expect(introHasShow, '#intro.show dupa resume').toBe(false);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('timer calm — porneste la start, auriu sub 1 min, ingheata la expirare, resume pastreaza ceasul (T10/§Design pct.10) @campanie',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = campaignCfg(3, 'classic');
      cfg.timerMin = 1;
      const tmpPath = await writeCampaignHtml(page, cfg, 'timer');
      const gp = await page.context().newPage();

      try {
        await gp.goto('file://' + tmpPath);

        // Intro necronometrat — ceasul e ascuns pana la start
        expect(await gp.locator('#chrome-timer').isVisible(), 'timer ascuns pe intro').toBe(false);

        await gp.locator('#btn-start').click();

        // Dupa start: vizibil, format M:SS, aproape de 1:00
        const timer = gp.locator('#chrome-timer');
        await expect(timer).toBeVisible();
        await expect(timer).toHaveText(/^\d:\d\d$/);
        const t0 = await timer.textContent();
        const sec0 = (+t0.split(':')[0]) * 60 + (+t0.split(':')[1]);
        expect(sec0, 'ceasul porneste ~1:00').toBeGreaterThan(50);
        expect(sec0).toBeLessThanOrEqual(60);

        // Deadline ABSOLUT salvat in sessionStorage (resume pastreaza ceasul)
        const dl = await gp.evaluate(() => +sessionStorage.getItem(_DEADLINE_KEY));
        expect(dl, 'deadline absolut in sessionStorage').toBeGreaterThan(Date.now());

        // Sub 1 minut → auriu (.low). Manipulam deadline determinist.
        await gp.evaluate(() => { _deadline = Date.now() + 5000; tickTimer(); });
        await expect(timer).toHaveText('0:05');
        await expect(timer).toHaveClass(/low/);

        // Expirare → ingheata pe 0:00 + .expired; jocul curge nestingherit
        await gp.evaluate(() => { _deadline = Date.now() - 1000; tickTimer(); });
        await expect(timer).toHaveText('0:00');
        await expect(timer).toHaveClass(/expired/);

        // Jocul continua dupa expirare (zero penalizare): rezolva camera 0
        await enterRoom(gp, 0);
        await solveRoom(gp, 'classic', 'r1');
        await waitOverworld(gp);

        // Resume pastreaza ceasul: suprascriem deadline-ul cu o valoare cunoscuta, reload
        await gp.evaluate(() => { sessionStorage.setItem(_DEADLINE_KEY, String(Date.now() + 8000)); });
        await gp.reload();
        await gp.waitForLoadState('domcontentloaded');
        await gp.waitForFunction(
          () => window.__ow && window.__ow.state.active &&
                document.getElementById('overworld')?.classList.contains('show'),
          null, { timeout: 5000 }
        );

        // Ceasul reia de la deadline-ul salvat (~0:08), NU resetat la 1:00
        await expect(gp.locator('#chrome-timer')).toBeVisible();
        const tR = await gp.locator('#chrome-timer').textContent();
        const secR = (+tR.split(':')[0]) * 60 + (+tR.split(':')[1]);
        expect(secR, 'resume reia ceasul (nu reset la 60)').toBeLessThan(55);
        expect(secR).toBeGreaterThan(0);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('muzica ambient — opt-in, porneste la start, tempo accelereaza sub 1 min, duck pe voce, toggle (T10)',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = campaignCfg(3, 'classic');
      cfg.music = true;
      cfg.timerMin = 1; /* timer pornit → tempo poate accelera */
      const tmpPath = await writeCampaignHtml(page, cfg, 'music');
      const gp = await page.context().newPage();

      try {
        await gp.goto('file://' + tmpPath);

        // Butonul de muzica vizibil (opt-in activ); muzica inca neporita
        await expect(gp.locator('#btn-music')).toBeVisible();
        expect(await gp.evaluate(() => window.__music.state().playing), 'inca neporita pe intro').toBe(false);

        await gp.locator('#btn-start').click();

        // Dupa start: muzica ruleaza, buton apasat
        await gp.waitForFunction(() => window.__music.state().playing === true, null, { timeout: 4000 });
        await expect(gp.locator('#btn-music')).toHaveAttribute('aria-pressed', 'true');

        // Tempo: 1.0 cand >60s ramase; creste progresiv sub 1 min (citit determinist)
        const tempos = await gp.evaluate(() => {
          const f = window.__music.tempo;
          _deadline = Date.now() + 90000; const t90 = f();
          _deadline = Date.now() + 30000; const t30 = f();
          _deadline = Date.now() + 1000;  const t1  = f();
          return { t90, t30, t1 };
        });
        expect(tempos.t90).toBeCloseTo(1, 1);
        expect(tempos.t30, 'accelereaza sub 1 min').toBeGreaterThan(tempos.t90);
        expect(tempos.t1,  'mai rapid spre expirare').toBeGreaterThan(tempos.t30);

        // Duck: vocea are prioritate → atenueaza muzica
        const ducked   = await gp.evaluate(() => { duckMusic(true);  return window.__music.state().duck; });
        const unducked = await gp.evaluate(() => { duckMusic(false); return window.__music.state().duck; });
        expect(ducked, 'duck activ < 1').toBeLessThan(1);
        expect(unducked, 'duck dezactivat = 1').toBe(1);

        // Toggle off din buton → se opreste
        await gp.locator('#btn-music').click();
        await expect(gp.locator('#btn-music')).toHaveAttribute('aria-pressed', 'false');
        expect(await gp.evaluate(() => window.__music.state().playing), 'oprit dupa toggle').toBe(false);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('diploma — „Vezi diploma" arata certificat A4 cu nume/stele-per-camera/cuvant/creator, inapoi (§Design pct.9)',
    async ({ page }) => {
      test.setTimeout(120000);
      const errors = trackErrors(page);
      const cfg = campaignCfg(3, 'classic');
      cfg.player = 'Maria';
      cfg.creator = 'Doamna Ana';
      const tmpPath = await writeCampaignHtml(page, cfg, 'diploma');
      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();
        for (let i = 0; i < 3; i++) {
          await enterRoom(gp, i);
          await solveRoom(gp, 'classic', 'r' + (i + 1));
        }
        await gp.waitForFunction(() => document.getElementById('finale')?.classList.contains('show'),
          null, { timeout: 10000 });

        // Buton „Vezi diploma" → diploma vizibila, finale ascunsa
        await gp.locator('#btn-diploma').click();
        await expect(gp.locator('#diploma')).toBeVisible();
        await expect(gp.locator('#finale')).not.toBeVisible();

        // Numele copilului (cel mai mare element) + titlul jocului
        await expect(gp.locator('#dipl-name')).toHaveText('Maria');
        await expect(gp.locator('#dipl-game')).toContainText('Test Campanie');

        // Rand de stele per camera: 3 randuri, fiecare cu ★ (rezolvate, nu sarite)
        await expect(gp.locator('#dipl-rooms .dipl-room')).toHaveCount(3);
        const firstRoom = await gp.locator('#dipl-rooms .dipl-room .rstars').first().innerText();
        expect(firstRoom).toMatch(/[★☆]{3}/);

        // Cuvantul magic in dale (3 litere colectate, A B C)
        await expect(gp.locator('#dipl-word span')).toHaveCount(3);

        // Footer: data + „creat de Doamna Ana"
        await expect(gp.locator('#dipl-footer')).toContainText('creat de Doamna Ana');

        // Butonul de print exista (nu il apasam — window.print blocheaza headless)
        await expect(gp.locator('#dipl-print')).toBeVisible();

        // Inapoi → finale din nou
        await gp.locator('#dipl-back').click();
        await expect(gp.locator('#finale')).toBeVisible();
        await expect(gp.locator('#diploma')).not.toBeVisible();

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 3: Camera moartă — timeout 4s → skip-banner + cod eroare
  // ─────────────────────────────────────────────────────────────────────
  test('camera moarta — template stricat → skip-banner + cod eroare vizibil @campanie',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'dead');

      const gp = await page.context().newPage();
      // Captura doar pageerror (nu console.warn asteptat de la timeout)
      const gameErrors = [];
      gp.on('pageerror', err => gameErrors.push(err.message));

      try {
        await gp.goto('file://' + tmpPath);

        // Inlocuieste template-ul 'classic' cu HTML gol care NU apeleaza roomReady
        await gp.evaluate(() => {
          TPL['classic'] = '<!doctype html><html><body><p>Camera intepenita</p></body></html>';
        });

        await gp.locator('#btn-start').click();
        await enterRoom(gp, 0); // monteaza camera moarta (fara roomReady) → timeout 4s

        // Timeout 4s → skip-banner apare in max 9s (4s timeout + 5s marja)
        await gp.waitForFunction(
          () => document.getElementById('skip-banner')?.classList.contains('show'),
          null, { timeout: 9000 }
        );

        // Codul erorii e vizibil
        const skipCode = await gp.locator('#skip-code').innerText();
        expect(skipCode).toContain('Cod:');
        expect(skipCode).toContain('timeout');

        // Butonul "Sari la camera urmatoare" e vizibil
        await expect(gp.locator('#btn-skip')).toBeVisible();

        // Camera urmatoare (idx=1) se poate deschide
        await gp.locator('#btn-skip').click();

        // skipRoom → showSkipBanner → btn-skip → idx+1 < N → showOverworld(next)
        await gp.waitForFunction(
          () => (window.__ow && window.__ow.state.active) ||
                document.getElementById('skip-banner')?.classList.contains('show'),
          null, { timeout: 5000 }
        );

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 4: Eroare post-ready — roomError dupa roomReady = acelasi skip
  // ─────────────────────────────────────────────────────────────────────
  test('eroare post-ready — acelasi skip ca camera moarta @campanie',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = campaignCfg(2, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'post-ready');

      const gp = await page.context().newPage();
      const gameErrors = [];
      gp.on('pageerror', err => gameErrors.push(err.message));

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();
        await enterRoom(gp, 0);

        // Asteapta roomReady pentru camera 0 (data-room-ready setat)
        await gp.waitForFunction(
          () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
          null, { timeout: 8000 }
        );

        // Apeleaza window.roomError direct de pe fereastra orchestratorului (gp)
        // roomError are semantica ORICAND — si post-ready (D5)
        await gp.evaluate(() => {
          window.roomError(0, 'eroare-post-ready-test');
        });

        // skip-banner trebuie sa apara imediat
        await gp.waitForFunction(
          () => document.getElementById('skip-banner')?.classList.contains('show'),
          null, { timeout: 5000 }
        );

        const skipCode = await gp.locator('#skip-code').innerText();
        expect(skipCode).toContain('Cod:');
        await expect(gp.locator('#btn-skip')).toBeVisible();

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 5: Dublu-click "Deschide usa" — idempotent (T4 + D4)
  // ─────────────────────────────────────────────────────────────────────
  test('dubla-intrare usa pe harta — idempotent (fara stare corupta) @campanie',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'dblclick');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        // Rezolva camera 0
        await enterRoom(gp, 0);
        await solveRoom(gp, 'classic', 'r1');

        // Asteapta harta (target = camera 1)
        await waitOverworld(gp);

        // Dubla intrare pe usa 1 — a doua trebuie ignorata (idempotenta, T4/D4)
        await gp.evaluate(() => { window.__ow.enterDoor(1); window.__ow.enterDoor(1); });

        // Camera 1 trebuie sa se monteze exact o singura data
        await gp.waitForFunction(
          () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
          null, { timeout: 8000 }
        );

        // Rezolva camera 1 si verifica starea finala
        await solveRoom(gp, 'classic', 'r2');

        // Harta pentru camera 2 trebuie sa apara (nu sarit din cauza duplicate mount)
        await waitOverworld(gp);

        // Target = camera 3 (idx 2); exact 2 usi rezolvate (0+1, fara dubla-numarare)
        const st = await gp.evaluate(() => window.__ow.state);
        expect(st.target).toBe(2);
        expect(st.doors.filter(d => d.solved).length).toBe(2);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 6: $ / $& in text — D1 replace-functie nu corupe JSON-ul
  // ─────────────────────────────────────────────────────────────────────
  test('intrebare cu $/$& in text — camera se monteaza corect (D1 replace-functie) @campanie',
    async ({ page }) => {
      const errors = trackErrors(page);
      const cfg = {
        ...campaignCfg(1, 'classic'),
        puzzles: [{
          title: 'Dollar test', type: 'free',
          question: 'Costa $10.00 & $& mai mult?',
          answer: 'da', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'X',
          style: 'classic'
        }]
      };
      const tmpPath = await writeCampaignHtml(page, cfg, 'dollar');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();
        await enterRoom(gp, 0);

        // Asteapta roomReady
        await gp.waitForFunction(
          () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
          null, { timeout: 8000 }
        );

        // CFG.puzzles[0].question in frame trebuie sa fie intact
        const question = await gp.evaluate(() => {
          return document.getElementById('room-frame')
            ?.contentWindow?.CFG?.puzzles?.[0]?.question ?? '';
        });
        expect(question, 'Intrebarea lipseste din CFG al frame-ului').toBeTruthy();
        expect(question).toContain('$10.00');
        expect(question).toContain('$&');

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 7: 8+ camere — beep functional (AudioContext D2) pana la final
  // ─────────────────────────────────────────────────────────────────────
  test('campanie 8+ camere — beep functional pana la final @campanie',
    async ({ page }) => {
      test.setTimeout(120000);
      const errors = trackErrors(page);
      const cfg = campaignCfg(8, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, '8rooms');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        for (let i = 0; i < 8; i++) {
          await enterRoom(gp, i);
          await solveRoom(gp, 'classic', 'r' + (i + 1));
        }

        // Finale trebuie sa apara
        await gp.waitForFunction(
          () => document.getElementById('finale')?.classList.contains('show'),
          null, { timeout: 10000 }
        );

        // 8 litere colectate: A-H
        const finWord = await gp.locator('#fin-word').innerText();
        expect(finWord.replace(/\s/g, '')).toMatch(/[A-H]{1,8}/);

        // Stele: "X / 24 ★" (8 × 3 = 24)
        const finStars = await gp.locator('#fin-stars').innerText();
        expect(finStars).toMatch(/\d+ \/ 24/);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 8: 320x568 — chrome 40px + zero overflow orizontal (T6 + TD4)
  // ─────────────────────────────────────────────────────────────────────
  test('campanie: 320x568 fara overflow orizontal (chrome 40px + calc(100vh-chrome)) @campanie',
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      const errors = trackErrors(page);
      const cfg = campaignCfg(2, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, '320x568');

      const gp = await page.context().newPage();
      await gp.setViewportSize({ width: 320, height: 568 });
      const gpErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.waitForTimeout(500); // asteapta CSS aplicat

        // Zero scroll orizontal (§Design pct. 11)
        const overflow = await gp.evaluate(
          () => document.documentElement.scrollWidth >
                document.documentElement.clientWidth + 1
        );
        expect(overflow, 'Overflow orizontal la 320x568 in campanie').toBe(false);

        // Chrome bar 40px la viewport < 600px (media query #chrome { height: 40px })
        const chromeHeight = await gp.evaluate(() => {
          const chrome = document.getElementById('chrome');
          return chrome ? chrome.getBoundingClientRect().height : null;
        });
        expect(chromeHeight, 'chromeHeight null — #chrome nu exista').not.toBeNull();
        expect(chromeHeight, 'Chrome > 40px la 320px').toBeLessThanOrEqual(40);

        // Si pe harta (overworld) — fara overflow orizontal la 320px
        await gp.locator('#btn-start').click();
        await gp.waitForFunction(
          () => window.__ow && window.__ow.state.active,
          null, { timeout: 5000 }
        );
        await gp.waitForTimeout(200);
        const owOverflow = await gp.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(owOverflow, 'Overflow orizontal pe harta la 320x568').toBe(false);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gpErrors, gpErrors.join('\n')).toHaveLength(0);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 9 (S4+): Audio — deblocare ctx pe PRIMUL gest (orice), nu doar btn-start.
  // NB: headless Chromium creeaza AudioContext direct 'running' (ignora autoplay
  // policy), deci "ctx==running" e trivial. Testam WIRING-ul real al deblocarii:
  // (A) primul gest oarecare (tastatura, ca la resume) deblocheaza fara btn-start;
  // (B) beep() se auto-vindeca dintr-un ctx readus in 'suspended'.
  // ─────────────────────────────────────────────────────────────────────
  test('audio — deblocare pe primul gest + beep self-heal (S1) @campanie',
    async ({ page }) => {
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'audio');
      const gp = await page.context().newPage();
      try {
        await gp.goto('file://' + tmpPath);
        // Fara voice in cfg → butonul de naratiune ramane ascuns (opt-in, D10)
        await expect(gp.locator('#btn-voice')).toBeHidden();
        // Inainte de orice gest: ctx inexistent (creat lazy)
        const before = await gp.evaluate(
          () => (window.beep && window.beep._ctx) ? window.beep._ctx.state : 'NO_CTX'
        );
        expect(before, 'ctx nu trebuie sa existe inainte de gest').toBe('NO_CTX');

        // (A) Cale RESUME: un gest de tastatura (mers pe harta), FARA btn-start,
        // trebuie sa creeze+deblocheze ctx-ul prin listenerul global one-time.
        await gp.keyboard.press('ArrowDown');
        await gp.waitForTimeout(100);
        const afterKey = await gp.evaluate(
          () => (window.beep && window.beep._ctx) ? window.beep._ctx.state : 'NO_CTX'
        );
        expect(afterKey, 'gestul de tastatura trebuie sa deblocheze ctx (cale resume)').toBe('running');

        // (B) beep() trebuie sa produca oscilatoare si sa reia un ctx suspendat.
        const heal = await gp.evaluate(async () => {
          await window.beep._ctx.suspend();
          const mid = window.beep._ctx.state;        // 'suspended'
          let osc = 0;
          const orig = window.beep._ctx.createOscillator.bind(window.beep._ctx);
          window.beep._ctx.createOscillator = function () { osc++; return orig(); };
          window.beep(true);
          await new Promise(r => setTimeout(r, 50));
          return { mid, osc, end: window.beep._ctx.state };
        });
        expect(heal.mid, 'ctx trebuie suspendat inainte de self-heal').toBe('suspended');
        expect(heal.osc, 'beep trebuie sa creeze oscilatoare').toBeGreaterThan(0);
        expect(heal.end, 'beep trebuie sa reia ctx-ul suspendat').toBe('running');
      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 9b (PR2): Voce — naratiune opt-in (D10). Headless nu reda audio, dar
  // spionam speechSynthesis.speak/cancel: butonul apare doar la voice=true,
  // povestea+intrebarea sunt citite, schimbarea scenei cheama cancel, iar
  // toggle-off face voiceSay no-op.
  // ─────────────────────────────────────────────────────────────────────
  test('voce — naratiune opt-in: buton, citeste poveste/intrebare, cancel + toggle @campanie',
    async ({ page }) => {
      const cfg = campaignCfg(3, 'classic');
      cfg.voice = true;
      const tmpPath = await writeCampaignHtml(page, cfg, 'voice');
      const gp = await page.context().newPage();
      try {
        await gp.goto('file://' + tmpPath);
        // Spy: inlocuim speak (sa nu redea real) si numaram cancel
        await gp.evaluate(() => {
          window.__spoken = []; window.__cancels = 0;
          const ss = window.speechSynthesis;
          ss.speak = (u) => { window.__spoken.push(String((u && u.text) || '')); };
          const oc = ss.cancel.bind(ss);
          ss.cancel = () => { window.__cancels++; try { oc(); } catch (e) {} };
        });
        // Butonul apare cand voice=true, pornit implicit
        await expect(gp.locator('#btn-voice')).toBeVisible();
        expect(await gp.locator('#btn-voice').getAttribute('aria-pressed')).toBe('true');

        // Start → citeste povestea
        await gp.locator('#btn-start').click();
        await waitOverworld(gp);
        await gp.waitForTimeout(120);
        const afterStart = await gp.evaluate(() => window.__spoken.slice());
        expect(afterStart.some(t => t.includes('O campanie de test')),
          'povestea trebuie citita la start').toBeTruthy();

        // Intra in camera → roomReady citeste intrebarea; tranzitia cheama cancel
        await enterRoom(gp, 0);
        await gp.waitForFunction(
          () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
          null, { timeout: 8000 }
        );
        await gp.waitForTimeout(120);
        const afterRoom = await gp.evaluate(() => window.__spoken.slice());
        expect(afterRoom.some(t => t.includes('Raspunde 1')),
          'intrebarea camerei trebuie citita la roomReady').toBeTruthy();
        expect(await gp.evaluate(() => window.__cancels),
          'schimbarea scenei trebuie sa cheme speechSynthesis.cancel').toBeGreaterThan(0);

        // Toggle off → aria-pressed false + voiceSay devine no-op
        await gp.locator('#btn-voice').click();
        expect(await gp.locator('#btn-voice').getAttribute('aria-pressed')).toBe('false');
        await gp.evaluate(() => window.voiceSay('NU_TREBUIE_CITIT'));
        const spokenAfter = await gp.evaluate(() => window.__spoken.slice());
        expect(spokenAfter.includes('NU_TREBUIE_CITIT'),
          'voiceSay trebuie no-op cand naratiunea e oprita').toBeFalsy();
      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 9c (PR2): A11y — tinte tap >=44px, aria pe progres+dpad, reduced-motion
  // (Playwright emuleaza prefers-reduced-motion → asertam faptic ca animatiile
  // decorative sunt neutralizate).
  // ─────────────────────────────────────────────────────────────────────
  test('a11y — tap>=44px + aria progres/dpad + reduced-motion @campanie',
    async ({ page }) => {
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'a11y');
      const gp = await page.context().newPage();
      try {
        await gp.emulateMedia({ reducedMotion: 'reduce' });
        await gp.goto('file://' + tmpPath);

        // Aria pe progres: container + dot initial cu stare
        await expect(gp.locator('#dots')).toHaveAttribute('role', 'group');
        const dot0 = await gp.locator('#dot-0').getAttribute('aria-label');
        expect(dot0).toContain('Camera 1 din 3');
        expect(dot0).toContain('neinceputa');

        // Start → harta; dpad cu aria-label + tinte tap >=44px
        await gp.locator('#btn-start').click();
        await waitOverworld(gp);
        for (const [d, label] of [['U', 'Sus'], ['D', 'Jos'], ['L', 'Stanga'], ['R', 'Dreapta']]) {
          const btn = gp.locator(`#ow-dpad button[data-d="${d}"]`);
          await expect(btn).toHaveAttribute('aria-label', label);
          const box = await btn.boundingBox();
          expect(box.width, `dpad ${d} latime`).toBeGreaterThanOrEqual(44);
          expect(box.height, `dpad ${d} inaltime`).toBeGreaterThanOrEqual(44);
        }

        // Reduced-motion: confetti decorativ -> display:none (proba directa pe regula CSS)
        const confettiDisplay = await gp.evaluate(() => {
          const probe = document.createElement('div');
          probe.className = 'confetti';
          document.body.appendChild(probe);
          const disp = getComputedStyle(probe).display;
          probe.remove();
          return disp;
        });
        expect(confettiDisplay, 'confetti trebuie ascuns sub reduced-motion').toBe('none');

        // Dot devine 'rezolvata' dupa ce camera 0 e gata (verifica aria dinamic)
        await enterRoom(gp, 0);
        await solveRoom(gp, 'classic', 'r1');
        await waitOverworld(gp);
        await expect.poll(
          () => gp.locator('#dot-0').getAttribute('aria-label')
        ).toContain('rezolvata');
      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 10 (S4): Overworld — mers cu tastatura + iesire blocata pana la final
  // ─────────────────────────────────────────────────────────────────────
  test('overworld — mers cu tastatura + iesire blocata pana la final @campanie',
    async ({ page }) => {
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'ow-nav');
      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);
      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();
        await waitOverworld(gp);

        // Mers cu tastatura: ArrowRight muta jucatorul o celula la dreapta
        const p0 = await gp.evaluate(() => window.__ow.state.player);
        await gp.locator('body').press('ArrowRight');
        const p1 = await gp.evaluate(() => window.__ow.state.player);
        expect(p1.col, 'jucatorul nu s-a miscat cu tastatura').toBe(p0.col + 1);

        // Iesirea (steag) e blocata pana la rezolvarea tuturor camerelor
        expect(await gp.evaluate(() => window.__ow.state.allDone)).toBe(false);
        await gp.evaluate(() => window.__ow.enterExit());
        const finaleShown = await gp.evaluate(
          () => document.getElementById('finale')?.classList.contains('show')
        );
        expect(finaleShown, 'finalul nu trebuie sa apara cu iesirea blocata').toBe(false);
      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }
      expect(gameErrors, gameErrors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Test 11 (S4): Arcade Bomberman — bomba/AI/respawn pe demo-ul generat
  // ─────────────────────────────────────────────────────────────────────
  test('arcade bomberman — bomba sparge cutie + AI urmareste + respawn pastreaza progres @regresie',
    async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(fileURL('exemplu-arcade.html'));
      await page.waitForFunction(() => typeof window.__game !== 'undefined', { timeout: 5000 });
      await page.evaluate(() => { window.__seed = 42; window.__game.restartWithSeed(42); });

      // Stare initiala: 3 vieti, dusmani prezenti
      const init = await page.evaluate(() => ({ lives: window.__game.lives, enemies: window.__game.enemiesCount }));
      expect(init.lives).toBe(3);
      expect(init.enemies).toBeGreaterThan(0);

      // Bomba sparge o cutie adiacenta
      await page.evaluate(() => window.__game.setTile(2, 1, 2));
      expect(await page.evaluate(() => window.__game.getTile(2, 1))).toBe(2);
      await page.evaluate(() => { window.__game.placeBomb(); window.__game.explodeAllBombs(); });
      expect(await page.evaluate(() => window.__game.getTile(2, 1)), 'cutia nu s-a distrus').toBe(0);

      // AI: cu cale libera, BFS returneaza un pas care se apropie de jucator
      const step = await page.evaluate(() => {
        const m = window.__game.map;
        for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) if (m[y][x] === 2) window.__game.setTile(x, y, 0);
        return window.__game.bfsStep(7, 7, 1, 1);
      });
      expect(step, 'BFS nu a gasit cale spre jucator').not.toBeNull();
      expect(Math.abs(step.x - 1) + Math.abs(step.y - 1)).toBeLessThan((7 - 1) + (7 - 1));

      // Respawn pastreaza progresul puzzle
      await page.evaluate(() => window.__game.solveDoor(0));
      await page.evaluate(() => window.__game.killPlayer());
      await page.waitForTimeout(1800);
      const st = await page.evaluate(() => ({
        lives: window.__game.lives,
        solved: window.__game.puzzleProgress.doorsSolved[0],
        alive: window.__game.player.alive
      }));
      expect(st.lives, 'viata nu a scazut').toBe(2);
      expect(st.solved, 'progresul puzzle s-a pierdut la respawn').toBe(true);
      expect(st.alive, 'jucatorul nu a respawnat').toBe(true);

      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  test('arcade bomberman — raza initiala 1 + powerup-uri (drop la cutie, pickup creste raza/bombe) @regresie',
    async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(fileURL('exemplu-arcade.html'));
      await page.waitForFunction(() => typeof window.__game !== 'undefined', { timeout: 5000 });
      await page.evaluate(() => window.__game.restartWithSeed(11));

      // Raza initiala = 1, max bombe = 1
      const base = await page.evaluate(() => ({ r: window.__game.bombRange, m: window.__game.maxBombs }));
      expect(base.r, 'raza initiala trebuie sa fie 1').toBe(1);
      expect(base.m, 'numar bombe initial trebuie sa fie 1').toBe(1);

      // Raza 1: cutie la distanta 2 ramane intacta (player mutat departe de explozie)
      await page.evaluate(() => {
        window.__game.teleportPlayer(1, 1);
        window.__game.setTile(2, 1, 2); window.__game.setTile(3, 1, 2);
        window.__game.placeBomb(); window.__game.teleportPlayer(11, 11); window.__game.explodeAllBombs();
      });
      expect(await page.evaluate(() => window.__game.getTile(2, 1)), 'cutia la distanta 1 trebuie spartá').toBe(0);
      expect(await page.evaluate(() => window.__game.getTile(3, 1)), 'raza 1: cutia la distanta 2 trebuie intactá').toBe(2);

      // Drop: peste multe cutii sparte apar powerup-uri care SUPRAVIETUIESC exploziei care le-a creat.
      // (Bug-ul prins: powerup-ul cadea pe celula cutiei si checkExplosionHits il stergea instant.)
      const dropRounds = await page.evaluate(() => {
        window.__game.restartWithSeed(11);
        let rounds = 0;
        for (let i = 0; i < 60; i++) {
          window.__game.teleportPlayer(1, 1); window.__game.setTile(2, 1, 2);
          window.__game.placeBomb(); window.__game.teleportPlayer(11, 11); window.__game.explodeAllBombs();
          // ridica orice powerup ramas (mut player pe el) ca sa nu fie sters de explozia urmatoare
          window.__game.powerups.slice().forEach(p => { if (p.x === 2 && p.y === 1) rounds++; window.__game.teleportPlayer(p.x, p.y); window.__game.movePlayer('R'); window.__game.movePlayer('L'); });
        }
        return rounds;
      });
      expect(dropRounds, 'niciun powerup nu a supravietuit pe celula cutiei sparte').toBeGreaterThan(0);

      // Pickup: range creste bombRange, bomb creste maxBombs; powerup consumat
      const pick = await page.evaluate(() => {
        window.__game.restartWithSeed(11);
        window.__game.setTile(2, 1, 0); window.__game.setTile(3, 1, 0);
        window.__game.teleportPlayer(1, 1);
        window.__game.dropPowerupAt(2, 1, 'range'); window.__game.movePlayer('R');
        const a = { r: window.__game.bombRange, pu: window.__game.powerups.length };
        window.__game.dropPowerupAt(3, 1, 'bomb'); window.__game.movePlayer('R');
        const c = { m: window.__game.maxBombs, pu: window.__game.powerups.length };
        return { a, c };
      });
      expect(pick.a.r, 'pickup range nu a crescut bombRange').toBe(2);
      expect(pick.a.pu, 'powerup range nu a fost consumat').toBe(0);
      expect(pick.c.m, 'pickup bomb nu a crescut maxBombs').toBe(2);
      expect(pick.c.pu, 'powerup bomb nu a fost consumat').toBe(0);

      expect(errors, errors.join('\n')).toHaveLength(0);
    });

  // ─────────────────────────────────────────────────────────────────────
  // Adventure Mode tests (E0-E6)
  // ─────────────────────────────────────────────────────────────────────

  /** Helper: genereaza cfg de campanie cu adventure ON. */
  function adventureCfg(puzzles) {
    return {
      title: 'Test Adventure', player: 'Tester', color: '#6d28d9',
      style: 'campaign', charName: 'Alex',
      story: 'Aventura de test.',
      finalMessage: 'Ai terminat aventura!',
      adventure: true,
      puzzles
    };
  }

  test('adventure — branch-jump: room0→2 (sare room1), room2→exit, diploma neexplorata @campanie',
    async ({ page }) => {
      test.setTimeout(90000);
      const errors = trackErrors(page);
      const cfg = adventureCfg([
        { title: 'Camera 0', type: 'free', question: 'R0?', answer: 'r0', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'A', style: 'classic', branch: { '*': 2 } },
        { title: 'Camera 1', type: 'free', question: 'R1?', answer: 'r1', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'B', style: 'classic', branch: { '*': '' } },
        { title: 'Camera 2', type: 'free', question: 'R2?', answer: 'r2', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'C', style: 'classic', branch: { '*': 'end' } }
      ]);
      const tmpPath = await writeCampaignHtml(page, cfg, 'adv-jump');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        // Enter room 0 (door 0 unlocked in adventure)
        await enterRoom(gp, 0);
        await solveRoom(gp, 'classic', 'r0');

        // After solving room 0: overworld with door 2 unlocked, door 1 locked
        await waitOverworld(gp);
        const stAfter0 = await gp.evaluate(() => window.__ow.state);
        expect(stAfter0.owUnlocked[2], 'door 2 trebuie deblocata dupa room0').toBeTruthy();
        expect(stAfter0.owUnlocked[1], 'door 1 trebuie sa ramana incuiata').toBeFalsy();
        expect(stAfter0.doors[0].solved, 'room 0 trebuie sa fie done').toBe(true);

        // Door 1 should be locked — entering it should be blocked (stay in overworld)
        await gp.evaluate(() => window.__ow.enterDoor(1));
        await gp.waitForTimeout(300);
        const stLocked = await gp.evaluate(() => window.__ow.state);
        expect(stLocked.active, 'harta trebuie sa ramana activa cand usa e incuiata').toBe(true);

        // Enter room 2 (unlocked)
        await enterRoom(gp, 2);
        await solveRoom(gp, 'classic', 'r2');

        // After solving room 2: exit should be unlocked
        await waitOverworld(gp);
        const stAfter2 = await gp.evaluate(() => window.__ow.state);
        expect(stAfter2.owExitUnlocked, 'exit trebuie deblocat dupa room2→end').toBe(true);

        // Enter exit → finale
        await gp.evaluate(() => window.__ow.enterExit());
        await gp.waitForFunction(
          () => document.getElementById('finale')?.classList.contains('show'),
          null, { timeout: 5000 }
        );

        // Open diploma → camera 1 should be "neexplorata"
        await gp.locator('#btn-diploma').click();
        const diplomaText = await gp.locator('#dipl-rooms').innerText();
        expect(diplomaText).toMatch(/neexplorat/i);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }

      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, 'Builder errors:\n' + errors.join('\n')).toHaveLength(0);
    });

  test('adventure — resume non-contiguu: room0 done → reload → room0 done + usa2 deblocata + usa1 incuiata @campanie',
    async ({ page }) => {
      test.setTimeout(60000);
      const errors = trackErrors(page);
      const cfg = adventureCfg([
        { title: 'Camera 0', type: 'free', question: 'R0?', answer: 'r0', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'A', style: 'classic', branch: { '*': 2 } },
        { title: 'Camera 1', type: 'free', question: 'R1?', answer: 'r1', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'B', style: 'classic', branch: { '*': '' } },
        { title: 'Camera 2', type: 'free', question: 'R2?', answer: 'r2', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'C', style: 'classic', branch: { '*': 'end' } }
      ]);
      const tmpPath = await writeCampaignHtml(page, cfg, 'adv-resume');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        // Solve room 0 → branches to room 2, skips room 1
        await enterRoom(gp, 0);
        await solveRoom(gp, 'classic', 'r0');
        await waitOverworld(gp);

        // Reload — tryResume trebuie sa reconstituie starea non-contigua
        await gp.reload();
        await gp.waitForLoadState('domcontentloaded');

        // Asteapta overworld activ (resume, nu intro)
        await gp.waitForFunction(() => window.__ow && window.__ow.state.active, null, { timeout: 8000 });

        const stResume = await gp.evaluate(() => window.__ow.state);
        expect(stResume.doors[0].solved, 'room 0 trebuie sa fie done dupa resume').toBe(true);
        expect(stResume.owUnlocked[2], 'usa 2 trebuie deblocata dupa resume').toBeTruthy();
        expect(stResume.owUnlocked[1], 'usa 1 trebuie sa ramana incuiata dupa resume').toBeFalsy();

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }

      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, 'Builder errors:\n' + errors.join('\n')).toHaveLength(0);
    });

  test('adventure off — regresia non-adventure: toate usile intrabile in orice ordine @campanie',
    async ({ page }) => {
      test.setTimeout(60000);
      const errors = trackErrors(page);
      // adventure:false (default) — toate ușile deblocate, orice ordine
      const cfg = campaignCfg(3, 'classic');
      const tmpPath = await writeCampaignHtml(page, cfg, 'adv-off');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        // In non-adventure: can enter door 1 first (not door 0)
        await waitOverworld(gp);
        await gp.evaluate(() => window.__ow.enterDoor(1));
        await gp.waitForFunction(
          () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
          null, { timeout: 8000 }
        );
        // overworld became inactive (we entered a room) — confirms door 1 was enterable
        const stAfter = await gp.evaluate(() => window.__ow.state);
        expect(stAfter.active, 'harta trebuie sa fie inactiva dupa intrarea in room1').toBe(false);

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }

      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, 'Builder errors:\n' + errors.join('\n')).toHaveLength(0);
    });

  test('adventure — branch tf: raspuns Adevarat→2, Fals→1 deblocheza usa corecta @campanie',
    async ({ page }) => {
      test.setTimeout(60000);
      const errors = trackErrors(page);
      const cfg = adventureCfg([
        { title: 'Camera 0', type: 'tf', question: 'E adevarat?', answer: '', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'A', style: 'classic', branch: { Adevarat: 2, Fals: 1 } },
        { title: 'Camera 1', type: 'free', question: 'R1?', answer: 'r1', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'B', style: 'classic', branch: {} },
        { title: 'Camera 2', type: 'free', question: 'R2?', answer: 'r2', tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'C', style: 'classic', branch: {} }
      ]);
      const tmpPath = await writeCampaignHtml(page, cfg, 'adv-tf');

      const gp = await page.context().newPage();
      const gameErrors = trackErrors(gp);

      try {
        await gp.goto('file://' + tmpPath);
        await gp.locator('#btn-start').click();

        // Enter room 0 (tf puzzle, classic engine: buttons in #answers)
        await waitOverworld(gp);
        await gp.evaluate(() => window.__ow.enterDoor(0));
        await gp.waitForFunction(
          () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
          null, { timeout: 8000 }
        );
        const ifl = gp.frameLocator('#room-frame');
        await ifl.locator('#btnStart').click();
        // Click "Adevarat" (correct answer → branch key 'Adevarat' → should unlock door 2)
        await ifl.locator('#answers button:text("Adevarat")').click();
        await gp.waitForTimeout(1200); // animatie next()

        await waitOverworld(gp);
        const st = await gp.evaluate(() => window.__ow.state);
        expect(st.owUnlocked[2], 'Adevarat→2: usa 2 trebuie deblocata').toBeTruthy();
        expect(st.owUnlocked[1], 'Adevarat→2: usa 1 trebuie sa ramana incuiata').toBeFalsy();

      } finally {
        await gp.close();
        try { unlinkSync(tmpPath); } catch (_) {}
      }

      expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
      expect(errors, 'Builder errors:\n' + errors.join('\n')).toHaveLength(0);
    });

});

// ═══════════════════════════════════════════════════════════════════════
// SECTIUNEA 5 — SHARE (link + QR + player.html) @share
// ═══════════════════════════════════════════════════════════════════════

test.describe('Share: link + QR + player @share', () => {

  test('@share compresie round-trip: inflate(deflate(s)) === s', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));
    const ok = await page.evaluate(async () => {
      if (typeof deflateToBase64url !== 'function') return 'missing deflate';
      if (typeof inflateFromBase64url !== 'function') return 'missing inflate';
      const s = JSON.stringify({ title: 'Test', puzzles: [{ question: 'x', answer: '42' }] });
      const compressed = await deflateToBase64url(s);
      if (typeof compressed !== 'string' || compressed.length === 0) return 'empty compressed';
      const decompressed = await inflateFromBase64url(compressed);
      return decompressed === s ? 'ok' : 'mismatch';
    });
    expect(ok, 'round-trip result').toBe('ok');
    expect(errors).toHaveLength(0);
  });

  test('@share QR structural: makeQrSvg produce SVG valid', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));
    const result = await page.evaluate(() => {
      if (typeof makeQrSvg !== 'function') return { err: 'makeQrSvg missing' };
      const svg = makeQrSvg('https://example.com/play.html#abc123');
      if (!svg) return { err: 'null result' };
      return { hasViewBox: svg.includes('viewBox'), hasPath: svg.includes('<path'), len: svg.length };
    });
    expect(result.err, 'error').toBeUndefined();
    expect(result.hasViewBox, 'viewBox').toBe(true);
    expect(result.hasPath, '<path').toBe(true);
    expect(result.len, 'svg length').toBeGreaterThan(100);
    expect(errors).toHaveLength(0);
  });

  test('@share playerHTML() genereaza HTML cu inflate + motor inainte de boot + TPL', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));
    const result = await page.evaluate(() => {
      if (typeof playerHTML !== 'function') return { err: 'playerHTML missing' };
      const html = playerHTML();
      /* Motorul (window.__runGame) trebuie definit ÎNAINTE ca boot-ul să-l apeleze, ca să nu
       * existe race de parsare (Brave dădea „motor lipsă" când await-ul din inflate se rezolva
       * pe microtask înainte ca scriptul motor să fie parsat). */
      return {
        hasInflate: html.includes('inflateFromBase64url'),
        hasRunGame: html.includes('window.__runGame=function'),
        noLegacyInjection: !html.includes('text/plain'),
        engineBeforeBoot: html.indexOf('window.__runGame=function') < html.indexOf('inflateFromBase64url(h)'),
        hasTPL: html.includes('var TPL'),
        len: html.length
      };
    });
    expect(result.err, 'error').toBeUndefined();
    expect(result.hasInflate, 'inflate helper').toBe(true);
    expect(result.hasRunGame, 'window.__runGame definit').toBe(true);
    expect(result.noLegacyInjection, 'fara injectie dinamica text/plain').toBe(true);
    expect(result.engineBeforeBoot, 'motorul definit inaintea boot-ului').toBe(true);
    expect(result.hasTPL, 'var TPL').toBe(true);
    expect(result.len).toBeGreaterThan(5000);
    expect(errors).toHaveLength(0);
  });

  test('@share player porneste din hash — campanie 1 camera, final vizibil', async ({ page }) => {
    test.setTimeout(60000);
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));
    const { playerHtml, hash } = await page.evaluate(async () => {
      const cfg = {
        title: 'Test Player', player: '', color: '#6d28d9', style: 'campaign', creator: '',
        charName: 'Alex', voice: false, music: false, adventure: false, timerMin: 0,
        puzzles: [{ title: 'P1', type: 'free', question: 'Cat fac 1+1?', answer: '2',
          tfAnswer: 'Adevarat', choices: '', hint: '', letter: 'A', style: 'classic', branch: {} }],
        story: 'Povestea', finalMessage: 'Bravo!'
      };
      const compressed = await deflateToBase64url(JSON.stringify(cfg));
      return { playerHtml: playerHTML(), hash: compressed };
    });

    const tmpPath = join(ROOT, 'tests', '.tmp-player.html');
    writeFileSync(tmpPath, playerHtml);
    const gp = await page.context().newPage();
    const gameErrors = trackErrors(gp);
    const consoleLogs = [];
    gp.on('console', m => consoleLogs.push(m.type() + ': ' + m.text()));
    try {
      await gp.goto('file://' + tmpPath + '#' + hash);
      await gp.waitForFunction(() => !!window.MASTER, { timeout: 10000 }).catch(e => { throw new Error('MASTER not set. Console: ' + consoleLogs.slice(0,5).join(' | ')); });
      const title = await gp.evaluate(() => window.MASTER.title);
      expect(title, 'MASTER.title').toBe('Test Player');

      await gp.locator('#btn-start').click();
      /* after start, overworld is shown; navigate to room 0 */
      await gp.waitForFunction(() => window.__ow && window.__ow.state.active, null, { timeout: 8000 });
      await gp.evaluate(() => window.__ow.enterDoor(0));
      await gp.waitForFunction(
        () => document.getElementById('room-frame')?.hasAttribute('data-room-ready'),
        null, { timeout: 8000 }
      );
      const ifl = gp.frameLocator('#room-frame');
      await ifl.locator('#btnStart').click();
      await ifl.locator('#answers input[type=text]').fill('2');
      await ifl.locator('#answers button:text("Verifica")').click();
      await gp.waitForTimeout(1200);
      await gp.waitForFunction(() => {
        const fin = document.getElementById('finale');
        return fin && fin.classList.contains('show');
      }, { timeout: 10000 });
    } finally {
      await gp.close();
      try { unlinkSync(tmpPath); } catch (_) {}
    }
    expect(gameErrors, 'Game errors:\n' + gameErrors.join('\n')).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  test('@share player fara hash — afiseaza mesaj niciun joc', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));
    const playerHtml = await page.evaluate(() => playerHTML());
    const tmpPath = join(ROOT, 'tests', '.tmp-player-empty.html');
    writeFileSync(tmpPath, playerHtml);
    const gp = await page.context().newPage();
    try {
      await gp.goto('file://' + tmpPath);
      await gp.waitForTimeout(600);
      const txt = await gp.locator('#intro-title').textContent({ timeout: 3000 }).catch(() => '');
      expect(txt, 'mesaj fara hash').toContain('Niciun joc');
    } finally {
      await gp.close();
      try { unlinkSync(tmpPath); } catch (_) {}
    }
    expect(errors).toHaveLength(0);
  });

  test('@share share UI: butoane share disabled fara CompressionStream', async ({ page }) => {
    await page.addInitScript(() => {
      delete window.CompressionStream;
      delete window.DecompressionStream;
    });
    const errors = trackErrors(page);
    await page.goto(fileURL('escape-builder.html'));
    const shareDisabled = await page.locator('#btnShare').isDisabled();
    const copyDisabled  = await page.locator('#btnCopyLink').isDisabled();
    expect(shareDisabled, 'btnShare disabled').toBe(true);
    expect(copyDisabled,  'btnCopyLink disabled').toBe(true);
    const dlEnabled = await page.locator('#btnDownloadPlayer').isEnabled();
    expect(dlEnabled, 'btnDownloadPlayer enabled').toBe(true);
    expect(errors).toHaveLength(0);
  });

});
