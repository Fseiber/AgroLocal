import { describe, expect, it } from "vitest";
import { toKg, type UnitCode } from "@/lib/domain";
import { quantityCases } from "./quantity-cases";

describe("Conversión decimal de cantidades", () => {
  it.each(quantityCases)("$name", ({ quantity, unit, weight, expected }) => {
    if (expected === null) expect(() => toKg(quantity, unit, weight)).toThrow();
    else expect(toKg(quantity, unit, weight)).toBe(expected);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])("rechaza cantidad inválida %s", (quantity) => {
    expect(() => toKg(quantity, "kg")).toThrow();
  });

  it.each([undefined, null, 0, -25, NaN, Infinity, -Infinity])(
    "rechaza peso inválido %s",
    (weight) => {
      expect(() => toKg(100, "bolsa", weight)).toThrow();
      expect(() => toKg(1, "big_bag", weight)).toThrow();
    },
  );

  it("rechaza códigos de presentación usados como unidades", () => {
    for (const unit of ["bolsas", "big_bags", "granel", "otro", ""]) {
      expect(() => toKg(100, unit as UnitCode, 25)).toThrow("Unidad desconocida");
    }
  });

  it("no confunde cantidad en toneladas con cantidad de envases", () => {
    expect(toKg(2.5, "t")).toBe(2500);
    expect(toKg(100, "bolsa", 25)).toBe(2500);
  });

  it("no modifica el factor de toneladas por un peso de envase", () => {
    expect(toKg(2.5, "t", 25)).toBe(2500);
  });

  it("conserva decimales menores a un kg al consultar toneladas", () => {
    expect(toKg(0.0015, "t")).toBe(1.5);
  });

  it("rechaza un resultado cuyo decimal se pierde al serializarlo como number", () => {
    expect(() => toKg(9007199254740, "bolsa", 1.0000000000001)).toThrow("precisión");
  });

  it("rechaza desbordamiento y cantidades que redondean a cero", () => {
    expect(() => toKg(Number.MAX_VALUE, "t")).toThrow();
    expect(() => toKg(Number.MIN_VALUE, "kg")).toThrow();
  });
});
