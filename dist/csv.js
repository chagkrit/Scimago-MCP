import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { stringify } from "csv-stringify/sync";
export async function writeCsvFile(outputPath, rows, columns) {
    const absolutePath = resolve(outputPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    const csv = stringify(rows, {
        header: true,
        columns,
        quoted_string: true,
    });
    await writeFile(absolutePath, csv, "utf8");
    return { path: absolutePath, rows: rows.length };
}
