import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { QuoteButton } from "@/components/quote-button";
import { supabase } from "@/integrations/supabase/client";
import { formatKg, formatPrice, PRODUCT_LABELS, VERIFICATION_LABELS } from "@/lib/domain";
import { fetchCompaniesPublic } from "@/lib/market";

export const Route = createFileRoute("/mercado/demanda/$id")({
  head: () => ({
    meta: [
      { title: "Demanda de arroz — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Requisitos de una empresa que busca comprar arroz en AgroLocal." },
      { property: "og:title", content: "Se busca arroz — AgroLocal" },
      { property: "og:description", content: "Cantidad, destino y calidad requerida por el comprador." },
    ],
  }),
  component: Page,
});

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>;
}

function Page() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["demand", id],
    queryFn: async () => {
      const { data: d, error } = await supabase.from("demands").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!d) return null;
      const companies = await fetchCompaniesPublic([d.company_id]);
      return { d, c: companies[d.company_id] };
    },
  });
  if (q.isLoading) return <p className="mx-auto max-w-4xl px-4 py-10">Cargando...</p>;
  if (!q.data) return <p className="mx-auto max-w-4xl px-4 py-10">Esta demanda no existe o ya no está activa. <Link to="/mercado" className="underline">Volver</Link></p>;
  const { d, c } = q.data;
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_320px]">
      <div>
        <Link to="/mercado" search={{ tab: "demandas" }} className="text-sm text-muted-foreground hover:underline">← Volver al mercado</Link>
        <div className="mt-4 text-sm font-semibold text-muted-foreground">{d.code} {d.is_demo && <Badge variant="outline">Demo</Badge>}</div>
        <h1 className="text-3xl font-extrabold uppercase">Se busca {(PRODUCT_LABELS[d.product_type] ?? "").toLowerCase()} — {d.commercial_type}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border bg-card p-5">
          <Item k="Cantidad buscada" v={formatKg(d.quantity_kg)} />
          <Item k="Cantidad mínima" v={d.min_quantity_kg ? formatKg(d.min_quantity_kg) : "Sin mínimo"} />
          <Item k="Precio objetivo" v={formatPrice(d.target_price, d.currency, d.price_unit)} />
          <Item k="Destino" v={`${d.locality}, ${d.province}`} />
          <Item k="Variedad" v={d.variety || "Indistinta"} />
          {d.subgroup && <Item k="Subgrupo" v={d.subgroup} />}
          <Item k="Presentación" v={d.presentation || "Indistinta"} />
          <Item k="Necesario para" v={d.needed_by ?? "A convenir"} />
          <Item k="Entrega" v={d.delivery_terms || "A convenir"} />
        </dl>
        <h2 className="mt-8 text-xl font-bold">Calidad requerida</h2>
        <p className="mt-2 whitespace-pre-line">{d.quality_requirements || "No especificada"}</p>
        {d.description && <><h2 className="mt-8 text-xl font-bold">Más información</h2><p className="mt-2 whitespace-pre-line">{d.description}</p></>}
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Comprador</p>
          <p className="text-lg font-bold">{c?.name}</p>
          <p className="text-sm">{c?.activity_type} · {c?.locality}, {c?.province}</p>
          <p className="mt-1 text-sm font-medium text-success">{c?.is_demo ? "Demo" : VERIFICATION_LABELS[c?.verification_status ?? ""]}</p>
        </div>
        <QuoteButton demandId={d.id} ownerCompanyId={d.company_id} isDemo={d.is_demo} maxKg={d.quantity_kg} productLabel={`${PRODUCT_LABELS[d.product_type]} ${d.commercial_type}`} postCode={d.code ?? ""} label="Ofrecer mi producto por WhatsApp" />
      </aside>
    </div>
  );
}
