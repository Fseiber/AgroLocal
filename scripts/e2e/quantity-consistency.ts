import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireIsolatedE2EConfig } from "./safety";
import { toKg } from "../../src/lib/domain";
import { quantityCases } from "../../src/test/quantity-cases";

// Does not apply migrations. An operator must prepare and confirm the isolated backend first.
const config = requireIsolatedE2EConfig();
const admin = createClient(config.url, config.serviceRoleKey, { auth: { persistSession: false } });
const users: string[] = [];
const companies: string[] = [];
let assertions = 0;

function check(name: string, condition: boolean): void {
  if (!condition) throw new Error("FAIL: " + name);
  assertions++;
  console.log("PASS: " + name);
}

async function must<T>(
  request: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const result = await request;
  if (result.error || result.data === null || result.data === undefined) {
    // Never echo requests, connection strings, credentials or auth sessions.
    throw new Error("La operación de prueba no devolvió el resultado esperado");
  }
  return result.data;
}

function freshCuit(): string {
  for (;;) {
    const base =
      "30" + String(crypto.getRandomValues(new Uint32Array(1))[0]! % 100000000).padStart(8, "0");
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let digit =
      11 - (weights.reduce((sum, weight, index) => sum + weight * Number(base[index]), 0) % 11);
    if (digit === 11) digit = 0;
    if (digit !== 10) return base + digit;
  }
}

async function makeParty(tag: string) {
  const email = "quantity-" + tag + "-" + crypto.randomUUID() + "@example.com";
  const password = crypto.randomUUID() + "!aA9";
  const createdResponse = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createdResponse.error || !createdResponse.data.user)
    throw new Error("No se pudo crear el usuario de prueba");
  const created = createdResponse.data;
  users.push(created.user.id);
  const company = (await must(
    admin
      .from("companies")
      .insert({
        name: "Prueba cantidades " + tag,
        cuit: freshCuit(),
        province: "Corrientes",
        locality: "Prueba",
        activity_type: "Productor",
        verification_status: "verified",
      })
      .select("id")
      .single(),
  )) as { id: string };
  companies.push(company.id);
  await must(
    admin
      .from("company_members")
      .insert({
        company_id: company.id,
        user_id: created.user.id,
        role: "operator",
      })
      .select("id")
      .single(),
  );
  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw new Error("No se pudo iniciar la sesión de prueba");
  return { client, company: company.id, user: created.user.id };
}

type Party = Awaited<ReturnType<typeof makeParty>>;

function listing(party: Party, extra: Record<string, unknown> = {}) {
  return {
    company_id: party.company,
    created_by: party.user,
    product_type: "elaborado",
    commercial_type: "Largo fino",
    province: "Corrientes",
    locality: "Prueba",
    original_unit: "t",
    original_quantity: 100,
    quantity_kg: 100000,
    ...extra,
  };
}

async function rejected(
  name: string,
  request: PromiseLike<{ error: { code?: string } | null }>,
): Promise<void> {
  const result = await request;
  check(name, result.error !== null && ["23514", "P0001"].includes(result.error.code ?? ""));
}

async function action(
  client: SupabaseClient,
  id: string,
  name: string,
  data: Record<string, unknown> = {},
) {
  return (await must(client.rpc("operation_action", { _id: id, _action: name, _data: data }))) as {
    reserved_kg: number;
    delivered_kg: number;
    released_kg: number;
  };
}

try {
  // Stop BEFORE fixture creation if 0011 has not been installed independently.
  check(
    "0011 disponible",
    (await must(admin.rpc("agrolocal_quantity_finite", { _value: 1 }))) === true,
  );
  for (const c of quantityCases) {
    const raw = await admin.rpc("agrolocal_quantity_expected_kg", {
      _unit: c.unit,
      _quantity: c.quantity,
      _weight: c.weight,
    });
    check("SQL sin error: " + c.name, !raw.error);
    const sqlKg = raw.data as number | null;
    let tsKg: number | null = null;
    try {
      tsKg = toKg(c.quantity, c.unit, c.weight);
    } catch {
      /* invalid by contract */
    }
    check(
      "SQL/TypeScript: " + c.name,
      c.expected === null
        ? tsKg === null && (sqlKg === null || sqlKg <= 0)
        : sqlKg === c.expected && tsKg === sqlKg,
    );
  }

  for (const special of ["NaN", "Infinity", "-Infinity"]) {
    check(
      "SQL finitud " + special,
      (await must(admin.rpc("agrolocal_quantity_finite", { _value: special }))) === false,
    );
  }
  const seller = await makeParty("seller");
  const buyer = await makeParty("buyer");

  for (const c of quantityCases.filter((c) => c.expected !== null)) {
    await must(
      seller.client
        .from("listings")
        .insert(
          listing(seller, {
            original_unit: c.unit,
            original_quantity: c.quantity,
            unit_weight_kg: c.weight,
            quantity_kg: c.expected,
            unit_count: ["bolsa", "big_bag"].includes(c.unit) ? c.quantity : null,
          }),
        )
        .select("id")
        .single(),
    );
    check("INSERT válido: " + c.name, true);
  }
  // unit_count counts packages, including when the original quantity uses mass units.
  const packaged = (await must(
    seller.client
      .from("listings")
      .insert(
        listing(seller, {
          original_quantity: 2.5,
          quantity_kg: 2500,
          unit_count: 100,
          unit_weight_kg: 25,
        }),
      )
      .select("id,original_quantity,unit_count")
      .single(),
  )) as { id: string; original_quantity: number; unit_count: number };
  check(
    "2,5 toneladas y 100 envases no se confunden",
    packaged.original_quantity === 2.5 && packaged.unit_count === 100,
  );

  await must(
    seller.client
      .from("listings")
      .insert(
        listing(seller, {
          original_unit: "bolsa",
          original_quantity: 100,
          unit_weight_kg: 25,
          quantity_kg: 2500,
          unit_count: null,
          min_sale_kg: 2500,
        }),
      )
      .select("id")
      .single(),
  );
  check("conteo opcional y mínimo igual al total conservados", true);
  const invalid = [
    { original_unit: "bolsas" },
    { original_unit: "bolsa", original_quantity: 100, unit_weight_kg: 25, quantity_kg: 10000 },
    { original_unit: "bolsa", original_quantity: 100, unit_weight_kg: null, quantity_kg: 2500 },
    {
      original_unit: "bolsa",
      original_quantity: 100,
      unit_weight_kg: 25,
      unit_count: 99,
      quantity_kg: 2500,
    },
    { original_quantity: 2.5, unit_count: 2.5, unit_weight_kg: 25, quantity_kg: 2500 },
    { unit_count: 0 },
    { unit_count: "NaN" },
    { min_sale_kg: 0 },
    { min_sale_kg: -1 },
    { min_sale_kg: "NaN" },
    { original_quantity: 0 },
    { original_quantity: -1 },
    { quantity_kg: "NaN" },
    { unit_weight_kg: "Infinity" },
    { min_sale_kg: 100001 },
    { original_unit: "kg", original_quantity: 0.0004, quantity_kg: 0.0004 },
  ];
  for (const [index, extra] of invalid.entries()) {
    await rejected(
      "INSERT contradictorio " + index,
      seller.client.from("listings").insert(listing(seller, extra)),
    );
  }
  await rejected(
    "UPDATE kg sin corregir unidades",
    seller.client.from("listings").update({ quantity_kg: 2600 }).eq("id", packaged.id),
  );
  await must(
    seller.client
      .from("listings")
      .update({ description: "Actualizaci?n inocua" })
      .eq("id", packaged.id)
      .select("id")
      .single(),
  );
  check("edición sin alterar cantidades", true);

  const demand = {
    company_id: buyer.company,
    created_by: buyer.user,
    product_type: "elaborado",
    commercial_type: "Largo fino",
    province: "Corrientes",
    locality: "Prueba",
    original_unit: "bolsa",
    original_quantity: 100,
    unit_weight_kg: 25,
    quantity_kg: 2500,
  };
  await must(
    buyer.client
      .from("demands")
      .insert({ ...demand, min_quantity_kg: 2500 })
      .select("id")
      .single(),
  );
  check("demanda con mínimo igual al total", true);
  await rejected(
    "demanda con mínimo superior",
    buyer.client.from("demands").insert({ ...demand, min_quantity_kg: 2501 }),
  );

  const stock = (await must(
    seller.client.from("listings").insert(listing(seller)).select("id").single(),
  )) as { id: string };
  const quote = (await must(
    buyer.client.rpc("request_quote", {
      _company: buyer.company,
      _listing: stock.id,
      _demand: null,
      _kg: 35000,
    }),
  )) as { id: string };
  const terms = {
    quantity_kg: 35000,
    price: 200,
    price_unit: "kg",
    currency: "ARS",
    unit_weight_kg: null,
    quality_terms: "Prueba",
    delivery_terms: "Retiro",
    modality: "direct",
    estimated_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  };
  await rejected(
    "RPC acuerdo no finito",
    seller.client.rpc("propose_operation", {
      _opportunity: quote.id,
      _listing: stock.id,
      _terms: { ...terms, quantity_kg: "NaN" },
    }),
  );
  const operation = (await must(
    seller.client.rpc("propose_operation", {
      _opportunity: quote.id,
      _listing: stock.id,
      _terms: terms,
    }),
  )) as string;
  const reserved = await action(buyer.client, operation, "confirm", { version: 1 });
  check("reserva de 35 t", reserved.reserved_kg === 35000);
  const deliveryId = crypto.randomUUID();
  await action(seller.client, operation, "register_delivery", {
    delivery_id: deliveryId,
    quantity_kg: 30000,
  });
  await action(buyer.client, operation, "accept_delivery", { delivery_id: deliveryId });
  const accepted = await action(buyer.client, operation, "accept_delivery", {
    delivery_id: deliveryId,
  });
  check(
    "recepción idempotente: 30 t vendidas y 5 t reservadas",
    accepted.delivered_kg === 30000 && accepted.reserved_kg === 5000,
  );
  await action(seller.client, operation, "release_remaining", { note: "Prueba cantidades" });
  const release = (await must(
    seller.client
      .from("operation_events")
      .select("id")
      .eq("operation_id", operation)
      .eq("event", "release_remaining")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  )) as { id: string };
  await action(buyer.client, operation, "approve_release", { request_id: release.id });
  const final = (await must(
    seller.client
      .from("listings")
      .select("quantity_kg,reserved_kg,sold_kg")
      .eq("id", stock.id)
      .single(),
  )) as {
    quantity_kg: number;
    reserved_kg: number;
    sold_kg: number;
  };
  check(
    "stock final sin reconversión",
    final.quantity_kg === 100000 && final.reserved_kg === 0 && final.sold_kg === 30000,
  );

  // Historical mass precision is preserved for already-kg records.
  await must(
    admin
      .from("operation_versions")
      .insert({
        operation_id: operation,
        version: 99,
        seller_by: seller.user,
        terms: { ...terms, quantity_kg: "0.00001" },
      })
      .select("id")
      .single(),
  );
  check("precisión hist?rica en kg conservada", true);
  await rejected(
    "versión con cantidad no numérica",
    admin.from("operation_versions").insert({
      operation_id: operation,
      version: 100,
      seller_by: seller.user,
      terms: { ...terms, quantity_kg: "invalid" },
    }),
  );
  await rejected(
    "entrega directa no finita",
    admin.from("operation_deliveries").insert({
      id: crypto.randomUUID(),
      operation_id: operation,
      registered_by: seller.user,
      quantity_kg: "Infinity",
    }),
  );
  console.log("PASS: " + assertions + " verificaciones");
} catch {
  process.exitCode = 1;
  console.error(
    "FAIL: regresión de cantidades. No se imprimen credenciales ni respuestas de autenticación.",
  );
} finally {
  // Only IDs created by this run. Check cleanup and try users even after company cleanup failure.
  if (companies.length) {
    const cleanup = await admin.from("companies").delete().in("id", companies);
    if (cleanup.error) {
      process.exitCode = 1;
      console.error("FAIL: limpieza de empresas de prueba");
    }
  }
  for (const id of users) {
    const cleanup = await admin.auth.admin.deleteUser(id);
    if (cleanup.error) {
      process.exitCode = 1;
      console.error("FAIL: limpieza de usuario de prueba");
    }
  }
}
