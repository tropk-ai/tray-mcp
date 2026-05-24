// AUTO-GENERATED from tray-api-ai-plugin SKILL.md — do not edit manually
// Source: skills/visao-geral/SKILL.md
// Skill: tray-visao-geral
//
// Regenerate with: pnpm gen-tools

import { z } from 'zod';
import type { TrayClient } from '../tray/client.js';

export const tools: Array<{
  definition: { name: string; description: string; inputSchema: z.ZodTypeAny };
  execute: (input: any, ctx: { client: TrayClient }) => Promise<unknown>;
}> = [];
