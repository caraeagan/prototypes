# Marker Learning Roadmap

Interactive product roadmap that pulls issues from Linear and displays them grouped by owner, project, or status.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and add your Linear API key:

```bash
cp .env.example .env
```

Get an API key from [Linear Settings > API](https://linear.app/settings/api).

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the roadmap.

## Deployment

Configured for Vercel. Add `LINEAR_API_KEY` as an environment variable in your Vercel project settings.
