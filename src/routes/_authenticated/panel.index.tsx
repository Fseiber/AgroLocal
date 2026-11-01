import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileSearch, PlusCircle, ShoppingCart, Users, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelShell } from "@/components/panel-shell";
import { RegisterCompanyForm } from "@/components/company-form";
import { OperationNotifications } from "@/components/operation-notifications";
import { supabase } from "@/integrations/supabase/client";
import { canOperate, useAuthSession, type Membership } from "@/hooks/use-session";
import { availableKg, formatKg, PRODUCT_LABELS, VERIFICATION_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/panel/")({
  head: () => ({ meta: [{ title: "Mi panel — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Gestioná tus publicaciones y demandas en AgroLocal." }, { property: "og:title", content: "Mi panel — AgroLocal" }, { property: "og:description", content: "Gestioná tus publicaciones y demandas en AgroLocal." }] }),
  component: () => (
    <PanelShell title="Mi panel" requireCompany={false}>
      {({ membership }) => (membership ? <Dashboard m={membership} /> : <Onboarding />)}
    </PanelShell>
  ),
});

function Onboarding() {
  const { user } = useAuthSession();
  return <RegisterCompanyForm defaultEmail={user?.email ?? ""} defaultPhone={(user?.user_metadata?.["phone"] as string) ?? ""} />;
}

function Dashboard({ m }: { m: Membership }) {
  const ok = canOperate(m);
  const q = useQuery({
    queryKey: ["my-posts", m.company.id],
    queryFn: async () => {
      const [l, d] = await Promise.all([
        supabase.from("listings").select("*").eq("company_id", m.company.id).order("created_at", { ascending: false }),
        supabase.from("demands").select("*").eq("company_id", m.company.id).order("created_at", { ascending: false }),
      ]);
      if (l.error) throw l.error;
      if (d.error) throw d.error;
      const o = await supabase.from("opportunities").select("id,status,initiator_company_id").in("status", ["contact_requested", "negotiating"]);
      return { listings: l.data, demands: d.data, opps: o.data ?? [] };
    },
  });
  const active = q.data?.listings.filter((l) => l.status === "active") ?? [];
  const totalAvail = active.reduce((a, l) => a + availableKg(l), 0);

  return (
    <div className="space-y-8">
      <OperationNotifications companyId={m.company.id} />
      <Button asChild variant="outline" size="lg"><Link to="/panel/historial">Mi historial · Operaciones comerciales</Link></Button>
      {m.company.verification_status !== "verified" && (
        <div className="rounded-2xl border border-warning bg-accent p-5">
          <p className="font-semibold">{VERIFICATION_LABELS[m.company.verification_status]}</p>
          <p className="text-sm text-muted-foreground">
            {m.company.verification_note || "El equipo de AgroLocal está revisando tus datos. Mientras tanto podés explorar el mercado."}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Big to="/panel/publicar/cascara" icon={Wheat} label="Publicar arroz con cáscara" disabled={!ok} />
        <Big to="/panel/publicar/elaborado" icon={PlusCircle} label="Publicar arroz elaborado" disabled={!ok} />
        <Big to="/panel/demandas/nueva" icon={ShoppingCart} label="Publicar demanda de compra" disabled={!ok} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/panel/oportunidades" className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-card hover:opacity-90">
          <p className="text-lg font-bold">Mis oportunidades</p>
          <p className="text-sm opacity-90">{q.data?.opps.filter((o) => o.initiator_company_id !== m.company.id).length ?? 0} consultas recibidas abiertas · {q.data?.opps.filter((o) => o.initiator_company_id === m.company.id).length ?? 0} realizadas</p>
        </Link>
        <Link to="/mercado" className="rounded-2xl border-2 border-primary p-5 shadow-card hover:bg-accent">
          <p className="text-lg font-bold">Explorar ofertas</p>
          <p className="text-sm text-muted-foreground">Buscá arroz disponible y pedí cotización</p>
        </Link>
      </div>
      {active.length > 0 && <p className="text-sm">Para <b>encontrar compradores</b>, abrí una de tus publicaciones: ahí ves los compradores compatibles.</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat k="Publicaciones activas" v={String(active.length)} />
        <Stat k="Disponible para vender" v={formatKg(totalAvail)} />
        <Stat k="Demandas activas" v={String(q.data?.demands.filter((d) => d.status === "active").length ?? 0)} />
      </div>

      <section>
        <h2 className="text-xl font-bold">Mis publicaciones</h2>
        <div className="mt-3 divide-y rounded-2xl border bg-card">
          {(q.data?.listings ?? []).map((l) => (
            <Link key={l.id} to="/panel/publicaciones/$id" params={{ id: l.id }} className="flex items-center justify-between gap-3 p-4 hover:bg-muted">
              <div>
                <p className="font-semibold">{l.code} · {PRODUCT_LABELS[l.product_type]} {l.commercial_type}</p>
                <p className="text-sm text-muted-foreground">Disponible {formatKg(availableKg(l))} · Reservado {formatKg(l.reserved_kg)} · Vendido {formatKg(l.sold_kg)}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{l.status === "active" ? "Activa" : l.status === "paused" ? "Pausada" : "Cerrada"}</span>
            </Link>
          ))}
          {q.data?.listings.length === 0 && <p className="p-6 text-center text-muted-foreground">Todavía no publicaste arroz.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Mis demandas</h2>
        <div className="mt-3 divide-y rounded-2xl border bg-card">
          {(q.data?.demands ?? []).map((d) => (
            <Link key={d.id} to="/panel/demandas/$id" params={{ id: d.id }} className="flex justify-between p-4 hover:bg-muted">
              <span className="font-semibold">{d.code} · {PRODUCT_LABELS[d.product_type]} {d.commercial_type}</span>
              <span className="text-sm text-muted-foreground">{formatKg(d.quantity_kg)}</span>
            </Link>
          ))}
          {q.data?.demands.length === 0 && <p className="p-6 text-center text-muted-foreground">No tenés demandas publicadas.</p>}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="lg"><Link to="/mercado"><FileSearch />Explorar mercado</Link></Button>
        <Button asChild variant="outline" size="lg"><Link to="/panel/empresa"><Building2 />Mi empresa</Link></Button>
        {m.role === "admin" && <Button asChild variant="outline" size="lg"><Link to="/panel/usuarios"><Users />Usuarios</Link></Button>}
      </div>
    </div>
  );
}

function Big({ to, icon: Icon, label, disabled }: { to: "/panel/publicar/cascara" | "/panel/publicar/elaborado" | "/panel/demandas/nueva"; icon: typeof Wheat; label: string; disabled: boolean }) {
  if (disabled) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed p-5 text-muted-foreground">
        <Icon className="h-7 w-7" /><span className="font-semibold">{label}</span>
        <span className="text-xs">Disponible cuando la empresa esté verificada y tengas permiso de operador.</span>
      </div>
    );
  }
  return (
    <Link to={to} className="flex flex-col gap-2 rounded-2xl bg-secondary p-5 text-secondary-foreground shadow-card hover:opacity-90">
      <Icon className="h-7 w-7" /><span className="text-lg font-bold">{label}</span>
    </Link>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{k}</p><p className="text-2xl font-bold">{v}</p></div>;
}
