// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/etiquetas-hub/SKILL.md
// Skill: tray-etiquetas-hub
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const etiquetas_hub_create_definition = {
  name: "tray_etiquetas_hub_create",
  description: 'Criar etiquetas (POST /labels)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function etiquetas_hub_create_execute(
  input: z.infer<typeof etiquetas_hub_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/labels`;
    const body = { "Label": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const etiquetas_hub_list_definition = {
  name: "tray_etiquetas_hub_list",
  description: 'Consultar etiquetas (GET /labels)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function etiquetas_hub_list_execute(
  input: z.infer<typeof etiquetas_hub_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/labels`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: etiquetas_hub_create_definition, execute: etiquetas_hub_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: etiquetas_hub_list_definition, execute: etiquetas_hub_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
