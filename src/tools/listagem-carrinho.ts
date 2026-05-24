// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/listagem-carrinho/SKILL.md
// Skill: tray-listagem-carrinho
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const listagem_carrinho_list_definition = {
  name: "tray_listagem_carrinho_list",
  description: 'Listagem de todos os carrinhos com paginação (GET /carts)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function listagem_carrinho_list_execute(
  input: z.infer<typeof listagem_carrinho_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/carts`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: listagem_carrinho_list_definition, execute: listagem_carrinho_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
