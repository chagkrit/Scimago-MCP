# Scopus MCP Connector

MCP server สำหรับค้นหา metadata จาก Elsevier Scopus APIs แล้วบันทึกเป็น CSV

## สิ่งที่ต้องมี

- Node.js 20+
- Elsevier API key: ตั้งค่าเป็น `SCOPUS_API_KEY`
- ถ้าองค์กรของคุณใช้ institutional token ให้ตั้ง `SCOPUS_INST_TOKEN`

Scopus web page เช่น `https://www.scopus.com/sources.uri?...` มักต้องใช้ browser session และอาจป้องกัน bot access ดังนั้น connector นี้ใช้ Elsevier APIs แทนการ scrape หน้าเว็บโดยตรง

## ติดตั้ง

ติดตั้งจาก GitHub แบบ global:

```bash
npm install -g github:chagkrit/Scopus-MCP
```

หรือ clone repo แล้วติดตั้งเอง:

```bash
git clone https://github.com/chagkrit/Scopus-MCP.git
cd Scopus-MCP
npm install
npm run build
```

หลังติดตั้งแล้วจะมี command:

```bash
scopus-mcp
scopus-export
```

## ใช้เป็น MCP server

ตั้งค่า API key ก่อน:

```bash
export SCOPUS_API_KEY="YOUR_ELSEVIER_API_KEY"
```

### Claude Code

เพิ่ม MCP server ให้ใช้ได้ทุก project/folder:

```bash
claude mcp add scopus -s user -e SCOPUS_API_KEY="$SCOPUS_API_KEY" -- scopus-mcp
claude mcp get scopus
```

ถ้าต้องการใช้เฉพาะ project ปัจจุบัน ให้เปลี่ยน `-s user` เป็น `-s local`

### Codex หรือ MCP client อื่น

เพิ่ม config ให้ MCP client โดยใช้ command จาก global install:

```json
{
  "mcpServers": {
    "scopus": {
      "command": "scopus-mcp",
      "args": [],
      "env": {
        "SCOPUS_API_KEY": "YOUR_ELSEVIER_API_KEY",
        "SCOPUS_INST_TOKEN": "OPTIONAL_INSTITUTION_TOKEN"
      }
    }
  }
}
```

## Tools

- `scopus_search`: ค้นหางานวิจัยและคืนผลลัพธ์เป็น JSON
- `scopus_search_to_csv`: ค้นหางานวิจัยและบันทึก CSV
- `scopus_sources_to_csv`: ดึง metadata ของ journal/source จาก Serial Title API และบันทึก CSV คล้ายข้อมูลในหน้า Scopus Sources

ตัวอย่าง query:

```text
TITLE-ABS-KEY("artificial intelligence" AND education) AND PUBYEAR > 2020
```

## ใช้ผ่าน CLI

```bash
export SCOPUS_API_KEY="YOUR_ELSEVIER_API_KEY"

scopus-export search \
  --query 'TITLE-ABS-KEY("artificial intelligence" AND education)' \
  --max-results 50 \
  --output ./exports/scopus_ai_education.csv

scopus-export sources \
  --content journal \
  --subject COMP \
  --max-results 100 \
  --output ./exports/scopus_sources.csv
```

## CSV fields

งานวิจัย:

- scopus_id
- eid
- title
- author
- publication
- cover_date
- year
- cited_by_count
- doi
- issn
- eissn
- aggregation_type
- subtype
- open_access
- url

Source/journal:

- source_id
- title
- issn
- eissn
- publisher
- coverage
- subject_area
- cite_score
- snip
- sjr
- url
