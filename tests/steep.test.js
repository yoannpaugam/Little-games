import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerrain, createRun, step, wrapAngle, distanceM, totalScore, crashText, rngFrom, autoPilot, jump, predictJump, jumpImpulse, JUMP_MIN, JUMP_MAX, CHARGE_TIME } from '../games/steep/engine.js';
import { WORLDS, COURSE_TYPES, COURSE_ORDER, worldById } from '../games/steep/worlds.js';

test('les mondes ont tout ce qu’il faut', () => {
  assert.ok(WORLDS.length >= 5);
  assert.equal(new Set(WORLDS.map((w) => w.id)).size, WORLDS.length);
  for (const w of WORLDS) {
    assert.ok(w.name && w.blurb && w.fall, w.id);
    for (const c of COURSE_ORDER) assert.ok(w.courses[c], `${w.id} : nom du parcours ${c}`);
    for (const k of ['sky', 'ground']) assert.equal(w.colors[k].length, 2);
    assert.ok(w.physics.maxSpeed > 200 && w.physics.friction > 0);
  }
  assert.deepEqual(Object.keys(COURSE_TYPES).sort(), [...COURSE_ORDER].sort());
});

test('le terrain est reproductible, continu et franchissable', () => {
  for (const course of COURSE_ORDER) {
    for (let seed = 1; seed <= 8; seed++) {
      const a = createTerrain({ course, seed });
      const b = createTerrain({ course, seed });
      a.extend(30000); b.extend(30000);
      assert.equal(a.pieces.length, b.pieces.length, 'même graine, même terrain');
      for (let x = 0; x < 30000; x += 97) {
        const g = a.ground(x);
        const gap = a.hazards.find((hz) => hz.type === 'gap' && x > hz.x0 && x < hz.x1);
        if (gap) { assert.equal(g, null, `vide dans la crevasse à ${x}`); continue; }
        assert.ok(g && Number.isFinite(g.y) && Number.isFinite(g.slope), `sol défini à ${x} (${course}, ${seed})`);
        assert.ok(Math.abs(g.slope) < 2.5, `pente raisonnable à ${x} : ${g.slope}`);
      }
      // Le terrain descend globalement
      assert.ok(a.ground(29000).y < a.ground(1000)?.y ?? 0);
      for (const hz of a.hazards) {
        if (hz.type === 'gap') {
          assert.ok(hz.x1 - hz.x0 <= 225, 'trou pas trop large');
          assert.ok(hz.yFar < hz.yNear + 33, 'bord d’en face au plus un peu plus haut');
        }
      }
    }
  }
});

test('les parcours se distinguent : Abîmes a bien plus de trous que Balade', () => {
  const count = (course) => {
    let n = 0;
    for (let seed = 1; seed <= 10; seed++) { const T = createTerrain({ course, seed }); T.extend(40000); n += T.hazards.filter((h) => h.type === 'gap').length; }
    return n;
  };
  assert.ok(count('abimes') > count('balade') * 3);
});

test('chaque piège est franchissable : le pilote automatique descend 2 km partout', () => {
  for (const w of WORLDS) {
    for (const course of COURSE_ORDER) {
      for (const seed of [1, 2, 3]) {
        const run = createRun({ world: w.id, course, seed });
        for (let i = 0; i < 60 * 150 && run.state === 'ride' && distanceM(run) < 2000; i++) { step(run, 1 / 60, autoPilot(run)); run.events.length = 0; }
        assert.ok(distanceM(run) >= 2000, `${w.id}/${course}/${seed} : ${distanceM(run)} m (${run.crash?.reason})`);
      }
    }
  }
});

test('les pièges demandent de bien juger : sauter toujours pareil fait tomber', () => {
  let falls = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const run = createRun({ world: 'cimes', course: 'abimes', seed });
    for (let i = 0; i < 60 * 120 && run.state === 'ride'; i++) {
      const hz = run.terrain.hazards.find((z) => (z.type === 'rock' || z.type === 'gap') && z.x0 > run.x);
      if (run.grounded && hz && hz.x0 - run.x < 25) jump(run, 0.3);
      step(run, 1 / 60, {}); run.events.length = 0;
    }
    if (run.state === 'crashed') falls++;
  }
  assert.ok(falls >= 10, `${falls}/12 chutes`);
});

test('appuyer charge le saut, relâcher saute ; un saut chargé va plus loin', () => {
  const run = createRun({ world: 'cimes', course: 'balade', seed: 4 });
  step(run, 0.5, {});
  const v0 = run.vx;
  for (let i = 0; i < 40; i++) step(run, 1 / 60, { held: true });
  assert.ok(run.grounded && run.charge >= 1, 'chargé au bout de ' + CHARGE_TIME + ' s');
  assert.ok(run.vx >= v0 * 0.95, 'baissé, on ne ralentit pas');
  step(run, 1 / 60, { held: false });
  assert.ok(!run.grounded, 'le relâchement fait sauter');
  assert.equal(run.charge, 0);
  assert.equal(jumpImpulse(0), JUMP_MIN);
  assert.equal(jumpImpulse(1), JUMP_MAX);
  const r2 = createRun({ world: 'cimes', course: 'balade', seed: 4 });
  step(r2, 0.5, {});
  const short = predictJump(r2, 0), long = predictJump(r2, 1);
  assert.ok(short.ok && long.ok && long.x > short.x + 80, `${short.x} → ${long.x}`);
  // Un appui commencé au sol ne fait pas de salto en l'air
  const r3 = createRun({ world: 'cimes', course: 'balade', seed: 4 });
  step(r3, 0.5, {});
  step(r3, 1 / 60, { held: true });
  assert.ok(r3.holdGround);
  // Il quitte le sol sans avoir relâché (bord d'une bosse) : pas de salto tant qu'on n'a pas réappuyé
  const g = r3.terrain.ground(r3.x);
  Object.assign(r3, { grounded: false, sinceGround: 1, airTime: 0.3, y: g.y + 80, vy: 200 });
  for (let i = 0; i < 10; i++) step(r3, 1 / 60, { held: true });
  assert.ok(Math.abs(r3.spin) < 0.5);
  step(r3, 1 / 60, { held: false });
  for (let i = 0; i < 10; i++) step(r3, 1 / 60, { held: true });
  assert.ok(r3.spin > 3, 'un nouvel appui en l’air fait tourner');
});

test('sans sauter, on finit par tomber sur un parcours Abîmes', () => {
  const run = createRun({ world: 'cimes', course: 'abimes', seed: 5 });
  for (let i = 0; i < 60 * 240 && run.state === 'ride'; i++) step(run, 1 / 60, {});
  assert.equal(run.state, 'crashed');
  assert.ok(['obstacle', 'gap', 'wall', 'landing'].includes(run.crash.reason));
  assert.ok(crashText(run.crash.reason, 'cimes').length > 3);
});

test('un salto réussi rapporte des points', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const run = createRun({ world: 'cimes', course: 'bosses', seed });
    step(run, 2, {});
    jump(run, 1);
    step(run, 1 / 120, { held: false });
    // On tourne presque un tour, puis on lâche : le redressement automatique termine la rotation
    for (let i = 0; i < 1000 && run.state === 'ride' && !run.grounded; i++) step(run, 1 / 120, { held: Math.abs(run.airSpin) < Math.PI * 2 - 1 });
    assert.equal(run.state, 'ride', `seed ${seed} : réception réussie`);
    assert.equal(run.flips, 1);
    assert.ok(run.score >= 100);
    assert.ok(run.events.some((e) => e.type === 'land' && e.turns === 1));
  }
});

test('une réception à l’envers fait tomber, une réception à plat non', () => {
  for (const [angle, expected] of [[Math.PI, 'crashed'], [0, 'ride']]) {
    const run = createRun({ world: 'cimes', course: 'balade', seed: 1 });
    step(run, 1, {});
    const g = run.terrain.ground(run.x);
    Object.assign(run, { grounded: false, airTime: 0.5, y: g.y + 2, vy: -200, angle: Math.atan(g.slope) + angle, spin: 0 });
    for (let i = 0; i < 60 && !run.grounded && run.state === 'ride'; i++) step(run, 1 / 240, { held: angle !== 0 });
    assert.equal(run.state, expected);
    if (expected === 'crashed') assert.equal(run.crash.reason, 'landing');
  }
});

test('pièces, score total et angles', () => {
  const bot = (r) => autoPilot(r);
  assert.equal(wrapAngle(Math.PI * 3), Math.PI);
  assert.ok(Math.abs(wrapAngle(-Math.PI * 2.5) + Math.PI / 2) < 1e-9);
  const run = createRun({ world: 'dunes', course: 'balade', seed: 9 });
  for (let i = 0; i < 60 * 30 && run.state === 'ride'; i++) { step(run, 1 / 60, bot(run)); run.events.length = 0; }
  assert.equal(totalScore(run), distanceM(run) + run.score);
  assert.ok(run.coins >= 0 && run.score >= run.coins * 10);
  const r = rngFrom(4); const r2 = rngFrom(4);
  assert.equal(r(), r2());
  assert.equal(worldById('nope'), null);
});
