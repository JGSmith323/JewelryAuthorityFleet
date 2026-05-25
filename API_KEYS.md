# API Keys Setup Guide

This document walks through obtaining credentials for every external service Jewelry Authority
integrates with. You can skip all of this and run the app in **Demo Mode** if you just want to
explore the UI.

All credentials live in the root `.env` file. Start by copying the template:

```bash
cp .env.example .env
```

Then fill in the variables described below.

---

## 1. Anthropic (Claude AI Chat)

The AI Chat page is powered by Claude `claude-sonnet-4-6` via the official Anthropic SDK.

**Where to get it:** <https://console.anthropic.com/>

**Steps:**
1. Sign in to the Anthropic Console.
2. Navigate to **Settings -> API Keys**.
3. Click **Create Key**, name it `Jewelry Authority`, copy the value.
4. Paste it into `.env` as `ANTHROPIC_API_KEY`.
5. Optionally override `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`).

**Plan:** Any paid tier; the chat endpoint uses small context windows so cost is low.

**Verify:** Open the Chat page in the app. If the key is missing you will see a clear banner
asking you to add it. If the key is present, send "What were my top selling items?" and you
should get a data-grounded response.

---

## 2. eBay

**Where to get it:** <https://developer.ebay.com/>

**Steps:**
1. Create a developer account at developer.ebay.com.
2. Go to **My Account -> Application Keys**.
3. Generate a keyset for the **Sandbox** environment first (switch to Production once you've
   verified things work).
4. Note the App ID, Cert ID, and Dev ID.
5. Generate an OAuth user token via **User Tokens -> Get a Token from eBay via Your
   Application**. Required scopes:
   - `https://api.ebay.com/oauth/api_scope/sell.inventory.readonly`
   - `https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly`
   - `https://api.ebay.com/oauth/api_scope/sell.analytics.readonly`
6. Paste the values into `.env`:
   ```
   EBAY_APP_ID=...
   EBAY_CERT_ID=...
   EBAY_DEV_ID=...
   EBAY_OAUTH_TOKEN=...
   EBAY_ENVIRONMENT=sandbox
   ```

**Verify:** On the **Platforms** page click **Sync Now** on the eBay card. The sync log table
will show a success row.

---

## 3. Shopify

**Where to get it:** Your Shopify admin (no developer account required for a private app).

**Steps:**
1. In your Shopify admin go to **Settings -> Apps and sales channels**.
2. Click **Develop apps** (enable it if prompted), then **Create an app**.
3. Name the app `Jewelry Authority`.
4. Under **Configuration -> Admin API integration**, grant these read scopes:
   `read_products`, `read_inventory`, `read_orders`, `read_customers`,
   `read_analytics`.
5. Click **Install app**. Copy the **Admin API access token** (starts with `shpat_`).
6. Paste into `.env`:
   ```
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_...
   SHOPIFY_API_VERSION=2024-01
   ```

**Verify:** Platforms page -> Shopify -> Sync Now.

---

## 4. Business Website

This integration is generic; it expects a REST endpoint at `WEBSITE_API_URL` that returns
orders, leads, and analytics. If your site runs WooCommerce, point this at the WooCommerce
REST API; if it's a custom build, point it at your own admin API.

**Steps:**
1. In your website admin, generate an API key with read access to orders, contact form
   submissions, and analytics.
2. Set:
   ```
   WEBSITE_API_URL=https://your-jewelry-website.com/api
   WEBSITE_API_KEY=...
   ```

**Verify:** Platforms page -> Website -> Sync Now.

---

## 5. Salesforce

**Where to get it:** Your Salesforce org as an administrator.

**Steps:**
1. In Salesforce Setup, search for **App Manager** and click **New Connected App**.
2. Fill in:
   - Name: `Jewelry Authority`
   - Enable OAuth Settings: yes
   - Callback URL: `http://localhost:3001/oauth/callback`
   - OAuth Scopes: `Manage user data via APIs (api)`, `Perform requests at any time (refresh_token, offline_access)`
3. Save, wait ~10 minutes for it to propagate, then open the app and copy the **Consumer Key**
   (=client id) and **Consumer Secret** (=client secret).
4. Reset your **Security Token** at **Personal Settings -> Reset Security Token** - it
   arrives in your email.
5. Fill in `.env`:
   ```
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   SALESFORCE_CLIENT_ID=...
   SALESFORCE_CLIENT_SECRET=...
   SALESFORCE_USERNAME=...
   SALESFORCE_PASSWORD=...
   SALESFORCE_SECURITY_TOKEN=...
   ```

**Verify:** Platforms page -> Salesforce -> Sync Now.

---

## Troubleshooting

- **"Platform not configured" badge** - the relevant env vars are missing or still set to the
  placeholder values. Edit `.env` and restart `npm run dev`.
- **Chat page shows a setup banner** - `ANTHROPIC_API_KEY` is missing.
- **All platforms show "demo"** - Demo Mode is on. Toggle it off in the top bar.
