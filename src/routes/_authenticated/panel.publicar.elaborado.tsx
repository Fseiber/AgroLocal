import { createFileRoute } from "@tanstack/react-router";
import { PanelShell } from "@/components/panel-shell";
import { ListingForm } from "@/components/listing-form";
import { canOperate } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/panel/publicar/elaborado")({
  head: () => ({ meta: [{ title: "Publicar arroz elaborado — AgroLocal" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "description", content: "Publicá un lote de arroz elaborado." }, { property: "og:title", content: "Publicar arroz elaborado — AgroLocal" }, { property: "og:description", content: "Publicá un lote de arroz elaborado." }] }),
  component: () => (
    <PanelShell title="Publicar arroz elaborado">
      {({ membership, userId }) => canOperate(membership)
        ? <ListingForm product="elaborado" m={membership!} userId={userId} />
        : <p>Tu empresa debe estar verificada y necesitás permiso de operador para publicar.</p>}
    </PanelShell>
  ),
});
