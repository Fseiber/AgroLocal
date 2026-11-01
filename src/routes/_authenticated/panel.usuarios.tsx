import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelShell } from "@/components/panel-shell";
import { selectCls } from "@/components/company-form";
import { supabase } from "@/integrations/supabase/client";
import type { Membership } from "@/hooks/use-session";
import { ROLE_LABELS } from "@/lib/domain";
import { errorMessage } from "@/lib/market";

export const Route = createFileRoute("/_authenticated/panel/usuarios")({
  head: () => ({ meta: [{ title: "Usuarios de la empresa — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Invitá y administrá usuarios de tu empresa." }, { property: "og:title", content: "Usuarios de la empresa — AgroLocal" }, { property: "og:description", content: "Invitá y administrá usuarios de tu empresa." }] }),
  component: () => (
    <PanelShell title="Usuarios de la empresa">
      {({ membership, userId }) => membership!.role === "admin" ? <Users m={membership!} userId={userId} /> : <p>Solo el administrador de la empresa puede gestionar usuarios.</p>}
    </PanelShell>
  ),
});

type Role = "admin" | "operator" | "viewer";

function Users({ m, userId }: { m: Membership; userId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operator");
  const q = useQuery({
    queryKey: ["members", m.company.id],
    queryFn: async () => {
      const [mem, inv] = await Promise.all([
        supabase.from("company_members").select("*").eq("company_id", m.company.id),
        supabase.from("company_invitations").select("*").eq("company_id", m.company.id).is("accepted_at", null),
      ]);
      return { members: mem.data ?? [], invites: inv.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["members"] });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error("Email inválido"); return; }
    const { error } = await supabase.from("company_invitations").insert({ company_id: m.company.id, email: email.trim().toLowerCase(), role, created_by: userId });
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Invitación guardada. La persona debe registrarse con ese email.");
    setEmail(""); refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-[1fr_200px_auto]">
        <Input className="h-12" type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button size="lg" className="h-12">Invitar</Button>
        <p className="text-xs text-muted-foreground sm:col-span-3">Cuando esa persona cree su cuenta con ese email e inicie sesión, queda asociada a la empresa.</p>
      </form>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-bold">Miembros</h2>
        <ul className="mt-2 divide-y">
          {(q.data?.members ?? []).map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm">{x.user_id === userId ? "Vos" : `Usuario ${x.user_id.slice(0, 8)}`}</span>
              <div className="flex gap-2">
                <select className="h-10 rounded-lg border px-2 text-sm" disabled={x.user_id === userId} value={x.role} onChange={async (e) => {
                  const { error } = await supabase.from("company_members").update({ role: e.target.value as Role }).eq("id", x.id);
                  if (error) toast.error(errorMessage(error)); else refresh();
                }}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {x.user_id !== userId && <Button variant="outline" size="sm" onClick={async () => {
                  const { error } = await supabase.from("company_members").delete().eq("id", x.id);
                  if (error) toast.error(errorMessage(error)); else refresh();
                }}>Quitar</Button>}
              </div>
            </li>
          ))}
        </ul>
        {!!q.data?.invites.length && (
          <>
            <h3 className="mt-4 font-semibold">Invitaciones pendientes</h3>
            <ul className="mt-1 text-sm">{q.data.invites.map((i) => <li key={i.id}>{i.email} · {ROLE_LABELS[i.role]}</li>)}</ul>
          </>
        )}
      </div>
    </div>
  );
}
