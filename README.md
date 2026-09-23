# QuestLog

Um quadro **só seu**, no computador: o que está em andamento, o que falta, e o histórico do que você fez.

Não substitui o Jira. A unidade é a **quest** (o que você está tocando agora), não o card da empresa.

Tudo fica nesta máquina. Não tem conta na nuvem.

## Instalar (um clique)

1. No GitHub: **Code → Download ZIP** (ou clone). Extraia a pasta.
2. Duplo clique em **`instalar.bat`**
3. Espera. Na primeira vez instala o que faltar (Node/pnpm) e gera o programa — pode levar vários minutos.
4. O QuestLog abre sozinho e ganha atalho na Área de Trabalho. Também registra para abrir no login.

O Windows pode avisar que o app **não tem editor conhecido**. Se você gerou daqui, pode avançar.

Perfil Gran / HESEC: clique com o direito em `instalar.bat` não funciona para isso. No PowerShell, na pasta:

```powershell
.\instalar.ps1 -Gran
```

## Primeira vez no app — só o que é seu

O instalador **não** consegue adivinhar seus projetos nem seu Jira. No quadro, **Settings**:

1. **Pastas dos repos** — caminho completo, tipo `C:\Users\SeuNome\projetos\meu-repo`
2. **Padrão de ticket** — se você usa códigos tipo `PROJ-123`
3. **Jira** (opcional) — Base URL + email + [token da API](https://id.atlassian.com/manage-profile/security) (não é a senha)
4. **Gemini** (opcional) — chave do [Google AI Studio](https://aistudio.google.com/apikey) para resumo de épicos

Token e chave ficam **só neste PC**. Outro computador = configurar de novo.

Se **Status Jira** pedir credencial: Settings → Jira. Não está no GitHub.

## Todo dia

O app deve abrir ~20 s depois do login. Senão, use o atalho **QuestLog** da Área de Trabalho.

- Olhe **Em andamento** e **Pausadas**
- Ao pausar, escreva o que **falta**

Dados (quadro, tokens): `C:\Users\SEU-USUARIO\AppData\Roaming\questlog`

Para não abrir no login: `pnpm desktop:startup:remove`

## Commits no quadro (opcional)

Só com **Cursor**. Sem isso o programa já funciona.

`git commit` no terminal do Cursor entra na timeline **sem aviso**. Confira no quadro.

Guia: [cursor/HOOKS.md](cursor/HOOKS.md).

## Atualizar

Baixe de novo a pasta (ou `git pull`) e rode **`instalar.bat`** outra vez. Seus dados não apagam.

---

## Para quem desenvolve

```powershell
pnpm desktop          # janela a partir do clone
pnpm start            # http://127.0.0.1:5173
```

CLI: `remind`, `ingest-commit`, `refresh-jira`, `import-jira`.

`.env` na raiz é opcional (CLI / overrides). O app lê Jira e Gemini do Settings.

Plano: [questlog-PLAN.md](questlog-PLAN.md).
