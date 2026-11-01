import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PanelShell } from "@/components/panel-shell";
import { MatchList } from "@/components/match-list";
import { QuoteButton } from "@/components/quote-button";
import { supabase } from "@/integrations/supabase/client";
import type { Membership } from "@/hooks/use-session";
import { formatKg, PRODUCT_LABELS } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/panel/demandas/$id")({
  head: () => ({ meta: [{ title: "Mi demanda — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Vendedores compatibles con tu demanda de compra." }, { property: "og:title", content: "Mi demanda — AgroLocal" }, { property: "og:description", content: "Vendedores compatibles con tu demanda de compra." }] }),
  component: () => <PanelShell title="Mi demanda">{({ membership }) => <Demand m={membership!} />}</PanelShell>,
});

function Demand({ m }: { m: Membership }) {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-demand", id],
    queryFn: async () => { const { data, error } = await supabase.from("demands").select("*").eq("id", id).single(); if (error) throw error; return data; },
  });
  if (q.isLoading) return <p>Cargando...</p>;
  if (!q.data) return <p>No encontramos la demanda.</p>;
  const d = q.data;
  const canEdit = m.role !== "viewer" && d.company_id === m.company.id;
  async function setStatus(status: "active" | "paused" | "closed") {
    const { error } = await supabase.from("demands").update({ status }).eq("id", id);
    if (error) toast.error(errorMessage(error)); else { toast.success("Estado actualizado"); qc.invalidateQueries(); }
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-muted-foreground">{d.code} · {d.status === "active" ? "Activa" : d.status === "paused" ? "Pausada" : "Cerrada"}</p>
        <h2 className="text-2xl font-bold">Se busca {PRODUCT_LABELS[d.product_type]?.toLowerCase()} — {d.commercial_type}</h2>
        <p className="text-sm">{formatKg(d.quantity_kg)} · destino {d.locality}, {d.province}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/mercado/demanda/$id" params={{ id }}>Ver como vendedor</Link></Button>
          {canEdit && d.status !== "active" && <Button onClick={() => setStatus("active")}>Activar</Button>}
          {canEdit && d.status === "active" && <Button variant="outline" onClick={() => setStatus("paused")}>Pausar</Button>}
          {canEdit && d.status !== "closed" && <Button variant="outline" onClick={() => setStatus("closed")}>Cerrar</Button>}
        </div>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-bold">Vendedores compatibles</h2>
        <MatchList demandId={id} renderAction={(r) => (
          <QuoteButton listingId={r.listing_id} demandId={id} ownerCompanyId={r.seller_company_id} isDemo={d.is_demo}
            maxKg={Math.min(r.available_kg, d.quantity_kg)} productLabel={`${PRODUCT_LABELS[d.product_type]} ${d.commercial_type}`} postCode={d.code ?? ""} label="Solicitar cotización por WhatsApp" />
        )} />
      </section>
    </div>
  );
}
