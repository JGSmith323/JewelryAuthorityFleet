# Jewelry Authority Fleet

> Multi-platform commerce intelligence for jewelry retailers.
> Unify eBay, Shopify, your business website, and Salesforce in one AI-powered dashboard.

Jewelry Authority is a production-grade dashboard that pulls sales, inventory, customer, and
CRM data from four channels into a single unified analytics surface, with an embedded Claude
AI analyst that answers questions about your data in plain English.

## Features

- **Unified Dashboard** - KPIs and trends across all four platforms in one view
- **Products / Orders / Customers** - merged tables with platform filtering and search
- **Analytics** - revenue by platform, by category, customer acquisition, platform comparison
- **Platforms** - per-channel sync status, last sync timestamps, sync logs
- **AI Chat** - ask Claude `claude-sonnet-4-6` about your data; system prompt is auto-augmented
  with a fresh data snapshot before every turn
- **Demo Mode** - one click seeds 50 products, 200 orders, 100 customers, 20 opportunities of
  realistic jewelry data so the entire app is usable with zero API connections
- **MCP Server** - exposes 14 tools across eBay, Shopify, Website, and Salesforce for use
  from any MCP-compatible client (Claude Desktop, etc.)

## Quick Start (2 minutes)

```bash
git clone https://github.com/JGSmith323/JewelryAuthorityFleet.git
cd JewelryAuthorityFleet
cp .env.example .env
npm run setup
npm run dev
```

Open <http://localhost:5173> and click the **DEMO** toggle in the top bar to populate the app
with sample data.

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run setup`      | Install every workspace and initialize the SQLite schema  |
| `npm run dev`        | Run the server, client, and MCP server concurrently       |
| `npm run dev:server` | Just the Express API on `:3001`                           |
| `npm run dev:client` | Just the Vite client on `:5173`                           |
| `npm run dev:mcp`    | Just the MCP server (stdio)                               |
| `npm run build`      | Build the production client bundle                        |
| `npm run start`      | Start the API server in production mode                   |

## Architecture

```
+--------------------+      +--------------------+      +------------------+
|  React + Vite      | <--> |  Express API       | <--> |  SQLite          |
|  Tailwind, Recharts|      |  better-sqlite3    |      |  (local file)    |
+--------------------+      +-------+------------+      +------------------+
                                    |
                                    v
                          +--------------------+
                          |  Anthropic SDK     |
                          |  claude-sonnet-4-6 |
                          +--------------------+

  +-----------------------------------------------------------+
  |  MCP Server (stdio) - 14 tools across 4 platforms         |
  |  eBay / Shopify / Website / Salesforce                    |
  +-----------------------------------------------------------+
```

## API Connections

See **[API_KEYS.md](./API_KEYS.md)** for step-by-step setup instructions for each platform.
You can run the full app in demo mode without any of these keys.

## Demo Mode

Demo mode is toggled from the top navigation bar. When enabled, the server seeds rich fake
jewelry data into SQLite; when disabled, the demo data is cleared and platform statuses reset
to `disconnected`. Demo state survives restarts (persisted in a `settings` table).

## License

Internal consulting deliverable. All rights reserved.
