import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelShell } from "@/components/panel-shell";
import { selectCls } from "@/components/company-form";
import { uploadFiles } from "@/components/listing-form";
import { MatchList } from "@/components/match-list";
import { supabase } from "@/integrations/supabase/client";
import type { Membership } from "@/hooks/use-session";
import { availableKg, formatKg, PRODUCT_LABELS, QUALITY_LABELS, toKg, type UnitCode } from "@/lib/domain";
import { errorMessage, signedUrls } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/panel/publicaciones/$id")({
  head: () => ({ meta: [{ title: "Gestionar publicación — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Stock, estado y documentos de tu publicación." }, { property: "og:title", content: "Gestionar publicación — AgroLocal" }, { property: "og:description", content: "Stock, estado y documentos de tu publicación." }] }),
  component: () => (
    <PanelShell title="Gestionar publicación">
      {({ membership, userId }) => <Manage m={membership!} userId={userId} />}
    </PanelShell>
  ),
});

const KIND_LABEL: Record<string, string> = { reserve: "Reserva", sell: "Venta (de reserva)", release: "Liberación", sell_direct: "Venta directa" };

function Manage({ m, userId }: { m: Membership; userId: string }) {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const canEdit = m.role !== "viewer";
  const [mv, setMv] = useState({ kind: "reserve", qty: "", unit: "t" as UnitCode, note: "" });
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["manage-listing", id],
    queryFn: async () => {
      const [l, mvs, docs] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).single(),
        supabase.from("stock_movements").select("*").eq("listing_id", id).order("created_at", { ascending: false }),
        supabase.from("listing_documents").select("*").eq("listing_id", id),
      ]);
      if (l.error) throw l.error;
      const d = docs.data ?? [];
      const urls = {
        ...(await signedUrls("listing-photos", d.filter((x) => x.bucket === "listing-photos").map((x) => x.path))),
        ...(await signedUrls("company-docs", d.filter((x) => x.bucket === "company-docs").map((x) => x.path))),
      };
      return { l: l.data, movements: mvs.data ?? [], docs: d, urls };
    },
  });
  if (q.isLoading) return <p>Cargando...</p>;
  if (!q.data) return <p>No encontramos la publicación.</p>;
  const { l, movements, docs, urls } = q.data;

  async function move() {
    try {
      setBusy(true);
      const kg = toKg(Number(mv.qty), mv.unit, l.unit_weight_kg);
      const { error } = await supabase.rpc("apply_stock_movement", { _listing: id, _kind: mv.kind, _kg: kg, ...(mv.note ? { _note: mv.note } : {}) });
      if (error) throw error;
      toast.success("Stock actualizado");
      setMv({ ...mv, qty: "", note: "" });
      qc.invalidateQueries();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  }
  async function setStatus(status: "active" | "paused" | "closed") {
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) toast.error(errorMessage(error)); else { toast.success("Estado actualizado"); qc.invalidateQueries(); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-muted-foreground">{l.code}</p>
        <h2 className="text-2xl font-bold">{PRODUCT_LABELS[l.product_type]} — {l.commercial_type}</h2>
        <p className="text-sm text-muted-foreground">{QUALITY_LABELS[l.quality_status]}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[["Original", l.quantity_kg], ["Disponible", availableKg(l)], ["Reservado", l.reserved_kg], ["Vendido", l.sold_kg], ["Liberado", l.released_kg]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-bold">{formatKg(v as number)}</p></div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/mercado/oferta/$id" params={{ id }}>Ver como comprador</Link></Button>
          {canEdit && l.status !== "active" && <Button onClick={() => setStatus("active")}>Activar</Button>}
          {canEdit && l.status === "active" && <Button variant="outline" onClick={() => setStatus("paused")}>Pausar</Button>}
          {canEdit && l.status !== "closed" && <Button variant="outline" onClick={() => setStatus("closed")}>Cerrar</Button>}
        </div>
      </div>

      <section id="compradores">
        <h3 className="mb-3 text-xl font-bold">Compradores compatibles</h3>
        <MatchList listingId={id} />
      </section>

      {canEdit && (
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <h3 className="text-lg font-bold">Registrar movimiento de stock</h3>
          <p className="text-sm text-muted-foreground">El sistema impide reservar o vender más de lo disponible.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <select className={selectCls} value={mv.kind} onChange={(e) => setMv({ ...mv, kind: e.target.value })}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Input className="h-12" type="number" min="0" step="any" placeholder="Cantidad" value={mv.qty} onChange={(e) => setMv({ ...mv, qty: e.target.value })} />
            <select className={selectCls} value={mv.unit} onChange={(e) => setMv({ ...mv, unit: e.target.value as UnitCode })}>
              <option value="t">t</option><option value="qq">qq</option><option value="kg">kg</option>
              {l.unit_weight_kg && <option value={l.original_unit}>{l.original_unit === "bolsa" ? "bolsas" : "big bags"}</option>}
            </select>
            <Button size="lg" className="h-12" disabled={busy || !mv.qty} onClick={move}>Registrar</Button>
          </div>
          <Input className="mt-3 h-12" placeholder="Nota (opcional)" value={mv.note} onChange={(e) => setMv({ ...mv, note: e.target.value })} maxLength={200} />
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-bold">Historial de stock</h3>
        <ul className="mt-2 divide-y text-sm">
          {movements.map((x) => <li key={x.id} className="flex justify-between py-2"><span>{KIND_LABEL[x.kind]} {x.note && `· ${x.note}`}</span><span>{formatKg(x.quantity_kg)} · {new Date(x.created_at).toLocaleDateString("es-AR")}</span></li>)}
          {!movements.length && <li className="py-2 text-muted-foreground">Sin movimientos.</li>}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-bold">Fotos y documentos</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {docs.map((d) => <li key={d.id}><a className="underline" href={urls[d.path] ?? "#"} target="_blank" rel="noreferrer">{d.file_name}</a> <span className="text-muted-foreground">({d.bucket === "company-docs" ? "privado" : "público"})</span></li>)}
          {!docs.length && <li className="text-muted-foreground">Sin archivos.</li>}
        </ul>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm">Agregar análisis (privado):</label>
            <Input type="file" className="max-w-xs" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try { await uploadFiles({ companyId: l.company_id, listingId: id, userId, photos: [], docs: [{ file, kind: "analysis" }] }); toast.success("Documento agregado"); qc.invalidateQueries(); }
              catch (err) { toast.error(errorMessage(err)); }
            }} />
            <label className="text-sm">Agregar foto:</label>
            <Input type="file" className="max-w-xs" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try { await uploadFiles({ companyId: l.company_id, listingId: id, userId, photos: [file], docs: [] }); toast.success("Foto agregada"); qc.invalidateQueries(); }
              catch (err) { toast.error(errorMessage(err)); }
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
