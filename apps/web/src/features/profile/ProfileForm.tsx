import { useState } from "react";
import type { ReactNode } from "react";
import type { Profile, ProfileRepo, UpsertProfileBody } from "../../shared/lib/api";

export type ProfileFormValues = {
  name: string;
  repos: ProfileRepo[];
  ticketPattern: string;
  ticketPrefixLabel: string;
  ticketBaseUrl: string;
  ticketHasEpic: boolean;
  branchPattern: string;
  commitHint: string;
  locale: string;
};

const emptyRepo = (): ProfileRepo => ({ nome: "", path: "" });

export function profileToFormValues(profile: Profile | null): ProfileFormValues {
  if (!profile) {
    return {
      name: "default",
      repos: [emptyRepo()],
      ticketPattern: "",
      ticketPrefixLabel: "Ticket",
      ticketBaseUrl: "",
      ticketHasEpic: false,
      branchPattern: "",
      commitHint: "",
      locale: "pt-BR",
    };
  }

  return {
    name: profile.name,
    repos: profile.repos.length > 0 ? profile.repos : [emptyRepo()],
    ticketPattern: profile.ticketPattern,
    ticketPrefixLabel: profile.ticketPrefixLabel,
    ticketBaseUrl: profile.ticketBaseUrl,
    ticketHasEpic: profile.ticketHasEpic,
    branchPattern: profile.branchPattern ?? "",
    commitHint: profile.commitHint ?? "",
    locale: profile.locale,
  };
}

export function formValuesToBody(values: ProfileFormValues): UpsertProfileBody {
  return {
    name: values.name.trim(),
    repos: values.repos
      .map((repo) => ({
        nome: repo.nome.trim(),
        path: repo.path.trim(),
      }))
      .filter((repo) => repo.nome && repo.path),
    ticketPattern: values.ticketPattern.trim(),
    ticketPrefixLabel: values.ticketPrefixLabel.trim() || "Ticket",
    ticketBaseUrl: values.ticketBaseUrl.trim(),
    ticketHasEpic: values.ticketHasEpic,
    branchPattern: values.branchPattern.trim() || null,
    commitHint: values.commitHint.trim() || null,
    locale: values.locale.trim() || "pt-BR",
  };
}

type ProfileFormProps = {
  initialProfile: Profile | null;
  submitLabel: string;
  isPending: boolean;
  errorMessage: string | null;
  onSubmit: (body: UpsertProfileBody) => void;
};

export function ProfileForm({
  initialProfile,
  submitLabel,
  isPending,
  errorMessage,
  onSubmit,
}: ProfileFormProps) {
  const [values, setValues] = useState(() =>
    profileToFormValues(initialProfile),
  );

  function updateRepo(index: number, patch: Partial<ProfileRepo>) {
    setValues((current) => ({
      ...current,
      repos: current.repos.map((repo, repoIndex) =>
        repoIndex === index ? { ...repo, ...patch } : repo,
      ),
    }));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(formValuesToBody(values));
      }}
    >
      <Field label="Nome do perfil">
        <input
          className="field"
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          required
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide">Repos</p>
          <button
            type="button"
            className="text-sm font-semibold"
            style={{ color: "var(--ql-accent)" }}
            onClick={() =>
              setValues((current) => ({
                ...current,
                repos: [...current.repos, emptyRepo()],
              }))
            }
          >
            + repo
          </button>
        </div>
        {values.repos.map((repo, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-2">
            <Field label="Nome">
              <input
                className="field"
                value={repo.nome}
                placeholder="es-api"
                onChange={(event) =>
                  updateRepo(index, { nome: event.target.value })
                }
              />
            </Field>
            <Field label="Path absoluto">
              <input
                className="field"
                value={repo.path}
                placeholder="C:\\projetos\\es-api"
                onChange={(event) =>
                  updateRepo(index, { path: event.target.value })
                }
              />
            </Field>
          </div>
        ))}
      </div>

      <Field label="Regex do ticket">
        <input
          className="field"
          value={values.ticketPattern}
          placeholder="HESEC-\\d+"
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              ticketPattern: event.target.value,
            }))
          }
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label do ticket">
          <input
            className="field"
            value={values.ticketPrefixLabel}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                ticketPrefixLabel: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Base URL">
          <input
            className="field"
            value={values.ticketBaseUrl}
            placeholder="https://…/browse/"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                ticketBaseUrl: event.target.value,
              }))
            }
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.ticketHasEpic}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              ticketHasEpic: event.target.checked,
            }))
          }
        />
        Este perfil usa epic
      </label>

      <Field label="Regex da branch (opcional)">
        <input
          className="field"
          value={values.branchPattern}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              branchPattern: event.target.value,
            }))
          }
        />
      </Field>

      <Field label="Dica de commit">
        <input
          className="field"
          value={values.commitHint}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              commitHint: event.target.value,
            }))
          }
        />
      </Field>

      <Field label="Locale">
        <input
          className="field"
          value={values.locale}
          onChange={(event) =>
            setValues((current) => ({ ...current, locale: event.target.value }))
          }
        />
      </Field>

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "var(--ql-accent)" }}
      >
        {isPending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium" style={{ color: "var(--ql-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
