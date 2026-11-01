import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireIsolatedE2EConfig } from "./safety";

const config = requireIsolatedE2EConfig();
const URL = config.url;
const ANON = config.publishableKey;
const SERVICE = config.serviceRoleKey;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const RUN = Date.now().toString(36);
const results: { area: string; test: string; ok: boolean | "blocked"; detail: string }[] = [];
const rec = (area: string, test: string, ok: boolean | "blocked", detail = "") => { results.push({ area, test, ok, detail }); };
const created: { users: string[]; companies: string[] } = { users: [], companies: [] };

// Valid CUITs (check digit computed)
function cuit(base10: string) {
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = w.reduce((a, x, i) => a + x * Number(base10[i]), 0);
  let c = 11 - (s % 11); if (c === 11) c = 0; if (c === 10) return null;
  return base10 + c;
}
function freshCuit(seed: number) {
  for (let i = 0; i < 50; i++) { const c = cuit("30" + String(70000000 + ((seed * 7919 + i + Date.now()) % 29999999)).padStart(8, "0")); if (c) return c; }
  throw new Error("cuit");
}

async function user(tag: string) {
  const email = `agrolocal.e2e.${tag}.${RUN}@example.com`;
  const password = "Test-" + RUN + "-x9!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Prueba " + tag, phone: "+5493790000000" } });
  if (error) throw error;
  created.users.push(data.user.id);
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { c, id: data.user.id, email };
}
const msg = (e: any) => (e ? e.message : "");

async function main() {
  // --- 1/2 signup + email confirmation required
  const pending = `agrolocal.e2e.unconfirmed.${RUN}@example.com`;
  const su = await anon.auth.signUp({ email: pending, password: "Test-" + RUN + "-x9!" });
  if (su.data.user) created.users.push(su.data.user.id);
  rec("Auth", "Registro con email y contraseña", !su.error && !!su.data.user && !su.data.session, su.error ? msg(su.error) : "sin sesión hasta confirmar");
  const si = await anon.auth.signInWithPassword({ email: pending, password: "Test-" + RUN + "-x9!" });
  rec("Auth", "No se puede ingresar sin confirmar el email", !!si.error, msg(si.error));

  const A = await user("a"), B = await user("b"), C = await user("c"), ADM = await user("admin"), A2 = await user("a2"), AV = await user("aview");
  await admin.from("user_roles").insert({ user_id: ADM.id, role: "admin" });

  // --- 3/4 company registration + CUIT
  const bad = await A.c.rpc("register_company", { _name: "Empresa Prueba A", _cuit: "30123456780", _province: "Corrientes", _locality: "Mercedes", _activity: "Productor", _intent: "sell", _phone: "+5493791111111", _email: "a@example.com" });
  rec("Empresas", "Rechazo de CUIT con dígito verificador incorrecto (servidor)", !!bad.error, msg(bad.error));
  const reg = async (u: any, name: string, seed: number, prov: string) => {
    const r = await u.c.rpc("register_company", { _name: name, _cuit: freshCuit(seed), _province: prov, _locality: "Local", _activity: "Productor", _intent: "both", _phone: "+54937900000" + seed, _email: `${seed}@example.com` });
    if (r.error) throw r.error; created.companies.push(r.data); return r.data as string;
  };
  const cA = await reg(A, "Prueba E2E A " + RUN, 1, "Corrientes");
  const cB = await reg(B, "Prueba E2E B " + RUN, 2, "Corrientes");
  const cC = await reg(C, "Prueba E2E C " + RUN, 3, "Chaco");
  rec("Empresas", "Registro de empresa con CUIT válido", !!cA && !!cB && !!cC, "estado inicial: pendiente");

  // --- 5 pending restriction
  const lp = await A.c.from("listings").insert({ company_id: cA, created_by: A.id, product_type: "cascara", commercial_type: "Largo fino", original_unit: "t", original_quantity: 100, quantity_kg: 100000, province: "Corrientes", locality: "Mercedes" });
  rec("Verificación", "Empresa pendiente no puede publicar", !!lp.error, msg(lp.error));
  const selfV = await A.c.from("companies").update({ verification_status: "verified" }).eq("id", cA).select("verification_status").single();
  rec("Verificación", "La empresa no puede auto-verificarse", selfV.data?.verification_status === "pending", "estado tras intento: " + selfV.data?.verification_status);
  const selfR = await A.c.rpc("set_company_verification", { _company: cA, _status: "verified", _note: "yo" });
  rec("Verificación", "Usuario común no puede usar la función de verificación", !!selfR.error, msg(selfR.error));
  const selfRole = await A.c.from("user_roles").insert({ user_id: A.id, role: "admin" });
  rec("Seguridad", "Un usuario no puede darse rol de administrador", !!selfRole.error, msg(selfRole.error));

  // --- 6 admin approves
  for (const id of [cA, cB, cC]) {
    const r = await ADM.c.rpc("set_company_verification", { _company: id, _status: "verified", _note: "Prueba automatizada" });
    if (r.error) throw r.error;
  }
  const noNote = await ADM.c.rpc("set_company_verification", { _company: cA, _status: "verified", _note: "" });
  const vA = await A.c.from("companies").select("verification_status").eq("id", cA).single();
  rec("Verificación", "Administrador aprueba empresas (con observación obligatoria)", vA.data?.verification_status === "verified" && !!noNote.error, "sin observación: " + msg(noNote.error));

  // --- 7/8 multiple users + roles
  await A.c.from("company_invitations").insert([{ company_id: cA, email: A2.email, role: "operator", created_by: A.id }, { company_id: cA, email: AV.email, role: "viewer", created_by: A.id }]);
  const acc1 = await A2.c.rpc("accept_pending_invitations"); const acc2 = await AV.c.rpc("accept_pending_invitations");
  const mem = await A.c.from("company_members").select("role").eq("company_id", cA);
  rec("Empresas", "Varios usuarios en una misma empresa (invitaciones)", acc1.data === 1 && acc2.data === 1 && mem.data?.length === 3, `miembros: ${mem.data?.map((m) => m.role).join(", ")}`);
  const opInv = await A2.c.from("company_invitations").insert({ company_id: cA, email: "x@example.com", role: "admin", created_by: A2.id });
  rec("Permisos", "Un operador no puede invitar usuarios", !!opInv.error, msg(opInv.error));

  // --- 9/10/11/16 listings
  const bagsNoWeight = await A2.c.from("listings").insert({ company_id: cA, created_by: A2.id, product_type: "elaborado", commercial_type: "Largo fino", subgroup: "pulido", presentation: "bolsas", original_unit: "bolsa", original_quantity: 500, quantity_kg: 500, province: "Corrientes", locality: "Mercedes" });
  rec("Cantidades", "Bolsas sin peso por bolsa se rechazan (servidor)", !!bagsNoWeight.error, msg(bagsNoWeight.error));
  const L1 = await A2.c.from("listings").insert({ company_id: cA, created_by: A2.id, product_type: "cascara", commercial_type: "Largo fino", variety: "Gurí", original_unit: "t", original_quantity: 100, quantity_kg: 100000, min_sale_kg: 10000, province: "Corrientes", locality: "Mercedes", quality: { humedad: "14" }, quality_status: "documented" }).select("*").single();
  rec("Publicaciones", "Publicación de arroz con cáscara (operador)", !L1.error && L1.data.code?.startsWith("OF-") && L1.data.quality_status === "declared", L1.error ? msg(L1.error) : `${L1.data.code}; "certificada" forzada a declarada`);
  const L2 = await A.c.from("listings").insert({ company_id: cA, created_by: A.id, product_type: "elaborado", commercial_type: "Largo fino", subgroup: "pulido", presentation: "bolsas", original_unit: "bolsa", original_quantity: 2000, unit_weight_kg: 25, unit_count: 2000, quantity_kg: 50000, province: "Corrientes", locality: "Mercedes" }).select("*").single();
  rec("Publicaciones", "Publicación de arroz elaborado en bolsas", !L2.error, L2.error ? msg(L2.error) : L2.data.code!);
  const vw = await AV.c.from("listings").insert({ company_id: cA, created_by: AV.id, product_type: "cascara", commercial_type: "Largo fino", original_unit: "t", original_quantity: 1, quantity_kg: 1000, province: "Corrientes", locality: "X" });
  rec("Permisos", "Usuario de consulta no puede publicar", !!vw.error, msg(vw.error));
  const D1 = await B.c.from("demands").insert({ company_id: cB, created_by: B.id, product_type: "cascara", commercial_type: "Largo fino", original_unit: "t", original_quantity: 35, quantity_kg: 35000, province: "Corrientes", locality: "Goya", quality_requirements: "Humedad máx. 14%" }).select("*").single();
  rec("Publicaciones", "Publicación de demanda de compra", !D1.error, D1.error ? msg(D1.error) : D1.data.code!);

  // --- 12/13 persistence + public search
  const pub = await anon.from("listings").select("id,code").eq("status", "active").eq("product_type", "cascara").eq("province", "Corrientes");
  rec("Mercado", "Persistencia y búsqueda pública con filtros", !!pub.data?.some((r) => r.id === L1.data!.id), `${pub.data?.length} resultados`);
  const priv = await anon.from("companies").select("contact_phone").eq("id", cA);
  rec("Privacidad", "Visitantes no ven datos de contacto de empresas", (priv.data?.length ?? 0) === 0, "filas visibles: " + priv.data?.length);

  // --- 14 edit + pause by owners, not others
  const edit = await A2.c.from("listings").update({ description: "Editado", status: "paused" }).eq("id", L1.data!.id).select("status").single();
  const hostile = await C.c.from("listings").update({ status: "closed" }).eq("id", L1.data!.id).select("id");
  const anonPaused = await anon.from("listings").select("id").eq("id", L1.data!.id);
  rec("Publicaciones", "El dueño edita y pausa; otra empresa no puede modificar", edit.data?.status === "paused" && (hostile.data?.length ?? 0) === 0 && anonPaused.data?.length === 0, "pausada deja de ser pública");
  await A2.c.from("listings").update({ status: "active" }).eq("id", L1.data!.id);
  const tamper = await A.c.from("listings").update({ sold_kg: 0, reserved_kg: 999999 }).eq("id", L1.data!.id).select("reserved_kg").single();
  rec("Stock", "No se puede alterar reservado/vendido directamente", tamper.data?.reserved_kg === 0, "reservado tras intento: " + tamper.data?.reserved_kg);

  // --- 15 private docs
  const path = `${cA}/${L1.data!.id}/analisis-${RUN}.pdf`;
  const up = await A.c.storage.from("company-docs").upload(path, new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), { contentType: "application/pdf" });
  await A.c.from("listing_documents").insert({ listing_id: L1.data!.id, company_id: cA, kind: "analysis", bucket: "company-docs", path, file_name: "analisis.pdf", created_by: A.id });
  const ownDl = await A.c.storage.from("company-docs").download(path);
  const otherDl = await C.c.storage.from("company-docs").download(path);
  const anonDl = await anon.storage.from("company-docs").createSignedUrl(path, 60);
  const otherUp = await C.c.storage.from("company-docs").upload(`${cA}/x-${RUN}.pdf`, new Blob(["x"]), { contentType: "application/pdf" });
  rec("Documentos", "Documentación privada solo para la empresa dueña", !up.error && !ownDl.error && !!otherDl.error && !!anonDl.error && !!otherUp.error, `otra empresa: ${msg(otherDl.error) || "bloqueado"}`);
  const q1 = await anon.from("listings").select("quality_status").eq("id", L1.data!.id).single();
  rec("Documentos", "Adjuntar análisis marca calidad 'respaldada con documento'", q1.data?.quality_status === "documented");

  // --- 17/18 stock
  const over = await A.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "reserve", _kg: 150000 });
  rec("Stock", "Reserva mayor al stock se rechaza", !!over.error, msg(over.error));
  const [r1, r2] = await Promise.all([
    A.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "reserve", _kg: 60000 }),
    A2.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "reserve", _kg: 60000 }),
  ]);
  const after = await A.c.from("listings").select("reserved_kg,sold_kg,quantity_kg").eq("id", L1.data!.id).single();
  rec("Stock", "Dos reservas simultáneas no producen sobreventa", [r1, r2].filter((r) => !r.error).length === 1 && after.data?.reserved_kg === 60000, `reservado final ${after.data?.reserved_kg} kg`);
  const s1 = await A.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "sell", _kg: 35000 });
  const s2 = await A.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "release", _kg: 25000 });
  const s3 = await A.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "sell_direct", _kg: 40000 });
  const fin = await A.c.from("listings").select("reserved_kg,sold_kg,quantity_kg").eq("id", L1.data!.id).single();
  const avail = fin.data!.quantity_kg - fin.data!.reserved_kg - fin.data!.sold_kg;
  rec("Stock", "Ventas parciales 35 t + 40 t sobre 100 t dejan 25 t", !s1.error && !s2.error && !s3.error && avail === 25000, `disponible ${avail} kg`);
  const otherStock = await C.c.rpc("apply_stock_movement", { _listing: L1.data!.id, _kind: "reserve", _kg: 1000 });
  rec("Stock", "Otra empresa no puede mover stock ajeno", !!otherStock.error, msg(otherStock.error));

  // --- 19 demo separation
  const demoInsert = await A.c.from("listings").insert({ company_id: cA, created_by: A.id, is_demo: true, product_type: "cascara", commercial_type: "Largo fino", original_unit: "t", original_quantity: 1, quantity_kg: 1000, province: "Corrientes", locality: "X" });
  const demoQuote = await B.c.rpc("request_quote", { _company: cB, _listing: (await anon.from("listings").select("id").eq("is_demo", true).limit(1).single()).data!.id, _demand: null as any, _kg: 10000 });
  rec("Demo", "Usuarios no crean datos demo ni operan sobre ellos", !!demoInsert.error && !!demoQuote.error, msg(demoQuote.error));

  // ================= PHASE 2 =================
  // Fresh 100 t listing for the scenario
  const P = await A.c.from("listings").insert({ company_id: cA, created_by: A.id, product_type: "cascara", commercial_type: "Largo fino", variety: "Gurí", original_unit: "t", original_quantity: 100, quantity_kg: 100000, province: "Corrientes", locality: "Mercedes", partial_allowed: true }).select("*").single();
  const m1 = await B.c.rpc("match_pairs", { _listing: null as any, _demand: D1.data!.id });
  const hit = m1.data?.find((r: any) => r.listing_id === P.data!.id);
  rec("Matching", "La demanda de B (35 t) encuentra la oferta de A (100 t)", !!hit, hit ? `coincide: ${hit.matches.join("; ")} | pendiente: ${hit.pending.join("; ")}` : msg(m1.error));
  const m2 = await A.c.rpc("match_pairs", { _listing: P.data!.id, _demand: null as any });
  rec("Matching", "La oferta de A encuentra a B como comprador compatible", !!m2.data?.some((r: any) => r.demand_id === D1.data!.id));
  const D2 = await C.c.from("demands").insert({ company_id: cC, created_by: C.id, product_type: "cascara", commercial_type: "Largo fino", variety: "Puitá", original_unit: "t", original_quantity: 20, quantity_kg: 20000, province: "Chaco", locality: "R" }).select("id").single();
  const m3 = await A.c.rpc("match_pairs", { _listing: P.data!.id, _demand: D2.data!.id });
  rec("Matching", "Requisito excluyente (variedad distinta) descarta la coincidencia", (m3.data?.length ?? 1) === 0);
  const D3 = await C.c.from("demands").insert({ company_id: cC, created_by: C.id, product_type: "cascara", commercial_type: "Largo fino", original_unit: "t", original_quantity: 500, quantity_kg: 500000, min_quantity_kg: 300000, province: "Chaco", locality: "R" }).select("id").single();
  const m4 = await A.c.rpc("match_pairs", { _listing: P.data!.id, _demand: D3.data!.id });
  rec("Matching", "Cantidad mínima del comprador mayor al stock descarta la coincidencia", (m4.data?.length ?? 1) === 0);

  const q = await B.c.rpc("request_quote", { _company: cB, _listing: P.data!.id, _demand: null as any, _kg: 35000 });
  const qa = q.data as any;
  rec("Oportunidades", "B solicita cotización: se registra la oportunidad", !q.error && qa?.code?.startsWith("OP-") && qa.existing === false, q.error ? msg(q.error) : `${qa.code}, teléfono comercial de A devuelto`);
  const q2 = await B.c.rpc("request_quote", { _company: cB, _listing: P.data!.id, _demand: null as any, _kg: 35000 });
  rec("Oportunidades", "Repetir la solicitud no duplica la oportunidad", (q2.data as any)?.id === qa?.id && (q2.data as any)?.existing === true);
  const self = await A.c.rpc("request_quote", { _company: cA, _listing: P.data!.id, _demand: null as any, _kg: 1000 });
  rec("Oportunidades", "Una empresa no puede consultar su propia oferta", !!self.error, msg(self.error));
  const tooMuch = await B.c.rpc("request_quote", { _company: cB, _listing: L2.data!.id, _demand: null as any, _kg: 999999 });
  rec("Oportunidades", "No se puede consultar más que lo disponible", !!tooMuch.error, msg(tooMuch.error));
  const viewerQ = await AV.c.rpc("request_quote", { _company: cA, _listing: null as any, _demand: D1.data!.id, _kg: 1000 });
  rec("Permisos", "Usuario de consulta no puede iniciar negociaciones", !!viewerQ.error, msg(viewerQ.error));

  const seeA = await A.c.from("opportunities").select("id").eq("id", qa.id);
  const seeB = await B.c.from("opportunities").select("id").eq("id", qa.id);
  const seeC = await C.c.from("opportunities").select("id").eq("id", qa.id);
  const evC = await C.c.from("opportunity_events").select("id").eq("opportunity_id", qa.id);
  rec("Oportunidades", "A y B ven la oportunidad; C (ajena) no la ve", seeA.data?.length === 1 && seeB.data?.length === 1 && seeC.data?.length === 0 && evC.data?.length === 0);
  const cMod = await C.c.rpc("set_opportunity_status", { _id: qa.id, _status: "cancelled", _note: "ajeno" });
  const cParties = await C.c.rpc("opportunity_parties", { _id: qa.id });
  rec("Oportunidades", "C no puede modificar ni ver los datos de las partes", !!cMod.error && !!cParties.error, msg(cMod.error));

  const n1 = await A.c.rpc("set_opportunity_status", { _id: qa.id, _status: "negotiating", _note: "Hablamos por WhatsApp" });
  const n2 = await B.c.rpc("set_opportunity_status", { _id: qa.id, _status: "agreement_declared" });
  const st = await A.c.from("opportunities").select("status,seller_declared_at,buyer_declared_at").eq("id", qa.id).single();
  rec("Oportunidades", "Cada parte declara solo su propio acuerdo", !n1.error && !n2.error && st.data?.status === "agreement_declared" && !!st.data.buyer_declared_at && !st.data.seller_declared_at, "comprador declaró, vendedor pendiente");
  const stockUnchanged = await anon.from("listings").select("reserved_kg,sold_kg").eq("id", P.data!.id).single();
  rec("Oportunidades", "Solicitar cotización o declarar acuerdo no descuenta stock", stockUnchanged.data?.sold_kg === 0 && stockUnchanged.data?.reserved_kg === 0);
  const ev = await B.c.from("opportunity_events").select("event").eq("opportunity_id", qa.id);
  rec("Oportunidades", "Historial de eventos de la oportunidad", (ev.data?.length ?? 0) === 3, ev.data?.map((e) => e.event).join(" → "));
  const directIns = await C.c.from("opportunities").insert({ listing_id: P.data!.id, seller_company_id: cA, buyer_company_id: cC, initiator_company_id: cC, requested_by: C.id, quantity_kg: 1 } as any);
  rec("Seguridad", "No se pueden crear oportunidades sin pasar por el servidor", !!directIns.error, msg(directIns.error));
}

async function cleanup() {
  if (created.companies.length) await admin.from("companies").delete().in("id", created.companies);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
}

main().catch((e) => rec("Script", "Error inesperado", false, msg(e) || String(e))).finally(async () => {
  await cleanup();
  for (const r of results) console.log(`${r.ok === true ? "PASS" : r.ok === "blocked" ? "BLOCKED" : "FAIL"} | ${r.area} | ${r.test} | ${r.detail}`);
  console.log(`TOTAL ${results.length}, FAIL ${results.filter((r) => r.ok === false).length}`);
  if (results.some((r) => r.ok === false)) process.exitCode = 1;
});
