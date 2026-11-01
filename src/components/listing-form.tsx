import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/routes/auth";
import { selectCls } from "@/components/company-form";
import { supabase } from "@/integrations/supabase/client";
import type { Membership } from "@/hooks/use-session";
import { COMMERCIAL_TYPES, ELABORADO_SUBGROUPS, formatKg, PRESENTATIONS, PROVINCES, toKg, UNITS, unitNeedsWeight, type UnitCode } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

const MAX_BYTES = 10 * 1024 * 1024;
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function uploadFiles(opts: { companyId: string; listingId: string; userId: string; photos: File[]; docs: { file: File; kind: string }[] }) {
  for (const f of [...opts.photos, ...opts.docs.map((d) => d.file)]) {
    if (f.size > MAX_BYTES) throw new Error(`"${f.name}" supera los 10 MB`);
    if (!DOC_TYPES.includes(f.type)) throw new Error(`"${f.name}": solo PDF, JPG, PNG o WEBP`);
  }
  const items = [
    ...opts.photos.map((file) => ({ file, kind: "photo", bucket: "listing-photos" })),
    ...opts.docs.map((d) => ({ file: d.file, kind: d.kind, bucket: "company-docs" })),
  ];
  for (const it of items) {
    const safe = it.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${opts.companyId}/${opts.listingId}/${crypto.randomUUID()}-${safe}`;
    const up = await supabase.storage.from(it.bucket).upload(path, it.file, { contentType: it.file.type });
    if (up.error) throw up.error;
    const ins = await supabase.from("listing_documents").insert({
      listing_id: opts.listingId, company_id: opts.companyId, kind: it.kind, bucket: it.bucket, path, file_name: it.file.name, created_by: opts.userId,
    });
    if (ins.error) throw ins.error;
  }
}

export function ListingForm({ product, m, userId }: { product: "cascara" | "elaborado"; m: Membership; userId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    commercial_type: "", variety: "", subgroup: "", presentation: product === "cascara" ? "granel" : "bolsas",
    unit: (product === "cascara" ? "t" : "bolsa") as UnitCode, quantity: "", unit_weight: "", min_sale: "", min_unit: "t" as UnitCode,
    partial: true, price: "", currency: "ARS", price_unit: "t", province: m.company.province, locality: m.company.locality,
    available_from: "", delivery_terms: "", description: "",
    humedad: "", materias_extranas: "", granos_enteros: "", rendimiento_total: "", quebrados: "", grado: "", otros: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<{ file: File; kind: string }[]>([]);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const totalKg = useMemo(() => {
    try { return toKg(Number(f.quantity), f.unit, f.unit_weight ? Number(f.unit_weight) : null); } catch { return null; }
  }, [f.quantity, f.unit, f.unit_weight]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!f.commercial_type) throw new Error("Elegí el tipo comercial");
      if (product === "elaborado" && !f.subgroup) throw new Error("Elegí el subgrupo");
      if (!f.locality.trim()) throw new Error("Ingresá la localidad");
      const quantity_kg = toKg(Number(f.quantity), f.unit, f.unit_weight ? Number(f.unit_weight) : null);
      const min_sale_kg = f.min_sale ? toKg(Number(f.min_sale), f.min_unit, f.unit_weight ? Number(f.unit_weight) : null) : null;
      if (min_sale_kg && min_sale_kg > quantity_kg) throw new Error("La venta mínima no puede superar la cantidad total");
      const qualityKeys = product === "cascara"
        ? ["humedad", "materias_extranas", "granos_enteros", "rendimiento_total", "otros"]
        : ["quebrados", "grado", "humedad", "otros"];
      const quality = Object.fromEntries(qualityKeys.map((k) => [k, (f as any)[k].trim()]).filter(([, v]) => v));
      setLoading(true);
      const { data, error } = await supabase.from("listings").insert({
        company_id: m.company.id, created_by: userId, product_type: product,
        commercial_type: f.commercial_type, variety: f.variety.trim() || null, subgroup: product === "elaborado" ? f.subgroup : null,
        presentation: f.presentation, original_unit: f.unit, original_quantity: Number(f.quantity),
        unit_weight_kg: unitNeedsWeight(f.unit) ? Number(f.unit_weight) : null,
        unit_count: unitNeedsWeight(f.unit) ? Number(f.quantity) : null,
        quantity_kg, min_sale_kg, partial_allowed: f.partial,
        price: f.price ? Number(f.price) : null, currency: f.currency, price_unit: f.price_unit,
        province: f.province, locality: f.locality.trim(), available_from: f.available_from || null,
        delivery_terms: f.delivery_terms.trim() || null, description: f.description.trim() || null,
        quality, quality_status: Object.keys(quality).length ? "declared" : "not_informed",
      }).select("id").single();
      if (error) throw error;
      if (photos.length || docs.length) {
        try { await uploadFiles({ companyId: m.company.id, listingId: data.id, userId, photos, docs }); }
        catch (err) { toast.error("La publicación se creó, pero falló un archivo: " + errorMessage(err)); }
      }
      toast.success("Publicación creada");
      qc.invalidateQueries();
      navigate({ to: "/panel/publicaciones/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const unitsForQty = product === "cascara" ? UNITS.filter((u) => u.code !== "bolsa") : UNITS;

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Datos básicos">
        <Field label="Tipo comercial"><select className={selectCls} value={f.commercial_type} onChange={up("commercial_type")}><option value="">Elegir...</option>{COMMERCIAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Variedad (si la conocés)"><Input className="h-12" value={f.variety} onChange={up("variety")} maxLength={80} /></Field>
        {product === "elaborado" && (
          <Field label="Subgrupo"><select className={selectCls} value={f.subgroup} onChange={up("subgroup")}><option value="">Elegir...</option>{ELABORADO_SUBGROUPS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        )}
        <Field label="Presentación"><select className={selectCls} value={f.presentation} onChange={up("presentation")}>{PRESENTATIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></Field>
      </Section>

      <Section title="Cantidad">
        <Field label="Unidad"><select className={selectCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as UnitCode })}>{unitsForQty.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}</select></Field>
        <Field label={unitNeedsWeight(f.unit) ? "Número de bolsas / big bags" : "Cantidad total disponible"}><Input className="h-12" type="number" min="0" step="any" value={f.quantity} onChange={up("quantity")} required /></Field>
        {unitNeedsWeight(f.unit) && (
          <Field label="Peso de cada una (kg)" hint="Obligatorio para calcular el total"><Input className="h-12" type="number" min="0" step="any" value={f.unit_weight} onChange={up("unit_weight")} required /></Field>
        )}
        <div className="flex items-end"><p className="rounded-lg bg-accent px-4 py-3 font-semibold">Total: {totalKg ? formatKg(totalKg) : "—"}</p></div>
        <Field label="Venta mínima (opcional)"><div className="flex gap-2"><Input className="h-12" type="number" min="0" step="any" value={f.min_sale} onChange={up("min_sale")} /><select className={selectCls + " w-40"} value={f.min_unit} onChange={(e) => setF({ ...f, min_unit: e.target.value as UnitCode })}>{unitsForQty.map((u) => <option key={u.code} value={u.code}>{u.code}</option>)}</select></div></Field>
        <label className="flex items-center gap-3 pt-6"><Checkbox checked={f.partial} onCheckedChange={(v) => setF({ ...f, partial: !!v })} /> Acepto ventas parciales</label>
      </Section>

      <Section title="Precio y entrega">
        <Field label="Precio público (opcional)" hint="Si lo dejás vacío se muestra 'A convenir'"><Input className="h-12" type="number" min="0" step="any" value={f.price} onChange={up("price")} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Moneda"><select className={selectCls} value={f.currency} onChange={up("currency")}><option>ARS</option><option>USD</option></select></Field>
          <Field label="Por"><select className={selectCls} value={f.price_unit} onChange={up("price_unit")}><option value="t">tonelada</option><option value="kg">kg</option><option value="qq">quintal</option><option value="bolsa">bolsa</option></select></Field>
        </div>
        <Field label="Provincia"><select className={selectCls} value={f.province} onChange={up("province")}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Localidad"><Input className="h-12" value={f.locality} onChange={up("locality")} /></Field>
        <Field label="Disponible desde (vacío = inmediata)"><Input className="h-12" type="date" value={f.available_from} onChange={up("available_from")} /></Field>
        <Field label="Condición de entrega"><Input className="h-12" placeholder="Ej.: retira el comprador, puesto en planta" value={f.delivery_terms} onChange={up("delivery_terms")} maxLength={200} /></Field>
      </Section>

      <Section title="Calidad (opcional, podés completarla después)">
        {product === "cascara" ? (
          <>
            <Field label="Humedad (%)"><Input className="h-12" value={f.humedad} onChange={up("humedad")} /></Field>
            <Field label="Materias extrañas (%)"><Input className="h-12" value={f.materias_extranas} onChange={up("materias_extranas")} /></Field>
            <Field label="Rendimiento granos enteros (%)"><Input className="h-12" value={f.granos_enteros} onChange={up("granos_enteros")} /></Field>
            <Field label="Rendimiento total (%)"><Input className="h-12" value={f.rendimiento_total} onChange={up("rendimiento_total")} /></Field>
          </>
        ) : (
          <>
            <Field label="Quebrados (%)"><Input className="h-12" value={f.quebrados} onChange={up("quebrados")} /></Field>
            <Field label="Grado comercial"><Input className="h-12" value={f.grado} onChange={up("grado")} /></Field>
            <Field label="Humedad (%)"><Input className="h-12" value={f.humedad} onChange={up("humedad")} /></Field>
          </>
        )}
        <Field label="Otros parámetros"><Input className="h-12" value={f.otros} onChange={up("otros")} maxLength={300} /></Field>
        <p className="text-xs text-muted-foreground sm:col-span-2">Los datos se muestran como "declarados". Si adjuntás un análisis o ficha técnica, figuran como "respaldados con documento". Nunca se marcan como certificados.</p>
      </Section>

      <Section title="Fotos y documentos">
        <Field label="Fotos del producto (públicas)" hint="JPG, PNG o WEBP · máx. 10 MB c/u">
          <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} />
        </Field>
        <Field label="Análisis de calidad (privado)" hint="PDF o imagen · máx. 10 MB">
          <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => {
            const file = e.target.files?.[0]; setDocs([...docs.filter((d) => d.kind !== "analysis"), ...(file ? [{ file, kind: "analysis" }] : [])]);
          }} />
        </Field>
        <Field label="Ficha técnica (privada)">
          <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => {
            const file = e.target.files?.[0]; setDocs([...docs.filter((d) => d.kind !== "tech_sheet"), ...(file ? [{ file, kind: "tech_sheet" }] : [])]);
          }} />
        </Field>
      </Section>

      <Section title="Descripción adicional">
        <div className="sm:col-span-2"><Textarea rows={4} value={f.description} onChange={up("description")} maxLength={2000} /></div>
      </Section>

      <Button type="submit" size="xl" className="w-full" disabled={loading}>{loading ? "Publicando..." : "Publicar"}</Button>
    </form>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border bg-card p-5 shadow-card sm:grid-cols-2">
      <legend className="px-2 text-lg font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}
