import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { QuoteButton } from "@/components/quote-button";
import { supabase } from "@/integrations/supabase/client";
import { availableKg, formatKg, formatPrice, PRODUCT_LABELS, QUALITY_LABELS, VERIFICATION_LABELS } from "@/lib/domain";
import { fetchCompaniesPublic, signedUrls } from "@/lib/market";

export const Route = createFileRoute("/mercado/oferta/$id")({
  head: () => ({
    meta: [
      { title: "Oferta de arroz — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Detalle de una oferta de venta de arroz publicada en AgroLocal." },
      { property: "og:title", content: "Oferta de arroz en AgroLocal" },
      { property: "og:description", content: "Cantidad, ubicación, calidad y condiciones de entrega." },
    ],
  }),
  component: Page,
});

const QUALITY_KEYS: Record<string, string> = {
  humedad: "Humedad (%)", materias_extranas: "Materias extrañas (%)", granos_enteros: "Rendimiento granos enteros (%)",
  rendimiento_total: "Rendimiento total (%)", quebrados: "Quebrados (%)", grado: "Grado comercial", otros: "Otros",
};

function Page() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data: l, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!l) return null;
      const [companies, { data: docs }] = await Promise.all([
        fetchCompaniesPublic([l.company_id]),
        supabase.from("listing_documents").select("*").eq("listing_id", id).eq("bucket", "listing-photos"),
      ]);
      const urls = await signedUrls("listing-photos", (docs ?? []).map((d) => d.path));
      return { l, c: companies[l.company_id], photos: (docs ?? []).map((d) => urls[d.path]).filter((u): u is string => !!u) };
    },
  });

  if (q.isLoading) return <p className="mx-auto max-w-4xl px-4 py-10">Cargando...</p>;
  if (!q.data) return <p className="mx-auto max-w-4xl px-4 py-10">Esta oferta no existe o ya no está disponible. <Link to="/mercado" className="underline">Volver al mercado</Link></p>;
  const { l, c, photos } = q.data;
  const quality = (l.quality ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_320px]">
      <div>
        <Link to="/mercado" className="text-sm text-muted-foreground hover:underline">← Volver al mercado</Link>
        <p className="mt-4 text-sm font-semibold text-muted-foreground">{l.code} {l.is_demo && <Badge variant="outline">Demo</Badge>}</p>
        <h1 className="text-3xl font-extrabold uppercase">{PRODUCT_LABELS[l.product_type]} — {l.commercial_type}</h1>
        {photos.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto">{photos.map((u) => <img key={u} src={u} alt="Foto del producto" className="h-48 rounded-xl object-cover" />)}</div>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border bg-card p-5">
          <Item k="Disponible" v={formatKg(availableKg(l))} />
          <Item k="Cantidad total" v={formatKg(l.quantity_kg)} />
          <Item k="Precio" v={formatPrice(l.price, l.currency, l.price_unit)} />
          <Item k="Venta mínima" v={l.min_sale_kg ? formatKg(l.min_sale_kg) : "Sin mínimo"} />
          <Item k="Venta parcial" v={l.partial_allowed ? "Sí" : "No"} />
          <Item k="Ubicación" v={`${l.locality}, ${l.province}`} />
          <Item k="Variedad" v={l.variety || "No informada"} />
          {l.subgroup && <Item k="Subgrupo" v={l.subgroup} />}
          <Item k="Presentación" v={l.presentation + (l.unit_weight_kg ? ` (${l.unit_weight_kg} kg c/u)` : "")} />
          <Item k="Disponibilidad" v={l.available_from ?? "Inmediata"} />
          <Item k="Entrega" v={l.delivery_terms || "A convenir"} />
        </dl>
        <h2 className="mt-8 text-xl font-bold">Calidad</h2>
        <p className="text-sm text-muted-foreground">{QUALITY_LABELS[l.quality_status]}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {Object.entries(quality).filter(([, v]) => v).map(([k, v]) => <Item key={k} k={QUALITY_KEYS[k] ?? k} v={String(v)} />)}
          {Object.values(quality).filter(Boolean).length === 0 && <p className="text-sm text-muted-foreground">Sin parámetros cargados.</p>}
        </dl>
        {l.description && <><h2 className="mt-8 text-xl font-bold">Descripción</h2><p className="mt-2 whitespace-pre-line">{l.description}</p></>}
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Vendedor</p>
          <p className="text-lg font-bold">{c?.name}</p>
          <p className="text-sm">{c?.activity_type} · {c?.locality}, {c?.province}</p>
          <p className="mt-1 text-sm font-medium text-success">{c?.is_demo ? "Demo" : VERIFICATION_LABELS[c?.verification_status ?? ""]}</p>
        </div>
        <QuoteButton listingId={l.id} ownerCompanyId={l.company_id} isDemo={l.is_demo} maxKg={availableKg(l)} productLabel={`${PRODUCT_LABELS[l.product_type]} ${l.commercial_type}`} postCode={l.code ?? ""} label="Solicitar cotización por WhatsApp" />
      </aside>
    </div>
  );
}

export function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>;
}
