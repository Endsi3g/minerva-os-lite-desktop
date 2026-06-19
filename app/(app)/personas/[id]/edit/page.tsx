import { PersonaForm } from "../../_components/persona-form";

export const metadata = {
  title: "Modifier le profil cible | Minerva OS Reach Lite",
};

interface EditPersonaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPersonaPage({ params }: EditPersonaPageProps) {
  const { id } = await params;
  return <PersonaForm personaId={id} />;
}
