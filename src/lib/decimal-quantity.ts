/**
 * Decimal multiplication with PostgreSQL numeric's positive half-up rounding.
 * Parse the same decimal strings JSON serializes, rather than a binary product.
 */
function decimal(value: number): { coefficient: bigint; scale: number } {
  const [mantissa = "", exponent = "0"] = String(value).toLowerCase().split("e");
  const [whole = "0", fraction = ""] = mantissa.split(".");
  return { coefficient: BigInt(whole + fraction), scale: fraction.length - Number(exponent) };
}

export function roundQuantityProduct(quantity: number, factor: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(factor) || factor <= 0) {
    throw new Error("La cantidad y el peso deben ser positivos y finitos");
  }
  const a = decimal(quantity);
  const b = decimal(factor);
  const coefficient = a.coefficient * b.coefficient;
  const scale = a.scale + b.scale;
  const divisor = scale > 3 ? 10n ** BigInt(scale - 3) : 1n;
  const grams =
    scale > 3 ? (coefficient + divisor / 2n) / divisor : coefficient * 10n ** BigInt(3 - scale);
  if (grams <= 0n) throw new Error("La cantidad mínima es 0,001 kg");
  const digits = grams.toString().padStart(4, "0");
  const result = Number(digits.slice(0, -3) + "." + digits.slice(-3));
  if (!Number.isFinite(result)) throw new Error("La cantidad excede la precisión admitida");
  const encoded = decimal(result);
  const encodedDivisor = encoded.scale > 3 ? 10n ** BigInt(encoded.scale - 3) : 1n;
  const encodedGrams =
    encoded.scale > 3
      ? encoded.coefficient / encodedDivisor
      : encoded.coefficient * 10n ** BigInt(3 - encoded.scale);
  if (
    encodedGrams !== grams ||
    (encoded.scale > 3 && encoded.coefficient % encodedDivisor !== 0n)
  ) {
    throw new Error("La cantidad excede la precisión admitida");
  }
  return result;
}
