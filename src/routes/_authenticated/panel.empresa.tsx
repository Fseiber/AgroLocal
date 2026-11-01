import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelShell } from "@/components/panel-shell";
import { selectCls } from "@/components/company-form";
import { Field } from "@/routes/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Membership } from "@/hooks/use-session";
import { ACTIVITY_TYPES, PROVINCES, VERIFICATION_LABELS } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/panel/empresa")({
  head: () => ({ meta: [{ title: "Mi empresa — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Datos y verificación de tu empresa." }, { property: "og:title", content: "Mi empresa — AgroLocal" }, { property: "og:description", content: "Datos y verificación de tu empresa." }] }),
  component: () => <PanelShell title="Mi empresa">{({ membership }) => <Company m={membership!} />}</PanelShell>,
});

function Company({ m }: { m: Membership }) {
  const qc = useQueryClient();
  const c = m.company;
  const isAdmin = m.role === "admin";
  const [f, setF] = useState({ name: c.name, province: c.province, locality: c.locality, activity_type: c.activity_type, contact_phone: c.contact_phone, contact_email: c.contact_email });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const events = useQuery({
    queryKey: ["ver-events", c.id],
    queryFn: async () => (await supabase.from("verification_events").select("*").eq("company_id", c.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function save() {
    const { error } = await supabase.from("companies").update(f).eq("id", c.id);
    if (error) toast.error(errorMessage(error)); else { toast.success("Datos guardados"); qc.invalidateQueries({ queryKey: ["me"] }); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Estado de verificación</p>
        <p className="text-xl font-bold">{VERIFICATION_LABELS[c.verification_status]}</p>
        {c.verification_note && <p className="mt-1 text-sm">Observación: {c.verification_note}</p>}
        <p className="mt-1 text-sm text-muted-foreground">CUIT {c.cuit} · Tu rol: {m.role}</p>
      </div>
      <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <Field label="Razón social"><Input className="h-12" disabled={!isAdmin} value={f.name} onChange={up("name")} /></Field>
        <Field label="Actividad"><select className={selectCls} disabled={!isAdmin} value={f.activity_type} onChange={up("activity_type")}>{ACTIVITY_TYPES.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Provincia"><select className={selectCls} disabled={!isAdmin} value={f.province} onChange={up("province")}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Localidad"><Input className="h-12" disabled={!isAdmin} value={f.locality} onChange={up("locality")} /></Field>
        <Field label="Teléfono comercial"><Input className="h-12" disabled={!isAdmin} value={f.contact_phone} onChange={up("contact_phone")} /></Field>
        <Field label="Email comercial"><Input className="h-12" disabled={!isAdmin} value={f.contact_email} onChange={up("contact_email")} /></Field>
        {isAdmin && <Button size="lg" className="sm:col-span-2" onClick={save}>Guardar cambios</Button>}
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-bold">Historial de verificación</h2>
        <ul className="mt-2 divide-y text-sm">
          {(events.data ?? []).map((e) => <li key={e.id} className="py-2"><b>{VERIFICATION_LABELS[e.to_status]}</b> · {new Date(e.created_at).toLocaleString("es-AR")}{e.note && ` — ${e.note}`}</li>)}
        </ul>
      </div>
    </div>
  );
}
