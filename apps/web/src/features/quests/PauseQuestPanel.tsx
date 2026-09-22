import { useState } from "react";

const MIN_FALTA_LENGTH = 3;

type PauseQuestPanelProps = {
  questTitulo: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (falta: string) => void;
};

export function PauseQuestPanel({
  questTitulo,
  isPending,
  onCancel,
  onConfirm,
}: PauseQuestPanelProps) {
  const [falta, setFalta] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = falta.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_FALTA_LENGTH;
  const missing = trimmed.length === 0;
  const canSubmit = trimmed.length >= MIN_FALTA_LENGTH && !isPending;

  return (
    <div
      className="space-y-3 rounded-xl border px-4 py-4"
      style={{
        borderColor: "var(--ql-accent)",
        background: "#f0fdfa",
      }}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide">
          Pausar quest
        </p>
        <p className="font-medium">{questTitulo}</p>
        <p className="text-sm" style={{ color: "var(--ql-muted)" }}>
          Antes de sair, anote o que falta. Isso é o que você lê ao retomar —
          sem depender de branch ou chat.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">O que falta?</span>
        <textarea
          className="field min-h-24"
          placeholder="Ex.: terminar o endpoint de login e pedir review"
          value={falta}
          autoFocus
          onChange={(event) => setFalta(event.target.value)}
          onBlur={() => setTouched(true)}
        />
      </label>

      {touched && missing ? (
        <p className="text-sm text-red-800">
          Preencha o campo Falta para pausar.
        </p>
      ) : null}
      {tooShort ? (
        <p className="text-sm text-red-800">
          Escreva pelo menos {MIN_FALTA_LENGTH} caracteres.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--ql-accent)" }}
          disabled={!canSubmit}
          onClick={() => {
            setTouched(true);
            if (!canSubmit) return;
            onConfirm(trimmed);
          }}
        >
          {isPending ? "Pausando…" : "Confirmar pausa"}
        </button>
        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--ql-border)" }}
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
