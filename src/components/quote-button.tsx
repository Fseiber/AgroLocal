import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { canOperate, useAuthSession, useMe } from "@/hooks/use-session";
import { formatKg } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

/**
 * Registers an opportunity on the server, then opens WhatsApp (plain wa.me link,
 * not an API integration) with a prefilled message that carries the opportunity code.
 */
export function QuoteButton(props: {
  listingId?: string | undefined;
  demandId?: string | undefined;
  ownerCompanyId: string;
  isDemo: boolean;
  maxKg: number;
  productLabel: string;
  postCode: string;
  label: string;
}) {
  const { user } = useAuthSession();
  const me = useMe(user?.id);
  const qc = useQueryClient();
  const [tons, setTons] = useState("");
  const [busy, setBusy] = useState(false);
  const m = me.data?.membership ?? null;

  if (props.isDemo) return <p className="rounded-xl bg-muted p-4 text-sm">Publicación de demostración: no admite consultas reales.</p>;
  if (!user) return (
    <div className="rounded-xl bg-accent p-4">
      <p className="text-sm">Ingresá con una empresa verificada para solicitar cotización.</p>
      <Button asChild size="lg" className="mt-3 w-full"><Link to="/auth">Iniciar sesión</Link></Button>
    </div>
  );
  if (me.isLoading) return null;
  if (m?.company.id === props.ownerCompanyId) return <p className="rounded-xl bg-muted p-4 text-sm">Es una publicación de tu empresa.</p>;
  if (!canOperate(m)) return <p className="rounded-xl bg-muted p-4 text-sm">Tu empresa debe estar verificada y necesitás permiso de operador para consultar.</p>;

  async function go() {
    const kg = Math.round(Number(tons) * 1000);
    if (!kg || kg <= 0) { toast.error("Indicá cuántas toneladas querés consultar"); return; }
    if (kg > props.maxKg) { toast.error(`Máximo ${formatKg(props.maxKg)}`); return; }
    // Open the tab synchronously so popup blockers allow it, then navigate it.
    const win = window.open("", "_blank");
    setBusy(true);
    const { data, error } = await supabase.rpc("request_quote", {
      _company: m!.company.id, _listing: props.listingId ?? (null as unknown as string), _demand: props.demandId ?? (null as unknown as string), _kg: kg,
    });
    setBusy(false);
    if (error) { win?.close(); toast.error(errorMessage(error)); return; }
    const r = data as { code: string; phone: string; existing: boolean; quantity_kg: number };
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    toast.success(r.existing ? `Ya tenías la oportunidad ${r.code} abierta` : `Oportunidad ${r.code} registrada`);
    if (!r.phone) { win?.close(); toast.error("La otra empresa no cargó un teléfono comercial"); return; }
    const text = `Hola, te escribo desde AgroLocal (${m!.company.name}). Oportunidad ${r.code}: ${props.productLabel}, ${formatKg(r.quantity_kg)}. Referencia de publicación ${props.postCode}.`;
    if (win) win.location.href = waLink(r.phone, text); else window.location.href = waLink(r.phone, text);
  }

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-card">
      <label className="text-sm font-semibold">Cantidad a consultar (toneladas)</label>
      <Input className="h-12" type="number" min="0" step="any" value={tons} onChange={(e) => setTons(e.target.value)} placeholder={`Hasta ${formatKg(props.maxKg)}`} />
      <Button size="xl" variant="lime" className="w-full" disabled={busy} onClick={go}>{busy ? "Registrando..." : props.label}</Button>
      <p className="text-xs text-muted-foreground">Se registra la oportunidad en AgroLocal y se abre WhatsApp con un mensaje listo. Abrir WhatsApp no cierra ninguna venta.</p>
    </div>
  );
}
