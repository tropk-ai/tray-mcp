// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/emissores-etiqueta/SKILL.md
// Skill: tray-emissores-etiqueta
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const emissores_etiqueta_create_definition = {
  name: "tray_emissores_etiqueta_create",
  description: 'Cadastrar URL da etiqueta (POST /label-emitters)',
  inputSchema: z.object({
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function emissores_etiqueta_create_execute(
  input: z.infer<typeof emissores_etiqueta_create_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/label-emitters`;
    const body = { "LabelEmitter": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const emissores_etiqueta_create_label_emitters_definition = {
  name: "tray_emissores_etiqueta_create_label_emitters",
  description: 'Vincular URL da etiqueta ao pedido (POST /label-emitters/:order_id)',
  inputSchema: z.object({
    order_id: z.union([z.string(), z.number()]).describe('Path parameter order_id'),
    body: z.record(z.unknown()).describe('Resource fields. Will be wrapped automatically with the appropriate top-level key.'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function emissores_etiqueta_create_label_emitters_execute(
  input: z.infer<typeof emissores_etiqueta_create_label_emitters_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/label-emitters/${encodeURIComponent(String(input.order_id))}`;
    const body = { "LabelEmitter": input.body } as Record<string, unknown>;
    return ctx.client.request<unknown>('POST', path, { body, accessToken: input.access_token });
}

export const emissores_etiqueta_delete_definition = {
  name: "tray_emissores_etiqueta_delete",
  description: 'Excluir URL da etiqueta (DELETE /label-emitters/:id)',
  inputSchema: z.object({
    id: z.union([z.string(), z.number()]).describe('Path parameter id'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function emissores_etiqueta_delete_execute(
  input: z.infer<typeof emissores_etiqueta_delete_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/label-emitters/${encodeURIComponent(String(input.id))}`;
    return ctx.client.request<unknown>('DELETE', path, { accessToken: input.access_token });
}

export const tools = [
  { definition: emissores_etiqueta_create_definition, execute: emissores_etiqueta_create_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: emissores_etiqueta_create_label_emitters_definition, execute: emissores_etiqueta_create_label_emitters_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
  { definition: emissores_etiqueta_delete_definition, execute: emissores_etiqueta_delete_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
