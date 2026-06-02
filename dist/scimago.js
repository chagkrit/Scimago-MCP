export const scimagoDefaultCategories = [
    "oncology",
    "surgery",
    "obstetrics-and-gynecology",
];
export const scimagoQuartiles = ["Q1", "Q2", "Q3", "Q4"];
export const scimagoCategoryMap = {
    oncology: { id: "2730", label: "Oncology", area: "2700", areaLabel: "Medicine" },
    surgery: { id: "2746", label: "Surgery", area: "2700", areaLabel: "Medicine" },
    "obstetrics-and-gynecology": {
        id: "2729",
        label: "Obstetrics and Gynecology",
        area: "2700",
        areaLabel: "Medicine",
    },
};
const DEFAULT_BASE_URL = "https://www.scimagojr.com";
export class ScimagoClient {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    async searchJournals(options = {}) {
        const categories = options.categories?.length ? options.categories : [...scimagoDefaultCategories];
        const quartiles = new Set(options.quartiles?.length ? options.quartiles : ["Q1", "Q2"]);
        const maxResults = Math.max(1, Math.min(options.maxResults ?? 500, 10_000));
        const rows = [];
        for (const category of categories) {
            const categoryConfig = scimagoCategoryMap[category];
            const url = this.buildJournalRankUrl(category, options);
            const text = await this.fetchText(url);
            const parsedRows = parseScimagoCsv(text, categoryConfig, url.toString()).filter((row) => quartiles.has(row.quartile));
            rows.push(...parsedRows);
            if (rows.length >= maxResults)
                break;
        }
        return rows.slice(0, maxResults);
    }
    buildJournalRankUrl(category, options = {}) {
        const categoryConfig = scimagoCategoryMap[category];
        const url = new URL("/journalrank.php", this.options.baseUrl ?? DEFAULT_BASE_URL);
        url.searchParams.set("area", categoryConfig.area);
        url.searchParams.set("category", categoryConfig.id);
        url.searchParams.set("out", "xls");
        if (options.year)
            url.searchParams.set("year", String(options.year));
        const sourceType = options.type ?? "j";
        if (sourceType !== "all")
            url.searchParams.set("type", sourceType);
        if (options.openAccess !== undefined)
            url.searchParams.set("openaccess", String(options.openAccess));
        if (options.wos !== undefined)
            url.searchParams.set("wos", String(options.wos));
        if (options.order)
            url.searchParams.set("order", options.order);
        if (options.direction)
            url.searchParams.set("ord", options.direction);
        return url;
    }
    async fetchText(url) {
        const headers = {
            Accept: "text/csv, application/vnd.ms-excel, text/html;q=0.9, */*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": this.options.userAgent ??
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        };
        if (this.options.cookie)
            headers.Cookie = this.options.cookie;
        const response = await fetch(url, { headers });
        const text = await response.text();
        if (!response.ok || isCloudflareChallenge(text)) {
            throw new Error([
                `SCImago request failed for ${url.toString()}`,
                `HTTP ${response.status} ${response.statusText}`.trim(),
                "SCImago currently uses browser protection for some requests.",
                "If this happens, open the URL in a browser and pass a valid cookie in SCIMAGO_COOKIE.",
            ].join(" "));
        }
        return text;
    }
}
export const scimagoColumns = [
    "rank",
    "source_id",
    "title",
    "type",
    "issn",
    "sjr",
    "quartile",
    "h_index",
    "total_docs",
    "total_docs_3years",
    "total_refs",
    "total_cites_3years",
    "citable_docs_3years",
    "cites_per_doc_2years",
    "refs_per_doc",
    "country",
    "region",
    "publisher",
    "coverage",
    "categories",
    "areas",
    "scimago_category",
    "scimago_category_id",
    "scimago_area",
    "scimago_url",
];
function parseScimagoCsv(text, category, url) {
    const records = parseDelimited(text);
    if (records.length < 2)
        return [];
    const header = records[0].map(normalizeHeader);
    return records.slice(1).map((record) => {
        const get = (...names) => {
            for (const name of names) {
                const index = header.indexOf(normalizeHeader(name));
                if (index >= 0)
                    return record[index]?.trim() ?? "";
            }
            return "";
        };
        const getByPrefix = (prefix) => {
            const normalizedPrefix = normalizeHeader(prefix);
            const index = header.findIndex((name) => name.startsWith(normalizedPrefix));
            return index >= 0 ? record[index]?.trim() ?? "" : "";
        };
        const sjrWithQuartile = get("SJR");
        const quartile = get("SJR Best Quartile", "Best Quartile") || sjrWithQuartile.match(/\bQ[1-4]\b/)?.[0] || "";
        return {
            rank: get("Rank"),
            source_id: get("Sourceid", "Source Id", "Source ID"),
            title: get("Title"),
            type: get("Type"),
            issn: get("Issn", "ISSN"),
            sjr: sjrWithQuartile.replace(/\s*Q[1-4]\s*$/, ""),
            quartile,
            h_index: get("H index"),
            total_docs: get("Total Docs.") || getByPrefix("Total Docs."),
            total_docs_3years: get("Total Docs. (3years)"),
            total_refs: get("Total Refs."),
            total_cites_3years: get("Total Cites (3years)"),
            citable_docs_3years: get("Citable Docs. (3years)"),
            cites_per_doc_2years: get("Cites / Doc. (2years)"),
            refs_per_doc: get("Ref. / Doc."),
            country: get("Country"),
            region: get("Region"),
            publisher: get("Publisher"),
            coverage: get("Coverage"),
            categories: get("Categories"),
            areas: get("Areas"),
            scimago_category: category.label,
            scimago_category_id: category.id,
            scimago_area: category.areaLabel,
            scimago_url: url.replace("&out=xls", ""),
        };
    });
}
function parseDelimited(text) {
    const delimiter = text.includes(";") ? ";" : ",";
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (char === '"') {
            if (quoted && next === '"') {
                field += '"';
                index += 1;
            }
            else {
                quoted = !quoted;
            }
            continue;
        }
        if (!quoted && char === delimiter) {
            row.push(field);
            field = "";
            continue;
        }
        if (!quoted && (char === "\n" || char === "\r")) {
            if (char === "\r" && next === "\n")
                index += 1;
            row.push(field);
            if (row.some((value) => value.trim() !== ""))
                rows.push(row);
            row = [];
            field = "";
            continue;
        }
        field += char;
    }
    row.push(field);
    if (row.some((value) => value.trim() !== ""))
        rows.push(row);
    return rows;
}
function normalizeHeader(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function isCloudflareChallenge(text) {
    return text.includes("cf-mitigated") || text.includes("Just a moment...") || text.includes("challenges.cloudflare.com");
}
