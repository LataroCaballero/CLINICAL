import { describe, expect, it } from "vitest";
import {
  MOTIVO_SIN_OPTIN,
  MOTIVO_SIN_TELEFONO,
  formatTelefono,
  getMotivoBloqueoWhatsApp,
  tieneTelefono,
} from "@/lib/telefono";

describe("lib/telefono (SSOT Phase 69)", () => {
  describe("tieneTelefono", () => {
    it("es false para null", () => {
      expect(tieneTelefono(null)).toBe(false);
    });

    it("es false para undefined", () => {
      expect(tieneTelefono(undefined)).toBe(false);
    });

    it("es false para string vacío", () => {
      expect(tieneTelefono("")).toBe(false);
    });

    it("es false para string sólo espacios (falsy-tras-trim, Phase 67 D-03)", () => {
      expect(tieneTelefono("   ")).toBe(false);
    });

    it("es true para un número real", () => {
      expect(tieneTelefono("1122334455")).toBe(true);
    });
  });

  describe("formatTelefono", () => {
    it("sin teléfono devuelve el guion simple U+002D (Phase 69 D-01, no em dash)", () => {
      const placeholder = formatTelefono(null);
      expect(placeholder).toBe("-");
      expect(placeholder.charCodeAt(0)).toBe(45);
    });

    it("con teléfono devuelve el número", () => {
      expect(formatTelefono("1122334455")).toBe("1122334455");
    });
  });

  describe("getMotivoBloqueoWhatsApp (precedencia D-14/D-15)", () => {
    it("sin teléfono y sin opt-in -> MOTIVO_SIN_TELEFONO", () => {
      expect(getMotivoBloqueoWhatsApp(null, false)).toBe(MOTIVO_SIN_TELEFONO);
    });

    it("sin teléfono y CON opt-in -> igual MOTIVO_SIN_TELEFONO (teléfono tiene precedencia)", () => {
      expect(getMotivoBloqueoWhatsApp(null, true)).toBe(MOTIVO_SIN_TELEFONO);
    });

    it("con teléfono y sin opt-in -> MOTIVO_SIN_OPTIN", () => {
      expect(getMotivoBloqueoWhatsApp("1122334455", false)).toBe(
        MOTIVO_SIN_OPTIN,
      );
    });

    it("con teléfono y con opt-in -> null (habilitado)", () => {
      expect(getMotivoBloqueoWhatsApp("1122334455", true)).toBeNull();
    });
  });
});
