# Amazon Brand Store Builder

AI-powered Amazon Brand Store concept generator with real product data from Amazon.

## How it works

1. Enter brand name → tool searches Amazon via Bright Data
2. Bright Data scrapes real product data (names, descriptions, prices, categories)
3. AI analyzes the products and builds a complete store concept
4. You fine-tune the result

## Setup

```bash
npm install
```

Create `.env`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-xxx
BRIGHT_DATA_API_KEY=your-bright-data-api-key
```

```bash
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Vercel → Import → select repo
3. Environment Variables:
   - `VITE_ANTHROPIC_API_KEY` = your Anthropic key
   - `BRIGHT_DATA_API_KEY` = your Bright Data key
4. Deploy
