import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleHotels } from "./parse-hotels.ts";

const fixture = `
  <section>
    <h2>Hotel Costa Azul</h2>
    <div>MX$ 1,500 por noche</div>
    <div>MXN 3,000 en total</div>
    <div>4.7 de 5 · de 2,540 reseñas</div>
    <a href="/travel/hotels/entity/costa">Ofertas</a>
  </section>
  <section>
    <h2>Posada del Centro</h2>
    <div>$1.200 por noche</div>
    <div>4,5 de 5 · de 125 reseñas</div>
  </section>
  <section>
    <h2>Hotel sin tarifa</h2>
    <div>Consultar disponibilidad</div>
  </section>
`;

test("parses MXN night and stay prices, ratings, reviews, and hotel links", () => {
  const hotels = parseGoogleHotels(fixture, 2);
  assert.equal(hotels.length, 2);
  assert.deepEqual(hotels[0], {
    name: "Hotel Costa Azul",
    perNight: 1500,
    stayTotal: 3000,
    hasStayTotal: true,
    currency: "MXN",
    rating: 4.7,
    reviews: 2540,
    googlePath: "/travel/hotels/entity/costa",
  });
});

test("estimates a stay from the per-night price when a provider omits its total", () => {
  const hotel = parseGoogleHotels(fixture, 3)[1];
  assert.ok(hotel);
  assert.equal(hotel.name, "Posada del Centro");
  assert.equal(hotel.perNight, 1200);
  assert.equal(hotel.stayTotal, 3600);
  assert.equal(hotel.hasStayTotal, false);
  assert.equal(hotel.currency, "MXN");
});

test("accepts US-dollar price labels while preserving their currency", () => {
  const hotels = parseGoogleHotels(
    "<h2>Desert Hotel</h2><div>US$ 120.50 por noche</div><div>US$ 241.00 en total</div>",
    2,
  );
  assert.equal(hotels[0]?.currency, "USD");
  assert.equal(hotels[0]?.perNight, 120.5);
  assert.equal(hotels[0]?.stayTotal, 241);
});

test("ignores hotel headings without a price and deduplicates repeated names", () => {
  const html = `${fixture}<h2>Hotel Costa Azul</h2><div>MX$ 99 por noche</div>`;
  const hotels = parseGoogleHotels(html, 2);
  assert.equal(hotels.length, 2);
});
