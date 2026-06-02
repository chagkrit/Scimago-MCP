import { setTimeout as sleep } from "node:timers/promises";
import type { ScopusConfig } from "./config.js";

const DEFAULT_SEARCH_FIELDS = [
  "dc:identifier",
  "eid",
  "dc:title",
  "dc:creator",
  "prism:publicationName",
  "prism:coverDate",
  "prism:coverDisplayDate",
  "prism:doi",
  "prism:issn",
  "prism:eIssn",
  "subtype",
  "subtypeDescription",
  "openaccess",
  "citedby-count",
  "prism:aggregationType",
  "link",
].join(",");

export type SearchOptions = {
  query: string;
  maxResults?: number;
  count?: number;
  start?: number;
  view?: "STANDARD" | "COMPLETE";
  sort?: string;
  date?: string;
  fields?: string;
};

export type SourceOptions = {
  title?: string;
  issn?: string;
  publisher?: string;
  subject?: string;
  subjectCode?: string;
  content?: "tradejournal" | "journal" | "conferenceproceeding" | "bookseries";
  openAccess?: "all" | "full" | "partial" | "none";
  date?: string;
  maxResults?: number;
  count?: number;
  start?: number;
  view?: "STANDARD" | "COVERIMAGE" | "ENHANCED" | "CITESCORE";
};

type ScopusSearchEntry = Record<string, unknown>;
type ScopusSourceEntry = Record<string, unknown>;

export type ResearchCsvRow = {
  scopus_id: string;
  eid: string;
  title: string;
  author: string;
  publication: string;
  cover_date: string;
  year: string;
  cited_by_count: string;
  doi: string;
  issn: string;
  eissn: string;
  aggregation_type: string;
  subtype: string;
  open_access: string;
  url: string;
};

export type SourceCsvRow = {
  source_id: string;
  title: string;
  issn: string;
  eissn: string;
  publisher: string;
  coverage: string;
  subject_area: string;
  cite_score: string;
  snip: string;
  sjr: string;
  url: string;
};

export class ScopusClient {
  constructor(private readonly config: ScopusConfig) {}

  async search(options: SearchOptions): Promise<ScopusSearchEntry[]> {
    const maxResults = clamp(options.maxResults ?? 25, 1, 20_000);
    const pageSize = clamp(options.count ?? 25, 1, options.view === "COMPLETE" ? 25 : 200);
    const rows: ScopusSearchEntry[] = [];
    let start = options.start ?? 0;

    while (rows.length < maxResults) {
      const count = Math.min(pageSize, maxResults - rows.length);
      const payload = await this.getJson("/content/search/scopus", {
        query: options.query,
        count: String(count),
        start: String(start),
        view: options.view ?? "STANDARD",
        field: options.fields ?? DEFAULT_SEARCH_FIELDS,
        sort: options.sort,
        date: options.date,
      });

      const entries = asArray(payload?.["search-results"]?.entry);
      if (entries.length === 0) break;

      rows.push(...entries);
      start += entries.length;

      if (entries.length < count) break;
      await sleep(180);
    }

    return rows.slice(0, maxResults);
  }

  async sources(options: SourceOptions): Promise<ScopusSourceEntry[]> {
    const maxResults = clamp(options.maxResults ?? 25, 1, 20_000);
    const pageSize = clamp(options.count ?? 25, 1, 200);
    const rows: ScopusSourceEntry[] = [];
    let start = options.start ?? 0;

    while (rows.length < maxResults) {
      const count = Math.min(pageSize, maxResults - rows.length);
      const payload = await this.getJson("/content/serial/title", {
        title: options.title,
        issn: options.issn,
        pub: options.publisher,
        subj: options.subject,
        subjCode: options.subjectCode,
        content: options.content,
        oa: options.openAccess,
        date: options.date,
        count: String(count),
        start: String(start),
        view: options.view ?? "STANDARD",
      });

      const entries = asArray(payload?.["serial-metadata-response"]?.entry);
      if (entries.length === 0) break;

      rows.push(...entries);
      start += entries.length;

      if (entries.length < count) break;
      await sleep(180);
    }

    return rows.slice(0, maxResults);
  }

  private async getJson(path: string, params: Record<string, string | undefined>) {
    const url = new URL(path, this.config.baseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-ELS-APIKey": this.config.apiKey,
    };

    if (this.config.instToken) headers["X-ELS-Insttoken"] = this.config.instToken;

    const response = await fetch(url, { headers });
    const text = await response.text();

    if (!response.ok) {
      const quotaStatus = response.headers.get("X-ELS-Status");
      const reset = response.headers.get("X-RateLimit-Reset");
      const detail = [quotaStatus, reset ? `reset=${reset}` : undefined].filter(Boolean).join(", ");
      throw new Error(
        `Scopus API ${response.status} ${response.statusText}${detail ? ` (${detail})` : ""}: ${text.slice(0, 500)}`,
      );
    }

    return text ? JSON.parse(text) : {};
  }
}

export function toResearchCsvRows(entries: ScopusSearchEntry[]): ResearchCsvRow[] {
  return entries.map((entry) => {
    const coverDate = stringValue(entry["prism:coverDate"]);
    return {
      scopus_id: stringValue(entry["dc:identifier"]).replace(/^SCOPUS_ID:/, ""),
      eid: stringValue(entry.eid),
      title: stringValue(entry["dc:title"]),
      author: stringValue(entry["dc:creator"]),
      publication: stringValue(entry["prism:publicationName"]),
      cover_date: coverDate,
      year: coverDate.slice(0, 4),
      cited_by_count: stringValue(entry["citedby-count"]),
      doi: stringValue(entry["prism:doi"]),
      issn: stringValue(entry["prism:issn"]),
      eissn: stringValue(entry["prism:eIssn"]),
      aggregation_type: stringValue(entry["prism:aggregationType"]),
      subtype: stringValue(entry.subtypeDescription) || stringValue(entry.subtype),
      open_access: stringValue(entry.openaccess),
      url: pickScopusUrl(entry.link),
    };
  });
}

export function toSourceCsvRows(entries: ScopusSourceEntry[]): SourceCsvRow[] {
  return entries.map((entry) => ({
    source_id: stringValue(entry["source-id"]),
    title: stringValue(entry["dc:title"]),
    issn: stringValue(entry["prism:issn"]),
    eissn: stringValue(entry["prism:eIssn"]),
    publisher: stringValue(entry["dc:publisher"]),
    coverage: stringValue(entry.coverage),
    subject_area: joinSubjectAreas(entry["subject-area"]),
    cite_score: metricValue(entry, "citeScore"),
    snip: metricValue(entry, "SNIP"),
    sjr: metricValue(entry, "SJR"),
    url: pickScopusUrl(entry.link),
  }));
}

export const researchColumns: Array<keyof ResearchCsvRow> = [
  "scopus_id",
  "eid",
  "title",
  "author",
  "publication",
  "cover_date",
  "year",
  "cited_by_count",
  "doi",
  "issn",
  "eissn",
  "aggregation_type",
  "subtype",
  "open_access",
  "url",
];

export const sourceColumns: Array<keyof SourceCsvRow> = [
  "source_id",
  "title",
  "issn",
  "eissn",
  "publisher",
  "coverage",
  "subject_area",
  "cite_score",
  "snip",
  "sjr",
  "url",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [value as Record<string, unknown>];
}

function stringValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "$" in value) return stringValue((value as { $?: unknown }).$);
  return JSON.stringify(value);
}

function pickScopusUrl(value: unknown): string {
  const links = asArray(value);
  const scopusLink =
    links.find((link) => stringValue(link["@ref"]).toLowerCase() === "scopus") ??
    links.find((link) => stringValue(link["@href"]).includes("scopus"));

  return scopusLink ? stringValue(scopusLink["@href"]) : "";
}

function joinSubjectAreas(value: unknown): string {
  return asArray(value)
    .map((area) => stringValue(area.$) || stringValue(area))
    .filter(Boolean)
    .join("; ");
}

function metricValue(entry: Record<string, unknown>, metricName: string): string {
  const direct = stringValue(entry[metricName]) || stringValue(entry[metricName.toLowerCase()]);
  if (direct) return direct;

  const metrics = asArray(entry["citeScoreYearInfoList"]);
  const latest = metrics.at(0);
  return latest ? stringValue(latest[metricName]) || stringValue(latest[metricName.toLowerCase()]) : "";
}
