import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PanelShell } from "@/components/panel-shell";
import { Section } from "@/components/listing-form";
import { selectCls } from "@/components/company-form";
import { Field } from "@/routes/auth";
import { supabase } from "@/integrations/supabase/client";
import { canOperate, type Membership } from "@/hooks/use-session";
import { COMMERCIAL_TYPES, ELABORADO_SUBGROUPS, PRESENTATIONS, PROVINCES, toKg, UNITS, unitNeedsWeight, type UnitCode } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/panel/demandas/nueva")({
  head: () => ({ meta: [{ title: "Publicar demanda — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Publicá qué arroz necesitás comprar." }, { property: "og:title", content: "Publicar demanda — AgroLocal" }, { property: "og:description", content: "Publicá qué arroz necesitás comprar." }] }),
  component: () => (
    <PanelShell title="Publicar demanda de compra">
      {({ membership, userId }) => canOperate(membership)
        ? <DemandForm m={membership!} userId={userId} />
        : <p>Tu empresa debe estar verificada y necesitás permiso de operador para publicar.</p>}
    </PanelShell>
  ),
});

function DemandForm({ m, userId }: { m: Membership; userId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    product: "elaborado", commercial_type: "", variety: "", subgroup: "", presentation: "", unit: "t" as UnitCode, quantity: "", unit_weight: "",
    min_quantity: "", province: m.company.province, locality: m.company.locality, quality: "", target_price: "", currency: "ARS", price_unit: "t",
    needed_by: "", delivery_terms: "", description: "",
  });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!f.commercial_type) throw new Error("Elegí el tipo comercial");
      const w = f.unit_weight ? Number(f.unit_weight) : null;
      const quantity_kg = toKg(Number(f.quantity), f.unit, w);
      const min_quantity_kg = f.min_quantity ? toKg(Number(f.min_quantity), f.unit, w) : null;
      setLoading(true);
      const { data, error } = await supabase.from("demands").insert({
        company_id: m.company.id, created_by: userId, product_type: f.product as "cascara" | "elaborado",
        commercial_type: f.commercial_type, variety: f.variety.trim() || null, subgroup: f.product === "elaborado" ? f.subgroup || null : null,
        presentation: f.presentation || null, original_unit: f.unit, original_quantity: Number(f.quantity), unit_weight_kg: unitNeedsWeight(f.unit) ? w : null,
        quantity_kg, min_quantity_kg, province: f.province, locality: f.locality.trim(), quality_requirements: f.quality.trim() || null,
        target_price: f.target_price ? Number(f.target_price) : null, currency: f.currency, price_unit: f.price_unit,
        needed_by: f.needed_by || null, delivery_terms: f.delivery_terms.trim() || null, description: f.description.trim() || null,
      }).select("id").single();
      if (error) throw error;
      toast.success("Demanda publicada");
      qc.invalidateQueries();
      navigate({ to: "/mercado/demanda/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Qué necesitás">
        <Field label="Producto"><select className={selectCls} value={f.product} onChange={up("product")}><option value="cascara">Arroz con cáscara</option><option value="elaborado">Arroz elaborado</option></select></Field>
        <Field label="Tipo comercial"><select className={selectCls} value={f.commercial_type} onChange={up("commercial_type")}><option value="">Elegir...</option>{COMMERCIAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Variedad (opcional)"><Input className="h-12" value={f.variety} onChange={up("variety")} /></Field>
        {f.product === "elaborado" && <Field label="Subgrupo"><select className={selectCls} value={f.subgroup} onChange={up("subgroup")}><option value="">Indistinto</option>{ELABORADO_SUBGROUPS.map((t) => <option key={t}>{t}</option>)}</select></Field>}
        <Field label="Presentación"><select className={selectCls} value={f.presentation} onChange={up("presentation")}><option value="">Indistinta</option>{PRESENTATIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></Field>
      </Section>
      <Section title="Cantidad">
        <Field label="Unidad"><select className={selectCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as UnitCode })}>{UNITS.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}</select></Field>
        <Field label="Cantidad buscada"><Input className="h-12" type="number" min="0" step="any" value={f.quantity} onChange={up("quantity")} required /></Field>
        {unitNeedsWeight(f.unit) && <Field label="Peso de cada una (kg)"><Input className="h-12" type="number" min="0" step="any" value={f.unit_weight} onChange={up("unit_weight")} required /></Field>}
        <Field label="Cantidad mínima aceptable (opcional)"><Input className="h-12" type="number" min="0" step="any" value={f.min_quantity} onChange={up("min_quantity")} /></Field>
      </Section>
      <Section title="Destino, precio y calidad">
        <Field label="Provincia de destino"><select className={selectCls} value={f.province} onChange={up("province")}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Localidad de destino"><Input className="h-12" value={f.locality} onChange={up("locality")} /></Field>
        <Field label="Precio objetivo (opcional)"><Input className="h-12" type="number" min="0" step="any" value={f.target_price} onChange={up("target_price")} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Moneda"><select className={selectCls} value={f.currency} onChange={up("currency")}><option>ARS</option><option>USD</option></select></Field>
          <Field label="Por"><select className={selectCls} value={f.price_unit} onChange={up("price_unit")}><option value="t">tonelada</option><option value="kg">kg</option><option value="qq">quintal</option><option value="bolsa">bolsa</option></select></Field>
        </div>
        <Field label="Lo necesito para (opcional)"><Input className="h-12" type="date" value={f.needed_by} onChange={up("needed_by")} /></Field>
        <Field label="Condiciones de entrega"><Input className="h-12" value={f.delivery_terms} onChange={up("delivery_terms")} maxLength={200} /></Field>
        <div className="sm:col-span-2"><Field label="Calidad requerida"><Textarea rows={3} value={f.quality} onChange={up("quality")} maxLength={2000} /></Field></div>
        <div className="sm:col-span-2"><Field label="Más información"><Textarea rows={3} value={f.description} onChange={up("description")} maxLength={2000} /></Field></div>
      </Section>
      <Button type="submit" size="xl" className="w-full" disabled={loading}>{loading ? "Publicando..." : "Publicar demanda"}</Button>
    </form>
  );
}
