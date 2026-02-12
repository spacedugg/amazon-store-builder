import { useState, useRef, useEffect } from "react";
import Head from "next/head";

/* ═══════════════════════════════════════════════════════════════
   AMAZON BRAND STORE BUILDER — MULTI-STEP AI GENERATION
   5 sequential API calls, each focused on one job.
   Production Next.js version — uses /api/generate endpoint
   ═══════════════════════════════════════════════════════════════ */

// ── Real Amazon Store Tile Types & Specs ──
const TILES = {
  hero_image:     { name:"Hero Image", icon:"🖼️", grp:"Header", sizes:["full_width"], needsImage:true,
    specs:{ full_width:{ min:"3000×600px", rec:"3000×1200px", max:"5MB", safe:"Mittlere 70%", fmt:"JPG/PNG" }}},
  image:          { name:"Image", icon:"🖼️", grp:"Content", sizes:["full_width","large","medium","small"], needsImage:true,
    specs:{ full_width:{min:"1500×20px",rec:"3000px Breite",max:"5MB"}, large:{min:"1500×1500px"}, medium:{min:"1500×750px"}, small:{min:"750×750px"}}},
  image_with_text:{ name:"Image + Text", icon:"📝", grp:"Content", sizes:["full_width","large","medium","small"], needsImage:true,
    specs:{ full_width:{min:"3000×1500px (Overlay) / 1500×1500px (Beside)",max:"5MB"}, large:{min:"1500×1500px"}, medium:{min:"1500×750px / 750×750px"}, small:{min:"750×750px"}}},
  shoppable_image:{ name:"Shoppable Image", icon:"🛒", grp:"Content", sizes:["full_width","large","medium","small"], needsImage:true,
    specs:{ full_width:{min:"1500×750px",rec:"3000×1500px",max:"5MB",note:"Bis zu 6 Produkt-Hotspots"}}},
  text:           { name:"Text", icon:"📝", grp:"Content", sizes:["full_width","large","medium","small"], needsImage:false },
  video:          { name:"Video", icon:"🎥", grp:"Media", sizes:["full_width","large","medium"], needsImage:true,
    specs:{ full_width:{cover:"3000×1500px",video:"1280×640px",ratio:"6:4–8:3",fmt:"MP4 H.264"}}},
  background_video:{ name:"Background Video", icon:"🎬", grp:"Media", sizes:["full_width","large","medium"], needsImage:false,
    specs:{ full_width:{video:"1280×640px",dur:"2–20s",note:"Auto-play, stumm, max 4/Seite"}}},
  gallery:        { name:"Gallery", icon:"🎨", grp:"Content", sizes:["full_width"], needsImage:true,
    specs:{ full_width:{min:"1500×750px",count:"3–8 Bilder",note:"Alle gleiche Größe"}}},
  product:        { name:"Product", icon:"📦", grp:"Produkte", sizes:["full_width","large","medium","small"], needsImage:false },
  product_grid:   { name:"Product Grid", icon:"🛍️", grp:"Produkte", sizes:["full_width"], needsImage:false,
    specs:{ full_width:{note:"4–500 Produkte, Standard oder Tall, max 1/Seite"}}},
  best_sellers:   { name:"Best Sellers", icon:"🏆", grp:"Produkte", sizes:["full_width"], needsImage:false },
  recommended:    { name:"Recommended", icon:"💡", grp:"Produkte", sizes:["full_width"], needsImage:false },
  featured_deals: { name:"Featured Deals", icon:"🏷️", grp:"Produkte", sizes:["full_width"], needsImage:false },
};

const SIZE_LABELS = { full_width:"Full Width", large:"Large", medium:"Medium", small:"Small" };
const GROUPS = ["Header","Content","Media","Produkte"];

// ── Helpers ──
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
const mkTile = (type,size="full_width",content={},briefing="") => ({
  id:uid(), type, size: TILES[type]?.sizes.includes(size)?size:(TILES[type]?.sizes[0]||"full_width"),
  content, imageBriefing:briefing, image:null, imageFile:"", imgW:0, imgH:0
});
const mkPage = (name,id) => ({ id:id||uid(), name, heroImageBriefing:"", tiles:[] });

// ── Styles ──
const S = {
  dark: "#1a1a2e",
  orange: "#FF9900",
  border: "#e2e4e8",
  gray: "#6b7280",
  lightBg: "#f5f6f8",
  // Common
  badge: (bg,color) => ({ display:"inline-block", padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700, background:bg, color }),
  btn: (bg,color) => ({ padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700, background:bg, color, border:"none", cursor:"pointer" }),
  btnOutline: { padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:600, background:"none", color:"#9ca3af", border:"1px solid #4b5563", cursor:"pointer" },
  input: { width:"100%", padding:"6px 10px", borderRadius:8, fontSize:13, border:"1px solid #ddd", outline:"none" },
  textarea: { width:"100%", padding:"6px 10px", borderRadius:8, fontSize:12, border:"1px solid #ddd", outline:"none", resize:"vertical", minHeight:60 },
  label: { display:"block", marginBottom:3, fontSize:10, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".3px" },
  section: { marginBottom:12 },
};

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function Home() {
  const [store, setStore] = useState({ brandName:"", brandProfile:null, amazonData:null, pages:[mkPage("Homepage","homepage")] });
  const [curPage, setCurPage] = useState("homepage");
  const [selTile, setSelTile] = useState(null);
  const [mode, setMode] = useState("builder");

  const [aiModal, setAiModal] = useState(false);
  const [aiBrand, setAiBrand] = useState("");
  const [aiMp, setAiMp] = useState("de");
  const [aiCat, setAiCat] = useState("");
  const [aiInfo, setAiInfo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genSteps, setGenSteps] = useState([]);
  const [genLog, setGenLog] = useState([]);
  const [refine, setRefine] = useState("");
  const [toast, setToast] = useState(null);
  const [hoveredTile, setHoveredTile] = useState(null);
  const [errorLog, setErrorLog] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const addError = (msg, detail) => setErrorLog(prev=>[...prev, { time:new Date().toLocaleTimeString(), msg, detail: detail||"" }]);

  const page = store.pages.find(p=>p.id===curPage) || store.pages[0];
  const tile = page?.tiles.find(t=>t.id===selTile);
  const tileDef = tile ? TILES[tile.type] : null;

  const showToast = (m,t="ok") => { setToast({m,t}); setTimeout(()=>setToast(null),4000); };
  const addLog = (msg) => setGenLog(prev=>[...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const up = (fn) => setStore(prev => { const n=JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  const upPage = (fn) => up(s=>{ const p=s.pages.find(pg=>pg.id===curPage); if(p)fn(p); });
  const upTile = (fn) => upPage(p=>{ const t=p.tiles.find(ti=>ti.id===selTile); if(t)fn(t); });

  const addTile = (type) => { const t=mkTile(type); upPage(p=>p.tiles.push(t)); setSelTile(t.id); };
  const delTile = (id) => { upPage(p=>{p.tiles=p.tiles.filter(t=>t.id!==id);}); if(selTile===id)setSelTile(null); };
  const moveTile = (id,d) => upPage(p=>{ const i=p.tiles.findIndex(t=>t.id===id); const j=i+d; if(j>=0&&j<p.tiles.length)[p.tiles[i],p.tiles[j]]=[p.tiles[j],p.tiles[i]]; });
  const addPageFn = (name) => { const p=mkPage(name||"Neue Seite"); up(s=>s.pages.push(p)); setCurPage(p.id); setSelTile(null); };
  const delPage = (id) => { if(store.pages.length<=1)return; up(s=>{s.pages=s.pages.filter(p=>p.id!==id);}); if(curPage===id)setCurPage(store.pages.find(p=>p.id!==id)?.id); };

  // Image upload
  const fileRef = useRef(null);
  const handleImg = (file) => {
    if(!file||!selTile)return;
    const r=new FileReader();
    r.onload=(e)=>{ const img=new Image(); img.onload=()=>{
      upTile(t=>{t.image=e.target.result;t.imageFile=file.name;t.imgW=img.width;t.imgH=img.height;t.imgSize=`${(file.size/1048576).toFixed(1)}MB`;});
      showToast(`Bild: ${img.width}×${img.height}px`);
    }; img.src=e.target.result; };
    r.readAsDataURL(file);
  };

  // ── API call via /api/generate with retry for rate limits ──
  const callStep = async (step, body, maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let resp;
      try {
        resp = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "step", step, ...body }),
        });
      } catch(networkErr) {
        const msg = `Network error at step "${step}": ${networkErr.message}`;
        addError(msg, networkErr.stack);
        addLog(`❌ ${msg}`);
        throw new Error(msg);
      }
      let data;
      const rawText = await resp.text();
      try {
        data = JSON.parse(rawText);
      } catch(parseErr) {
        const msg = `JSON parse error at step "${step}" (HTTP ${resp.status})`;
        addError(msg, rawText.slice(0, 2000));
        addLog(`❌ ${msg}`);
        throw new Error(`${msg}: ${rawText.slice(0, 200)}`);
      }
      if (data.error && (data.error.includes("429") || data.error.includes("rate")) && attempt < maxRetries) {
        const wait = 15 * (attempt + 1);
        addLog(`⏳ Rate limit — warte ${wait}s vor Retry ${attempt+1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }
      if (data.error) {
        const msg = `Step "${step}" failed: ${data.error}`;
        addError(msg, JSON.stringify(data, null, 2));
        throw new Error(data.error);
      }
      return data.data;
    }
    const msg = "Rate limit nach allen Retries. Bitte 1 Minute warten.";
    addError(msg);
    throw new Error(msg);
  };

  // ═══════════════════════════════════════════════════
  // MULTI-STEP GENERATION (4 steps: research, architecture, content, validate)
  // ═══════════════════════════════════════════════════
  const generate = async () => {
    if(!aiBrand.trim()) return showToast("Markenname fehlt!","err");
    setAiModal(false); setGenerating(true); setGenLog([]);
    const steps = [
      {name:"Marke & Amazon recherchieren", desc:"Web Search: Website, Produkte, ASINs, Kategorien..."},
      {name:"Store-Architektur erstellen", desc:"Seiten, Navigation, Tile-Sequenzen..."},
      {name:"Inhalte generieren", desc:"Texte, Bild-Briefings pro Seite..."},
      {name:"Validieren & aufbauen", desc:"Prüfen, Auto-Fix, Store zusammensetzen..."},
    ];
    setGenSteps(steps);

    try {
      // STEP 1: Combined brand + Amazon research
      setGenStep(0); addLog("🔍 Recherchiere Marke & Amazon-Produkte...");
      const brandProfile = await callStep("research", { brandName:aiBrand, marketplace:aiMp, category:aiCat, additionalInfo:aiInfo });
      addLog(`✅ Brand: ${brandProfile.type}, ${brandProfile.categories?.length||0} Kategorien, ${brandProfile.products?.length||0} Produkte`);

      // STEP 2: Architecture
      setGenStep(1); addLog("🏗️ Erstelle Store-Architektur...");
      const architecture = await callStep("architecture", { marketplace:aiMp, brandProfile });
      addLog(`✅ ${architecture.pages?.length||0} Seiten geplant`);
      architecture.pages?.forEach(p => addLog(`   📄 ${p.name}: ${p.purpose?.slice(0,60)}...`));

      // STEP 3: Content per page
      setGenStep(2);
      const builtPages = [];
      for(let i=0; i<(architecture.pages||[]).length; i++) {
        const pagePlan = architecture.pages[i];
        addLog(`📝 Seite ${i+1}/${architecture.pages.length}: "${pagePlan.name}"...`);
        const pageContent = await callStep("content", { marketplace:aiMp, brandProfile, pagePlan });
        const validTiles = (pageContent.tiles||[]).filter(t=>TILES[t.type]).map(t=>mkTile(t.type,t.size,t.content||{},t.imageBriefing||""));
        builtPages.push({ id:pagePlan.id||`page_${i}`, name:pageContent.pageName||pagePlan.name, heroImageBriefing:pageContent.heroImageBriefing||"", tiles:validTiles });
        addLog(`   ✅ ${validTiles.length} Tiles, ${validTiles.filter(t=>t.imageBriefing).length} Briefings`);
      }

      // STEP 4: Validate
      setGenStep(3); addLog("🔍 Validiere...");
      let warnings = 0;
      builtPages.forEach(p => {
        if(p.tiles.filter(t=>t.type==="product_grid").length>1){ p.tiles=p.tiles.filter((t,i)=>t.type!=="product_grid"||p.tiles.findIndex(x=>x.type==="product_grid")===i); warnings++; }
        if(p.tiles.length>20){ p.tiles=p.tiles.slice(0,20); warnings++; }
        p.tiles.forEach(t=>{ if(TILES[t.type]?.needsImage && !t.imageBriefing) warnings++; });
      });
      addLog(`✅ ${warnings} Warnungen`);

      setStore({ brandName:aiBrand, brandProfile, amazonData:null, pages:builtPages });
      setCurPage(builtPages[0]?.id); setSelTile(null);
      const tot = builtPages.reduce((a,p)=>a+p.tiles.length,0);
      addLog(`\n🎉 FERTIG: ${builtPages.length} Seiten, ${tot} Tiles`);
      showToast(`Store: ${builtPages.length} Seiten, ${tot} Tiles`);
    } catch(e) {
      addLog(`❌ FEHLER: ${e.message}`);
      addError(`Generation failed: ${e.message}`, e.stack);
      showToast(e.message,"err");
    } finally { setGenerating(false); setShowErrors(true); }
  };

  // ── Refine ──
  const doRefine = async () => {
    if(!refine.trim()||!store.pages.length) return;
    setGenerating(true); setGenSteps([{name:"Verfeinere...",desc:refine}]); setGenStep(0); setGenLog([]);
    addLog(`✏️ "${refine}"`);
    const storeClean = JSON.parse(JSON.stringify(store));
    storeClean.pages.forEach(p=>p.tiles.forEach(t=>{t.image=null;}));
    try {
      const resp = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"refine", store:storeClean, instruction:refine })});
      const result = await resp.json();
      if(result.error) throw new Error(result.error);
      if(result.pages?.length) {
        const pages = result.pages.map((p,i)=>({
          ...mkPage(p.name, p.id||`page_${i}`), heroImageBriefing:p.heroImageBriefing||"",
          tiles:(p.tiles||[]).filter(t=>TILES[t.type]).map(t=>mkTile(t.type,t.size,t.content||{},t.imageBriefing||""))
        }));
        up(s=>{ s.pages=pages; s.brandProfile=result.brandProfile||s.brandProfile; });
        setCurPage(pages[0]?.id); addLog("✅ Verfeinert"); showToast("Store verfeinert!");
      }
    } catch(e) { addLog(`❌ ${e.message}`); showToast(e.message,"err"); }
    finally { setGenerating(false); setRefine(""); }
  };

  // ── Export ──
  const exportBriefing = () => {
    const bp = store.brandProfile;
    let md = `# Designer Briefing: ${store.brandName}\n\n`;
    if(bp) md += `## Brand\n- Typ: ${bp.type}\n- Ton: ${bp.tone}\n- Farben: ${bp.colors?.primary}, ${bp.colors?.secondary}, ${bp.colors?.accent}\n- USPs: ${(bp.usps||[]).join(" | ")}\n\n---\n\n`;
    store.pages.forEach((pg,pi)=>{
      md += `# Seite ${pi+1}: ${pg.name}\n\n## Hero\n- 3000×600px, max 5MB, Safe Zone 70%\n- ${pg.heroImageBriefing||"—"}\n\n`;
      pg.tiles.forEach((t,ti)=>{
        const d=TILES[t.type]; md += `### ${ti+1}. ${d?.name} (${SIZE_LABELS[t.size]})\n`;
        if(t.imageBriefing) md += `🎨 ${t.imageBriefing}\n`;
        if(t.image) md += `✅ ${t.imageFile} (${t.imgW}×${t.imgH})\n`;
        else if(d?.needsImage) md += `⚠ Bild fehlt\n`;
        md += `\n`;
      });
      md += `---\n\n`;
    });
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([md],{type:"text/markdown"}));
    a.download=`${store.brandName||"store"}_briefing.md`; a.click(); showToast("Briefing exportiert!");
  };

  const exportJSON = () => {
    const d=JSON.parse(JSON.stringify(store)); d.pages.forEach(p=>p.tiles.forEach(t=>{t.image=null;}));
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));
    a.download=`${store.brandName||"store"}.json`; a.click(); showToast("JSON exportiert!");
  };

  const accent = store.brandProfile?.colors?.primary || S.orange;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <>
      <Head><title>Amazon Brand Store Builder</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>

        {/* HEADER */}
        <header style={{display:"flex",alignItems:"center",height:52,padding:"0 16px",gap:12,background:S.dark,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,color:"#fff",fontWeight:700,fontSize:14}}>
            <span style={{fontSize:16}}>🏪</span>
            <span>Store Builder</span>
            <span style={{...S.badge(S.orange,S.dark),fontSize:9}}>MULTI-STEP AI</span>
          </div>
          {store.brandProfile && (
            <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:12,padding:"4px 8px",borderRadius:6,background:"rgba(255,255,255,.08)"}}>
              <span style={{width:12,height:12,borderRadius:"50%",background:accent}} />
              <span style={{fontSize:12,color:"#9ca3af"}}>{store.brandName} · {store.brandProfile.type}</span>
            </div>
          )}
          <div style={{flex:1,display:"flex",justifyContent:"center",gap:4}}>
            {[["builder","✏️ Builder"],["preview","👁️ Preview"],["briefing","📋 Briefing"]].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:600,
                color:mode===m?"#fff":"#6b7280",background:mode===m?"rgba(255,255,255,.12)":"none"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setAiModal(true)} style={S.btn(S.orange,S.dark)}>✨ AI Generieren</button>
            {errorLog.length>0 && <button onClick={()=>setShowErrors(!showErrors)} style={{...S.btnOutline, color:"#ef4444", borderColor:"#ef4444"}}> 🐛 {errorLog.length} Errors</button>}
            <button onClick={exportBriefing} style={S.btnOutline}>📋 Briefing</button>
            <button onClick={exportJSON} style={S.btnOutline}>📥 JSON</button>
          </div>
        </header>

        {/* MAIN */}
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>

          {/* SIDEBAR */}
          {mode==="builder" && (
            <aside style={{width:220,background:"#fff",borderRight:`1px solid ${S.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
              <div style={{padding:10,borderBottom:`1px solid ${S.border}`,fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".5px"}}>Amazon Tiles</div>
              <div style={{flex:1,overflowY:"auto",padding:6}}>
                {GROUPS.map(g=>(
                  <div key={g} style={{marginBottom:10}}>
                    <div style={{fontSize:9,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",padding:"0 8px",marginBottom:2,letterSpacing:".5px"}}>{g}</div>
                    {Object.entries(TILES).filter(([,v])=>v.grp===g).map(([k,v])=>(
                      <button key={k} onClick={()=>addTile(k)} style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:6,textAlign:"left",fontSize:12,background:"none",border:"none"}}
                        onMouseOver={e=>e.currentTarget.style.background="#f5f5f5"} onMouseOut={e=>e.currentTarget.style.background="none"}>
                        <span style={{fontSize:14,flexShrink:0}}>{v.icon}</span>
                        <span style={{fontWeight:500,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* CANVAS */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Page tabs */}
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",background:"#fff",borderBottom:`1px solid ${S.border}`,overflowX:"auto",flexShrink:0}}>
              {store.pages.map(p=>(
                <button key={p.id} onClick={()=>{setCurPage(p.id);setSelTile(null);}}
                  style={{padding:"4px 10px",borderRadius:6,fontSize:12,fontWeight:600,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4,
                    border:`1px solid ${p.id===curPage?S.dark:"#e5e7eb"}`,color:p.id===curPage?"#fff":"#6b7280",background:p.id===curPage?S.dark:"none"}}>
                  {p.name}
                  {store.pages.length>1 && <span onClick={e=>{e.stopPropagation();delPage(p.id);}} style={{opacity:.4,marginLeft:4,fontSize:10,cursor:"pointer"}}>✕</span>}
                </button>
              ))}
              <button onClick={()=>{const n=prompt("Seitenname:");if(n)addPageFn(n);}}
                style={{padding:"4px 8px",border:"1px dashed #d1d5db",borderRadius:6,fontSize:12,color:"#9ca3af",background:"none"}}>+ Seite</button>
            </div>

            {/* Canvas area */}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              <div style={{maxWidth:900,margin:"0 auto"}}>
                {page && <>
                  {/* Hero */}
                  {mode!=="preview" && (
                    <div style={{marginBottom:12,borderRadius:12,border:"2px dashed #d1d5db",overflow:"hidden",minHeight:100,background:`linear-gradient(135deg,${S.dark},#2d2d5e)`}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,color:"rgba(255,255,255,.4)",textAlign:"center"}}>
                        <span style={{fontSize:20,marginBottom:4}}>🖼️</span>
                        <div style={{fontSize:12,fontWeight:600}}>Hero Image · 3000×600px · Safe Zone 70%</div>
                        {page.heroImageBriefing && <div style={{fontSize:11,marginTop:4,color:"rgba(255,255,255,.25)",fontStyle:"italic",maxWidth:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{page.heroImageBriefing.slice(0,80)}..."</div>}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {page.tiles.length===0 && mode!=="preview" && (
                    <div style={{border:"2px dashed #d1d5db",borderRadius:16,padding:40,textAlign:"center",color:"#9ca3af",background:"#fff"}}>
                      <div style={{fontSize:24,marginBottom:8}}>📦</div>
                      <div style={{fontWeight:600,color:"#6b7280",fontSize:14}}>Keine Tiles</div>
                      <div style={{fontSize:12,marginTop:4}}>Links ein Tile klicken oder ✨ AI Generieren</div>
                    </div>
                  )}

                  {/* Tiles */}
                  {page.tiles.map(t => {
                    const def = TILES[t.type];
                    const isSel = selTile===t.id;
                    const isHov = hoveredTile===t.id;
                    const c = t.content||{};
                    const hasImg = !!t.image;

                    let inner;
                    if(t.type==="text") {
                      inner = <div style={{padding:20}}><p style={{fontSize:14,color:"#6b7280",lineHeight:1.6,textAlign:c.alignment||"left"}}>{c.text||"Text..."}</p></div>;
                    } else if(t.type==="image_with_text") {
                      inner = (
                        <div style={{display:"flex",flexDirection:c.layout==="text_beside"?"row":"column",minHeight:180}}>
                          <div style={{flex:1,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",color:"#d1d5db",fontSize:30,minHeight:140}}>
                            {hasImg ? <img src={t.image} alt="" style={{width:"100%",height:"auto"}} /> : "🖼️"}
                          </div>
                          <div style={{flex:1,padding:20,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                            {c.headline && <h3 style={{fontWeight:700,fontSize:16,marginBottom:8}}>{c.headline}</h3>}
                            {c.body && <p style={{fontSize:14,color:"#6b7280",lineHeight:1.6}}>{c.body}</p>}
                            {c.linkText && <span style={{fontSize:14,fontWeight:600,marginTop:8,color:"#007EB9"}}>{c.linkText} →</span>}
                          </div>
                        </div>
                      );
                    } else if(t.type==="product_grid") {
                      inner = <div style={{padding:20}}><div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Product Grid ({c.layout||"standard"})</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{[1,2,3,4,5,6,7,8].map(i=>
                          <div key={i} style={{background:"#fafafa",border:"1px solid #eee",borderRadius:6,padding:8,textAlign:"center"}}>
                            <div style={{width:"100%",aspectRatio:"1",background:"#f3f4f6",borderRadius:4,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center",color:"#d1d5db"}}>📦</div>
                            <div style={{fontSize:11,color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.asins?.[i-1]||`Produkt ${i}`}</div>
                          </div>
                        )}</div></div>;
                    } else if(t.type==="product") {
                      inner = <div style={{padding:16,display:"flex",alignItems:"center",gap:12}}><div style={{width:64,height:64,background:"#f3f4f6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#d1d5db"}}>📦</div><div><div style={{fontWeight:600,fontSize:14}}>{c.customTitle||c.name||"Produkt"}</div><div style={{fontSize:11,color:"#9ca3af",fontFamily:"monospace",marginTop:2}}>{c.asin||"ASIN"}</div>{c.price&&<div style={{fontSize:14,fontWeight:700,marginTop:2,color:"#CC0C39"}}>{c.price}</div>}</div></div>;
                    } else if(t.type==="best_sellers") {
                      inner = <div style={{padding:20,textAlign:"center",background:"linear-gradient(to right,#fffbeb,#fff7ed)"}}><span style={{fontSize:18}}>🏆</span><div style={{fontSize:14,fontWeight:600,marginTop:4}}>Best Sellers</div><div style={{fontSize:12,color:"#9ca3af"}}>Auto — Top 5</div></div>;
                    } else if(t.type==="recommended") {
                      inner = <div style={{padding:20,textAlign:"center",background:"#eff6ff"}}><span style={{fontSize:18}}>💡</span><div style={{fontSize:14,fontWeight:600,marginTop:4}}>Recommended</div><div style={{fontSize:12,color:"#9ca3af"}}>Personalisiert</div></div>;
                    } else if(t.type==="featured_deals") {
                      inner = <div style={{padding:20,textAlign:"center",background:"#fff7ed"}}><span style={{fontSize:18}}>🏷️</span><div style={{fontSize:14,fontWeight:600,marginTop:4}}>Featured Deals</div><div style={{fontSize:12,color:"#9ca3af"}}>Aktive Promotions</div></div>;
                    } else if(t.type==="gallery") {
                      inner = <div style={{padding:16}}><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{[1,2,3,4].map(i=><div key={i} style={{aspectRatio:"1",background:"#f3f4f6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#d1d5db",fontSize:20}}>🖼️</div>)}</div></div>;
                    } else if(t.type==="video"||t.type==="background_video") {
                      inner = <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:32,fontSize:36,background:S.dark,minHeight:160,color:"rgba(255,255,255,.3)",position:"relative"}}>▶</div>;
                    } else if(t.type==="shoppable_image") {
                      inner = hasImg
                        ? <div style={{position:"relative"}}><img src={t.image} alt="" style={{width:"100%",height:"auto"}} /><div style={{position:"absolute",top:8,right:8,padding:"2px 8px",background:"rgba(255,255,255,.9)",borderRadius:6,fontSize:12,fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,.1)"}}>🛒 Shoppable</div></div>
                        : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,background:"#f3f4f6",color:"#9ca3af",minHeight:180}}><span style={{fontSize:30,marginBottom:8}}>🛒🖼️</span><div style={{fontSize:12}}>Shoppable Image</div></div>;
                    } else {
                      inner = hasImg
                        ? <img src={t.image} alt="" style={{width:"100%",height:"auto",display:"block"}} />
                        : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,background:"#f3f4f6",color:"#9ca3af",minHeight:140}}>
                            <span style={{fontSize:30,marginBottom:8}}>🖼️</span>
                            <div style={{fontSize:12,fontWeight:600}}>{def?.name}</div>
                            {t.imageBriefing && <div style={{fontSize:11,marginTop:4,fontStyle:"italic",maxWidth:400,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{t.imageBriefing.slice(0,80)}..."</div>}
                          </div>;
                    }

                    if(mode==="preview") return <div key={t.id} style={{marginBottom:0}}>{inner}</div>;

                    return (
                      <div key={t.id} onClick={()=>setSelTile(t.id)} onMouseEnter={()=>setHoveredTile(t.id)} onMouseLeave={()=>setHoveredTile(null)}
                        style={{background:"#fff",borderRadius:12,overflow:"hidden",marginBottom:10,cursor:"pointer",position:"relative",
                          border:`2px solid ${isSel?accent:"transparent"}`,boxShadow:isSel?"0 4px 16px rgba(0,0,0,.1)":isHov?"0 2px 8px rgba(0,0,0,.06)":"0 1px 3px rgba(0,0,0,.04)",transition:"all .15s"}}>
                        <div style={{...S.badge(S.dark,"#fff"),position:"absolute",top:6,left:6,zIndex:10}}>{def?.name} · {SIZE_LABELS[t.size]}</div>
                        {(isHov||isSel) && (
                          <div style={{position:"absolute",top:6,right:6,zIndex:10,display:"flex",gap:3}}>
                            {[["↑",()=>moveTile(t.id,-1)],["↓",()=>moveTile(t.id,1)],["✕",()=>delTile(t.id)]].map(([sym,fn],i)=>(
                              <button key={i} onClick={e=>{e.stopPropagation();fn();}} style={{width:22,height:22,borderRadius:4,background:"rgba(255,255,255,.9)",boxShadow:"0 1px 4px rgba(0,0,0,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,border:"none",cursor:"pointer"}}>{sym}</button>
                            ))}
                          </div>
                        )}
                        {t.imageBriefing && !hasImg && <div style={{...S.badge("#fef3c7","#92400e"),position:"absolute",bottom:6,right:6,zIndex:10}}>📋 Briefing</div>}
                        {hasImg && <div style={{...S.badge("#dcfce7","#166534"),position:"absolute",bottom:6,left:6,zIndex:10}}>✓ {t.imgW}×{t.imgH}</div>}
                        {inner}
                      </div>
                    );
                  })}
                </>}
              </div>
            </div>

            {/* Refine bar */}
            {mode==="builder" && (
              <div style={{display:"flex",gap:8,padding:10,background:"#fff",borderTop:`1px solid ${S.border}`,flexShrink:0}}>
                <input value={refine} onChange={e=>setRefine(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doRefine()}
                  style={{...S.input,flex:1}} placeholder="AI: 'Füge Bundle-Seite hinzu', 'Mehr Lifestyle', 'Ton professioneller'..." />
                <button onClick={doRefine} style={S.btn(S.orange,S.dark)}>✨ Verfeinern</button>
              </div>
            )}
          </div>

          {/* PROPERTIES PANEL */}
          {mode==="builder" && (
            <aside style={{width:280,background:"#fff",borderLeft:`1px solid ${S.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
              <div style={{padding:10,borderBottom:`1px solid ${S.border}`,fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",display:"flex",justifyContent:"space-between"}}>
                Eigenschaften {tile && <span style={{color:accent,textTransform:"none",fontWeight:500}}>{tile.type}</span>}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:10}}>
                {!tile ? (
                  <div style={{textAlign:"center",color:"#9ca3af",paddingTop:32}}><div style={{fontSize:20,marginBottom:8,opacity:.3}}>🎯</div><div style={{fontSize:12}}>Tile auswählen</div></div>
                ) : (
                  <>
                    <div style={S.section}><label style={S.label}>Tile-Größe</label>
                      <select value={tile.size} onChange={e=>upTile(t=>{t.size=e.target.value;})} style={S.input}>
                        {tileDef?.sizes.map(s=><option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
                      </select></div>
                    {tileDef?.needsImage && tileDef.specs && (
                      <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:10,marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#92400e",marginBottom:4}}>📐 Bild-Spezifikationen</div>
                        {Object.entries(tileDef.specs[tile.size]||tileDef.specs[Object.keys(tileDef.specs)[0]]||{}).map(([k,v])=>(
                          <div key={k} style={{fontSize:12,color:"#92400e"}}><b>{k}:</b> {v}</div>
                        ))}
                      </div>
                    )}
                    {tileDef?.needsImage && (
                      <div style={S.section}><label style={S.label}>Bild hochladen</label>
                        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImg(e.target.files?.[0])} />
                        <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:8,border:`2px dashed ${tile.image?"#86efac":"#ddd"}`,borderRadius:8,fontSize:12,color:"#6b7280",background:"none",cursor:"pointer"}}>
                          {tile.image ? `✓ ${tile.imageFile} (${tile.imgW}×${tile.imgH})` : "📁 Bild wählen..."}
                        </button></div>
                    )}
                    {tileDef?.needsImage && (
                      <div style={S.section}><label style={S.label}>🎨 Designer-Briefing</label>
                        <textarea value={tile.imageBriefing||""} onChange={e=>upTile(t=>{t.imageBriefing=e.target.value;})} style={{...S.textarea,minHeight:80}}
                          placeholder="DIMENSIONS: ... | CONTENT: ... | TEXT IN IMAGE: ... | COLORS: ... | MOOD: ..." /></div>
                    )}
                    {tile.type==="image_with_text" && <>
                      <SelField label="Layout" value={tile.content.layout} opts={[["text_over","Text über Bild"],["text_beside","Text neben Bild"]]} onChange={v=>upTile(t=>{t.content.layout=v;})} />
                      <InpField label="Headline" value={tile.content.headline} onChange={v=>upTile(t=>{t.content.headline=v;})} />
                      <TxtField label="Body" value={tile.content.body} onChange={v=>upTile(t=>{t.content.body=v;})} />
                      <InpField label="Link-Text" value={tile.content.linkText} onChange={v=>upTile(t=>{t.content.linkText=v;})} />
                    </>}
                    {tile.type==="text" && <>
                      <TxtField label="Text" value={tile.content.text} onChange={v=>upTile(t=>{t.content.text=v;})} />
                      <SelField label="Ausrichtung" value={tile.content.alignment} opts={[["left","Links"],["center","Mitte"],["right","Rechts"]]} onChange={v=>upTile(t=>{t.content.alignment=v;})} />
                    </>}
                    {tile.type==="product" && <>
                      <InpField label="ASIN" value={tile.content.asin} onChange={v=>upTile(t=>{t.content.asin=v;})} />
                      <InpField label="Titel" value={tile.content.customTitle||tile.content.name} onChange={v=>upTile(t=>{t.content.customTitle=v;})} />
                    </>}
                    {tile.type==="product_grid" && <>
                      <SelField label="Layout" value={tile.content.layout} opts={[["standard","Standard"],["tall","Tall"]]} onChange={v=>upTile(t=>{t.content.layout=v;})} />
                      <TxtField label="ASINs (eine/Zeile)" value={(tile.content.asins||[]).join("\n")} onChange={v=>upTile(t=>{t.content.asins=v.split("\n").filter(Boolean);})} />
                    </>}
                  </>
                )}
              </div>
            </aside>
          )}

          {/* BRIEFING PANEL */}
          {mode==="briefing" && (
            <aside style={{width:320,background:"#fff",borderLeft:`1px solid ${S.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
              <div style={{padding:10,borderBottom:`1px solid ${S.border}`,fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase"}}>📐 Bild-Specs & Briefings</div>
              <div style={{flex:1,overflowY:"auto",padding:10}}>
                {store.brandProfile && (
                  <div style={{background:"#f9fafb",border:`1px solid ${S.border}`,borderRadius:8,padding:10,marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700}}>{store.brandName}</div>
                    <div style={{display:"flex",gap:4,margin:"4px 0"}}>{Object.values(store.brandProfile.colors||{}).map((c,i)=><span key={i} style={{width:16,height:16,borderRadius:"50%",border:"1px solid #ddd",background:c}} />)}</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>{store.brandProfile.type} · {store.brandProfile.tone}</div>
                  </div>
                )}
                <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:10,marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1e40af"}}>Hero Image</div>
                  <div style={{fontSize:11,color:"#1d4ed8",marginTop:2}}>3000×600px | max 5MB | Safe Zone 70%</div>
                  {page?.heroImageBriefing && <div style={{fontSize:11,color:"#2563eb",marginTop:4,fontStyle:"italic"}}>{page.heroImageBriefing}</div>}
                </div>
                {page?.tiles.map((t,i) => {
                  const def = TILES[t.type]; const ni = def?.needsImage;
                  return (
                    <div key={t.id} style={{borderRadius:8,padding:10,marginBottom:6,border:`1px solid ${ni?"#fcd34d":"#e5e7eb"}`,background:ni?"#fffbeb":"#f9fafb"}}>
                      <div style={{fontSize:12,fontWeight:700,color:ni?"#92400e":"#6b7280"}}>{i+1}. {def?.name} ({SIZE_LABELS[t.size]})</div>
                      {ni && def.specs && Object.entries(def.specs[t.size]||Object.values(def.specs)[0]||{}).map(([k,v])=>(
                        <div key={k} style={{fontSize:11,color:"#92400e"}}><b>{k}:</b> {v}</div>
                      ))}
                      {t.imageBriefing && <div style={{fontSize:11,marginTop:4,padding:6,background:"#fff",borderRadius:4,border:"1px solid #fde68a"}}>🎨 {t.imageBriefing}</div>}
                      {t.image ? <div style={{fontSize:11,color:"#166534",fontWeight:600,marginTop:4}}>✓ {t.imageFile} ({t.imgW}×{t.imgH})</div>
                               : ni && <div style={{fontSize:11,color:"#dc2626",fontWeight:600,marginTop:4}}>⚠ Bild fehlt</div>}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* AI MODAL */}
      {aiModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,backdropFilter:"blur(4px)"}} onClick={()=>setAiModal(false)}>
          <div style={{background:"#fff",borderRadius:16,maxWidth:420,width:"92%",boxShadow:"0 25px 50px rgba(0,0,0,.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:20,paddingBottom:8}}>
              <h2 style={{fontSize:18,fontWeight:800}}>✨ Multi-Step AI Generator</h2>
              <p style={{fontSize:12,color:"#9ca3af",marginTop:2}}>5 fokussierte AI-Calls</p>
            </div>
            <div style={{padding:20,paddingTop:8,display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={S.label}>Markenname *</label><input value={aiBrand} onChange={e=>setAiBrand(e.target.value)} style={{...S.input,padding:8}} placeholder="z.B. natural elements, HOLY, Kärcher..." /></div>
              <div><label style={S.label}>Marktplatz</label><select value={aiMp} onChange={e=>setAiMp(e.target.value)} style={{...S.input,padding:8}}>
                <option value="de">🇩🇪 Amazon.de</option><option value="com">🇺🇸 Amazon.com</option><option value="co.uk">🇬🇧 Amazon.co.uk</option><option value="fr">🇫🇷 Amazon.fr</option>
              </select></div>
              <div><label style={S.label}>Kategorie (optional)</label><input value={aiCat} onChange={e=>setAiCat(e.target.value)} style={{...S.input,padding:8}} /></div>
              <div><label style={S.label}>Zusätzliche Infos (optional)</label><textarea value={aiInfo} onChange={e=>setAiInfo(e.target.value)} style={{...S.textarea,padding:8}} rows={2} /></div>
            </div>
            <div style={{padding:20,paddingTop:4,display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setAiModal(false)} style={{...S.btnOutline,color:"#6b7280"}}>Abbrechen</button>
              <button onClick={generate} style={S.btn(S.orange,S.dark)}>🚀 Generieren</button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATION OVERLAY — stays open until dismissed */}
      {generating && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:16,maxWidth:600,width:"92%",boxShadow:"0 25px 50px rgba(0,0,0,.3)",overflow:"hidden",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:20,paddingBottom:12}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>Store wird generiert...</div>
              {genSteps.map((s,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,marginBottom:6,fontSize:12,
                  background:i<genStep?"#ecfdf5":i===genStep?"#fffbeb":"#f9fafb",
                  color:i<genStep?"#166534":i===genStep?"#92400e":"#9ca3af",fontWeight:i===genStep?600:400}}>
                  <span style={{fontSize:14,width:20,textAlign:"center"}}>{i<genStep?"✅":i===genStep?"⏳":"⬜"}</span>
                  <div><div style={{fontWeight:600}}>{s.name}</div><div style={{fontWeight:400,opacity:.7}}>{s.desc}</div></div>
                </div>
              ))}
            </div>
            <div style={{background:"#111827",padding:16,overflowY:"auto",flex:1,fontFamily:"'Menlo','Consolas',monospace"}}>
              {genLog.map((l,i) => <div key={i} style={{fontSize:11,color:l.includes("❌")?"#f87171":"#4ade80",lineHeight:1.7,wordBreak:"break-all"}}>{l}</div>)}
              {genLog.length>0 && <div style={{fontSize:12,color:"#4ade80",animation:"pulse 1s infinite"}}>_</div>}
            </div>
          </div>
        </div>
      )}

      {/* ERROR LOG PANEL */}
      {showErrors && !generating && errorLog.length>0 && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}} onClick={()=>setShowErrors(false)}>
          <div style={{background:"#fff",borderRadius:16,maxWidth:700,width:"92%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 25px 50px rgba(0,0,0,.3)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:16,borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:16,fontWeight:700,color:"#dc2626"}}>🐛 Error Log ({errorLog.length})</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setErrorLog([]);setShowErrors(false);}} style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:600,background:"#f3f4f6",border:"1px solid #ddd"}}>Clear All</button>
                <button onClick={()=>setShowErrors(false)} style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:600,background:"#f3f4f6",border:"1px solid #ddd"}}>✕ Close</button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:12}}>
              {errorLog.map((e,i) => (
                <div key={i} style={{marginBottom:12,padding:12,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8}}>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>{e.time}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#dc2626",marginBottom:4,wordBreak:"break-all"}}>{e.msg}</div>
                  {e.detail && <pre style={{fontSize:10,color:"#6b7280",background:"#fff",padding:8,borderRadius:4,border:"1px solid #e5e7eb",overflow:"auto",maxHeight:200,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{e.detail}</pre>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{position:"fixed",top:16,right:16,zIndex:50}}>
          <div style={{padding:"10px 16px",borderRadius:12,fontSize:12,fontWeight:600,color:"#fff",boxShadow:"0 8px 24px rgba(0,0,0,.2)",
            background:toast.t==="err"?"#dc2626":"#059669"}}>
            {toast.t==="ok"?"✓":"✕"} {toast.m}
          </div>
        </div>
      )}
    </>
  );
}

// ── Form helpers ──
function InpField({label,value,onChange,ph}) {
  return <div style={{marginBottom:12}}><label style={{display:"block",marginBottom:3,fontSize:10,fontWeight:600,color:"#9ca3af",textTransform:"uppercase"}}>{label}</label>
    <input value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"4px 8px",borderRadius:6,fontSize:12,border:"1px solid #ddd"}} placeholder={ph} /></div>;
}
function TxtField({label,value,onChange,ph}) {
  return <div style={{marginBottom:12}}><label style={{display:"block",marginBottom:3,fontSize:10,fontWeight:600,color:"#9ca3af",textTransform:"uppercase"}}>{label}</label>
    <textarea value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"4px 8px",borderRadius:6,fontSize:12,border:"1px solid #ddd",resize:"vertical",minHeight:56}} placeholder={ph} /></div>;
}
function SelField({label,value,opts,onChange}) {
  return <div style={{marginBottom:12}}><label style={{display:"block",marginBottom:3,fontSize:10,fontWeight:600,color:"#9ca3af",textTransform:"uppercase"}}>{label}</label>
    <select value={value||opts[0]?.[0]} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"4px 8px",borderRadius:6,fontSize:12,border:"1px solid #ddd"}}>
      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select></div>;
}
