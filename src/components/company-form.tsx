import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/routes/auth";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_TYPES, isValidCuit, normalizeCuit, PROVINCES } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá la razón social").max(160),
  cuit: z.string().refine(isValidCuit, "CUIT inválido: revisá los 11 números"),
  province: z.string().min(1, "Elegí la provincia"),
  locality: z.string().trim().min(2, "Ingresá la localidad").max(100),
  activity: z.string().min(1, "Elegí la actividad"),
  intent: z.enum(["sell", "buy", "both"]),
  phone: z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "Teléfono inválido"),
  email: z.string().trim().email("Email inválido"),
});

export const selectCls = "h-12 w-full rounded-lg border border-input bg-background px-3";

export function RegisterCompanyForm({ defaultEmail, defaultPhone }: { defaultEmail: string; defaultPhone: string }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ name: "", cuit: "", province: "", locality: "", activity: "", intent: "both", phone: defaultPhone, email: defaultEmail });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Revisá los datos"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("register_company", {
      _name: p.data.name, _cuit: normalizeCuit(p.data.cuit), _province: p.data.province, _locality: p.data.locality,
      _activity: p.data.activity, _intent: p.data.intent, _phone: p.data.phone, _email: p.data.email,
    });
    setLoading(false);
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Empresa registrada. Queda pendiente de revisión.");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-6 shadow-card sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-xl font-bold">Registrá tu empresa</h2>
        <p className="text-sm text-muted-foreground">Elegir vender o comprar no te impide hacer las dos cosas después.</p>
      </div>
      <Field label="Razón social"><Input className="h-12" value={f.name} onChange={up("name")} /></Field>
      <Field label="CUIT" hint="11 números, con o sin guiones"><Input className="h-12" inputMode="numeric" value={f.cuit} onChange={up("cuit")} /></Field>
      <Field label="Provincia"><select className={selectCls} value={f.province} onChange={up("province")}><option value="">Elegir...</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
      <Field label="Localidad"><Input className="h-12" value={f.locality} onChange={up("locality")} /></Field>
      <Field label="Actividad"><select className={selectCls} value={f.activity} onChange={up("activity")}><option value="">Elegir...</option>{ACTIVITY_TYPES.map((p) => <option key={p}>{p}</option>)}</select></Field>
      <Field label="Quiero..."><select className={selectCls} value={f.intent} onChange={up("intent")}><option value="sell">Vender</option><option value="buy">Comprar</option><option value="both">Vender y comprar</option></select></Field>
      <Field label="Teléfono comercial"><Input className="h-12" type="tel" value={f.phone} onChange={up("phone")} /></Field>
      <Field label="Email comercial"><Input className="h-12" type="email" value={f.email} onChange={up("email")} /></Field>
      <Button type="submit" size="xl" className="sm:col-span-2" disabled={loading}>{loading ? "Enviando..." : "Enviar a revisión"}</Button>
    </form>
  );
}
