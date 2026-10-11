import test from "node:test";
import assert from "node:assert/strict";
import {
  decideAxis,
  revealOffset,
  resolveReveal,
  revealRatio,
  shouldCancelClick,
  velocityFromSamples,
} from "./gesture.ts";

test("axis lock keeps pending moves pending and never guesses from a single pixel", () => {
  assert.equal(decideAxis(0, 0), "pending");
  assert.equal(decideAxis(6, 4), "pending");
  assert.equal(decideAxis(-9, 2), "pending");
});

test("horizontal needs to beat vertical by the ~1.2 ratio", () => {
  // 12 vs 11 -> ratio 1.09 fails, so this stays a vertical (browser) gesture.
  assert.equal(decideAxis(12, 11), "vertical");
  assert.equal(decideAxis(24, 12), "horizontal");
  assert.equal(decideAxis(-30, 10), "horizontal");
  assert.equal(decideAxis(10, 40), "vertical");
});

test("reveal offset never exposes more than the panel width", () => {
  assert.equal(revealOffset(0, { open: false, width: 96 }), 0);
  assert.equal(revealOffset(-40, { open: false, width: 96 }), -40);
  assert.equal(revealOffset(-300, { open: false, width: 96 }), -96 - 28 * 1);
  assert.ok(revealOffset(-300, { open: false, width: 96 }) >= -96 - 28 - 0.01);
  assert.equal(revealOffset(-96, { open: false, width: 96 }), -96);
  assert.equal(revealOffset(0, { open: true, width: 96 }), -96);
  assert.equal(revealOffset(96, { open: true, width: 96 }), 0);
  // Dragging right while closed is damped, never a positive offset.
  const damped = revealOffset(60, { open: false, width: 96 });
  assert.ok(damped > 0, "damped pull should still give a tiny affordance");
  assert.ok(damped <= 28, "damped pull must stay small");
});

test("a zero width panel is a no-op even before it is measured", () => {
  assert.equal(revealOffset(-30, { open: false, width: 0 }), 0);
  assert.equal(revealRatio(-30, 0), 0);
  assert.equal(resolveReveal({ offset: -30, velocity: -1, width: 0, open: true }), true);
});

test("crossing half of the panel opens it; releasing early closes it", () => {
  const base = { velocity: 0, width: 120, open: false };
  assert.equal(resolveReveal({ ...base, offset: -20 }), false);
  assert.equal(resolveReveal({ ...base, offset: -100 }), true);
  assert.equal(resolveReveal({ offset: -100, velocity: 0, width: 120, open: true }), true);
  assert.equal(resolveReveal({ offset: -20, velocity: 0, width: 120, open: true }), false);
});

test("a quick flick wins even without reaching the halfway mark", () => {
  assert.equal(resolveReveal({ offset: -34, velocity: -1.2, width: 120, open: false }), true);
  assert.equal(resolveReveal({ offset: -86, velocity: 1.1, width: 120, open: true }), false);
  // A slow, tiny drag is not a flick.
  assert.equal(resolveReveal({ offset: -6, velocity: -0.2, width: 120, open: false }), false);
});

test("tiny movements must not cancel an honest tap on the card", () => {
  assert.equal(shouldCancelClick(0), false);
  assert.equal(shouldCancelClick(4), false);
  assert.equal(shouldCancelClick(-8), false);
  assert.equal(shouldCancelClick(-24), true);
});

test("velocity tracker uses the trailing window and survives missing time", () => {
  assert.equal(velocityFromSamples([]), 0);
  assert.equal(velocityFromSamples([{ t: 10, x: 0 }]), 0);
  assert.equal(
    velocityFromSamples([
      { t: 10, x: 0 },
      { t: 10, x: -20 },
    ]),
    0,
  );
  assert.equal(
    velocityFromSamples([
      { t: 0, x: 0 },
      { t: 20, x: -30 },
    ]),
    -1.5,
  );
});
