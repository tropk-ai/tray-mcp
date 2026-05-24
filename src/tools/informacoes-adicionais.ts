// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/informacoes-adicionais/SKILL.md
// Skill: tray-informacoes-adicionais
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const informacoes_adicionais_list_definition = {
  name: "tray_informacoes_adicionais_list",
  description: 'Listagem geral das informações adicionais (GET /additional-info)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_list_execute(
  input: z.infer<typeof informacoes_adicionais_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/additional-info`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const informacoes_adicionais_get_definition = {
  name: "tray_informacoes_adicionais_get",
  description: 'Consultar dados por ID (GET /additional-info/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_get_execute(
  input: z.infer<typeof informacoes_adicionais_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/additional-info/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const informacoes_adicionais_create_definition = {
  name: "tray_informacoes_adicionais_create",
  description: 'Cadastrar informação adicional (POST /additional-info)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_create_execute(
  input: z.infer<typeof informacoes_adicionais_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/additional-info`;
    const body = { "AdditionalInfo": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const informacoes_adicionais_update_definition = {
  name: "tray_informacoes_adicionais_update",
  description: 'Atualizar informação (PUT /additional-info/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_update_execute(
  input: z.infer<typeof informacoes_adicionais_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/additional-info/${encodeURIComponent(String(input.id))}`;
    const body = { "AdditionalInfo": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const informacoes_adicionais_update_additional_info_definition = {
  name: "tray_informacoes_adicionais_update_additional_info",
  description: 'Atualizar informações relacionadas ao produto (PUT /products/:id/additional-info)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_update_additional_info_execute(
  input: z.infer<typeof informacoes_adicionais_update_additional_info_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}/additional-info`;
    const body = { "AdditionalInfo": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const informacoes_adicionais_create_additional_info_definition = {
  name: "tray_informacoes_adicionais_create_additional_info",
  description: 'Vincular informação adicional ao produto (POST /products/:id/additional-info)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_create_additional_info_execute(
  input: z.infer<typeof informacoes_adicionais_create_additional_info_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}/additional-info`;
    const body = { "AdditionalInfo": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const informacoes_adicionais_delete_definition = {
  name: "tray_informacoes_adicionais_delete",
  description: 'Excluir relação com produto (DELETE /products/:id/additional-info/:info_id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    info_id: z.union([z.string(), z.number()]).describe('Path parameter info_id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_delete_execute(
  input: z.infer<typeof informacoes_adicionais_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}/additional-info/${encodeURIComponent(String(input.info_id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const informacoes_adicionais_delete_additional_info_definition = {
  name: "tray_informacoes_adicionais_delete_additional_info",
  description: 'Excluir informação adicional (DELETE /additional-info/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function informacoes_adicionais_delete_additional_info_execute(
  input: z.infer<typeof informacoes_adicionais_delete_additional_info_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/additional-info/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: informacoes_adicionais_list_definition, execute: informacoes_adicionais_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_get_definition, execute: informacoes_adicionais_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_create_definition, execute: informacoes_adicionais_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_update_definition, execute: informacoes_adicionais_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_update_additional_info_definition, execute: informacoes_adicionais_update_additional_info_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_create_additional_info_definition, execute: informacoes_adicionais_create_additional_info_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_delete_definition, execute: informacoes_adicionais_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: informacoes_adicionais_delete_additional_info_definition, execute: informacoes_adicionais_delete_additional_info_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
