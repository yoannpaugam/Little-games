import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, lineClue, cluesOf, solveLine, solveLogic, generate, isSolved, lineMatches, formatTime } from '../games/nonogram/nonogram.js';

function rngFrom(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('indices d’une ligne', () => {
  assert.deepEqual(lineClue([1, 1, 0, 1, 0]), [2, 1]);
  assert.deepEqual(lineClue([0, 0, 0]), []);
  assert.deepEqual(lineClue([1, 1, 1]), [3]);
});

test('résolution d’une ligne', () => {
  // 4 dans 5 cases : les 3 du milieu sont sûres
  assert.deepEqual(solveLine([-1, -1, -1, -1, -1], [4]), [-1, 1, 1, 1, -1]);
  // 2 1 dans 4 cases : tout est déterminé
  assert.deepEqual(solveLine([-1, -1, -1, -1], [2, 1]), [1, 1, 0, 1]);
  // ligne vide
  assert.deepEqual(solveLine([-1, -1, -1], []), [0, 0, 0]);
  // impossible
  assert.equal(solveLine([0, 0, -1], [2]), null);
  // une case noire connue fixe le bloc
  assert.deepEqual(solveLine([-1, -1, 1, -1, -1, -1], [1]), [0, 0, 1, 0, 0, 0]);
});

test('les croix comptent comme des cases blanches', () => {
  assert.ok(lineMatches([1, 2, 1, 1, 0], [1, 2]));
  assert.ok(!lineMatches([1, 1, 2, 1, 0], [1, 2]));
});

for (const lv of LEVELS) {
  test(`grilles ${lv.label} (${lv.size}×${lv.size}) : solution unique trouvable par logique`, () => {
    const rnd = rngFrom(lv.size * 101);
    for (let k = 0; k < 40; k++) {
      const { grid, clues } = generate(lv.size, rnd);
      const n = lv.size;
      assert.equal(grid.length, n * n);
      assert.deepEqual(cluesOf(grid, n), clues);
      assert.ok(clues.rows.every((c) => c.length) && clues.cols.every((c) => c.length), 'aucune ligne vide');
      const res = solveLogic(n, clues);
      assert.ok(res.solved, 'résolue sans deviner');
      assert.deepEqual(res.grid, grid, 'la logique retrouve la grille tirée');
      assert.ok(isSolved(grid, n, clues));
      const filled = grid.reduce((a, b) => a + b, 0) / (n * n);
      assert.ok(filled >= 0.4 && filled <= 0.72, `remplissage ${filled}`);
    }
  });
}

test('format du temps', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(75000), '1:15');
  assert.equal(formatTime(3725000), '1:02:05');
});
