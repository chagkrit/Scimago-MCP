#!/usr/bin/env node
import { Command } from "commander";
import { getConfig } from "./config.js";
import { writeCsvFile } from "./csv.js";
import {
  researchColumns,
  ScopusClient,
  sourceColumns,
  toResearchCsvRows,
  toSourceCsvRows,
} from "./scopus.js";
import {
  ScimagoClient,
  type ScimagoCategory,
  type ScimagoQuartile,
  scimagoColumns,
  scimagoDefaultCategories,
  scimagoQuartiles,
} from "./scimago.js";

const program = new Command();

program
  .name("scimago-export")
  .description("Export SCImago and Scopus metadata to CSV")
  .version("0.1.0");

program
  .command("scimago")
  .description("Export SCImago Q1/Q2 medicine journals to CSV")
  .option("-o, --output <path>", "CSV output path", "./exports/scimago_health_medicine_q1_q2.csv")
  .option(
    "--categories <categories>",
    `Comma-separated categories: ${scimagoDefaultCategories.join(", ")}`,
    parseCategories,
    [...scimagoDefaultCategories],
  )
  .option("--quartiles <quartiles>", "Comma-separated quartiles, e.g. Q1,Q2", parseQuartiles, ["Q1", "Q2"])
  .option("--year <year>", "Optional SCImago ranking year, e.g. 2024", parseNumber)
  .option("-m, --max-results <number>", "Maximum rows", parseNumber, 500)
  .option("--all-types", "Include all source types instead of journals only")
  .option("--open-access", "Limit to open access journals")
  .option("--wos", "Limit to Web of Science indexed sources")
  .option("--order <order>", "Sort field: sjr, h, c, cd, totaldocs, totalrefs, country, or titem", "sjr")
  .option("--direction <direction>", "Sort direction: asc or desc", "desc")
  .action(async (options) => {
    const client = new ScimagoClient({
      cookie: process.env.SCIMAGO_COOKIE,
      baseUrl: process.env.SCIMAGO_BASE_URL,
      userAgent: process.env.SCIMAGO_USER_AGENT,
    });
    const rows = await client.searchJournals({
      categories: options.categories,
      quartiles: options.quartiles,
      year: options.year,
      maxResults: options.maxResults,
      type: options.allTypes ? "all" : "j",
      openAccess: options.openAccess || undefined,
      wos: options.wos || undefined,
      order: options.order,
      direction: options.direction,
    });
    const result = await writeCsvFile(options.output, rows, scimagoColumns);
    console.log(`Wrote ${result.rows} rows to ${result.path}`);
  });

program
  .command("search")
  .description("Search Scopus research metadata and export CSV")
  .requiredOption("-q, --query <query>", "Scopus query")
  .option("-o, --output <path>", "CSV output path", "./exports/scopus_research.csv")
  .option("-m, --max-results <number>", "Maximum rows", parseNumber, 25)
  .option("-c, --count <number>", "Page size", parseNumber, 25)
  .option("--view <view>", "STANDARD or COMPLETE", "STANDARD")
  .option("--sort <sort>", "Scopus sort expression")
  .option("--date <date>", "Optional date filter, e.g. 2020-2026")
  .action(async (options) => {
    const client = new ScopusClient(getConfig());
    const rows = toResearchCsvRows(
      await client.search({
        query: options.query,
        maxResults: options.maxResults,
        count: options.count,
        view: options.view,
        sort: options.sort,
        date: options.date,
      }),
    );
    const result = await writeCsvFile(options.output, rows, researchColumns);
    console.log(`Wrote ${result.rows} rows to ${result.path}`);
  });

program
  .command("sources")
  .description("Export Scopus source/journal metadata to CSV")
  .option("--title <title>", "Source title filter")
  .option("--issn <issn>", "ISSN filter")
  .option("--publisher <publisher>", "Publisher name filter")
  .option("--subject <subject>", "Subject abbreviation, e.g. COMP, MEDI, SOCI")
  .option("--subject-code <subjectCode>", "Numeric subject code")
  .option("--content <content>", "tradejournal, journal, conferenceproceeding, or bookseries")
  .option("--open-access <openAccess>", "all, full, partial, or none")
  .option("--date <date>", "Optional metadata date range, e.g. 2002-2007")
  .option("-o, --output <path>", "CSV output path", "./exports/scopus_sources.csv")
  .option("-m, --max-results <number>", "Maximum rows", parseNumber, 25)
  .option("-c, --count <number>", "Page size", parseNumber, 25)
  .option("--view <view>", "STANDARD, COVERIMAGE, ENHANCED, or CITESCORE", "STANDARD")
  .action(async (options) => {
    const client = new ScopusClient(getConfig());
    const rows = toSourceCsvRows(
      await client.sources({
        title: options.title,
        issn: options.issn,
        publisher: options.publisher,
        subject: options.subject,
        subjectCode: options.subjectCode,
        content: options.content,
        openAccess: options.openAccess,
        date: options.date,
        maxResults: options.maxResults,
        count: options.count,
        view: options.view,
      }),
    );
    const result = await writeCsvFile(options.output, rows, sourceColumns);
    console.log(`Wrote ${result.rows} rows to ${result.path}`);
  });

function parseNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

function parseCategories(value: string): ScimagoCategory[] {
  return parseCsvValues(value, [...scimagoDefaultCategories], "category") as ScimagoCategory[];
}

function parseQuartiles(value: string): ScimagoQuartile[] {
  return parseCsvValues(value.toUpperCase(), [...scimagoQuartiles], "quartile") as ScimagoQuartile[];
}

function parseCsvValues(value: string, allowed: string[], label: string): string[] {
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const invalid = values.filter((item) => !allowed.includes(item));
  if (invalid.length > 0) {
    throw new Error(`Invalid ${label}: ${invalid.join(", ")}. Allowed: ${allowed.join(", ")}`);
  }

  return values;
}

await program.parseAsync();
