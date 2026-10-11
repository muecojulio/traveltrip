import test from "node:test";
import assert from "node:assert/strict";
import {
  checkSearchRateLimit,
  PublicSearchError,
  readResponseBytesWithLimit,
  safeExternalHref,
  sanitizeCityName,
  sanitizePlainText,
  sanitizeSavedTrips,
  validateAllowedUrl,
} from "./security.ts";

test("validateAllowedUrl permits only allowlisted HTTPS origins without credentials or custom ports", () => {
  const valid = validateAllowedUrl("https://www.google.com/travel/hotels/Cancun");
  assert.equal(valid.hostname, "www.google.com");

  assert.throws(
    () => validateAllowedUrl("http://www.google.com/travel/hotels"),
    PublicSearchError,
  );
  assert.throws(
    () => validateAllowedUrl("https://user:pass@www.google.com/travel/hotels"),
    PublicSearchError,
  );
  assert.throws(
    () => validateAllowedUrl("https://www.google.com:8443/travel/hotels"),
    PublicSearchError,
  );
  assert.throws(
    () => validateAllowedUrl("https://evil.example.com/travel/hotels"),
    PublicSearchError,
  );
  assert.throws(() => validateAllowedUrl("http://169.254.169.254/latest/meta-data"), PublicSearchError);
});

test("readResponseBytesWithLimit aborts streaming responses that exceed maxBytes even without Content-Length", async () => {
  const small = new Response("Hola México");
  const bytes = await readResponseBytesWithLimit(small, 100);
  assert.equal(new TextDecoder().decode(bytes), "Hola México");

  const oversized = new Response("x".repeat(500));
  await assert.rejects(() => readResponseBytesWithLimit(oversized, 100), PublicSearchError);
});

test("sanitizeCityName accepts Mexican Spanish city names and blocks path traversal or script injection", () => {
  assert.equal(sanitizeCityName("  San Cristóbal de las Casas "), "San Cristóbal de las Casas");
  assert.equal(sanitizeCityName("León, Gto."), "León, Gto.");
  assert.throws(() => sanitizeCityName("../../etc/passwd"), PublicSearchError);
  assert.throws(() => sanitizeCityName("Cancun/../../admin"), PublicSearchError);
  assert.throws(() => sanitizeCityName("Ciudad $123"), PublicSearchError);
});

test("safeExternalHref blocks javascript/data/http URLs and permits https or relative paths", () => {
  assert.equal(
    safeExternalHref("https://www.booking.com/searchresults.es.html"),
    "https://www.booking.com/searchresults.es.html",
  );
  assert.equal(safeExternalHref("/privacidad"), "/privacidad");
  assert.equal(safeExternalHref("javascript:alert(1)"), null);
  assert.equal(safeExternalHref("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeExternalHref("http://insecure.example.com"), null);
  assert.equal(safeExternalHref("//protocol-relative.example.com"), null);
});

test("sanitizePlainText strips angle brackets and control characters", () => {
  assert.equal(sanitizePlainText("Hotel <script>Sol</script>\u0000"), "Hotel scriptSol/script");
});

test("checkSearchRateLimit enforces sliding window limits", () => {
  const key = "test-rate-limit-bucket";
  const t0 = 1_000_000;
  assert.equal(checkSearchRateLimit(key, { maxRequests: 2, windowMs: 10_000, now: t0 }).allowed, true);
  assert.equal(
    checkSearchRateLimit(key, { maxRequests: 2, windowMs: 10_000, now: t0 + 100 }).allowed,
    true,
  );
  const blocked = checkSearchRateLimit(key, { maxRequests: 2, windowMs: 10_000, now: t0 + 200 });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  const afterWindow = checkSearchRateLimit(key, {
    maxRequests: 2,
    windowMs: 10_000,
    now: t0 + 11_000,
  });
  assert.equal(afterWindow.allowed, true);
});

test("sanitizeSavedTrips filters out malformed localStorage entries", () => {
  assert.deepEqual(sanitizeSavedTrips(null), []);
  assert.deepEqual(sanitizeSavedTrips({ not: "an array" }), []);
  assert.deepEqual(sanitizeSavedTrips([null, { id: "bad" }]), []);

  const valid = sanitizeSavedTrips([
    {
      id: "cancun|2026-11-10|2026-11-14|2|Hotel Caribe",
      selectedHotelName: "Hotel Caribe",
      quote: {
        place: "Cancún",
        state: "Quintana Roo",
        checkIn: "2026-11-10",
        checkOut: "2026-11-14",
        nights: 4,
        adults: 2,
        originLabel: "CDMX",
        flightMode: true,
        hotels: [],
        flights: [],
        otherFlights: [],
        hiddenFlights: 0,
        best: null,
        alternatives: [],
        weather: [],
        usdMxn: 19.5,
        notices: [],
        fetchedAt: "2026-10-11T12:00:00.000Z",
        cached: false,
        cityLinks: [],
      },
    },
  ]);
  assert.equal(valid.length, 1);
  assert.equal(valid[0]?.quote.place, "Cancún");
});
