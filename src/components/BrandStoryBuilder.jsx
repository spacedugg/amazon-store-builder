import React, { useEffect, useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { fetchProductData } from "../productData";
import {
  SPECS,
  newStory,
  newCard,
  safeUrl,
  productUrl,
  imageWarnings,
  offsets,
  validateStory,
  publicationWarnings,
  claudePrompt,
  DESIGN_RULES,
} from "../brandStoryModel.mjs";
import "./BrandStoryBuilder.css";
const EXAMPLES = [
  ["Cellufine", "cellufine.png"],
  ["Live By Eco", "live-by-eco.png"],
  ["ONROAD", "onroad.png"],
  ["Futum", "futum.jpg"],
];
const imageSrc = (x) => (typeof x === "string" ? x : x?.url);
async function api(query = "", body) {
  const r = await fetch(
    "/api/brand-stories" + query,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const j = await r.json();
  if (!r.ok) throw Error(j.error || "Anfrage fehlgeschlagen.");
  return j;
}
function download(s) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.brandName || "brand-story"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function uploadImage(file) {
  if (!["image/png", "image/jpeg"].includes(file.type))
    throw Error("Bitte JPG oder PNG hochladen.");
  const local = URL.createObjectURL(file);
  let dimensions;
  try {
    dimensions = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () =>
        resolve({ width: im.naturalWidth, height: im.naturalHeight });
      im.onerror = () => reject(Error("Bild kann nicht gelesen werden."));
      im.src = local;
    });
  } finally {
    URL.revokeObjectURL(local);
  }
  const blob = await upload(
    `brand-stories/${crypto.randomUUID()}/${file.name}`,
    file,
    { access: "public", handleUploadUrl: "/api/blob-upload" },
  );
  return { url: blob.url, name: file.name, size: file.size, ...dimensions };
}
function Picture({
  image,
  alt = "",
  placeholder = "Bild fehlt",
  fit = "cover",
}) {
  return imageSrc(image) ? (
    <img src={imageSrc(image)} alt={alt} style={{ objectFit: fit }} />
  ) : (
    <div className="bs-placeholder">{placeholder}</div>
  );
}
export function StoryCarousel({ story, mobile = false, raster = false }) {
  const [page, setPage] = useState(0),
    touch = useRef(null);
  const steps = offsets(story.cards.length, mobile),
    index = Math.min(page, Math.max(steps.length - 1, 0));
  useEffect(() => setPage(0), [mobile, story.cards.length]);
  function move(d) {
    setPage((p) => Math.max(0, Math.min(steps.length - 1, p + d)));
  }
  return (
    <div
      className={`bs-carousel ${mobile ? "bs-mobile" : ""}`}
      tabIndex={0}
      aria-label="Brand Story Karussell"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current !== null) {
          const d = touch.current - e.changedTouches[0].clientX;
          if (Math.abs(d) > 40) move(d > 0 ? 1 : -1);
          touch.current = null;
        }
      }}
    >
      <div className="bs-backdrop">
        <Picture
          image={story.background[mobile ? "mobile" : "desktop"]}
          placeholder={mobile ? "Mobiler Hintergrund" : "Desktop-Hintergrund"}
        />
      </div>
      <div
        className="bs-rail"
        style={{
          transform: `translateX(-${(steps[index] || 0) * (mobile ? 83.2 : 26.78)}%)`,
        }}
      >
        {story.cards.map((c, i) => (
          <div
            key={c.id}
            className={`bs-card bs-${c.type}`}
            style={{
              left: `${(mobile ? 10.91 : 31.66) + i * (mobile ? 83.2 : 26.78)}%`,
            }}
          >
            {c.type === "media" ? (
              <Picture image={c.image} placeholder={`Bildkarte ${i + 1}`} />
            ) : (
              <>
                <div className="bs-grid">
                  {c.slots.map((slot, j) => {
                    const target = productUrl(slot, story.marketplace);
                    return (
                      <a
                        key={j}
                        href={target || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Produkt ${j + 1}${slot.asin ? " " + slot.asin : ""}`}
                      >
                        <Picture
                          image={slot.image || slot.productImage}
                          placeholder={`Produkt ${j + 1}`}
                          fit={slot.image ? "cover" : "contain"}
                        />
                      </a>
                    );
                  })}
                </div>
                <div className="bs-grid-footer">
                  <strong>{c.headline}</strong>
                  <a
                    href={safeUrl(c.shopUrl) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Shop besuchen
                  </a>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {raster && (
        <div className="bs-raster">
          <span>Desktop-Intro: nur ergänzendes Branding</span>
          <div />
        </div>
      )}
      <button
        className="bs-prev"
        aria-label="Vorherige Karten"
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        ‹
      </button>
      <button
        className="bs-next"
        aria-label="Nächste Karten"
        disabled={index >= steps.length - 1}
        onClick={() => move(1)}
      >
        ›
      </button>
      <span className="bs-counter" aria-live="polite">
        {index + 1} / {Math.max(steps.length, 1)}
      </span>
    </div>
  );
}
function Field({ label, value, onChange, area = false, ...props }) {
  const Tag = area ? "textarea" : "input";
  return (
    <label className="bs-field">
      <span>{label}</span>
      <Tag
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
function Asset({ label, image, kind, onUpload, onRemove, disabled }) {
  return (
    <div className="bs-asset">
      <div>
        <strong>{label}</strong>
        <small>{SPECS[kind].join(" × ")} px · JPG/PNG · 2 MB</small>
      </div>
      {image && <Picture image={image} />}
      <label className="bs-upload">
        Bild hochladen
        <input
          disabled={disabled}
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => {
            if (e.target.files[0]) onUpload(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </label>
      {image && (
        <button disabled={disabled} onClick={onRemove}>
          Bild entfernen
        </button>
      )}
      {imageWarnings(image, kind).map((w) => (
        <p role="alert" className="bs-warning" key={w}>
          {w}
        </p>
      ))}
    </div>
  );
}
export default function BrandStoryBuilder() {
  const token = new URLSearchParams(location.search).get("token");
  const [story, setStory] = useState(null),
    [record, setRecord] = useState({}),
    [stories, setStories] = useState([]),
    [mode, setMode] = useState(token ? "loading" : "editor"),
    [tab, setTab] = useState("design"),
    [selected, setSelected] = useState(null),
    [mobile, setMobile] = useState(() => window.innerWidth < 650),
    [raster, setRaster] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [json, setJson] = useState("");
  useEffect(() => {
    if (token) {
      api("?token=" + encodeURIComponent(token))
        .then((r) => {
          setStory(r.data);
          setRecord({ revision: r.revision });
          setMode(r.mode);
        })
        .catch((e) => {
          setMode("error");
          setMessage(e.message);
        });
    } else {
      api()
        .then((r) => setStories(r.stories))
        .catch((e) => setMessage(e.message));
      const raw = sessionStorage.getItem("brand-story-draft");
      if (raw)
        try {
          const d = JSON.parse(raw);
          setStory(d.story);
          setRecord(d.record);
          setDirty(true);
        } catch {}
    }
  }, []);
  useEffect(() => {
    if (mode !== "editor" || !story) return;
    try {
      sessionStorage.setItem(
        "brand-story-draft",
        JSON.stringify({ story, record }),
      );
    } catch {}
  }, [story, record, mode]);
  useEffect(() => {
    const f = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);
  const currentStory = useRef(story);
  currentStory.current = story;
  const card = story?.cards.find((c) => c.id === selected);
  function change(fn) {
    setStory((s) => fn(structuredClone(s)));
    setDirty(true);
  }
  function updateCard(patch) {
    change((s) => {
      Object.assign(
        s.cards.find((c) => c.id === selected),
        patch,
      );
      return s;
    });
  }
  const running = useRef(false);
  async function run(fn) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function save(publish = false) {
    validateStory(story);
    let current = record;
    if (!current.id) {
      current = await api("", { data: story });
      setRecord(current);
    }
    const r = await api("", {
      id: current.id,
      revision: current.revision,
      data: story,
      publish,
    });
    setRecord(r);
    if (currentStory.current === story) setDirty(false);
    setMessage(publish ? "Freigabelinks aktualisiert." : "Gespeichert.");
    setStories((await api()).stories);
    return r;
  }
  async function loadProduct(cardId, slotIndex, asin) {
    if (!/^[A-Z0-9]{10}$/i.test(asin)) return;
    await run(async () => {
      const result = await fetchProductData([asin], story.marketplace);
      const p = result.products[0];
      if (!p?.image)
        throw Error(
          result.failures?.[0]?.reason ||
            "Produktbild nicht verfügbar. Eigenes Bild hochladen.",
        );
      change((s) => {
        const target = s.cards.find((c) => c.id === cardId)?.slots[slotIndex];
        if (target && target.asin === asin)
          target.productImage = { url: p.image };
        return s;
      });
    });
  }
  async function copy(text) {
    await navigator.clipboard.writeText(text);
    setMessage("In die Zwischenablage kopiert.");
  }
  function link(kind) {
    return `${location.origin}/brand-stories?token=${encodeURIComponent(record[kind + "Token"])}`;
  }
  async function load(id) {
    if (dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    await run(async () => {
      const r = await api("?id=" + encodeURIComponent(id));
      setStory(r.data);
      setRecord(r);
      setSelected(null);
      setDirty(false);
    });
  }
  async function asset(file, apply) {
    await run(async () => {
      const img = await uploadImage(file);
      change((s) => {
        apply(s, img);
        return s;
      });
      setMessage("Bild hochgeladen. Änderungen bitte speichern.");
    });
  }
  function add(type) {
    change((s) => {
      const c = newCard(type, s.cards);
      s.cards.push(c);
      setSelected(c.id);
      return s;
    });
  }
  function reorder(delta) {
    change((s) => {
      const i = s.cards.findIndex((c) => c.id === selected),
        j = i + delta;
      if (j >= 0 && j < s.cards.length)
        [s.cards[i], s.cards[j]] = [s.cards[j], s.cards[i]];
      return s;
    });
  }
  async function folder(files) {
    await run(async () => {
      const next = structuredClone(story),
        report = [];
      const assigned = new Set();
      for (const f of files) {
        const key = f.name.replace(/\.(png|jpe?g)$/i, "").toLowerCase();
        let apply;
        if (key === "background-desktop" || key === "background-mobile") {
          const k = key.slice(11);
          apply = (img) => (next.background[k] = img);
        }
        for (const c of next.cards) {
          if (c.type === "media" && key === c.fileKey)
            apply = (img) => (c.image = img);
          if (c.type === "grid")
            c.slots.forEach((slot, i) => {
              if (key === `${c.fileKey}-${i + 1}`)
                apply = (img) => (slot.image = img);
            });
        }
        if (!apply) {
          report.push(`${f.name}: keine passende Position`);
          continue;
        }
        if (assigned.has(key)) {
          report.push(`${f.name}: doppelter Dateischlüssel, übersprungen`);
          continue;
        }
        try {
          const img = await uploadImage(f);
          apply(img);
          const kind =
            key === "background-desktop"
              ? "desktop"
              : key === "background-mobile"
                ? "mobile"
                : /^card-\d+-[1-4]$/.test(key)
                  ? "product"
                  : "media";
          report.push(
            ...imageWarnings(img, kind).map((w) => `${f.name}: WARNUNG: ${w}`),
          );
          assigned.add(key);
          report.push(`${f.name}: zugeordnet`);
        } catch (e) {
          report.push(`${f.name}: ${e.message}`);
        }
      }
      if (mode === "designer") {
        const assets = [];
        for (const kind of ["desktop", "mobile"])
          if (next.background[kind])
            assets.push({ kind, image: next.background[kind] });
        for (const c of next.cards) {
          if (c.type === "media" && c.image)
            assets.push({ kind: "media", cardId: c.id, image: c.image });
          if (c.type === "grid")
            c.slots.forEach((slot, i) => {
              if (slot.image)
                assets.push({
                  kind: "product",
                  cardId: c.id,
                  slot: i,
                  image: slot.image,
                });
            });
        }
        const r = await api("?token=" + encodeURIComponent(token), {
          assets,
          revision: record.revision,
        });
        setStory(r.data);
        setRecord({ revision: r.revision });
      } else {
        setStory(next);
        setDirty(true);
      }
      setMessage(report.join("\n"));
    });
  }
  function importJson() {
    const next = validateStory(JSON.parse(json));
    if (
      next.brandName.trim().toLowerCase() ===
        story.brandName.trim().toLowerCase() &&
      next.marketplace === story.marketplace
    ) {
      for (const kind of ["desktop", "mobile"])
        next.background[kind] ||= story.background[kind];
      next.references ||= story.references || [];
      for (const c of next.cards) {
        const old = story.cards.find((x) => x.id === c.id && x.type === c.type);
        if (!old) continue;
        c.image ||= old.image;
        if (c.type === "grid")
          c.slots.forEach((slot, i) => {
            slot.image ||= old.slots[i].image;
            if (slot.asin === old.slots[i].asin)
              slot.productImage ||= old.slots[i].productImage;
          });
      }
    }
    if (
      !confirm(
        "Story-Struktur durch diesen Import ersetzen? Bitte vorhandene Bilder und IDs im JSON beibehalten.",
      )
    )
      return;
    setStory(next);
    setSelected(null);
    setDirty(true);
    setJson("");
    setMessage("Import übernommen. Änderungen bitte prüfen und speichern.");
  }
  if (mode === "loading" || mode === "error")
    return (
      <main className="bs-app">
        <p>{message || "Brand Story wird geladen …"}</p>
      </main>
    );
  const designer = mode === "designer",
    customer = mode === "customer";
  return (
    <main className={`bs-app ${customer ? "bs-customer" : ""}`}>
      <header className="bs-header">
        <div>
          <span className="bs-eyebrow">
            TEMOA ·{" "}
            {designer
              ? "DESIGNER BRIEFING"
              : customer
                ? "PREVIEW"
                : "WORKSPACE"}
          </span>
          <h1>{story?.brandName || "Brand Stories"}</h1>
        </div>
        <div className="bs-actions">
          {!token && (
            <>
              <button
                disabled={busy}
                onClick={() => {
                  if (dirty && !confirm("Ungespeicherte Änderungen verwerfen?"))
                    return;
                  const name = prompt("Für welche Marke?");
                  if (!name?.trim()) return;
                  setStory(newStory(name.trim()));
                  setRecord({});
                  setSelected(null);
                  setDirty(true);
                }}
              >
                Neue Brand Story
              </button>
              {story && (
                <>
                  <button disabled={busy} onClick={() => run(() => save())}>
                    {dirty ? "Änderungen speichern" : "Speichern"}
                  </button>
                  <button
                    className="bs-primary"
                    disabled={busy}
                    onClick={() => run(() => save(true))}
                  >
                    Freigabelinks aktualisieren
                  </button>
                </>
              )}
            </>
          )}
          <button aria-pressed={!mobile} onClick={() => setMobile(false)}>
            Desktop
          </button>
          <button aria-pressed={mobile} onClick={() => setMobile(true)}>
            Mobil
          </button>
        </div>
      </header>
      {message && (
        <div role="status" className="bs-message">
          {message}
        </div>
      )}
      {!token && stories.length > 0 && (
        <label className="bs-open">
          Story öffnen{" "}
          <select
            disabled={busy}
            value={record.id || ""}
            onChange={(e) => e.target.value && load(e.target.value)}
          >
            <option value="">Auswählen</option>
            {stories.map((s) => (
              <option value={s.id} key={s.id}>
                {s.brandName} · {s.marketplace} · {s.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      )}
      {!story ? (
        <div className="bs-empty">
          <h2>Markengeschichten gestalten</h2>
          <p>
            Lege eine Marke an, entwickle die Karten und teile die interaktive
            Vorschau.
          </p>
        </div>
      ) : (
        <>
          {!customer && (
            <nav className="bs-tabs">
              {[
                ["design", designer ? "Design" : "Editor"],
                ["briefing", "Designer-Briefing"],
                ["references", designer ? "Examples" : "Designbeispiele"],
                ...(!token
                  ? [
                      ["instructions", "Anweisungen & Claude"],
                      ["import", "JSON-Import"],
                    ]
                  : []),
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
          {(tab === "design" || customer) && (
            <>
              {!customer && (
                <div className="bs-preview-tools">
                  <span>Hintergrund bleibt fest · Karten bewegen sich</span>
                  {!mobile && (
                    <label>
                      <input
                        type="checkbox"
                        checked={raster}
                        onChange={(e) => setRaster(e.target.checked)}
                      />{" "}
                      Positionsraster
                    </label>
                  )}
                </div>
              )}
              <StoryCarousel
                story={story}
                mobile={mobile}
                raster={!customer && raster && !mobile}
              />
              {!token && (
                <div className="bs-workbench">
                  <aside>
                    <button
                      aria-pressed={!selected}
                      onClick={() => setSelected(null)}
                    >
                      Hintergrund & Marke
                    </button>
                    {story.cards.map((c, i) => (
                      <button
                        key={c.id}
                        aria-pressed={selected === c.id}
                        onClick={() => setSelected(c.id)}
                      >
                        {i + 1}. {c.type === "grid" ? "ASIN-Grid" : "Bildkarte"}
                        <small>{c.fileKey}</small>
                      </button>
                    ))}
                    <button
                      disabled={busy || story.cards.length >= 19}
                      onClick={() => add("media")}
                    >
                      ＋ Bildkarte
                    </button>
                    <button
                      disabled={busy || story.cards.length >= 19}
                      onClick={() => add("grid")}
                    >
                      ＋ ASIN-Grid
                    </button>
                  </aside>
                  <fieldset disabled={busy} className="bs-panel">
                    {!card ? (
                      <>
                        <h2>Hintergrund & Marke</h2>
                        <Field
                          label="Marke"
                          value={story.brandName}
                          onChange={(v) =>
                            change((s) => ({ ...s, brandName: v }))
                          }
                        />
                        <div className="bs-row">
                          <Field
                            label="Marktplatz"
                            value={story.marketplace}
                            onChange={(v) =>
                              change((s) => ({ ...s, marketplace: v }))
                            }
                          />
                          <Field
                            label="Sprache"
                            value={story.language}
                            onChange={(v) =>
                              change((s) => ({ ...s, language: v }))
                            }
                          />
                        </div>
                        <p>
                          Links ist Platz für ergänzendes Branding. Alle
                          wichtigen Aussagen müssen über die Karten auch mobil
                          verständlich sein. Plane das Motiv so, dass es beim
                          Weiterklicken gezielt verdeckt wird.
                        </p>
                        {["desktop", "mobile"].map((k) => (
                          <Asset
                            key={k}
                            label={
                              k === "desktop"
                                ? "Desktop-Hintergrund"
                                : "Mobiler Hintergrund"
                            }
                            image={story.background[k]}
                            kind={k}
                            onUpload={(f) =>
                              asset(f, (s, img) => (s.background[k] = img))
                            }
                            onRemove={() =>
                              change((s) => {
                                s.background[k] = null;
                                return s;
                              })
                            }
                          />
                        ))}
                        <Field
                          area
                          label="Designer brief (English)"
                          value={story.background.brief}
                          onChange={(v) =>
                            change((s) => {
                              s.background.brief = v;
                              return s;
                            })
                          }
                        />
                        <Field
                          area
                          label="Wortlaut im Hintergrundbild"
                          value={story.background.copy}
                          onChange={(v) =>
                            change((s) => {
                              s.background.copy = v;
                              return s;
                            })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <div className="bs-actions">
                          <h2>{card.fileKey}</h2>
                          <button onClick={() => reorder(-1)}>↑</button>
                          <button onClick={() => reorder(1)}>↓</button>
                          <button
                            onClick={() => {
                              if (confirm("Karte entfernen?"))
                                change((s) => {
                                  s.cards = s.cards.filter(
                                    (c) => c.id !== selected,
                                  );
                                  setSelected(null);
                                  return s;
                                });
                            }}
                          >
                            Karte entfernen
                          </button>
                        </div>
                        <Field
                          area
                          label="Designer brief (English)"
                          value={card.brief}
                          onChange={(v) => updateCard({ brief: v })}
                        />
                        <Field
                          area
                          label="Wortlaut im Bild"
                          value={card.copy}
                          onChange={(v) => updateCard({ copy: v })}
                        />
                        {card.type === "media" ? (
                          <Asset
                            label="Bildkarte"
                            kind="media"
                            image={card.image}
                            onUpload={(f) =>
                              asset(
                                f,
                                (s, img) =>
                                  (s.cards.find(
                                    (c) => c.id === selected,
                                  ).image = img),
                              )
                            }
                            onRemove={() => updateCard({ image: null })}
                          />
                        ) : (
                          <>
                            <Field
                              label="Grid-Überschrift"
                              maxLength={30}
                              value={card.headline}
                              onChange={(v) => updateCard({ headline: v })}
                            />
                            <Field
                              label="Ziel für Shop besuchen"
                              type="url"
                              value={card.shopUrl}
                              onChange={(v) => updateCard({ shopUrl: v })}
                            />
                            {card.slots.map((slot, i) => (
                              <section key={i} className="bs-slot">
                                <h3>Produkt {i + 1}</h3>
                                <Field
                                  label="ASIN"
                                  maxLength={10}
                                  value={slot.asin}
                                  onBlur={() => {
                                    if (!slot.productImage)
                                      loadProduct(card.id, i, slot.asin);
                                  }}
                                  onChange={(v) => {
                                    const slots = structuredClone(card.slots);
                                    slots[i].asin = v.trim().toUpperCase();
                                    slots[i].productImage = null;
                                    updateCard({ slots });
                                  }}
                                />
                                <Field
                                  label="Produktlink (optional, ersetzt das ASIN-Ziel)"
                                  value={slot.url}
                                  onChange={(v) => {
                                    const slots = structuredClone(card.slots);
                                    slots[i].url = v;
                                    updateCard({ slots });
                                  }}
                                />
                                <button
                                  disabled={!/^[A-Z0-9]{10}$/i.test(slot.asin)}
                                  onClick={() =>
                                    loadProduct(card.id, i, slot.asin)
                                  }
                                >
                                  Produkthauptbild laden
                                </button>
                                {slot.productImage && (
                                  <div className="bs-product-default">
                                    <Picture image={slot.productImage} />
                                    <small>
                                      Produkthauptbild verfügbar
                                      {slot.image
                                        ? " · eigenes Bild hat Vorrang"
                                        : ""}
                                    </small>
                                  </div>
                                )}
                                <Asset
                                  label={`Eigenes Bild · ${card.fileKey}-${i + 1}`}
                                  kind="product"
                                  image={slot.image}
                                  onUpload={(f) =>
                                    asset(
                                      f,
                                      (s, img) =>
                                        (s.cards.find(
                                          (c) => c.id === selected,
                                        ).slots[i].image = img),
                                    )
                                  }
                                  onRemove={() => {
                                    const slots = structuredClone(card.slots);
                                    slots[i].image = null;
                                    updateCard({ slots });
                                  }}
                                />
                              </section>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </fieldset>
                </div>
              )}
              {(!token || designer) && (
                <section className="bs-panel">
                  <h2>
                    {designer
                      ? "Upload design files"
                      : "Bilder aus Ordner zuordnen"}
                  </h2>
                  <p>
                    Dateinamen: background-desktop.jpg, background-mobile.jpg,{" "}
                    {story.cards[0]?.fileKey || "card-01"}.jpg für Bildkarten;
                    card-02-1.jpg bis card-02-4.jpg für Grid-Plätze. Die
                    Dateischlüssel bleiben beim Umsortieren erhalten. Vorhandene
                    Bilder werden an passenden Positionen ersetzt.
                  </p>
                  <label className="bs-upload">
                    Ordner auswählen
                    <input
                      disabled={busy}
                      type="file"
                      webkitdirectory=""
                      multiple
                      onChange={(e) => {
                        folder(Array.from(e.target.files));
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <details>
                    <summary>Prüfung der Vorschau</summary>
                    {publicationWarnings(story).map((w, i) => (
                      <p className="bs-warning" key={i}>
                        {w}
                      </p>
                    ))}
                  </details>
                </section>
              )}
            </>
          )}
          {tab === "briefing" && !customer && (
            <section className="bs-panel">
              <h2>Designer briefing</h2>
              <p>{DESIGN_RULES}</p>
              <h3>Background</h3>
              <p>{story.background.brief}</p>
              <blockquote>{story.background.copy}</blockquote>
              <p>Files: background-desktop.jpg · background-mobile.jpg</p>
              {story.cards.map((c, i) => (
                <article key={c.id}>
                  <h3>
                    {i + 1}.{" "}
                    {c.type === "grid" ? "Four-product grid" : "Image card"} ·{" "}
                    {c.fileKey}
                  </h3>
                  <p>{c.brief}</p>
                  <blockquote>{c.copy}</blockquote>
                  <p>
                    {c.type === "grid"
                      ? `${c.fileKey}-1.jpg … ${c.fileKey}-4.jpg · 1328 × 1456 px each`
                      : `${c.fileKey}.jpg · 814 × 1019 px`}
                  </p>
                  {c.type === "grid" && (
                    <>
                      <p>
                        Headline: {c.headline} · Shop besuchen: {c.shopUrl}
                      </p>
                      {c.slots.map((slot, j) => (
                        <p key={j}>
                          Slot {j + 1}:{" "}
                          {productUrl(slot, story.marketplace) ||
                            "Product target pending"}
                        </p>
                      ))}
                    </>
                  )}
                </article>
              ))}
            </section>
          )}
          {tab === "references" && !customer && (
            <section className="bs-panel">
              <h2>{designer ? "Design references" : "Designbeispiele"}</h2>
              <p>
                {designer
                  ? "Each image shows consecutive carousel states. Use composition principles as inspiration. All brand facts and visual identity belong to the example brand."
                  : "Die Beispiele zeigen aufeinanderfolgende Karussellansichten. Übertragbar sind Aufbau und Kompositionsprinzipien."}
              </p>
              <div className="bs-examples">
                {EXAMPLES.map(([name, file]) => (
                  <a
                    href={"/brand-story-examples/" + file}
                    target="_blank"
                    rel="noreferrer"
                    key={file}
                  >
                    <img
                      src={"/brand-story-examples/" + file}
                      alt={name + " Brand Story"}
                    />
                    <strong>{name}</strong>
                  </a>
                ))}
                {(story.references || []).map((r, i) => (
                  <a
                    key={i}
                    href={safeUrl(r.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Picture image={r} />
                    <strong>{r.name}</strong>
                  </a>
                ))}
              </div>
              {!token && (
                <label className="bs-upload">
                  Eigenes Beispiel hinterlegen
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={busy}
                    onChange={(e) => {
                      if (e.target.files[0])
                        asset(
                          e.target.files[0],
                          (s, img) =>
                            (s.references = [...(s.references || []), img]),
                        );
                    }}
                  />
                </label>
              )}
            </section>
          )}
          {tab === "instructions" && !token && (
            <section className="bs-panel">
              <h2>Anweisungen & Claude</h2>
              <Field
                area
                label="Belegte Markeninformationen und Quellen"
                value={story.brandFacts}
                onChange={(v) => change((s) => ({ ...s, brandFacts: v }))}
              />
              <Field
                area
                label="Zusätzliche interne Anweisungen"
                value={story.instructions}
                onChange={(v) => change((s) => ({ ...s, instructions: v }))}
              />
              <p>
                Starte mit dem kopierten Briefing in Claude. Ergänze
                Markenquellen und lass das Ergebnis als JSON ausgeben.
                Importiere es anschließend unter JSON-Import.
              </p>
              <button
                disabled={busy}
                onClick={() => run(() => copy(claudePrompt(story)))}
              >
                Startanweisung für Claude kopieren
              </button>
              <details>
                <summary>Verbindliche Gestaltungsregeln</summary>
                <p>{DESIGN_RULES}</p>
              </details>
            </section>
          )}
          {tab === "import" && !token && (
            <section className="bs-panel">
              <h2>JSON-Import & Sicherung</h2>
              <button onClick={() => download(story)}>
                Aktuellen Stand exportieren
              </button>
              <textarea
                aria-label="Brand Story JSON"
                className="bs-json"
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) run(async () => setJson(await f.text()));
                }}
              />
              <button disabled={busy || !json} onClick={() => run(importJson)}>
                JSON prüfen und übernehmen
              </button>
            </section>
          )}
          {!token && (record.designerToken || record.customerToken) && (
            <section className="bs-panel">
              <h2>Freigabelinks</h2>
              <p>
                Links zeigen den zuletzt freigegebenen Stand. Entwürfe werden
                erst über „Freigabelinks aktualisieren“ sichtbar.
              </p>
              {[
                ["designer", "Designer-Link"],
                ["customer", "Kunden-Preview"],
              ].map(
                ([kind, label]) =>
                  record[kind + "Token"] && (
                    <div className="bs-share" key={kind}>
                      <a href={link(kind)} target="_blank" rel="noreferrer">
                        {label} öffnen
                      </a>
                      <button onClick={() => run(() => copy(link(kind)))}>
                        Link kopieren
                      </button>
                    </div>
                  ),
              )}
            </section>
          )}
        </>
      )}
      {busy && (
        <div className="bs-busy" role="status">
          Wird verarbeitet …
        </div>
      )}
    </main>
  );
}
