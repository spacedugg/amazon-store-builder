const { getClient } = require("./_db");
const { randomUUID, randomBytes } = require("node:crypto");
let ready;
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { validateStory, customerStory } =
      await import("../src/brandStoryModel.mjs");
    const db = getClient();
    if (!ready)
      ready = db
        .execute(
          `CREATE TABLE IF NOT EXISTS brand_stories(id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,designer_token TEXT UNIQUE,customer_token TEXT UNIQUE,published TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
        )
        .catch((e) => {
          ready = null;
          throw e;
        });
    await ready;
    if (req.query.token) {
      const row = (
        await db.execute({
          sql: "SELECT * FROM brand_stories WHERE designer_token=? OR customer_token=?",
          args: [req.query.token, req.query.token],
        })
      ).rows[0];
      if (!row || !row.published)
        return res.status(404).json({ error: "Freigabe nicht gefunden." });
      const published = JSON.parse(row.published),
        designer = row.designer_token === req.query.token;
      if (req.method === "GET") {
        const data = designer
          ? {
              ...published.designer,
              instructions: undefined,
              brandFacts: undefined,
            }
          : published.customer;
        return res.json({
          data,
          revision: row.revision,
          mode: designer ? "designer" : "customer",
        });
      }
      if (req.method !== "POST" || !designer)
        return res
          .status(403)
          .json({ error: "Nur Designer dürfen Bilder ergänzen." });
      const b = req.body || {},
        data = JSON.parse(row.data),
        updates = b.assets;
      if (!Array.isArray(updates) || updates.length > 100)
        throw Error("Ungültige Bildzuordnung.");
      function apply(s, update) {
        if (update.kind === "desktop" || update.kind === "mobile")
          s.background[update.kind] = update.image;
        else {
          const c = s.cards.find((c) => c.id === update.cardId);
          if (!c)
            throw Error("Karte wurde inzwischen entfernt. Bitte neu laden.");
          if (c.type === "media" && update.kind === "media")
            c.image = update.image;
          else if (
            c.type === "grid" &&
            update.kind === "product" &&
            Number.isInteger(update.slot) &&
            update.slot >= 0 &&
            update.slot < 4
          )
            c.slots[update.slot].image = update.image;
          else throw Error("Ungültiger Bildplatz.");
        }
      }
      updates.forEach((u) => {
        apply(data, u);
        apply(published.designer, u);
      });
      validateStory(data);
      validateStory(published.designer);
      const result = await db.execute({
        sql: "UPDATE brand_stories SET data=?,published=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?",
        args: [
          JSON.stringify(data),
          JSON.stringify(published),
          row.id,
          b.revision,
        ],
      });
      if (!result.rowsAffected)
        return res.status(409).json({
          error:
            "Story wurde inzwischen geändert. Bitte neu laden und erneut hochladen.",
        });
      return res.json({
        data: {
          ...published.designer,
          instructions: undefined,
          brandFacts: undefined,
        },
        revision: Number(row.revision) + 1,
      });
    }
    if (req.method === "GET") {
      if (req.query.id) {
        const row = (
          await db.execute({
            sql: "SELECT * FROM brand_stories WHERE id=?",
            args: [req.query.id],
          })
        ).rows[0];
        return row
          ? res.json({
              id: row.id,
              data: JSON.parse(row.data),
              revision: row.revision,
              designerToken: row.designer_token,
              customerToken: row.customer_token,
            })
          : res.status(404).json({ error: "Story nicht gefunden." });
      }
      const r = await db.execute(
        "SELECT id,json_extract(data,'$.brandName') AS brandName,json_extract(data,'$.marketplace') AS marketplace,updated_at FROM brand_stories ORDER BY updated_at DESC",
      );
      return res.json({ stories: r.rows });
    }
    if (req.method !== "POST")
      return res.status(405).json({ error: "Methode nicht erlaubt." });
    const b = req.body || {},
      data = validateStory(b.data),
      id = b.id || randomUUID();
    if (JSON.stringify(data).length > 2000000)
      return res.status(413).json({
        error: "Story zu groß. Bilder über die Bildablage hochladen.",
      });
    if (!b.id) {
      await db.execute({
        sql: "INSERT INTO brand_stories(id,data) VALUES(?,?)",
        args: [id, JSON.stringify(data)],
      });
      return res.json({ id, revision: 1 });
    }
    const dt = randomBytes(24).toString("hex"),
      ct = randomBytes(24).toString("hex");
    const published = JSON.stringify({
      designer: data,
      customer: customerStory(data),
    });
    const r = await db.execute({
      sql: `UPDATE brand_stories SET data=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP${b.publish ? ",published=?,designer_token=COALESCE(designer_token,?),customer_token=COALESCE(customer_token,?)" : ""} WHERE id=? AND revision=?`,
      args: b.publish
        ? [JSON.stringify(data), published, dt, ct, id, b.revision]
        : [JSON.stringify(data), id, b.revision],
    });
    if (!r.rowsAffected)
      return res.status(409).json({
        error:
          "Die Story wurde inzwischen geändert. Bitte neu laden; Änderungen vorher als JSON sichern.",
      });
    const row = (
      await db.execute({
        sql: "SELECT revision,designer_token,customer_token FROM brand_stories WHERE id=?",
        args: [id],
      })
    ).rows[0];
    return res.json({
      id,
      revision: Number(b.revision) + 1,
      designerToken: row.designer_token,
      customerToken: row.customer_token,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
