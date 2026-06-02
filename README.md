# Scimago MCP

MCP server สำหรับค้นหา SCImago Journal Rank โดยเน้นวารสาร Q1/Q2 ใน Health science / Medicine:

- Oncology
- Surgery
- Obstetrics and Gynecology

ค่าเริ่มต้นของ tool จะค้นหา Medicine categories เหล่านี้ให้ทันที และ export เป็น JSON หรือ CSV ได้

## Requirements

- Node.js 20+
- ไม่ต้องใช้ SCImago API key
- ถ้า `www.scimagojr.com` บล็อก request ด้วย browser protection ให้ตั้ง `SCIMAGO_COOKIE` จาก browser session ที่เข้าเว็บได้

## Install On Another Machine

ติดตั้งจาก GitHub:

```bash
npm install -g https://github.com/chagkrit/Scimago-MCP/archive/refs/heads/main.tar.gz
```

หมายเหตุ: ใช้ GitHub archive URL แทน `github:chagkrit/Scimago-MCP` เพราะ npm บางเวอร์ชันติดตั้ง git dependency แบบ global แล้วทำ symlink ไปยัง temporary git clone ทำให้ command หายหลังติดตั้ง

หลังติดตั้งแล้วจะมี commands:

```bash
scimago-mcp
scimago-export
```

## Claude Code

เพิ่ม MCP server แบบ user scope เพื่อให้ใช้ได้ทุก project:

```bash
claude mcp add scimago -s user -- scimago-mcp
claude mcp get scimago
```

ถ้า SCImago บล็อก request และคุณมี cookie จาก browser:

```bash
claude mcp add scimago -s user \
  -e SCIMAGO_COOKIE="YOUR_BROWSER_COOKIE" \
  -- scimago-mcp
```

ถ้าต้องการใช้เฉพาะ project ปัจจุบัน ให้เปลี่ยน `-s user` เป็น `-s local`

## Claude Code Terminal

ทดสอบจาก terminal โดย export CSV:

```bash
scimago-export scimago \
  --categories oncology,surgery,obstetrics-and-gynecology \
  --quartiles Q1,Q2 \
  --max-results 300 \
  --output ./exports/scimago_health_medicine_q1_q2.csv
```

ระบุปี เช่น ปี 2024:

```bash
scimago-export scimago \
  --year 2024 \
  --max-results 300 \
  --output ./exports/scimago_2024_q1_q2.csv
```

## Claude Desktop / Claude Cowork

เพิ่ม MCP server ใน config ของ Claude:

```json
{
  "mcpServers": {
    "scimago": {
      "command": "scimago-mcp",
      "args": [],
      "env": {
        "SCIMAGO_COOKIE": "OPTIONAL_BROWSER_COOKIE_IF_SCIMAGO_BLOCKS_REQUESTS"
      }
    }
  }
}
```

ถ้าไม่ได้ใช้ cookie สามารถลบ `env` ออกได้:

```json
{
  "mcpServers": {
    "scimago": {
      "command": "scimago-mcp",
      "args": []
    }
  }
}
```

## MCP Tools

- `scimago_health_medicine_journals`: ค้นหา SCImago และคืนผลลัพธ์เป็น JSON
- `scimago_health_medicine_journals_to_csv`: ค้นหา SCImago และบันทึก CSV

ค่า default:

- area: Medicine
- categories: Oncology (`2730`), Surgery (`2746`), Obstetrics and Gynecology (`2729`)
- quartiles: Q1, Q2
- source type: journal
- sort: SJR descending

ตัวอย่าง MCP input:

```json
{
  "maxResults": 300,
  "quartiles": ["Q1", "Q2"],
  "categories": ["oncology", "surgery", "obstetrics-and-gynecology"]
}
```

ตัวอย่าง export CSV:

```json
{
  "year": 2024,
  "maxResults": 300,
  "outputPath": "./exports/scimago_2024_q1_q2.csv"
}
```

## SCImago URLs

Tool ใช้ CSV export ของ SCImago ในรูปแบบนี้:

```text
https://www.scimagojr.com/journalrank.php?area=2700&category=2730&type=j&out=xls
```

Category IDs:

- Oncology: `2730`
- Surgery: `2746`
- Obstetrics and Gynecology: `2729`

## Optional Scopus Tools

โปรเจกต์นี้ยังเก็บ Scopus API tools เดิมไว้เป็น optional:

- `scopus_search`
- `scopus_search_to_csv`
- `scopus_sources_to_csv`

ต้องตั้ง `SCOPUS_API_KEY` ก่อนใช้งาน tools เหล่านี้

## Local Development

```bash
git clone https://github.com/chagkrit/Scimago-MCP.git
cd Scimago-MCP
npm install
npm run build
npm run typecheck
```

ใช้ local build กับ Claude Code:

```bash
claude mcp add scimago-local -s local -- node "$(pwd)/dist/index.js"
```
