import { setTimeout as sleep } from "node:timers/promises";
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
export class ScopusClient {
    config;
    constructor(config) {
        this.config = config;
    }
    async search(options) {
        const maxResults = clamp(options.maxResults ?? 25, 1, 20_000);
        const pageSize = clamp(options.count ?? 25, 1, options.view === "COMPLETE" ? 25 : 200);
        const rows = [];
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
            if (entries.length === 0)
                break;
            rows.push(...entries);
            start += entries.length;
            if (entries.length < count)
                break;
            await sleep(180);
        }
        return rows.slice(0, maxResults);
    }
    async sources(options) {
        const maxResults = clamp(options.maxResults ?? 25, 1, 20_000);
        const pageSize = clamp(options.count ?? 25, 1, 200);
        const rows = [];
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
            if (entries.length === 0)
                break;
            rows.push(...entries);
            start += entries.length;
            if (entries.length < count)
                break;
            await sleep(180);
        }
        return rows.slice(0, maxResults);
    }
    async getJson(path, params) {
        const url = new URL(path, this.config.baseUrl);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== "")
                url.searchParams.set(key, value);
        }
        const headers = {
            Accept: "application/json",
            "X-ELS-APIKey": this.config.apiKey,
        };
        if (this.config.instToken)
            headers["X-ELS-Insttoken"] = this.config.instToken;
        const response = await fetch(url, { headers });
        const text = await response.text();
        if (!response.ok) {
            const quotaStatus = response.headers.get("X-ELS-Status");
            const reset = response.headers.get("X-RateLimit-Reset");
            const detail = [quotaStatus, reset ? `reset=${reset}` : undefined].filter(Boolean).join(", ");
            throw new Error(`Scopus API ${response.status} ${response.statusText}${detail ? ` (${detail})` : ""}: ${text.slice(0, 500)}`);
        }
        return text ? JSON.parse(text) : {};
    }
}
export function toResearchCsvRows(entries) {
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
export function toSourceCsvRows(entries) {
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
export const researchColumns = [
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
export const sourceColumns = [
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
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function asArray(value) {
    if (!value)
        return [];
    return Array.isArray(value) ? value : [value];
}
function stringValue(value) {
    if (value === undefined || value === null)
        return "";
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    if (typeof value === "object" && "$" in value)
        return stringValue(value.$);
    return JSON.stringify(value);
}
function pickScopusUrl(value) {
    const links = asArray(value);
    const scopusLink = links.find((link) => stringValue(link["@ref"]).toLowerCase() === "scopus") ??
        links.find((link) => stringValue(link["@href"]).includes("scopus"));
    return scopusLink ? stringValue(scopusLink["@href"]) : "";
}
function joinSubjectAreas(value) {
    return asArray(value)
        .map((area) => stringValue(area.$) || stringValue(area))
        .filter(Boolean)
        .join("; ");
}
function metricValue(entry, metricName) {
    const direct = stringValue(entry[metricName]) || stringValue(entry[metricName.toLowerCase()]);
    if (direct)
        return direct;
    const metrics = asArray(entry["citeScoreYearInfoList"]);
    const latest = metrics.at(0);
    return latest ? stringValue(latest[metricName]) || stringValue(latest[metricName.toLowerCase()]) : "";
}
