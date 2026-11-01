import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelShell } from "@/components/panel-shell";
import { AgreementForm } from "@/components/agreement-form";
import { waLink } from "@/components/quote-button";
import { supabase } from "@/integrations/supabase/client";
import type { Membership } from "@/hooks/use-session";
import { formatKg } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/panel/oportunidades")({
  head: () => ({ meta: [{ title: "Mis oportunidades — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Consultas recibidas y realizadas, con su estado de negociación." }, { property: "og:title", content: "Mis oportunidades — AgroLocal" }, { property: "og:description", content: "Consultas recibidas y realizadas, con su estado de negociación." }] }),
  component: () => <PanelShell title="Mis oportunidades">{({ membership }) => membership ? <Opps m={membership} /> : null}</PanelShell>,
});

export const OPP_STATUS: Record<string, string> = {
  contact_requested: "Contacto solicitado",
  negotiating: "En negociación",
  agreement_declared: "Acuerdo declarado",
  cancelled: "Cancelada",
};

type Opp = {
  id: string; code: string; listing_id: string | null; demand_id: string | null; seller_company_id: string; buyer_company_id: string;
  initiator_company_id: string; quantity_kg: number; status: string; seller_declared_at: string | null; buyer_declared_at: string | null;
  next_action: string | null; created_at: string;
};

function Opps({ m }: { m: Membership }) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const q = useQuery({
    queryKey: ["opportunities", m.company.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Opp[];
    },
  });
  const rows = (q.data ?? []).filter((o) => (tab === "sent" ? o.initiator_company_id === m.company.id : o.initiator_company_id !== m.company.id));
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl bg-muted p-1">
        {(["received", "sent"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-5 py-2.5 font-semibold ${tab === t ? "bg-card shadow-card" : "text-muted-foreground"}`}>
            {t === "received" ? "Consultas recibidas" : "Consultas realizadas"}
          </button>
        ))}
      </div>
      {q.isLoading && <p>Cargando...</p>}
      {!q.isLoading && rows.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No hay oportunidades en esta sección.</p>}
      {rows.map((o) => <OppCard key={o.id} o={o} m={m} />)}
    </div>
  );
}

function OppCard({ o, m }: { o: Opp; m: Membership }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const isSeller = o.seller_company_id === m.company.id;
  const canAct = m.role !== "viewer";
  const details = useQuery({
    queryKey: ["opp-details", o.id],
    queryFn: async () => {
      const [p, ev] = await Promise.all([
        supabase.rpc("opportunity_parties", { _id: o.id }),
        supabase.from("opportunity_events").select("*").eq("opportunity_id", o.id).order("created_at"),
      ]);
      return { parties: p.data?.[0], events: ev.data ?? [] };
    },
  });
  const counterpart = isSeller ? details.data?.parties?.buyer_name : details.data?.parties?.seller_name;
  const counterPhone = isSeller ? details.data?.parties?.buyer_phone : details.data?.parties?.seller_phone;
  const myDeclared = isSeller ? o.seller_declared_at : o.buyer_declared_at;
  const operation = useQuery({queryKey:["opportunity-operation",o.id],queryFn:async()=>{const {data,error}=await supabase.from("commercial_operations").select("id").eq("opportunity_id",o.id).maybeSingle();if(error)throw error;return data;}});

  async function change(status: "negotiating" | "agreement_declared" | "cancelled") {
    const { error } = await supabase.rpc("set_opportunity_status", { _id: o.id, _status: status, ...(note.trim() ? { _note: note.trim() } : {}) });
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Oportunidad actualizada"); setNote("");
    qc.invalidateQueries({ queryKey: ["opportunities"] }); qc.invalidateQueries({ queryKey: ["opp-details", o.id] });
  }

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{o.code} · {isSeller ? "Vendés" : "Comprás"}</p>
          <p className="text-lg font-bold">{counterpart ?? "…"}</p>
          <p className="text-sm">Cantidad consultada: <b>{formatKg(o.quantity_kg)}</b> · {new Date(o.created_at).toLocaleDateString("es-AR")}</p>
          {o.listing_id && <Link to="/mercado/oferta/$id" params={{ id: o.listing_id }} className="text-sm underline">Ver publicación</Link>}
          {!o.listing_id && o.demand_id && <Link to="/mercado/demanda/$id" params={{ id: o.demand_id }} className="text-sm underline">Ver demanda</Link>}
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{OPP_STATUS[o.status]}</span>
      </div>
      {o.next_action && o.status !== "cancelled" && <p className="mt-2 text-sm">Próxima acción: <b>{o.next_action}</b></p>}
      {o.status === "agreement_declared" && (
        <p className="mt-1 text-xs text-muted-foreground">Vendedor: {o.seller_declared_at ? "declaró acuerdo" : "pendiente"} · Comprador: {o.buyer_declared_at ? "declaró acuerdo" : "pendiente"}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {counterPhone && <Button asChild variant="lime"><a href={waLink(counterPhone, `Hola, sigo la oportunidad ${o.code} de AgroLocal.`)} target="_blank" rel="noreferrer">Abrir WhatsApp</a></Button>}
        {canAct && o.status === "contact_requested" && <Button onClick={() => change("negotiating")}>Pasar a negociación</Button>}
        {canAct && (o.status === "negotiating" || o.status === "agreement_declared" || o.status === "contact_requested") && !myDeclared && <Button variant="outline" onClick={() => change("agreement_declared")}>Declarar acuerdo</Button>}
        {canAct && o.status !== "cancelled" && <Button variant="ghost" onClick={() => change("cancelled")}>Cancelar</Button>}
        <Button variant="ghost" onClick={() => setOpen(!open)}>{open ? "Ocultar historial" : "Ver historial"}</Button>
      </div>
      {canAct && o.status !== "cancelled" && <Input className="mt-2 h-11" placeholder="Nota para el historial (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
      {operation.data ? <Button asChild variant="outline" className="mt-3"><Link to="/panel/operaciones/$id" params={{id:operation.data.id}}>Ver operación comercial</Link></Button> : canAct && isSeller && o.status !== "cancelled" && <AgreementForm opportunityId={o.id} companyId={m.company.id} listingId={o.listing_id} quantity={o.quantity_kg}/>}
      {open && (
        <ol className="mt-3 space-y-1 border-l-2 border-secondary pl-4 text-sm">
          {(details.data?.events ?? []).map((e) => (
            <li key={e.id}>{new Date(e.created_at).toLocaleString("es-AR")} — {e.to_status ? OPP_STATUS[e.to_status] : e.event}{e.note && `: ${e.note}`}</li>
          ))}
        </ol>
      )}
    </article>
  );
}
