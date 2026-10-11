import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInstallQrUrl,
  detectDevicePlatform,
  generateQrMatrix,
  renderQrSvgString,
} from "./qr-code.ts";

test("generateQrMatrix produces valid ISO/IEC 18004 finder patterns, timing patterns, and dark module", () => {
  const matrix = generateQrMatrix("https://traveltrip.app/?install=1&platform=ios", "M");
  assert.equal(matrix.size, 17 + matrix.version * 4);
  assert.equal(matrix.modules.length, matrix.size);

  // Top-left finder pattern 7x7 outer ring + 3x3 center
  for (let i = 0; i < 7; i++) {
    assert.equal(matrix.modules[0][i], true);
    assert.equal(matrix.modules[6][i], true);
    assert.equal(matrix.modules[i][0], true);
    assert.equal(matrix.modules[i][6], true);
  }
  assert.equal(matrix.modules[3][3], true);
  assert.equal(matrix.modules[1][1], false);
  // White separator around top-left finder
  assert.equal(matrix.modules[7][7], false);

  // Dark module at (size - 8, 8) is always true
  assert.equal(matrix.modules[matrix.size - 8][8], true);

  // Timing pattern alternation along row 6 and col 6
  assert.equal(matrix.modules[6][8], true);
  assert.equal(matrix.modules[6][9], false);
  assert.equal(matrix.modules[8][6], true);
  assert.equal(matrix.modules[9][6], false);
});

test("renderQrSvgString outputs crisp vector SVG with quiet zone", () => {
  const svg = renderQrSvgString("https://traveltrip.app/");
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(svg.includes("<path d=\"M"));
});

test("buildInstallQrUrl builds platform-appropriate install links", () => {
  assert.equal(
    buildInstallQrUrl("https://traveltrip.grok.me/", "universal"),
    "https://traveltrip.grok.me/",
  );
  assert.equal(
    buildInstallQrUrl("https://traveltrip.grok.me", "ios"),
    "https://traveltrip.grok.me/?install=1&platform=ios",
  );
  assert.equal(
    buildInstallQrUrl("https://traveltrip.grok.me", "android"),
    "https://traveltrip.grok.me/?install=android",
  );
  assert.equal(
    buildInstallQrUrl("https://traveltrip.grok.me", "desktop"),
    "https://traveltrip.grok.me/?install=desktop",
  );
});

test("detectDevicePlatform classifies iOS, Android, and Desktop user agents", () => {
  assert.equal(
    detectDevicePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"),
    "ios",
  );
  assert.equal(
    detectDevicePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5),
    "ios",
  );
  assert.equal(
    detectDevicePlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)"),
    "android",
  );
  assert.equal(
    detectDevicePlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
    "desktop",
  );
});
