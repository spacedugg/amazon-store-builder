import test from "node:test";
import assert from "node:assert/strict";
import {
  newStory,
  resolveUploadTarget,
  newCard,
  offsets,
  customerStory,
  imageWarnings,
  validateStory,
  productUrl,
} from "../src/brandStoryModel.mjs";
test("desktop navigation starts at intro, then shows card 3,6,9; mobile advances one", () => {
  assert.deepEqual(offsets(10), [0, 3, 6, 9]);
  assert.deepEqual(offsets(4, true), [0, 1, 2, 3]);
  assert.deepEqual(offsets(2), [0]);
});
test("custom product artwork retains ASIN target and customer data excludes internal sources", () => {
  const s = newStory("Test");
  s.instructions = "SECRET";
  s.brandFacts = "SOURCE";
  const c = newCard("grid");
  c.brief = "INTERNAL";
  c.slots[0].asin = "B012345678";
  c.slots[0].image = { url: "https://example.com/custom.jpg" };
  s.cards = [c];
  const p = customerStory(s);
  assert.equal(p.cards[0].slots[0].image.url, c.slots[0].image.url);
  assert.equal(p.cards[0].slots[0].url, "https://www.amazon.de/dp/B012345678");
  assert(!JSON.stringify(p).includes("SECRET"));
  assert(!JSON.stringify(p).includes("INTERNAL"));
  assert(!JSON.stringify(p).includes("SOURCE"));
  assert.equal(productUrl({ url: "javascript:alert(1)" }), "");
});
test("reordering retains unique upload keys; new cards never reuse existing keys", () => {
  const a = newCard("media"),
    b = newCard("media", [a]);
  const s = newStory("Test");
  s.cards = [b, a];
  assert.equal(newCard("media", s.cards).fileKey, "card-03");
  assert.equal(validateStory(s), s);
});
test("invalid imported modules, duplicate keys and incomplete grids are rejected", () => {
  const s = newStory("Test");
  s.cards = [newCard("grid")];
  s.cards[0].slots.pop();
  assert.throws(() => validateStory(s));
  s.cards = [newCard("media")];
  s.cards.push({ ...s.cards[0], id: "another" });
  assert.throws(() => validateStory(s));
  s.cards = [{ ...newCard("media"), type: "questions" }];
  assert.throws(() => validateStory(s));
});
test("only too small uploads produce resolution alarms and never expose minimum dimensions", () => {
  assert.equal(
    imageWarnings({ width: 814, height: 1019, size: 1000 }, "media").length,
    0,
  );
  const w = imageWarnings({ width: 100, height: 125, size: 1000 }, "media");
  assert(w.some((x) => x.includes("Bildauflösung")));
  assert(!w.join().includes("362"));
});

test("delivery folder paths and grid quadrants remain assigned after reorder", () => {
  const s = newStory("Test"),
    a = newCard("media"),
    g = newCard("grid", [a]),
    b = newCard("media", [a, g]);
  s.cards = [b, g, a];
  assert.deepEqual(
    resolveUploadTarget(s, "Project/Hintergrund/Hintergrund_Desktop.jpg"),
    { kind: "desktop" },
  );
  assert.deepEqual(
    resolveUploadTarget(
      s,
      "Project/Brand Media Assets/media asset image 1.jpg",
    ),
    { kind: "media", cardId: a.id },
  );
  assert.deepEqual(
    resolveUploadTarget(s, "Project/ASIN Grids/ASIN image 1c.png"),
    { kind: "product", cardId: g.id, slot: 2 },
  );
  assert.equal(
    resolveUploadTarget(s, "Project/Preview Neu/Preview_04.jpg"),
    null,
  );
  assert.deepEqual(resolveUploadTarget(s, g.fileKey + "-4.jpg"), {
    kind: "product",
    cardId: g.id,
    slot: 3,
  });
});
test("all four composite image slots may link to the same ASIN", () => {
  const s = newStory("Test"),
    g = newCard("grid");
  g.slots.forEach((slot) => (slot.asin = "B012345678"));
  s.cards = [g];
  assert.equal(validateStory(s), s);
  assert.equal(
    new Set(customerStory(s).cards[0].slots.map((slot) => slot.url)).size,
    1,
  );
});
