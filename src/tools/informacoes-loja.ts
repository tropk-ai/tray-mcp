// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/informacoes-loja/SKILL.md
// Skill: tray-informacoes-loja
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const informacoes_loja_list_definition = {
  name: "tray_informacoes_loja_list",
  description: 'Consultar informações da loja (GET /store)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_loja_list_execute(
  input: z.infer<typeof informacoes_loja_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/store`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: informacoes_loja_list_definition, execute: informacoes_loja_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
