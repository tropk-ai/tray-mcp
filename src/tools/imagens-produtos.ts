// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/imagens-produtos/SKILL.md
// Skill: tray-imagens-produtos
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const imagens_produtos_create_images_definition = {
  name: "tray_imagens_produtos_create_images",
  description: 'Cadastro e atualização de imagem do produto (POST /products/:id/images)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function imagens_produtos_create_images_execute(
  input: z.infer<typeof imagens_produtos_create_images_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/products/${encodeURIComponent(String(input.id))}/images`;
    const body = { "ProductImage": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const imagens_produtos_create_images_images_definition = {
  name: "tray_imagens_produtos_create_images_images",
  description: 'Cadastro e atualização de imagem da variação (POST /variants/:id/images)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function imagens_produtos_create_images_images_execute(
  input: z.infer<typeof imagens_produtos_create_images_images_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/variants/${encodeURIComponent(String(input.id))}/images`;
    const body = { "ProductImage": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const imagens_produtos_create_definition = {
  name: "tray_imagens_produtos_create",
  description: 'Remoção de imagens (POST /images/remove)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function imagens_produtos_create_execute(
  input: z.infer<typeof imagens_produtos_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/images/remove`;
    const body = { "ProductImage": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const tools = [
  { definition: imagens_produtos_create_images_definition, execute: imagens_produtos_create_images_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: imagens_produtos_create_images_images_definition, execute: imagens_produtos_create_images_images_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: imagens_produtos_create_definition, execute: imagens_produtos_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
