export declare function writeCsvFile<T extends Record<string, unknown>>(outputPath: string, rows: T[], columns: string[]): Promise<{
    path: string;
    rows: number;
}>;
