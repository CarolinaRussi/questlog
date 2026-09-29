import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveProfile,
  type Profile,
  type UpsertProfileBody,
} from "../../shared/lib/api";
import { GeminiSettings } from "./GeminiSettings";
import { JiraSettings } from "./JiraSettings";
import { ProfileForm } from "./ProfileForm";
import { SprintSettings } from "../sprint/SprintSettings";

type ProfileSettingsProps = {
  profile: Profile;
  onBack: () => void;
};

export function ProfileSettings({ profile, onBack }: ProfileSettingsProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: UpsertProfileBody) => saveProfile(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
    },
  });

  return (
    <section className="panel space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Settings
          </h2>
          <p style={{ color: "var(--ql-muted)" }}>
            Paths, regex de ticket, Jira, Gemini e preferências do perfil ativo.
          </p>
        </div>
        <button type="button" className="text-sm font-semibold" onClick={onBack}>
          Voltar
        </button>
      </div>

      <JiraSettings />

      <GeminiSettings />

      <SprintSettings />

      <ProfileForm
        key={profile.id}
        initialProfile={profile}
        submitLabel="Salvar alterações"
        isPending={mutation.isPending}
        errorMessage={
          mutation.error instanceof Error ? mutation.error.message : null
        }
        onSubmit={(body) => mutation.mutate(body)}
      />
      {mutation.isSuccess ? (
        <p className="text-sm font-medium" style={{ color: "var(--ql-accent)" }}>
          Perfil atualizado.
        </p>
      ) : null}
    </section>
  );
}
