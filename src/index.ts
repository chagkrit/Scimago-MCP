#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getConfig } from "./config.js";
import { writeCsvFile } from "./csv.js";
import {
  researchColumns,
  ScopusClient,
  sourceColumns,
  toResearchCsvRows,
  toSourceCsvRows,
} from "./scopus.js";

const server = new McpServer({
  name: "scopus-mcp-connector",
  version: "0.1.0",
});

const SearchSchema = {
  query: z.string().describe("Scopus query, e.g. TITLE-ABS-KEY(ai AND education)"),
  maxResults: z.number().int().min(1).max(20000).default(25),
  count: z.number().int().min(1).max(200).default(25),
  start: z.number().int().min(0).default(0),
  view: z.enum(["STANDARD", "COMPLETE"]).default("STANDARD"),
  sort: z.string().optional(),
  date: z.string().optional().describe("Optional Scopus date filter, e.g. 2020-2026"),
  fields: z.string().optional().describe("Comma-separated Scopus field list"),
};

const SourceSchema = {
  title: z.string().optional(),
  issn: z.string().optional(),
  publisher: z.string().optional().describe("Partial publisher name, e.g. Elsevier"),
  subject: z.string().optional().describe("Scopus subject abbreviation, e.g. COMP, MEDI, SOCI"),
  subjectCode: z.string().optional().describe("Scopus numeric subject code"),
  content: z.enum(["tradejournal", "journal", "conferenceproceeding", "bookseries"]).optional(),
  openAccess: z.enum(["all", "full", "partial", "none"]).optional(),
  date: z.string().optional().describe("Optional source metadata date range, e.g. 2002-2007"),
  maxResults: z.number().int().min(1).max(20000).default(25),
  count: z.number().int().min(1).max(200).default(25),
  start: z.number().int().min(0).default(0),
  view: z.enum(["STANDARD", "COVERIMAGE", "ENHANCED", "CITESCORE"]).default("STANDARD"),
};

server.registerTool(
  "scopus_search",
  {
    title: "Search Scopus",
    description: "Search Scopus research metadata and return JSON rows.",
    inputSchema: SearchSchema,
  },
  async (args) => {
    const client = new ScopusClient(getConfig());
    const entries = await client.search(args);
    return {
      content: [{ type: "text", text: JSON.stringify(toResearchCsvRows(entries), null, 2) }],
    };
  },
);

server.registerTool(
  "scopus_search_to_csv",
  {
    title: "Export Scopus Search CSV",
    description: "Search Scopus research metadata and save the results to a CSV file.",
    inputSchema: {
      ...SearchSchema,
      outputPath: z.string().default("./exports/scopus_research.csv"),
    },
  },
  async (args) => {
    const client = new ScopusClient(getConfig());
    const rows = toResearchCsvRows(await client.search(args));
    const result = await writeCsvFile(args.outputPath, rows, researchColumns);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "scopus_sources_to_csv",
  {
    title: "Export Scopus Sources CSV",
    description: "Export Scopus source/journal metadata from the Serial Title API to CSV.",
    inputSchema: {
      ...SourceSchema,
      outputPath: z.string().default("./exports/scopus_sources.csv"),
    },
  },
  async (args) => {
    const client = new ScopusClient(getConfig());
    const rows = toSourceCsvRows(await client.sources(args));
    const result = await writeCsvFile(args.outputPath, rows, sourceColumns);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
