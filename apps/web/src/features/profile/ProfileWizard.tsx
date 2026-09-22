import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveProfile,
  type Profile,
  type UpsertProfileBody,
} from "../../shared/lib/api";
import { ProfileForm } from "./ProfileForm";

type ProfileWizardProps = {
  onSaved: (profile: Profile) => void;
};

export function ProfileWizard({ onSaved }: ProfileWizardProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: UpsertProfileBody) => saveProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile"], profile);
      onSaved(profile);
    },
  });

  return (
    <section className="panel space-y-4">
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Configurar QuestLog
        </h2>
        <p style={{ color: "var(--ql-muted)" }}>
          Informe os repos e o padrão de ticket da sua realidade. Você pode
          mudar isso depois em Settings.
        </p>
      </div>
      <ProfileForm
        initialProfile={null}
        submitLabel="Salvar e abrir o board"
        isPending={mutation.isPending}
        errorMessage={
          mutation.error instanceof Error ? mutation.error.message : null
        }
        onSubmit={(body) => mutation.mutate(body)}
      />
    </section>
  );
}
