import { describe, expect, it } from "vitest";
import { availableKg, isValidCuit, toKg } from "@/lib/domain";

describe("CUIT", () => {
  it("accepts a valid CUIT with dashes", () => {
    expect(isValidCuit("20-12345678-6")).toBe(true);
  });
  it("rejects a wrong check digit", () => {
    expect(isValidCuit("20-12345678-5")).toBe(false);
  });
  it("rejects wrong length", () => {
    expect(isValidCuit("2012345678")).toBe(false);
  });
});

describe("units", () => {
  it("converts tonnes and quintales to kg", () => {
    expect(toKg(120, "t")).toBe(120000);
    expect(toKg(3, "qq")).toBe(300);
  });
  it("refuses bags without weight per bag", () => {
    expect(() => toKg(500, "bolsa")).toThrow();
  });
  it("computes bags with weight", () => {
    expect(toKg(500, "bolsa", 25)).toBe(12500);
  });
});

describe("stock", () => {
  it("100 t minus sales of 35 t and 40 t leaves 25 t", () => {
    expect(availableKg({ quantity_kg: 100000, reserved_kg: 0, sold_kg: 75000 })).toBe(25000);
  });
  it("reserved quantity is not available", () => {
    expect(availableKg({ quantity_kg: 100000, reserved_kg: 30000, sold_kg: 35000 })).toBe(35000);
  });
});
