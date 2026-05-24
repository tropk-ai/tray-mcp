// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/configuracao-frete/SKILL.md
// Skill: tray-configuracao-frete
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const configuracao_frete_create_definition = {
  name: "tray_configuracao_frete_create",
  description: 'Cadastrar forma de envio com integração externa (POST /shippings/method/gateway)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function configuracao_frete_create_execute(
  input: z.infer<typeof configuracao_frete_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/method/gateway`;
    const body = { "ShippingMethod": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const configuracao_frete_update_definition = {
  name: "tray_configuracao_frete_update",
  description: 'Atualizar forma de envio (PUT /shippings/method/gateway/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function configuracao_frete_update_execute(
  input: z.infer<typeof configuracao_frete_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/method/gateway/${encodeURIComponent(String(input.id))}`;
    const body = { "ShippingMethod": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const configuracao_frete_delete_definition = {
  name: "tray_configuracao_frete_delete",
  description: 'Excluir forma de envio (DELETE /shippings/method/gateway/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function configuracao_frete_delete_execute(
  input: z.infer<typeof configuracao_frete_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/method/gateway/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const configuracao_frete_create_zipcode_table_definition = {
  name: "tray_configuracao_frete_create_zipcode_table",
  description: 'Cadastrar tabela de CEP (POST /shippings/method/zipcode_table)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function configuracao_frete_create_zipcode_table_execute(
  input: z.infer<typeof configuracao_frete_create_zipcode_table_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/method/zipcode_table`;
    const body = { "ShippingMethod": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const configuracao_frete_update_zipcode_table_definition = {
  name: "tray_configuracao_frete_update_zipcode_table",
  description: 'Atualizar tabela de CEP (PUT /shippings/method/zipcode_table/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function configuracao_frete_update_zipcode_table_execute(
  input: z.infer<typeof configuracao_frete_update_zipcode_table_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/method/zipcode_table/${encodeURIComponent(String(input.id))}`;
    const body = { "ShippingMethod": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const configuracao_frete_delete_zipcode_table_definition = {
  name: "tray_configuracao_frete_delete_zipcode_table",
  description: 'Excluir tabela de CEP (DELETE /shippings/method/zipcode_table/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function configuracao_frete_delete_zipcode_table_execute(
  input: z.infer<typeof configuracao_frete_delete_zipcode_table_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/shippings/method/zipcode_table/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: configuracao_frete_create_definition, execute: configuracao_frete_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: configuracao_frete_update_definition, execute: configuracao_frete_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: configuracao_frete_delete_definition, execute: configuracao_frete_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: configuracao_frete_create_zipcode_table_definition, execute: configuracao_frete_create_zipcode_table_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: configuracao_frete_update_zipcode_table_definition, execute: configuracao_frete_update_zipcode_table_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: configuracao_frete_delete_zipcode_table_definition, execute: configuracao_frete_delete_zipcode_table_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
