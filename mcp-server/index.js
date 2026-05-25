#!/usr/bin/env node
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ebayTools }       from './tools/ebay.js';
import { shopifyTools }    from './tools/shopify.js';
import { websiteTools }    from './tools/website.js';
import { salesforceTools } from './tools/salesforce.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: rootEnv, override: false });
}

const allTools = [...ebayTools, ...shopifyTools, ...websiteTools, ...salesforceTools];
const toolsByName = new Map(allTools.map((t) => [t.name, t]));

const server = new Server(
  { name: 'jewelry-authority', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const tool = toolsByName.get(name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await tool.handler(args || {});
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Tool error: ${err?.message || String(err)}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// MCP uses stdio for protocol, so log to stderr only
console.error(`[mcp] jewelry-authority server ready with ${allTools.length} tools`);
