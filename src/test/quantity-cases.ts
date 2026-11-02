// Shared decimal fixtures for offline tests and the opt-in PostgreSQL differential suite.
export const quantityCases = [
  { name: "kg", quantity: 125, unit: "kg", weight: null, expected: 125 },
  { name: "quintales", quantity: 3, unit: "qq", weight: null, expected: 300 },
  { name: "toneladas", quantity: 2.5, unit: "t", weight: null, expected: 2500 },
  { name: "bolsas", quantity: 100, unit: "bolsa", weight: 25, expected: 2500 },
  { name: "big bags", quantity: 3, unit: "big_bag", weight: 1000, expected: 3000 },
  {
    name: "envase fraccionario heredado",
    quantity: 0.5,
    unit: "bolsa",
    weight: 25,
    expected: 12.5,
  },
  { name: "empate positivo", quantity: 0.0005, unit: "kg", weight: null, expected: 0.001 },
  { name: "debajo de empate", quantity: 0.000499999, unit: "kg", weight: null, expected: null },
  { name: "gramos", quantity: 0.000001, unit: "t", weight: null, expected: 0.001 },
  { name: "decimales de envase", quantity: 3, unit: "bolsa", weight: 0.3335, expected: 1.001 },
  { name: "decimal binario", quantity: 1.0055, unit: "kg", weight: null, expected: 1.006 },
  { name: "producto decimal", quantity: 0.1, unit: "bolsa", weight: 0.035, expected: 0.004 },
  { name: "notación cientifica", quantity: 1e-7, unit: "big_bag", weight: 1e4, expected: 0.001 },
] as const;
