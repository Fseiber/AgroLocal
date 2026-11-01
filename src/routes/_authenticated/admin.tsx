import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PanelShell } from "@/components/panel-shell";
import { CommercialAdmin } from "@/components/commercial-admin";
import { selectCls } from "@/components/company-form";
import { supabase } from "@/integrations/supabase/client";
import { VERIFICATION_LABELS } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administración — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Revisión y verificación de empresas." }, { property: "og:title", content: "Administración — AgroLocal" }, { property: "og:description", content: "Revisión y verificación de empresas." }] }),
  component: () => (
    <PanelShell title="Administración AgroLocal" requireCompany={false}>
      {({ isPlatformAdmin }) => isPlatformAdmin ? <Admin /> : <p>No tenés acceso a esta sección.</p>}
    </PanelShell>
  ),
});

type Status = "started" | "pending" | "info_requested" | "verified" | "rejected" | "suspended";

function Admin() {
  const [filter, setFilter] = useState<string>("pending");
  const q = useQuery({
    queryKey: ["admin-companies", filter],
    queryFn: async () => {
      let qq = supabase.from("companies").select("*").eq("is_demo", false).order("created_at", { ascending: false });
      if (filter) qq = qq.eq("verification_status", filter as Status);
      const { data, error } = await qq;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-4">
      <select className={selectCls + " max-w-xs"} value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="">Todas</option>
        {Object.entries(VERIFICATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {(q.data ?? []).map((c) => <CompanyReview key={c.id} c={c} />)}
      {q.data?.length === 0 && <p className="text-muted-foreground">No hay empresas en este estado.</p>}
      <CommercialAdmin />
    </div>
  );
}

function CompanyReview({ c }: { c: any }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("verified");
  const [note, setNote] = useState("");
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{c.name}</h3>
          <p className="text-sm">CUIT {c.cuit} · {c.activity_type} · {c.locality}, {c.province}</p>
          <p className="text-sm text-muted-foreground">{c.contact_email} · {c.contact_phone}</p>
        </div>
        <span className="h-fit rounded-full bg-muted px-3 py-1 text-xs font-semibold">{VERIFICATION_LABELS[c.verification_status]}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[220px_1fr_auto]">
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          {Object.entries(VERIFICATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Textarea rows={1} placeholder="Observación (obligatoria)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="lg" className="h-12" onClick={async () => {
          const { error } = await supabase.rpc("set_company_verification", { _company: c.id, _status: status, _note: note });
          if (error) { toast.error(errorMessage(error)); return; }
          toast.success("Estado actualizado"); setNote(""); qc.invalidateQueries();
        }}>Guardar</Button>
      </div>
    </div>
  );
}
