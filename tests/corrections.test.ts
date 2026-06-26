import { describe, expect, it } from "vitest";

import { allTools } from "../src/tools/index.js";
import {
  applyCorrections,
  correctedTools,
  removedToolNames,
} from "../src/tools/corrections.js";

const base = allTools as readonly { definition: { name: string } }[];
const effective = applyCorrections(base);
const names = new Set(effective.map((t: any) => t.definition.name));

describe("route corrections", () => {
  it("drops every removed (non-existent) route", () => {
    for (const removed of removedToolNames) {
      expect(names.has(removed)).toBe(false);
    }
  });

  it("keeps each corrected tool exactly once", () => {
    for (const corrected of correctedTools) {
      const n = corrected.definition.name;
      const count = effective.filter((t: any) => t.definition.name === n).length;
      expect(count, n).toBe(1);
    }
  });

  it("uses the validated paths/wrappers", async () => {
    const byName = new Map(effective.map((t: any) => [t.definition.name, t]));

    const cases: Array<[string, any, string, string]> = [
      ["tray_pedidos_get_full", { id: 1 }, "GET", "/orders/1/complete"],
      ["tray_pedidos_create_products", { id: 5, body: {} }, "POST", "/orders/includeProduct/5"],
      ["tray_pedidos_delete", { id: 5, product_id: 4 }, "PUT", "/orders/excludeProduct/5/4"],
      ["tray_pagamentos_list_settings", { id: 1 }, "GET", "/payments/methods/settings/1"],
      ["tray_enderecos_cliente_get", { id: 3 }, "GET", "/customers/addresses/3"],
      ["tray_notas_fiscais_update", { order_id: 1, invoice_id: 73, body: {} }, "PUT", "/orders/1/invoices/73"],
      ["tray_variacoes_get", { id: 3705 }, "GET", "/products/variants/3705"],
      ["tray_kits_get", { id: 9 }, "GET", "/products/kits"],
      ["tray_imagens_produtos_create_images", { id: 4, body: {} }, "POST", "/products/4/images"],
      ["tray_imagens_produtos_create_images_images", { product_id: 4, variant_id: 3705, body: {} }, "POST", "/products/4/images"],
    ];

    for (const [name, input, method, path] of cases) {
      let seen: [string, string] | undefined;
      const fakeClient = {
        request: async (m: string, p: string) => {
          seen = [m, p];
          return {};
        },
      } as any;
      await byName.get(name)!.execute(input, { client: fakeClient });
      expect(seen, name).toEqual([method, path]);
    }
  });
});
