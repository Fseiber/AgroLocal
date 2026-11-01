import { createFileRoute, Link } from "@tanstack/react-router";
import { Handshake, MessageCircle, Search, Sprout, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroLocal — El agro tiene oportunidades. AgroLocal las conecta." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Encontrá compradores para tu arroz o nuevas fuentes de abastecimiento en una plataforma simple pensada para el agro argentino." },
      { property: "og:title", content: "AgroLocal — Marketplace de arroz en Argentina" },
      { property: "og:description", content: "Publicá tu arroz, encontrá compradores compatibles y negociá directamente." },
    ],
  }),
  component: Index,
});

const BENEFITS = [
  { icon: Sprout, title: "Publicá tu producto", text: "Cargá tu arroz con cáscara o elaborado en pocos pasos." },
  { icon: Search, title: "Encontrá compradores", text: "Llegá a empresas que buscan exactamente lo que tenés." },
  { icon: MessageCircle, title: "Recibí consultas", text: "Los compradores verificados te contactan directo." },
  { icon: Handshake, title: "Negociá directamente", text: "Sin intermediarios: acordás precio y condiciones." },
  { icon: ClipboardList, title: "Gestioná oportunidades", text: "Controlá stock, reservas y ventas en un solo lugar." },
];

function Index() {
  return (
    <>
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
            Mercado interno de arroz · NEA
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            El agro tiene oportunidades. <span className="text-success">AgroLocal</span> las conecta.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Encontrá compradores para tus productos o descubrí nuevas oportunidades de abastecimiento mediante una
            plataforma comercial simple, pensada para el agro argentino.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="default" size="xl"><Link to="/auth" search={{ mode: "signup", intent: "sell" }}>Quiero vender</Link></Button>
            <Button asChild variant="lime" size="xl"><Link to="/mercado">Quiero comprar</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold">Cómo te ayuda AgroLocal</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border bg-card p-5 shadow-card">
              <b.icon className="h-8 w-8 text-success" />
              <h3 className="mt-3 font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 rounded-3xl bg-primary p-8 text-primary-foreground md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase text-secondary-foreground">Próximamente</span>
            <h2 className="mt-4 text-3xl font-bold">Publicá desde WhatsApp</h2>
            <p className="mt-2 max-w-xl opacity-90">
              Estamos preparando un asistente para que puedas cargar tu arroz con un mensaje de texto o de voz. Mientras
              tanto, todo funciona desde la web y el celular.
            </p>
          </div>
          <Users className="hidden h-24 w-24 opacity-30 md:block" />
        </div>
      </section>
    </>
  );
}
