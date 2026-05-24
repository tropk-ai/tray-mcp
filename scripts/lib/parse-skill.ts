// Lightweight markdown parser for tray-api-ai-plugin SKILL.md files.
// No external deps — pure regex/string splitting. Supports escaped pipes (`\|`)
// inside table cells.

import { readFileSync } from "node:fs";

/** Parsed SKILL.md frontmatter (only fields we care about). */
export interface SkillFrontmatter {
  name: string;
  description: string;
  when_to_use?: string;
  when_not_to_use?: string;
}

/** A single API endpoint extracted from one of the `## Endpoints` tables. */
export interface ParsedEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Path as written in the markdown, e.g. `/categories/:id/order`. */
  path: string;
  /** Description text from the table row. */
  description: string;
  /** Path parameter names (e.g. `["id"]`, `["order_id", "id"]`). */
  pathParams: string[];
  /** Heading text of the section the row was found in (for disambiguation). */
  section: string;
}

/** Field documented in a `## Campos ...` table (used to type request bodies). */
export interface ParsedField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

/** Full SKILL.md content of interest. */
export interface ParsedSkill {
  area: string;
  frontmatter: SkillFrontmatter;
  endpoints: ParsedEndpoint[];
  fields: ParsedField[];
  /** Wrapper key for POST/PUT bodies (e.g. `Category`, `Product`). */
  bodyWrapper?: string;
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

function parseFrontmatter(md: string): SkillFrontmatter {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(md);
  if (!m) {
    return { name: "", description: "" };
  }
  const body = m[1] ?? "";
  // Very small YAML subset: `key: value` or `key: >\n  multi-line`.
  const out: Record<string, string> = {};
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1]!;
    const rest = (kv[2] ?? "").trim();
    if (rest === ">" || rest === "|") {
      // Folded / literal block. Collect indented lines that follow.
      const buf: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i] ?? "";
        if (/^\s+\S/.test(next)) {
          buf.push(next.replace(/^\s+/, ""));
          i++;
        } else if (next.trim() === "") {
          buf.push("");
          i++;
        } else {
          break;
        }
      }
      out[key] = buf.join(" ").replace(/\s+/g, " ").trim();
    } else {
      out[key] = rest;
      i++;
    }
  }
  return {
    name: out["name"] ?? "",
    description: out["description"] ?? "",
    when_to_use: out["when_to_use"],
    when_not_to_use: out["when_not_to_use"],
  };
}

// ---------------------------------------------------------------------------
// Markdown tables
// ---------------------------------------------------------------------------

/**
 * Split a markdown table row into cells, honoring `\|` escapes inside cells.
 * Leading/trailing pipes are stripped. Trims each cell.
 */
function splitRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "\\" && trimmed[i + 1] === "|") {
      buf += "|";
      i++;
      continue;
    }
    if (ch === "|") {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  out.push(buf.trim());
  return out;
}

interface RawTable {
  headers: string[];
  rows: string[][];
}

/**
 * Extract the first markdown table that appears in `block`.
 * Tables are recognised by the alignment row (`|:--|...`).
 */
function extractTable(block: string): RawTable | null {
  const lines = block.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const headerLine = lines[i] ?? "";
    const alignLine = lines[i + 1] ?? "";
    if (!/^\s*\|/.test(headerLine)) continue;
    if (!/^\s*\|?\s*:?-{2,}/.test(alignLine)) continue;
    const headers = splitRow(headerLine);
    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length) {
      const row = lines[j] ?? "";
      if (!/^\s*\|/.test(row)) break;
      rows.push(splitRow(row));
      j++;
    }
    return { headers, rows };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function extractPathParams(path: string): string[] {
  const params: string[] = [];
  // Match both `:foo` and `{foo}` style placeholders.
  const re = /(?::([a-zA-Z_][a-zA-Z0-9_]*))|(?:\{([a-zA-Z_][a-zA-Z0-9_]*)\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    const name = m[1] ?? m[2];
    if (name && !params.includes(name)) params.push(name);
  }
  return params;
}

function stripQuery(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

function cleanCellValue(s: string): string {
  return s.replace(/^`|`$/g, "").trim();
}

function parseEndpointsFromSection(
  section: string,
  body: string,
): ParsedEndpoint[] {
  const table = extractTable(body);
  if (!table) return [];
  // Identify columns: tolerate "Método|Endpoint|Descrição" and
  // "Endpoint|Descrição" (no method column — default to GET).
  const lower = table.headers.map((h) => h.toLowerCase());
  const methodIdx = lower.findIndex((h) => h.startsWith("método") || h === "metodo" || h === "method");
  const endpointIdx = lower.findIndex((h) => h.startsWith("endpoint"));
  const descIdx = lower.findIndex((h) => h.startsWith("descri"));
  if (endpointIdx === -1) return [];

  const out: ParsedEndpoint[] = [];
  for (const row of table.rows) {
    const rawMethod = methodIdx >= 0 ? cleanCellValue(row[methodIdx] ?? "").toUpperCase() : "GET";
    if (!HTTP_METHODS.has(rawMethod)) continue;
    const rawPath = cleanCellValue(row[endpointIdx] ?? "");
    if (!rawPath || !rawPath.startsWith("/")) continue;
    const path = stripQuery(rawPath);
    const description = descIdx >= 0 ? (row[descIdx] ?? "").trim() : "";
    out.push({
      method: rawMethod as ParsedEndpoint["method"],
      path,
      description,
      pathParams: extractPathParams(path),
      section,
    });
  }
  return out;
}

/**
 * Split the markdown body into `## <heading>` sections.
 * Returns `[heading, body]` pairs (heading text without leading `## `).
 */
function splitSections(md: string): Array<{ heading: string; body: string }> {
  const lines = md.split("\n");
  const sections: Array<{ heading: string; body: string }> = [];
  let current: { heading: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) sections.push({ heading: current.heading, body: current.body.join("\n") });
      current = { heading: m[1]!, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.body.join("\n") });
  return sections;
}

function parseEndpoints(md: string): ParsedEndpoint[] {
  const out: ParsedEndpoint[] = [];
  for (const { heading, body } of splitSections(md)) {
    if (!/^endpoints?\b/i.test(heading)) continue;
    out.push(...parseEndpointsFromSection(heading, body));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

function parseFields(md: string): ParsedField[] {
  const out: ParsedField[] = [];
  for (const { heading, body } of splitSections(md)) {
    if (!/^campos?\b/i.test(heading)) continue;
    const table = extractTable(body);
    if (!table) continue;
    const lower = table.headers.map((h) => h.toLowerCase());
    const nameIdx = lower.findIndex((h) => h.startsWith("campo") || h === "field");
    const typeIdx = lower.findIndex((h) => h.startsWith("tipo") || h === "type");
    const reqIdx = lower.findIndex((h) => h.startsWith("obrigat") || h === "required");
    const descIdx = lower.findIndex((h) => h.startsWith("descri"));
    if (nameIdx === -1) continue;
    for (const row of table.rows) {
      const name = cleanCellValue(row[nameIdx] ?? "");
      if (!name) continue;
      const type = typeIdx >= 0 ? cleanCellValue(row[typeIdx] ?? "") : "string";
      const reqRaw = reqIdx >= 0 ? cleanCellValue(row[reqIdx] ?? "").toLowerCase() : "";
      const description = descIdx >= 0 ? (row[descIdx] ?? "").trim() : "";
      const required =
        reqRaw === "sim" ||
        reqRaw === "yes" ||
        /\bobrigat[oó]rio\b/i.test(description);
      out.push({ name, type, required, description });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Body wrapper detection
// ---------------------------------------------------------------------------

function detectBodyWrapper(md: string): string | undefined {
  // Look for `{ "Foo": { ... } }` in any fenced JSON block.
  const fence = /```json\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(md)) !== null) {
    const block = m[1] ?? "";
    const obj = /^\s*\{\s*"([A-Z][A-Za-z0-9_]*)"\s*:\s*[{[]/m.exec(block);
    if (obj) return obj[1];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function parseSkillFile(path: string, area: string): ParsedSkill {
  const md = readFileSync(path, "utf8");
  return {
    area,
    frontmatter: parseFrontmatter(md),
    endpoints: parseEndpoints(md),
    fields: parseFields(md),
    bodyWrapper: detectBodyWrapper(md),
  };
}
