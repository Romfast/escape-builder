# CLAUDE.md

Ghid pentru Claude Code în acest repo.

## Sursa de adevăr: arborele AGENTS.md

Adevărul tehnic (arhitectură, reguli de editare, testare) trăiește în arborele `AGENTS.md`, nu aici.
Înainte să editezi un path, citește lanțul DOX din rădăcină:

- [`AGENTS.md`](AGENTS.md) — root: ce e produsul, Quick Reference, Durable Rules (zero-dep, un singur
  fișier, backslash dublu, sentinel `__CFG__`, demo-uri generate, `libJS`/`SNIP` partajate, dispatch
  pe 6 motoare).
- [`tests/AGENTS.md`](tests/AGENTS.md) — harness Playwright (fără `package.json` commitat, `npx`,
  tag-uri `@regresie`/`@campanie`, 24/24).
- `scratch/AGENTS.md` — prototipuri & QA (gitignored).

Documente de conținut: `DESIGN.md` (design campanie), `TODOS.md` (backlog), `HANDOFF.md` (handoff sesiune),
`README.md` (utilizator final).

## Specific Claude Code

- Regulile de mediu și modul non-interactiv (`claude -p`) sunt în `/workspace/CLAUDE.md` (părinte).
- Skill relevant: `/dox` — bootstrap/update al acestui arbore `AGENTS.md`.
