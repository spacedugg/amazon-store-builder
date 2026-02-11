# Amazon Brand Store Builder

Multi-Step AI-powered tool for creating Amazon Brand Stores.

## Deployment auf Vercel

### 1. Repository erstellen
```bash
cd vercel-project
git init
git add .
git commit -m "Amazon Store Builder v2"
```

### 2. Auf Vercel deployen
- Gehe zu vercel.com/new
- Importiere das Git-Repository
- Framework: Next.js (wird automatisch erkannt)

### 3. Environment Variable setzen
In den Vercel Project Settings → Environment Variables:
```
ANTHROPIC_API_KEY = sk-ant-...
```

### 4. Deployen
Vercel baut das Projekt automatisch mit `next build`.

## Projektstruktur
```
├── pages/
│   ├── _app.js          # Global CSS import
│   ├── index.js          # Haupt-App (Store Builder UI)
│   └── api/
│       └── generate.js   # Multi-Step AI API Endpoint
├── styles/
│   └── globals.css       # Global styles
├── package.json
├── next.config.js
├── vercel.json           # Function timeout config
└── README.md
```

## Architektur
Die AI-Generierung läuft in 5 sequentiellen Steps:
1. **Markenrecherche** (Web Search) → Brand-Profil
2. **Amazon-Daten** (Web Search) → ASINs, Kategorien, Preise
3. **Store-Architektur** → Seitenstruktur + Tile-Sequenzen
4. **Content pro Seite** (1 Call/Seite) → Texte + Bild-Briefings
5. **Validierung** → Amazon-Spec-Checks + Auto-Fix
