import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { newStory, newCard } from "../src/brandStoryModel.mjs";
import { changedStoryAssets } from '../src/brandStoryWorkflow.mjs';
const require = createRequire(import.meta.url);
test("isolated stories, revision conflicts, share privacy and designer images preserve customer snapshots", async () => {
  const tmp = await mkdtemp(resolve(".brandstory-api-")),
    db = createClient({ url: "file:" + join(tmp, "test.db") });
  const dbPath = require.resolve("../api/_db.js"),
    handlerPath = require.resolve("../api/brand-stories.js");
  const prior = require.cache[dbPath];
  require.cache[dbPath] = { exports: { getClient: () => db } };
  delete require.cache[handlerPath];
  const handler = require(handlerPath);
  async function request(method, body = {}, query = {}) {
    const res = {
      code: 200,
      setHeader() {},
      status(c) {
        this.code = c;
        return this;
      },
      json(b) {
        this.body = b;
        return this;
      },
    };
    await handler({ method, body, query }, res);
    return res;
  }
  try {
    const s = newStory("Test");
    s.instructions = "PRIVATE";
    s.context = { audience: 'PRIVATE_CONTEXT', products: 'PRIVATE_PRODUCTS' };
    s.cards = [newCard("media")];
    s.cards[0].title = 'PRIVATE_CARD_NAME';
    const created = (await request("POST", { data: s })).body;
    const other = (await request("POST", { data: s })).body;
    assert.notEqual(created.id, other.id);
    const blocked = await request('POST', { id: created.id, revision: 1, data: s, publish: true });
    assert.equal(blocked.code, 400);
    assert.match(blocked.body.error, /Beschreibung/);
    assert.equal((await request('GET', {}, { id: created.id })).body.revision, 1);
    const blockedNew = await request('POST', { data: s, publish: true });
    assert.equal(blockedNew.code, 400);
    assert.equal((await request('GET')).body.stories.length, 2);
    s.background.desktopBrief = 'Describe desktop background';
    s.background.mobileBrief = 'Describe mobile background';
    s.cards[0].brief = 'Show the supplied brand logo';
    s.cards[0].headline = 'Unsere Marke';
    s.cards[0].copy = 'Das ist der Body Text auf dem Bild.';
    const published = (
      await request("POST", {
        id: created.id,
        revision: 1,
        data: s,
        publish: true,
      })
    ).body;
    assert(published.designerToken);
    assert.notEqual(published.designerToken, published.customerToken);
    assert.equal(
      (await request("POST", { id: created.id, revision: 1, data: s })).code,
      409,
    );
    const c = await request("GET", {}, { token: published.customerToken });
    assert(!JSON.stringify(c.body).includes("PRIVATE"));
    assert(!("instructions" in c.body.data));
    const d = await request("GET", {}, { token: published.designerToken });
    assert(!('instructions' in d.body.data));
    assert(!('context' in d.body.data));
    assert.equal(d.body.data.cards[0].title, 'PRIVATE_CARD_NAME');
    assert.equal(d.body.data.cards[0].headline, 'Unsere Marke');
    assert.equal(d.body.data.cards[0].copy, 'Das ist der Body Text auf dem Bild.');
    const list = await request('GET');
    assert.equal(list.body.stories.length, 2);
    assert.equal(list.body.stories[0].cardCount, 1);
    assert(!JSON.stringify(list.body).includes('PRIVATE'));
    assert(!JSON.stringify(list.body).includes(published.customerToken));
    const image = {
        url: "https://example.com/asset.jpg",
        width: 814,
        height: 1019,
        size: 1000,
      },
      assets = [{ kind: "media", cardId: s.cards[0].id, image }];
    assert.equal(
      (
        await request(
          "POST",
          { assets, revision: 2 },
          { token: published.customerToken },
        )
      ).code,
      403,
    );
    assert.equal(
      (
        await request(
          "POST",
          { assets, revision: 2 },
          { token: published.designerToken },
        )
      ).code,
      200,
    );
    assert.equal(
      (await request("GET", {}, { token: published.customerToken })).body.data
        .cards[0].image,
      null,
    );
    assert.deepEqual(
      (await request("GET", {}, { id: created.id })).body.data.cards[0].image,
      image,
    );
    assert.equal(
      (
        await request(
          "POST",
          { assets, revision: 2 },
          { token: published.designerToken },
        )
      ).code,
      409,
    );
    assert.equal((await request("GET", {}, { token: "unknown" })).code, 404);
    const working = (await request('GET', {}, { id: created.id })).body;
    const operatorBackground = { ...image, url: 'https://example.com/operator-background.jpg' };
    working.data.background.desktop = operatorBackground;
    working.data.cards[0].brief = '';
    working.data.background.mobileBrief = '';
    await request('POST', { id: created.id, revision: working.revision, data: working.data });
    const designerSnapshot = (await request('GET', {}, { token: published.designerToken })).body;
    assert.equal(designerSnapshot.data.cards[0].brief, 'Show the supplied brand logo');
    const updatedSnapshot = structuredClone(designerSnapshot.data);
    updatedSnapshot.cards[0].image = { ...image, url: 'https://example.com/new-card.jpg' };
    await request('POST', { revision: designerSnapshot.revision, assets: changedStoryAssets(designerSnapshot.data, updatedSnapshot) }, { token: published.designerToken });
    assert.deepEqual((await request('GET', {}, { id: created.id })).body.data.background.desktop, operatorBackground);
    const staleDelete = await request('DELETE', { id: created.id, revision: 1 });
    assert.equal(staleDelete.code, 409);
    const revisionToDelete = (await request('GET', {}, { id: created.id })).body.revision;
    const deleted = await request('DELETE', { id: created.id, revision: revisionToDelete });
    assert.equal(deleted.code, 200);
    assert.equal(deleted.body.ok, true);
    assert.equal((await request('GET', {}, { id: created.id })).code, 404);
    assert.equal((await request('GET', {}, { token: published.designerToken })).code, 404);
    assert.equal((await request('GET')).body.stories.length, 1);

  } finally {
    db.close();
    delete require.cache[handlerPath];
    if (prior) require.cache[dbPath] = prior;
    else delete require.cache[dbPath];
    await rm(tmp, { recursive: true, force: true });
  }
});
