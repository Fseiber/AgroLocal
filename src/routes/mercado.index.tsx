import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DemandCard, ListingCard } from "@/components/market-cards";
import { supabase } from "@/integrations/supabase/client";
import { availableKg, COMMERCIAL_TYPES, PRESENTATIONS, PROVINCES } from "@/lib/domain";
import { fetchCompaniesPublic } from "@/lib/market";

export const Route = createFileRoute("/mercado/")({
  validateSearch: z.object({ tab: z.enum(["ofertas", "demandas"]).optional() }),
  head: () => ({
    meta: [
      { title: "Explorar mercado de arroz — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Ofertas de venta y demandas de compra de arroz con cáscara y elaborado en Argentina." },
      { property: "og:title", content: "Mercado de arroz — AgroLocal" },
      { property: "og:description", content: "Mirá qué arroz se vende y qué se busca, filtrado por zona, tipo y cantidad." },
    ],
  }),
  component: Market,
});

const Sel = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" />
);

function Market() {
  const { tab = "ofertas" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [f, setF] = useState({ product: "", type: "", variety: "", province: "", locality: "", minT: "", maxPrice: "", presentation: "", quality: "", onlyVerified: false, hideDemo: false });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const q = useQuery({
    queryKey: ["market", tab],
    queryFn: async () => {
      const table = tab === "ofertas" ? "listings" : "demands";
      const { data, error } = await supabase.from(table).select("*").eq("status", "active").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      const companies = await fetchCompaniesPublic((data ?? []).map((r) => r.company_id));
      return { rows: data ?? [], companies };
    },
  });

  const rows = useMemo(() => {
    const all = (q.data?.rows ?? []) as any[];
    return all.filter((r) => {
      const c = q.data!.companies[r.company_id];
      if (f.product && r.product_type !== f.product) return false;
      if (f.type && r.commercial_type !== f.type) return false;
      if (f.variety && !(r.variety ?? "").toLowerCase().includes(f.variety.toLowerCase())) return false;
      if (f.province && r.province !== f.province) return false;
      if (f.locality && !r.locality.toLowerCase().includes(f.locality.toLowerCase())) return false;
      const qty = tab === "ofertas" ? availableKg(r) : r.quantity_kg;
      if (f.minT && qty < Number(f.minT) * 1000) return false;
      const price = tab === "ofertas" ? r.price : r.target_price;
      if (f.maxPrice && price != null && price > Number(f.maxPrice)) return false;
      if (f.presentation && r.presentation !== f.presentation) return false;
      if (f.quality && tab === "ofertas" && r.quality_status !== f.quality) return false;
      if (f.onlyVerified && (c?.is_demo || c?.verification_status !== "verified")) return false;
      if (f.hideDemo && (r.is_demo || c?.is_demo)) return false;
      return true;
    });
  }, [q.data, f, tab]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-extrabold">Explorar mercado</h1>
      <div className="mt-6 inline-flex rounded-xl bg-muted p-1">
        {(["ofertas", "demandas"] as const).map((t) => (
          <button key={t} onClick={() => navigate({ search: { tab: t } })}
            className={`rounded-lg px-5 py-2.5 text-base font-semibold ${tab === t ? "bg-card shadow-card" : "text-muted-foreground"}`}>
            {t === "ofertas" ? "Ofertas de venta" : "Demandas de compra"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Sel value={f.product} onChange={up("product")}><option value="">Todos los productos</option><option value="cascara">Arroz con cáscara</option><option value="elaborado">Arroz elaborado</option></Sel>
        <Sel value={f.type} onChange={up("type")}><option value="">Todos los tipos</option>{COMMERCIAL_TYPES.map((t) => <option key={t}>{t}</option>)}</Sel>
        <Input className="h-11" placeholder="Variedad" value={f.variety} onChange={up("variety")} />
        <Sel value={f.province} onChange={up("province")}><option value="">Todas las provincias</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</Sel>
        <Input className="h-11" placeholder="Localidad" value={f.locality} onChange={up("locality")} />
        <Input className="h-11" type="number" min="0" placeholder="Cantidad mínima (t)" value={f.minT} onChange={up("minT")} />
        <Input className="h-11" type="number" min="0" placeholder="Precio máximo" value={f.maxPrice} onChange={up("maxPrice")} />
        <Sel value={f.presentation} onChange={up("presentation")}><option value="">Toda presentación</option>{PRESENTATIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Sel>
        {tab === "ofertas" && (
          <Sel value={f.quality} onChange={up("quality")}><option value="">Toda calidad</option><option value="documented">Respaldada con documento</option><option value="declared">Declarada</option><option value="not_informed">No informada</option></Sel>
        )}
        <div className="flex items-center gap-2"><Switch id="v" checked={f.onlyVerified} onCheckedChange={(v) => setF({ ...f, onlyVerified: v })} /><Label htmlFor="v">Solo verificadas</Label></div>
        <div className="flex items-center gap-2"><Switch id="d" checked={f.hideDemo} onCheckedChange={(v) => setF({ ...f, hideDemo: v })} /><Label htmlFor="d">Ocultar demo</Label></div>
      </div>

      {q.isLoading ? (
        <p className="mt-8 text-muted-foreground">Cargando...</p>
      ) : q.error ? (
        <p className="mt-8 text-destructive">No se pudo cargar el mercado.</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No hay publicaciones con esos filtros.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => tab === "ofertas"
            ? <ListingCard key={r.id} l={r} c={q.data!.companies[r.company_id]} />
            : <DemandCard key={r.id} d={r} c={q.data!.companies[r.company_id]} />)}
        </div>
      )}
    </div>
  );
}
