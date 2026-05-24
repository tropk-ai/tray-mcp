// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/newsletter/SKILL.md
// Skill: tray-newsletter
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const newsletter_list_definition = {
  name: "tray_newsletter_list",
  description: 'Listagem de assinantes da newsletter (GET /newsletters)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function newsletter_list_execute(
  input: z.infer<typeof newsletter_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/newsletters`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const newsletter_create_definition = {
  name: "tray_newsletter_create",
  description: 'Cadastrar assinante (POST /newsletters)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function newsletter_create_execute(
  input: z.infer<typeof newsletter_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/newsletters`;
    const body = { "Newsletter": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const newsletter_create_confirm_definition = {
  name: "tray_newsletter_create_confirm",
  description: 'Confirmar cadastro de newsletter (POST /newsletters/confirm)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function newsletter_create_confirm_execute(
  input: z.infer<typeof newsletter_create_confirm_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/newsletters/confirm`;
    const body = { "Newsletter": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const tools = [
  { definition: newsletter_list_definition, execute: newsletter_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: newsletter_create_definition, execute: newsletter_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: newsletter_create_confirm_definition, execute: newsletter_create_confirm_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
