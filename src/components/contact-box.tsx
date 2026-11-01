import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-session";
import { errorMessage } from "@/lib/market";

export function ContactBox({ companyId, isDemo, label }: { companyId: string; isDemo: boolean; label: string }) {
  const { user } = useAuthSession();
  const [contact, setContact] = useState<{ name: string; contact_phone: string; contact_email: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (isDemo) return <p className="rounded-xl bg-muted p-4 text-sm">Publicación de demostración: no tiene contacto real.</p>;
  if (!user) {
    return (
      <div className="rounded-xl bg-accent p-4">
        <p className="text-sm">Para ver el contacto, ingresá con una empresa verificada.</p>
        <Button asChild size="lg" className="mt-3 w-full"><Link to="/auth">Iniciar sesión</Link></Button>
      </div>
    );
  }
  if (contact) {
    const wa = contact.contact_phone.replace(/[^0-9]/g, "");
    return (
      <div className="space-y-2 rounded-xl bg-accent p-4 text-sm">
        <p className="font-semibold">{contact.name}</p>
        <p>Teléfono: {contact.contact_phone || "—"}</p>
        <p>Email: {contact.contact_email || "—"}</p>
        {wa && (
          <Button asChild variant="lime" size="lg" className="w-full">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
          </Button>
        )}
      </div>
    );
  }
  return (
    <div>
      <Button size="xl" variant="lime" className="w-full" onClick={async () => {
        setErr(null);
        const { data, error } = await supabase.rpc("get_company_contact", { _company: companyId });
        if (error) setErr(errorMessage(error)); else setContact(data?.[0] ?? null);
      }}>{label}</Button>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
