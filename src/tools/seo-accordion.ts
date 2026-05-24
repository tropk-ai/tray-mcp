// Special-case tool: ship a FAQ/SEO accordion into a Tray category description.
//
// The merchant provides an introduction blurb plus a list of FAQ entries.
// We sanitize the inputs (whitelisted tags only), assemble native
// <details>/<summary> markup, and PUT it to the Tray API at
// /categories/{id}. When `replace` is false we fetch the current
// description and append to it instead of overwriting.

import { z } from "zod";
import type { TrayClient } from "../tray/client.js";
import { escapeHtml, sanitize } from "../lib/html-sanitizer.js";

export const seo_accordion_definition = {
  name: "tray_categorias_set_seo_accordion",
  description:
    "Adiciona um accordion de FAQ/SEO na página de categoria. Cria HTML <details><summary> nativo no campo description da categoria, ideal para FAQ e conteúdo SEO.",
  inputSchema: z.object({
    category_id: z.union([z.number(), z.string()]),
    intro_html: z.string().optional(),
    faqs: z
      .array(
        z.object({
          pergunta: z.string(),
          resposta_html: z.string(),
        }),
      )
      .min(1),
    replace: z
      .boolean()
      .default(true)
      .describe(
        "Se true substitui description, se false anexa ao conteúdo atual",
      ),
  }),
} as const;

type SeoAccordionInput = z.infer<typeof seo_accordion_definition.inputSchema>;

interface CategoryGetResponse {
  Category?: { description?: string | null; [key: string]: unknown };
  [key: string]: unknown;
}

function buildAccordion(input: SeoAccordionInput): string {
  const intro = input.intro_html ? sanitize(input.intro_html) : "";
  const items = input.faqs
    .map((faq) => {
      const summary = escapeHtml(faq.pergunta);
      const body = sanitize(faq.resposta_html);
      return `<details name="faq"><summary>${summary}</summary>${body}</details>`;
    })
    .join("");
  return `${intro}${items}`;
}

export async function seo_accordion_execute(
  input: SeoAccordionInput,
  ctx: { client: TrayClient },
): Promise<{
  category_id: string | number;
  description_html: string;
  preview_url?: string;
}> {
  const accordion = buildAccordion(input);

  let descriptionHtml = accordion;
  if (!input.replace) {
    const current = await ctx.client.request<CategoryGetResponse>(
      "GET",
      `/categories/${encodeURIComponent(String(input.category_id))}`,
    );
    const existing = current?.Category?.description ?? "";
    descriptionHtml = `${existing ?? ""}${accordion}`;
  }

  await ctx.client.request<unknown>(
    "PUT",
    `/categories/${encodeURIComponent(String(input.category_id))}`,
    {
      body: { Category: { description: descriptionHtml } },
    },
  );

  return {
    category_id: input.category_id,
    description_html: descriptionHtml,
  };
}

export const tools = [
  {
    definition: seo_accordion_definition,
    execute: seo_accordion_execute as (
      input: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      ctx: { client: TrayClient },
    ) => Promise<unknown>,
  },
] as const;
