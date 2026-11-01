import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Cómo funciona — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Registrá tu empresa, verificala y empezá a publicar o buscar arroz en AgroLocal." },
      { property: "og:title", content: "Cómo funciona AgroLocal" },
      { property: "og:description", content: "Cuatro pasos para vender o comprar arroz entre empresas verificadas." },
    ],
  }),
  component: Page,
});

const STEPS = [
  ["Creá tu cuenta", "Con tu email y una contraseña. Te enviamos un correo para confirmarla."],
  ["Registrá tu empresa", "Razón social, CUIT, ubicación y actividad. Podés comprar y vender con la misma empresa."],
  ["Esperá la verificación", "El equipo de AgroLocal revisa los datos. Te avisamos si necesitamos algo más."],
  ["Publicá o buscá", "Cargá ofertas o demandas, mirá el mercado y contactá a otras empresas verificadas."],
];

function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">Cómo funciona</h1>
      <ol className="mt-8 space-y-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary font-display text-lg font-bold">{i + 1}</span>
            <div><h2 className="text-lg font-semibold">{t}</h2><p className="text-muted-foreground">{d}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-muted-foreground">
        Las ofertas y demandas son públicas. Los datos de contacto solo se muestran a empresas verificadas. AgroLocal no procesa pagos.
      </p>
      <Button asChild variant="lime" size="xl" className="mt-6"><Link to="/auth" search={{ mode: "signup" }}>Empezar ahora</Link></Button>
    </div>
  );
}
