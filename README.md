# Amazon Brand Store Builder

AI-powered Amazon Brand Store concept generator.

## Setup

```bash
npm install
```

## Local Development

Create a `.env` file:

```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

Then:

```bash
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select repo
3. Add environment variable:
   - Key: `VITE_ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
4. Deploy

## Usage

1. Click **Generate**
2. Upload a CSV/TXT with your ASINs (format: `ASIN, Product Name, Category`)
3. Enter brand name and marketplace
4. Click **Generate Store**
5. Click tiles to edit properties, upload images
6. Use the **ASINs** button to check coverage
