// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/palavras-chave/SKILL.md
// Skill: tray-palavras-chave
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const palavras_chave_list_definition = {
  name: "tray_palavras_chave_list",
  description: 'Listagem de palavras-chave (GET /keywords)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function palavras_chave_list_execute(
  input: z.infer<typeof palavras_chave_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/keywords`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const palavras_chave_get_definition = {
  name: "tray_palavras_chave_get",
  description: 'Consultar dados de uma palavra-chave (GET /keywords/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function palavras_chave_get_execute(
  input: z.infer<typeof palavras_chave_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/keywords/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: palavras_chave_list_definition, execute: palavras_chave_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: palavras_chave_get_definition, execute: palavras_chave_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
