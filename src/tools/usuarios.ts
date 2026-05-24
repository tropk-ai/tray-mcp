// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/usuarios/SKILL.md
// Skill: tray-usuarios
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const usuarios_list_definition = {
  name: "tray_usuarios_list",
  description: 'Listagem de usuários administrativos da loja (GET /users)',
  inputSchema: z.object({
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe('Optional query string parameters (filters, pagination, sort)'),
    access_token: z.string().optional().describe('Override the request access_token. Defaults to the configured Tray client token.')
  }),
} as const;

export async function usuarios_list_execute(
  input: z.infer<typeof usuarios_list_definition.inputSchema>,
  ctx: { client: TrayClient },
): Promise<unknown> {
    const path = `/users`;
    const query = input.query;
    return ctx.client.request<unknown>('GET', path, { query, accessToken: input.access_token });
}

export const tools = [
  { definition: usuarios_list_definition, execute: usuarios_list_execute as (input: any, ctx: { client: TrayClient }) => Promise<unknown> },
] as const;
