import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { newStory, newCard } from "../src/brandStoryModel.mjs";
let tmp, Builder;
before(async () => {
  tmp = await mkdtemp(resolve(".brandstory-ui-"));
  const out = join(tmp, "ui.mjs");
  await build({
    entryPoints: [resolve("src/components/BrandStoryBuilder.jsx")],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    packages: "external",
    loader: { ".css": "empty" },
  });
  Builder = (await import(pathToFileURL(out))).default;
});
after(async () => rm(tmp, { recursive: true, force: true }));
async function mount(shared, run, options = {}) {
  const dom = new JSDOM('<div id="root"></div>', {
      url: shared
        ? "https://builder.test/brand-stories?token=customer"
        : "https://builder.test/brand-stories",
    }),
    prev = {};
  const s = newStory("Testmarke");
  s.instructions = "PRIVATE";
  s.cards = Array.from({ length: 7 }, (_, i) => ({
    ...newCard("media"),
    id: "id" + i,
    fileKey: "card-0" + (i + 1),
  }));
  if (!shared)
    dom.window.sessionStorage.setItem(
      "brand-story-draft",
      JSON.stringify({ story: s, record: {} }),
    );
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    location: dom.window.location,
    sessionStorage: dom.window.sessionStorage,
    confirm: () => true,
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: options.fetch || (async () => ({
      ok: true,
      json: async () =>
        shared ? { mode: shared === true ? 'customer' : shared, data: s } : { stories: [] },
    })),
  };
  for (const [key, value] of Object.entries(globals)) {
    prev[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  const root = createRoot(dom.window.document.getElementById("root"));
  const click = async (b) => {
    assert(b);
    await act(async () =>
      b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })),
    );
  };
  const btn = (t) =>
    [...dom.window.document.querySelectorAll("button")].find(
      (b) => (b.getAttribute("aria-label") || b.textContent.trim()) === t,
    );
  try {
    await act(async () => root.render(React.createElement(Builder)));
    await run(dom.window.document, click, btn);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [k, d] of Object.entries(prev)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
  }
}
test("overview offers explicit draft recovery and editor uses a card picker plus Claude dialog", async () =>
  mount(false, async (d, click, btn) => {
    assert.match(d.body.textContent, /Deine Brand Stories/);
    assert(!d.querySelector('.bs-carousel'));
    await click(btn('Letzten Entwurf fortsetzen'));
    assert.match(d.body.textContent, /Testmarke/);
    assert(d.querySelector('textarea[aria-label="Desktop-Motiv und Inhalt (English)"]'));
    const background = d.querySelector('.bs-backdrop').outerHTML;
    await click(d.querySelector('[aria-label="Nächste Karten"]'));
    assert.match(d.querySelector('.bs-rail').style.transform, /80.34/);
    assert.equal(d.querySelector('.bs-backdrop').outerHTML, background);
    await click(btn('Mobil'));
    assert.match(d.querySelector('.bs-counter').textContent, /1 \/ 7/);
    await click(btn('Karte hinzufügen'));
    await click(btn('ASIN-Grid'));
    assert(d.body.textContent.includes('Grid-Überschrift'));
    assert.equal(d.querySelectorAll('.bs-slot').length, 4);
    assert.match(d.querySelector('.bs-counter').textContent, /8 \/ 8/);
    await click(btn('Konzept mit Claude'));
    assert(d.querySelector('[role="dialog"]'));
    assert(d.body.textContent.includes('Auftrag für Claude kopieren'));
    assert(d.querySelector('[aria-label="Brand Story JSON"]'));
    assert(!btn('Anweisungen & Claude'));
    assert(!btn('JSON-Import'));
  }));
test("new story offers Store-first or manual entry without the former required context form", async () =>
  mount(false, async (d, click, btn) => {
    await click(btn('Neue Brand Story'));
    assert(d.querySelector('[role="dialog"]'));
    for (const label of ['Markenname', 'Amazon Brand Store-Link'])
      assert([...d.querySelectorAll('label')].some(l => l.textContent.includes(label)));
    assert(btn('Store übernehmen')); assert(btn('Manuell starten'));
    assert(!d.querySelector('[aria-label="Zielgruppe"]'));
    assert(!d.querySelector('a[download]'));
  }));
test('interactive examples are available directly from the overview without opening a project', async () =>
  mount(false, async (d, click, btn) => {
    await click(btn('Beispiele'));
    assert.match(d.querySelector('[role="dialog"]').textContent,/Interaktive Brand-Story-Beispiele/);
  }));
test("customer share has no editor, uploads, internal instructions or briefing tabs", async () =>
  mount(true, async (d) => {
    assert(d.querySelector(".bs-carousel"));
    assert(!d.querySelector(".bs-workbench"));
    assert(!d.querySelector("input[type=file]"));
    assert(!d.body.textContent.includes("PRIVATE"));
    assert(!d.body.textContent.includes("Designer-Briefing"));
  }));
test('designer has element briefs, matching specifications and image uploads without concept editing', async () =>
  mount('designer', async (d, click) => {
    assert(!d.body.textContent.includes('PRIVATE'));
    assert(d.body.textContent.includes('Desktop'));
    assert(d.body.textContent.includes('3660 × 1563'));
    assert(d.body.textContent.includes('1389 × 1875'));
    assert(d.querySelector('input[type=file]'));
    assert(!d.body.textContent.includes('Konzept mit Claude'));
    const card = [...d.querySelectorAll('.bs-sidebar button')].find(b => b.textContent.includes('1. Brand Media Asset'));
    await click(card);
    assert(d.body.textContent.includes('814 × 1019'));
    assert(!d.querySelector('.bs-properties textarea'));
  }));
test('pending project loads disable new-project and draft-recovery actions', async () => {
  let finish;
  await mount(false, async (d, click, btn) => {
    await click(d.querySelector('[aria-label="Gespeichert öffnen"]'));
    assert(btn('Neue Brand Story').disabled);
    assert(btn('Letzten Entwurf fortsetzen').disabled);
    const s = newStory('Gespeichert');
    await act(async () => finish({ ok: true, json: async () => ({ id: 'saved', data: s, revision: 1 }) }));
    assert(d.querySelector('.bs-carousel'));
  }, { fetch: async url => url.includes('?id=') ? new Promise(resolve => { finish = resolve; }) : ({ ok: true, json: async () => ({ stories: [{ id: 'saved', brandName: 'Gespeichert', cardCount: 0 }] }) }) });
});
test('closing the Claude dialog preserves pasted JSON and its import review', async () =>
  mount(false, async (d, click, btn) => {
    await click(btn('Letzten Entwurf fortsetzen'));
    await click(btn('Konzept mit Claude'));
    const file = d.querySelector('input[accept="application/json,.json"]');
    const value = JSON.stringify(newStory('Importmarke'));
    Object.defineProperty(file, 'files', { value: [{ text: async () => value }] });
    await act(async () => file.dispatchEvent(new d.defaultView.Event('change', { bubbles: true })));
    await click(btn('JSON prüfen'));
    assert(d.querySelector('.bs-import-review'));
    await click(btn('Dialog schließen'));
    await click(btn('Konzept mit Claude'));
    assert.equal(d.querySelector('[aria-label="Brand Story JSON"]').value, value);
    assert(d.querySelector('.bs-import-review'));
  }));
