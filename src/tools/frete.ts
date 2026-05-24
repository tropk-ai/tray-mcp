// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/frete/SKILL.md
// Skill: tray-frete
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const frete_list_definition = {
  name: "tray_frete_list",
  description: 'Calcular frete para um ou mais produtos por CEP (GET /shippings/cotation/)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function frete_list_execute(
  input: z.infer<typeof frete_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/cotation/`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const frete_list_shippings_definition = {
  name: "tray_frete_list_shippings",
  description: 'Listar formas de envio disponíveis na loja (GET /shippings/)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function frete_list_shippings_execute(
  input: z.infer<typeof frete_list_shippings_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: frete_list_definition, execute: frete_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: frete_list_shippings_definition, execute: frete_list_shippings_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
