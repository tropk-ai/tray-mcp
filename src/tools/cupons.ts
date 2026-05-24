// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/cupons/SKILL.md
// Skill: tray-cupons
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const cupons_list_definition = {
  name: "tray_cupons_list",
  description: 'Listar cupons (GET /discount_coupons)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_list_execute(
  input: z.infer<typeof cupons_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_get_definition = {
  name: "tray_cupons_get",
  description: 'Detalhes de um cupom (GET /discount_coupons/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_execute(
  input: z.infer<typeof cupons_get_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_create_definition = {
  name: "tray_cupons_create",
  description: 'Criar cupom (POST /discount_coupons)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_create_execute(
  input: z.infer<typeof cupons_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons`;
    const body = { "DiscountCouponCustomer": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const cupons_update_definition = {
  name: "tray_cupons_update",
  description: 'Atualizar cupom (PUT /discount_coupons/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_update_execute(
  input: z.infer<typeof cupons_update_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/${encodeURIComponent(String(input.id))}`;
    const body = { "DiscountCouponCustomer": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('PUT', path, { body, accessToken: input.access_token });
}

export const cupons_delete_definition = {
  name: "tray_cupons_delete",
  description: 'Excluir cupom (DELETE /discount_coupons/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_delete_execute(
  input: z.infer<typeof cupons_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const cupons_get_customer_relationship_definition = {
  name: "tray_cupons_get_customer_relationship",
  description: 'Listar clientes vinculados (GET /discount_coupons/customer_relationship/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_customer_relationship_execute(
  input: z.infer<typeof cupons_get_customer_relationship_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/customer_relationship/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_get_product_relationship_definition = {
  name: "tray_cupons_get_product_relationship",
  description: 'Listar produtos vinculados (GET /discount_coupons/product_relationship/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_product_relationship_execute(
  input: z.infer<typeof cupons_get_product_relationship_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/product_relationship/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_get_category_relationship_definition = {
  name: "tray_cupons_get_category_relationship",
  description: 'Listar categorias vinculadas (GET /discount_coupons/category_relationship/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_category_relationship_execute(
  input: z.infer<typeof cupons_get_category_relationship_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/category_relationship/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_get_brand_relationship_definition = {
  name: "tray_cupons_get_brand_relationship",
  description: 'Listar marcas vinculadas (GET /discount_coupons/brand_relationship/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_brand_relationship_execute(
  input: z.infer<typeof cupons_get_brand_relationship_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/brand_relationship/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_get_shipping_relationship_definition = {
  name: "tray_cupons_get_shipping_relationship",
  description: 'Listar fretes vinculados (GET /discount_coupons/shipping_relationship/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_shipping_relationship_execute(
  input: z.infer<typeof cupons_get_shipping_relationship_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/shipping_relationship/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const cupons_get_gift_relationship_definition = {
  name: "tray_cupons_get_gift_relationship",
  description: 'Consultar cupom-presente vinculado (GET /discount_coupons/gift_relationship/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function cupons_get_gift_relationship_execute(
  input: z.infer<typeof cupons_get_gift_relationship_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/discount_coupons/gift_relationship/${encodeURIComponent(String(input.id))}`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: cupons_list_definition, execute: cupons_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_definition, execute: cupons_get_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_create_definition, execute: cupons_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_update_definition, execute: cupons_update_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_delete_definition, execute: cupons_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_customer_relationship_definition, execute: cupons_get_customer_relationship_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_product_relationship_definition, execute: cupons_get_product_relationship_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_category_relationship_definition, execute: cupons_get_category_relationship_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_brand_relationship_definition, execute: cupons_get_brand_relationship_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_shipping_relationship_definition, execute: cupons_get_shipping_relationship_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: cupons_get_gift_relationship_definition, execute: cupons_get_gift_relationship_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
