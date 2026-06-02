export type ScopusConfig = {
    apiKey: string;
    instToken?: string;
    baseUrl: string;
};
export declare function getConfig(): ScopusConfig;
