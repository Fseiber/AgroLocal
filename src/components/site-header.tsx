import logo from "@/assets/agrolocal-logo.jpeg.asset.json";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-session";

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="AgroLocal, inicio">
      <img src={logo.url} alt="AgroLocal" className="h-11 w-11 rounded-full" />
      <span className="font-display text-xl font-bold text-primary">AgroLocal</span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/mercado", label: "Explorar mercado" },
  { to: "/como-funciona", label: "Cómo funciona" },
] as const;

export function SiteHeader() {
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links = (
    <>
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-base font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
          activeProps={{ className: "text-foreground bg-accent" }}
          activeOptions={{ exact: n.to === "/" }}
        >
          {n.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex">{links}</nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button asChild variant="lime"><Link to="/panel">Mi panel</Link></Button>
              <Button variant="ghost" onClick={signOut}>Salir</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Iniciar sesión</Link></Button>
              <Button asChild variant="lime"><Link to="/auth" search={{ mode: "signup" }}>Registrarse</Link></Button>
            </>
          )}
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menú">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t bg-background px-4 py-3 md:hidden">
          <nav className="flex flex-col">{links}</nav>
          <div className="mt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Button asChild variant="lime" size="lg"><Link to="/panel" onClick={() => setOpen(false)}>Mi panel</Link></Button>
                <Button variant="outline" size="lg" onClick={signOut}>Salir</Button>
              </>
            ) : (
              <>
                <Button asChild variant="lime" size="lg"><Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>Registrarse</Link></Button>
                <Button asChild variant="outline" size="lg"><Link to="/auth" onClick={() => setOpen(false)}>Iniciar sesión</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p><span className="font-display font-semibold text-primary">AgroLocal</span> · Marketplace de arroz para el mercado argentino</p>
        <p>AgroLocal no procesa pagos. Las operaciones se acuerdan entre las partes.</p>
      </div>
    </footer>
  );
}
