import { roundQuantityProduct } from "./decimal-quantity";

// Pure business rules for AgroLocal (no I/O). Covered by src/test/domain.test.ts.

export const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
  "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
  "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
] as const;

export const ACTIVITY_TYPES = [
  "Productor", "Molino arrocero", "Distribuidor", "Mayorista", "Comercializador",
  "Comprador empresarial", "Otro",
] as const;

export const COMMERCIAL_TYPES = ["Largo fino", "Largo ancho", "Mediano", "Corto", "Otro"] as const;
export const ELABORADO_SUBGROUPS = ["pulido", "integral", "parboilizado", "otro"] as const;
export const PRESENTATIONS = [
  { value: "granel", label: "A granel" },
  { value: "bolsas", label: "Bolsas" },
  { value: "big_bags", label: "Big bags" },
  { value: "otro", label: "Otro envase" },
] as const;

export type UnitCode = "kg" | "qq" | "t" | "bolsa" | "big_bag";
export const UNITS: { code: UnitCode; label: string; factor: number | null }[] = [
  { code: "kg", label: "Kilogramos", factor: 1 },
  { code: "qq", label: "Quintales (100 kg)", factor: 100 },
  { code: "t", label: "Toneladas", factor: 1000 },
  { code: "bolsa", label: "Bolsas", factor: null },
  { code: "big_bag", label: "Big bags", factor: null },
];

export const unitNeedsWeight = (u: UnitCode) => u === "bolsa" || u === "big_bag";

/** Converts a quantity to kilograms. Bags/big bags require the weight per unit — never assumed. */
export function toKg(quantity: number, unit: UnitCode, weightPerUnitKg?: number | null): number {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("La cantidad debe ser mayor a cero");
  if (unitNeedsWeight(unit)) {
    if (!weightPerUnitKg || !Number.isFinite(weightPerUnitKg) || weightPerUnitKg <= 0) {
      throw new Error("Indicá el peso de cada bolsa o big bag para calcular el total");
    }
    return roundQuantityProduct(quantity, weightPerUnitKg);
  }
  const u = UNITS.find((x) => x.code === unit);
  if (!u || u.factor == null) throw new Error("Unidad desconocida");
  return roundQuantityProduct(quantity, u.factor);
}

export interface StockLike {
  quantity_kg: number;
  reserved_kg: number;
  sold_kg: number;
}
export const availableKg = (l: StockLike) => Math.max(0, l.quantity_kg - l.reserved_kg - l.sold_kg);

export function formatKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 })} t`;
  return `${kg.toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg`;
}

/** Validates an Argentine CUIT (11 digits + check digit). Accepts dashes/spaces. */
export function normalizeCuit(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}
export function isValidCuit(raw: string): boolean {
  const c = normalizeCuit(raw);
  if (!/^\d{11}$/.test(c)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(c[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) return false;
  return check === Number(c[10]);
}

export const VERIFICATION_LABELS: Record<string, string> = {
  started: "Registro iniciado",
  pending: "Pendiente de revisión",
  info_requested: "Información adicional solicitada",
  verified: "Empresa verificada",
  rejected: "Rechazada",
  suspended: "Suspendida",
};
export const QUALITY_LABELS: Record<string, string> = {
  declared: "Calidad declarada",
  documented: "Respaldada con documento",
  not_informed: "Calidad no informada",
};
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operator: "Operador comercial",
  viewer: "Solo consulta",
};
export const PRODUCT_LABELS: Record<string, string> = {
  cascara: "Arroz con cáscara",
  elaborado: "Arroz elaborado",
};

export function formatPrice(price: number | null, currency: string, unit: string) {
  if (price == null) return "A convenir";
  return `${currency === "USD" ? "US$" : "$"} ${price.toLocaleString("es-AR")} / ${unit}`;
}
