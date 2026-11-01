import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleDashed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKg } from "@/lib/domain";
import { fetchCompaniesPublic } from "@/lib/market";

type Match = { listing_id: string; demand_id: string; seller_company_id: string; buyer_company_id: string; available_kg: number; wanted_kg: number; matches: string[]; pending: string[] };

/** Rule-based matches for one listing (buyers) or one demand (sellers). Computed live from current stock. */
export function MatchList({ listingId, demandId, renderAction }: { listingId?: string; demandId?: string; renderAction?: (m: Match) => React.ReactNode }) {
  const forListing = !!listingId;
  const q = useQuery({
    queryKey: ["matches", listingId ?? null, demandId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("match_pairs", { _listing: listingId ?? (null as unknown as string), _demand: demandId ?? (null as unknown as string) });
      if (error) throw error;
      const rows = (data ?? []) as Match[];
      const companies = await fetchCompaniesPublic(rows.map((r) => (forListing ? r.buyer_company_id : r.seller_company_id)));
      return { rows, companies };
    },
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Buscando coincidencias...</p>;
  if (q.error) return <p className="text-sm text-destructive">No se pudieron calcular las coincidencias.</p>;
  if (!q.data!.rows.length) return <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Por ahora no hay {forListing ? "compradores" : "vendedores"} compatibles. Se recalcula cada vez que cambian las publicaciones.</p>;
  return (
    <ul className="space-y-3">
      {q.data!.rows.map((r) => {
        const c = q.data!.companies[forListing ? r.buyer_company_id : r.seller_company_id];
        return (
          <li key={r.listing_id + r.demand_id} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-success">{forListing ? "Posible comprador compatible" : "Posible vendedor compatible"}</p>
                <p className="text-lg font-bold">{c?.name ?? "Empresa"}</p>
                <p className="text-sm text-muted-foreground">{c?.locality}, {c?.province} · {forListing ? `Busca ${formatKg(r.wanted_kg)}` : `Disponible ${formatKg(r.available_kg)}`}</p>
              </div>
              {forListing
                ? <Link to="/mercado/demanda/$id" params={{ id: r.demand_id }} className="text-sm font-semibold underline">Ver demanda</Link>
                : <Link to="/mercado/oferta/$id" params={{ id: r.listing_id }} className="text-sm font-semibold underline">Ver oferta</Link>}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><p className="text-sm font-semibold">Coincide</p><ul className="mt-1 space-y-1 text-sm">{r.matches.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{x}</li>)}</ul></div>
              <div><p className="text-sm font-semibold">Pendiente de confirmar</p><ul className="mt-1 space-y-1 text-sm text-muted-foreground">{r.pending.map((x) => <li key={x} className="flex gap-2"><CircleDashed className="mt-0.5 h-4 w-4 shrink-0" />{x}</li>)}</ul></div>
            </div>
            {renderAction && <div className="mt-3">{renderAction(r)}</div>}
          </li>
        );
      })}
    </ul>
  );
}
