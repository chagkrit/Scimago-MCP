import type { ScopusConfig } from "./config.js";
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
export declare class ScopusClient {
    private readonly config;
    constructor(config: ScopusConfig);
    search(options: SearchOptions): Promise<ScopusSearchEntry[]>;
    sources(options: SourceOptions): Promise<ScopusSourceEntry[]>;
    private getJson;
}
export declare function toResearchCsvRows(entries: ScopusSearchEntry[]): ResearchCsvRow[];
export declare function toSourceCsvRows(entries: ScopusSourceEntry[]): SourceCsvRow[];
export declare const researchColumns: Array<keyof ResearchCsvRow>;
export declare const sourceColumns: Array<keyof SourceCsvRow>;
export {};
