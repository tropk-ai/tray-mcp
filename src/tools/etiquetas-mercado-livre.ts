// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/etiquetas-mercado-livre/SKILL.md
// Skill: tray-etiquetas-mercado-livre
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const etiquetas_mercado_livre_list_definition = {
  name: "tray_etiquetas_mercado_livre_list",
  description: 'Consultar etiquetas do Mercado Livre (GET /mercado-livre/labels)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function etiquetas_mercado_livre_list_execute(
  input: z.infer<typeof etiquetas_mercado_livre_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/mercado-livre/labels`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: etiquetas_mercado_livre_list_definition, execute: etiquetas_mercado_livre_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
