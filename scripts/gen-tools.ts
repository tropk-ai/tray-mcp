// Code generator for tray-mcp tool modules.
//
// Reads every `skills/<area>/SKILL.md` in the cloned tray-api-ai-plugin repo
// (default: /tmp/tray-api-ai-plugin) and emits one TypeScript file per area
// in `src/tools/<area>.ts`. Each generated file exports an array of
// `{ definition, execute }` pairs that the MCP server registers as tools.
//
// Run with: `pnpm gen-tools` or `tsx scripts/gen-tools.ts`.

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseSkillFile, type ParsedEndpoint, type ParsedSkill } from "./lib/parse-skill.js";

const PLUGIN_DIR = process.env.TRAY_PLUGIN_DIR ?? "/tmp/tray-api-ai-plugin";
const SKILLS_DIR = join(PLUGIN_DIR, "skills");
const OUT_DIR = join(process.cwd(), "src", "tools");

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function snakeCase(input: string): string {
  return input
    .replace(/[-/]+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function camelToPascal(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toIdentifier(input: string): string {
  let id = input.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
  if (/^[0-9]/.test(id)) id = "_" + id;
  return id;
}

function escapeJsString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function escapeForSingleQuoted(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ---------------------------------------------------------------------------
// Action naming
// ---------------------------------------------------------------------------

/**
 * Strip path parameters from a path so we can derive an action verb from the
 * remaining static segments. `/orders/:id/cancel` → `["orders", "cancel"]`.
 */
function staticSegments(path: string): string[] {
  return path
    .split("/")
    .filter(Boolean)
    .filter((seg) => !seg.startsWith(":") && !seg.startsWith("{"));
}

function actionFromEndpoint(ep: ParsedEndpoint): string {
  const segs = staticSegments(ep.path);
  const last = segs[segs.length - 1] ?? "";
  const hasPathParam = ep.pathParams.length > 0;

  // Trailing static segments after the last path param become verb suffixes:
  // `/orders/:id/cancel` → `cancel`, `/categories/:id/order` → `reorder`.
  const tailIdx = ep.path.lastIndexOf(":");
  const braceIdx = ep.path.lastIndexOf("{");
  const lastParamPos = Math.max(tailIdx, braceIdx);
  let trailingSegs: string[] = [];
  if (lastParamPos !== -1) {
    const after = ep.path.slice(lastParamPos);
    // Drop the param token itself, keep what comes after.
    trailingSegs = after.split("/").slice(1).filter(Boolean);
  }
  const verbSuffix = trailingSegs.length > 0 ? snakeCase(trailingSegs.join("_")) : "";

  let base: string;
  switch (ep.method) {
    case "GET":
      base = hasPathParam ? "get" : "list";
      if (last === "all" && !hasPathParam) base = "list_all";
      break;
    case "POST":
      base = "create";
      break;
    case "PUT":
      base = "update";
      break;
    case "PATCH":
      base = "patch";
      break;
    case "DELETE":
      base = "delete";
      break;
  }

  // Special suffix cases that read better as a single verb.
  if (verbSuffix === "order" && ep.method === "PUT") return "reorder";
  if (verbSuffix === "cancel") return "cancel";
  if (verbSuffix === "complete" && ep.method === "GET") return "get_complete";
  if (verbSuffix === "full" && ep.method === "GET") return "get_full";

  if (verbSuffix) return `${base}_${verbSuffix}`;
  return base;
}

/**
 * Produce a tool name unique within a single SKILL by appending a path-derived
 * suffix when two endpoints collide.
 */
function uniqueToolName(
  area: string,
  ep: ParsedEndpoint,
  taken: Set<string>,
): { name: string; action: string } {
  const areaSnake = snakeCase(area);
  const baseAction = actionFromEndpoint(ep);
  let action = baseAction;
  let name = `tray_${areaSnake}_${action}`;
  if (!taken.has(name)) {
    taken.add(name);
    return { name, action };
  }
  // Disambiguate using the trailing static path segment ignoring params.
  const segs = staticSegments(ep.path);
  for (let i = segs.length - 1; i >= 0; i--) {
    const candidateSuffix = snakeCase(segs.slice(i).join("_"));
    const candidate = `tray_${areaSnake}_${baseAction}_${candidateSuffix}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return { name: candidate, action: `${baseAction}_${candidateSuffix}` };
    }
  }
  // Final fallback: numeric suffix.
  let i = 2;
  while (taken.has(`${name}_${i}`)) i++;
  taken.add(`${name}_${i}`);
  return { name: `${name}_${i}`, action: `${action}_${i}` };
}

// ---------------------------------------------------------------------------
// Body wrapper inference
// ---------------------------------------------------------------------------

const WRAPPER_BY_AREA: Record<string, string> = {
  categorias: "Category",
  produtos: "Product",
  marcas: "Brand",
  variacoes: "Variant",
  clientes: "Customer",
  pedidos: "Order",
  cupons: "DiscountCoupon",
  parceiros: "Partner",
  usuarios: "User",
  webhooks: "Notification",
  kits: "Kit",
  newsletter: "Newsletter",
  newsletters: "Newsletter",
  pagamentos: "Payment",
  "informacoes-adicionais": "AdditionalInfo",
  "informacoes-loja": "Store",
  "imagens-produtos": "ProductImage",
  "perfis-cliente": "CustomerProfile",
  "enderecos-cliente": "CustomerAddress",
  "status-pedido": "OrderStatus",
  "notas-fiscais": "Invoice",
  "scripts-externos": "Script",
  "palavras-chave": "Keyword",
  caracteristicas: "Property",
  "listas-preco-b2b": "PriceList",
  multicd: "DistributionCenter",
  "emissores-etiqueta": "LabelEmitter",
  "etiquetas-hub": "Label",
  "etiquetas-mercado-livre": "Label",
  "configuracao-frete": "Shipping",
  frete: "Shipping",
  "carrinho-compras": "Cart",
  "listagem-carrinho": "Cart",
  "produtos-vendidos": "Sold",
};

function wrapperForEndpoint(
  area: string,
  ep: ParsedEndpoint,
  skillWrapper: string | undefined,
): string {
  // Specific overrides for known cross-resource endpoints.
  if (ep.path.includes("/customer_relationship")) return "DiscountCouponCustomer";
  if (ep.path.includes("/product_relationship")) return "DiscountCouponProduct";
  if (ep.path.includes("/category_relationship")) return "DiscountCouponCategory";
  if (ep.path.includes("/brand_relationship")) return "DiscountCouponBrand";
  if (ep.path.includes("/shipping_relationship")) return "DiscountCouponShipping";
  if (ep.path.includes("/gift_relationship")) return "DiscountCouponGift";
  if (ep.path.includes("/create_relationship")) return "DiscountCouponRelationship";
  if (ep.path.endsWith("/stock")) return "Stock";
  if (ep.path.endsWith("/order")) return "Order";
  if (ep.path.endsWith("/cancel")) return "Cancel";
  if (skillWrapper) return skillWrapper;
  const fallback = WRAPPER_BY_AREA[area];
  if (fallback) return fallback;
  // Last resort: PascalCase the last static segment.
  const segs = staticSegments(ep.path);
  return camelToPascal(snakeCase(segs[segs.length - 1] ?? area).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()));
}

// ---------------------------------------------------------------------------
// Code emission
// ---------------------------------------------------------------------------

interface EmittedTool {
  varBase: string;
  toolName: string;
  description: string;
  endpoint: ParsedEndpoint;
  body: boolean;
  wrapper: string;
}

function buildInputSchema(ep: ParsedEndpoint, needsBody: boolean): string {
  const props: string[] = [];
  for (const param of ep.pathParams) {
    // Path params are numeric in nearly every Tray endpoint. Accept both
    // numbers and numeric strings so callers can pass IDs from JSON.
    props.push(
      `    ${toIdentifier(param)}: z.union([z.string(), z.number()]).describe('Path parameter ${param}')`,
    );
  }
  if (ep.method === "GET") {
    props.push(
      `    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)')`,
    );
  }
  if (needsBody) {
    props.push(
      `    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.')`,
    );
  }
  props.push(`    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')`);
  return `z.object({\n${props.join(",\n")}\n  })`;
}

function buildExecuteBody(
  ep: ParsedEndpoint,
  needsBody: boolean,
  wrapper: string,
): string {
  // Build a runtime path by replacing :param / {param} with input.<param>.
  let pathExpr = "`" + escapeJsString(ep.path) + "`";
  for (const p of ep.pathParams) {
    const pat1 = new RegExp(`:${p}(?![a-zA-Z0-9_])`, "g");
    const pat2 = new RegExp(`\\{${p}\\}`, "g");
    let out = "`" + escapeJsString(ep.path) + "`";
    out = out.replace(pat1, "${encodeURIComponent(String(input." + toIdentifier(p) + "))}");
    out = out.replace(pat2, "${encodeURIComponent(String(input." + toIdentifier(p) + "))}");
    pathExpr = out;
  }
  // Apply both replacements in one final pass to cover paths with several params.
  let combined = "`" + escapeJsString(ep.path) + "`";
  for (const p of ep.pathParams) {
    const ident = toIdentifier(p);
    combined = combined.replace(
      new RegExp(`:${p}(?![a-zA-Z0-9_])`, "g"),
      "${encodeURIComponent(String(input." + ident + "))}",
    );
    combined = combined.replace(
      new RegExp(`\\{${p}\\}`, "g"),
      "${encodeURIComponent(String(input." + ident + "))}",
    );
  }
  pathExpr = combined;

  const lines: string[] = [];
  lines.push(`    const path = ${pathExpr};`);
  if (ep.method === "GET") {
    lines.push(`    const query = input.query;`);
  }
  if (needsBody) {
    lines.push(`    const body = { ${JSON.stringify(wrapper)}: input.body } as Record<string, unknown>;`);
  }
  const callArgs: string[] = [
    `'${ep.method}'`,
    `path`,
  ];
  const opts: string[] = [];
  if (ep.method === "GET") opts.push("query");
  if (needsBody) opts.push("body");
  opts.push("accessToken: input.access_token");
  callArgs.push(`{ ${opts.join(", ")} }`);
  lines.push(`    return ctx.client.request<unknown>(${callArgs.join(", ")});`);
  return lines.join("\n");
}

function generateToolBlock(
  area: string,
  ep: ParsedEndpoint,
  taken: Set<string>,
  skillWrapper: string | undefined,
): { code: string; tool: EmittedTool } {
  const { name: toolName, action } = uniqueToolName(area, ep, taken);
  const needsBody = ep.method === "POST" || ep.method === "PUT" || ep.method === "PATCH";
  const wrapper = needsBody ? wrapperForEndpoint(area, ep, skillWrapper) : "";
  const description = ep.description || `${ep.method} ${ep.path}`;
  const varBase = toIdentifier(`${snakeCase(area)}_${action}`);

  const code = [
    `export const ${varBase}_definition = {`,
    `  name: ${JSON.stringify(toolName)},`,
    `  description: '${escapeForSingleQuoted(description)} (${ep.method} ${ep.path})',`,
    `  inputSchema: ${buildInputSchema(ep, needsBody)},`,
    `} as const;`,
    ``,
    `export async function ${varBase}_execute(`,
    `  input: z.infer<typeof ${varBase}_definition.inputSchema>,`,
    `  ctx: { client: TrayClient },`,
    `): Promise<unknown> {`,
    buildExecuteBody(ep, needsBody, wrapper),
    `}`,
    ``,
  ].join("\n");

  return {
    code,
    tool: {
      varBase,
      toolName,
      description,
      endpoint: ep,
      body: needsBody,
      wrapper,
    },
  };
}

function generateAreaFile(skill: ParsedSkill): { source: string; tools: EmittedTool[] } {
  const taken = new Set<string>();
  const blocks: string[] = [];
  const tools: EmittedTool[] = [];
  for (const ep of skill.endpoints) {
    const { code, tool } = generateToolBlock(skill.area, ep, taken, skill.bodyWrapper);
    blocks.push(code);
    tools.push(tool);
  }

  const header = [
    `// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually`,
    `// Source: skills/${skill.area}/SKILL.md`,
    `// Skill: ${skill.frontmatter.name || skill.area}`,
    `//`,
    `// Regenerate with: pnpm gen-tools`,
    ``,
    `import { z } from 'zod';`,
    `import type { TrayClient } from '../tray/client.js';`,
    ``,
  ].join("\n");

  const exportList = tools.length === 0
    ? `export const tools: Array<{\n  definition: { name: string; description: string; inputSchema: z.ZodTypeAny };\n  execute: (input: any, ctx: { client: TrayClient }) => Promise<unknown>;\n}> = [];\n`
    : [
        `export const tools = [`,
        ...tools.map(
          (t) =>
            `  { definition: ${t.varBase}_definition, execute: ${t.varBase}_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },`,
        ),
        `] as const;`,
        ``,
      ].join("\n");

  const source = [header, ...blocks, exportList].join("\n");
  return { source, tools };
}

// ---------------------------------------------------------------------------
// Index file
// ---------------------------------------------------------------------------

function generateIndexFile(areas: string[]): string {
  const importLines = areas.map(
    (a, i) => `import { tools as ${toIdentifier("area_" + i)} } from './${a}.js';`,
  );
  const arrayLines = areas.map((_, i) => `  ...${toIdentifier("area_" + i)},`);
  return [
    `// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually`,
    `// Regenerate with: pnpm gen-tools`,
    ``,
    ...importLines,
    ``,
    `export const allTools = [`,
    ...arrayLines,
    `];`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function main(): void {
  if (!existsSync(SKILLS_DIR)) {
    throw new Error(`Skills directory not found at ${SKILLS_DIR}. Set TRAY_PLUGIN_DIR or clone tray-api-ai-plugin first.`);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const areas = readdirSync(SKILLS_DIR)
    .filter((entry) => statSync(join(SKILLS_DIR, entry)).isDirectory())
    .sort();

  const written: string[] = [];
  let totalTools = 0;
  for (const area of areas) {
    const file = join(SKILLS_DIR, area, "SKILL.md");
    if (!existsSync(file)) continue;
    const skill = parseSkillFile(file, area);
    const { source, tools } = generateAreaFile(skill);
    const outPath = join(OUT_DIR, `${area}.ts`);
    writeFileSync(outPath, source);
    written.push(outPath);
    totalTools += tools.length;
    process.stdout.write(`  ${area.padEnd(28)}  ${String(tools.length).padStart(2)} tools\n`);
  }

  const indexPath = join(OUT_DIR, "index.ts");
  writeFileSync(indexPath, generateIndexFile(areas));
  written.push(indexPath);
  process.stdout.write(`\nWrote ${written.length} files, ${totalTools} tools total.\n`);
}

main();
