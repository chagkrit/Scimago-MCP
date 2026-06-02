export declare const scimagoDefaultCategories: readonly ["oncology", "surgery", "obstetrics-and-gynecology"];
export declare const scimagoQuartiles: readonly ["Q1", "Q2", "Q3", "Q4"];
export declare const scimagoCategoryMap: {
    readonly oncology: {
        readonly id: "2730";
        readonly label: "Oncology";
        readonly area: "2700";
        readonly areaLabel: "Medicine";
    };
    readonly surgery: {
        readonly id: "2746";
        readonly label: "Surgery";
        readonly area: "2700";
        readonly areaLabel: "Medicine";
    };
    readonly "obstetrics-and-gynecology": {
        readonly id: "2729";
        readonly label: "Obstetrics and Gynecology";
        readonly area: "2700";
        readonly areaLabel: "Medicine";
    };
};
export type ScimagoCategory = keyof typeof scimagoCategoryMap;
export type ScimagoQuartile = (typeof scimagoQuartiles)[number];
export type ScimagoSearchOptions = {
    categories?: ScimagoCategory[];
    quartiles?: ScimagoQuartile[];
    year?: number;
    maxResults?: number;
    type?: "j" | "all";
    openAccess?: boolean;
    wos?: boolean;
    order?: "sjr" | "h" | "c" | "cd" | "totaldocs" | "totalrefs" | "country" | "titem";
    direction?: "asc" | "desc";
};
export type ScimagoJournalRow = {
    rank: string;
    source_id: string;
    title: string;
    type: string;
    issn: string;
    sjr: string;
    quartile: string;
    h_index: string;
    total_docs: string;
    total_docs_3years: string;
    total_refs: string;
    total_cites_3years: string;
    citable_docs_3years: string;
    cites_per_doc_2years: string;
    refs_per_doc: string;
    country: string;
    region: string;
    publisher: string;
    coverage: string;
    categories: string;
    areas: string;
    scimago_category: string;
    scimago_category_id: string;
    scimago_area: string;
    scimago_url: string;
};
export declare class ScimagoClient {
    private readonly options;
    constructor(options?: {
        baseUrl?: string;
        cookie?: string;
        userAgent?: string;
    });
    searchJournals(options?: ScimagoSearchOptions): Promise<ScimagoJournalRow[]>;
    buildJournalRankUrl(category: ScimagoCategory, options?: ScimagoSearchOptions): URL;
    private fetchText;
}
export declare const scimagoColumns: Array<keyof ScimagoJournalRow>;
