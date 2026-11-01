import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuthSession, useMe, type Membership } from "@/hooks/use-session";
import { VERIFICATION_LABELS } from "@/lib/domain";

/** Loads the signed-in user's company and renders children with it. */
export function PanelShell({
  title,
  children,
  requireCompany = true,
}: {
  title: string;
  requireCompany?: boolean;
  children: (ctx: { membership: Membership | null; isPlatformAdmin: boolean; userId: string }) => ReactNode;
}) {
  const { user } = useAuthSession();
  const me = useMe(user?.id);
  if (!user || me.isLoading) return <p className="mx-auto max-w-5xl px-4 py-10">Cargando...</p>;
  if (me.error) return <p className="mx-auto max-w-5xl px-4 py-10 text-destructive">No pudimos cargar tus datos.</p>;
  const { membership, isPlatformAdmin } = me.data!;
  if (requireCompany && !membership) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p>Primero registrá tu empresa.</p>
        <Link to="/panel" className="font-semibold underline">Ir al panel</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {title !== "Mi panel" && <Link to="/panel" className="text-sm text-muted-foreground hover:underline">← Mi panel</Link>}
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {membership && <p className="text-sm text-muted-foreground">{membership.company.name} · {VERIFICATION_LABELS[membership.company.verification_status]}</p>}
        </div>
        {isPlatformAdmin && <Link to="/admin" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Administración AgroLocal</Link>}
      </div>
      {children({ membership, isPlatformAdmin, userId: user.id })}
    </div>
  );
}
