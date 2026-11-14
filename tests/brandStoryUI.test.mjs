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
async function mount(shared, run) {
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
    fetch: async () => ({
      ok: true,
      json: async () =>
        shared ? { mode: "customer", data: s } : { stories: [] },
    }),
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
      (b) => b.textContent.trim() === t,
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
test("editor navigates cards, switches mobile, adds grid and exposes instructions", async () =>
  mount(false, async (d, click, btn) => {
    assert.match(d.body.textContent, /Testmarke/);
    const background = d.querySelector(".bs-backdrop").outerHTML;
    await click(d.querySelector('[aria-label="Nächste Karten"]'));
    assert.match(d.querySelector(".bs-rail").style.transform, /80.34/);
    assert.equal(d.querySelector(".bs-backdrop").outerHTML, background);
    await click(btn("Mobil"));
    assert.match(d.querySelector(".bs-counter").textContent, /1 \/ 7/);
    await click(btn("＋ ASIN-Grid"));
    assert(d.body.textContent.includes("Grid-Überschrift"));
    assert.equal(d.querySelectorAll(".bs-slot").length, 4);
    await click(btn("Anweisungen & Claude"));
    assert(d.body.textContent.includes("Startanweisung für Claude kopieren"));
    await click(btn("JSON-Import"));
    assert(d.querySelector('[aria-label="Brand Story JSON"]'));
  }));
test("customer share has no editor, uploads, internal instructions or briefing tabs", async () =>
  mount(true, async (d) => {
    assert(d.querySelector(".bs-carousel"));
    assert(!d.querySelector(".bs-workbench"));
    assert(!d.querySelector("input[type=file]"));
    assert(!d.body.textContent.includes("PRIVATE"));
    assert(!d.body.textContent.includes("Designer-Briefing"));
  }));
