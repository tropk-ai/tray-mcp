// Builds an MCP `Server` instance configured for a single (authenticated)
// merchant context. The context is captured per-request: each connection gets
// its own server bound to the TrayClient + storeId resolved by the auth
// middleware, so handlers can call Tray with the right credentials.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z, ZodError } from "zod";

import type { TrayClient } from "../tray/client.js";
import { allTools } from "../tools/index.js";

export interface McpServerContext {
  client: TrayClient;
  storeId: string;
}

type AnyZodObject = z.ZodTypeAny;

type ToolEntry = {
  definition: {
    name: string;
    description: string;
    inputSchema: AnyZodObject;
  };
  execute: (
    input: unknown,
    ctx: McpServerContext,
  ) => Promise<unknown>;
};

const TOOL_INDEX: Map<string, ToolEntry> = new Map(
  (allTools as readonly ToolEntry[]).map((tool) => [
    tool.definition.name,
    tool,
  ]),
);

function listToolDescriptors(): Array<{
  name: string;
  description: string;
  inputSchema: ReturnType<typeof zodToJsonSchema>;
}> {
  return (allTools as readonly ToolEntry[]).map((tool) => ({
    name: tool.definition.name,
    description: tool.definition.description,
    inputSchema: zodToJsonSchema(tool.definition.inputSchema, {
      $refStrategy: "none",
    }),
  }));
}

function toErrorMessage(err: unknown): string {
  if (err instanceof ZodError) {
    return `Invalid arguments: ${err.errors
      .map((e) => `${e.path.join(".") || "<root>"}: ${e.message}`)
      .join("; ")}`;
  }
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function createMcpServer(ctx: McpServerContext): Server {
  const server = new Server(
    { name: "tray-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listToolDescriptors(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const tool = TOOL_INDEX.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Unknown tool: ${name}`,
          },
        ],
      };
    }

    let parsed: unknown;
    try {
      parsed = tool.definition.inputSchema.parse(request.params.arguments ?? {});
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: toErrorMessage(err),
          },
        ],
      };
    }

    try {
      const result = await tool.execute(parsed, ctx);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: toErrorMessage(err),
          },
        ],
      };
    }
  });

  return server;
}

// Re-exported helpers for tests.
export const __test = { listToolDescriptors, TOOL_INDEX };
