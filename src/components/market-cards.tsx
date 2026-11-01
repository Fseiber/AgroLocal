import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { availableKg, formatKg, formatPrice, PRODUCT_LABELS, QUALITY_LABELS } from "@/lib/domain";
import type { CompanyPublic, Demand, Listing } from "@/lib/market";

function Verified({ c }: { c?: CompanyPublic | undefined }) {
  if (!c) return null;
  if (c.is_demo) return <Badge variant="outline" className="border-warning text-foreground">Demo</Badge>;
  if (c.verification_status === "verified")
    return <span className="inline-flex items-center gap-1 text-sm font-medium text-success"><BadgeCheck className="h-4 w-4" />Verificada</span>;
  return null;
}

export function ListingCard({ l, c }: { l: Listing; c?: CompanyPublic | undefined }) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l.code}</span>
        <Verified c={c} />
      </div>
      <h3 className="text-lg font-bold uppercase leading-tight">
        {PRODUCT_LABELS[l.product_type]} — {l.commercial_type}
      </h3>
      {l.variety && <p className="text-sm text-muted-foreground">Variedad: {l.variety}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted-foreground">Disponible</dt><dd className="text-base font-semibold">{formatKg(availableKg(l))}</dd></div>
        <div><dt className="text-muted-foreground">Precio</dt><dd className="font-semibold">{formatPrice(l.price, l.currency, l.price_unit)}</dd></div>
        <div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />{l.locality}, {l.province}</div>
        <div className="flex items-center gap-1"><Package className="h-4 w-4 text-muted-foreground" />{l.presentation}</div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{QUALITY_LABELS[l.quality_status]} · {l.available_from ? `Desde ${l.available_from}` : "Disponibilidad inmediata"}</p>
      <Button asChild variant="default" size="lg" className="mt-4">
        <Link to="/mercado/oferta/$id" params={{ id: l.id }}>Ver detalles</Link>
      </Button>
    </article>
  );
}

export function DemandCard({ d, c }: { d: Demand; c?: CompanyPublic | undefined }) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.code}</span>
        <Verified c={c} />
      </div>
      <h3 className="text-lg font-bold uppercase leading-tight">
        Se busca {(PRODUCT_LABELS[d.product_type] ?? "").toLowerCase()} — {d.commercial_type}
      </h3>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted-foreground">Cantidad buscada</dt><dd className="text-base font-semibold">{formatKg(d.quantity_kg)}</dd></div>
        <div><dt className="text-muted-foreground">Precio objetivo</dt><dd className="font-semibold">{formatPrice(d.target_price, d.currency, d.price_unit)}</dd></div>
        <div className="col-span-2 flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />Destino: {d.locality}, {d.province}</div>
      </dl>
      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{d.quality_requirements || "Calidad: sin especificar"}</p>
      <Button asChild variant="default" size="lg" className="mt-4">
        <Link to="/mercado/demanda/$id" params={{ id: d.id }}>Ver requisitos</Link>
      </Button>
    </article>
  );
}
