import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/market";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  intent: z.enum(["sell", "buy", "both"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Ingresar o registrarse — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Accedé a tu cuenta de AgroLocal o creá una nueva para tu empresa." },
      { property: "og:title", content: "Ingresar a AgroLocal" },
      { property: "og:description", content: "Registrate para publicar y contactar empresas verificadas." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "Ingresá tu nombre y apellido").max(100),
  phone: z.string().trim().regex(/^[0-9+\s-]{8,20}$/, "Teléfono inválido"),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

function AuthPage() {
  const { mode = "signin", intent } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos"); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/panel",
            data: { full_name: parsed.data.full_name, phone: parsed.data.phone, intent: intent ?? "both" },
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
        navigate({ to: "/panel" });
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Revisá tu correo</h1>
        <p className="mt-3 text-muted-foreground">Te enviamos un enlace a <b>{form.email}</b> para confirmar tu cuenta. Después vas a poder registrar tu empresa.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">{mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}</h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "signup" ? "Primero creás tu usuario; después registrás tu empresa." : "Ingresá con tu email y contraseña."}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        {mode === "signup" && (
          <>
            <Field label="Nombre y apellido"><Input value={form.full_name} onChange={set("full_name")} autoComplete="name" required className="h-12" /></Field>
            <Field label="Teléfono de contacto"><Input value={form.phone} onChange={set("phone")} type="tel" placeholder="+54 9 379 ..." required className="h-12" /></Field>
          </>
        )}
        <Field label="Email"><Input value={form.email} onChange={set("email")} type="email" autoComplete="email" required className="h-12" /></Field>
        <Field label="Contraseña"><Input value={form.password} onChange={set("password")} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required className="h-12" /></Field>
        <Button type="submit" size="xl" className="w-full" disabled={loading}>
          {loading ? "Procesando..." : mode === "signup" ? "Crear cuenta" : "Ingresar"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        {mode === "signup" ? "¿Ya tenés cuenta? " : "¿No tenés cuenta? "}
        <button className="font-semibold text-success underline" onClick={() => navigate({ to: "/auth", search: { mode: mode === "signup" ? "signin" : "signup", intent } })}>
          {mode === "signup" ? "Iniciá sesión" : "Registrate"}
        </button>
      </p>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
