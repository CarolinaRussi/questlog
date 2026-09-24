# QuestLog

Quadro pessoal pra quem usa **Jira** no dia a dia.

O Jira é o mapa do time. Ele não guarda o contexto da *sua* sessão: o que falta pra retomar, qual commit foi de qual tarefa, o que você pausou ontem, o épico em volta. Isso some na primeira troca de contexto. O QuestLog fica no meio (no seu PC, sem nuvem e sem o time olhando).

A integração é **só com o Jira**. Não tem ClickUp, Linear, Trello nem “qualquer ferramenta de ticket”. Se o seu dia não passa pelo Jira, este projeto não é pra você.

A unidade do quadro é a **quest** (“estou nisso”), não o card do Jira. Título, tickets, épico se fizer sentido, o que falta, e o resumo do que você já fez. Tudo fica nesta máquina: sem conta, sem sync na nuvem.

## O que ele faz

- Mostra o que está **em aberto** pra você: quests em andamento, pausadas, arquivadas. Sem varrer backlog dos outros.
- Na hora de pausar, pede o que **falta** para finalizar a quest. É o recado que você lê quando voltar a mexer na tarefa, para não se perder.
- **Sincronizar com o Jira** atualiza o que já está no quadro e puxa issues **abertas no seu nome**. O épico entra só como contexto das *suas* tarefas. Card do time, sem responsável ou de outra pessoa não entra (e o refresh tira o que tiver vindo por engano).
- Se você usa Cursor, o `git commit` entra no resumo do épico (Gemini). Se for um ticket **novo no seu nome**, o hook cria a quest sozinho — sem clicar Sincronizar com o Jira.

Ele não substitui o Jira e não é o backlog do time. É o seu caderno ao lado.

## No que ajuda

- Voltar segunda-feira (ou depois de uma interrupção) e lembrar o que estava na sua mão.
- Trocar de tarefa sem ficar perdido: o resumo do épico junta o que *você* já fez até ali.
- Ter um arquivo seu (do que você fez, não o épico inteiro do time).
- Amarração commit ↔ quest sem travar o `git commit` se o QuestLog falhar.

## Instalar (um clique)

1. No GitHub: **Code → Download ZIP** (ou clone). Extraia a pasta.
2. Duplo clique em **`instalar.bat`**
3. Espera. Na primeira vez instala o que faltar (Node/pnpm) e gera o programa — pode levar vários minutos.
4. O QuestLog abre sozinho e ganha atalho na Área de Trabalho. Também registra para abrir no login.

O Windows pode avisar que o app **não tem editor conhecido**. Se você gerou daqui, pode avançar.

## Primeira vez no app

O instalador não adivinha seus repositórios nem seu Jira. No quadro, **Settings**:

1. **Pastas dos repos** — caminho completo, tipo `C:\Users\SeuNome\projetos\meu-repo`
2. **Padrão de ticket** — se você usa códigos tipo `PROJ-123`
3. **Jira** — Base URL + email + [token da API](https://id.atlassian.com/manage-profile/security) (não é a senha)
4. **Gemini** (opcional) — chave do [Google AI Studio](https://aistudio.google.com/apikey) para resumo de épicos

Token e chave ficam **só neste PC**. Outro computador = configurar de novo.

Se **Sincronizar com o Jira** pedir credencial: Settings → Jira. Isso não vai no GitHub.

## Todo dia

O app deve abrir uns 20 s depois do login. Se não abrir, usa o atalho **QuestLog** da Área de Trabalho.

- Olha **Em andamento** e **Pausadas**
- Ao pausar, escreve o que **falta**
- **Sincronizar com o Jira** quando quiser puxar o que caiu no seu nome e atualizar o que já está no quadro

Dados (quadro, tokens): `C:\Users\SEU-USUARIO\AppData\Roaming\questlog`

Pra não abrir no login: `pnpm desktop:startup:remove`

## Commits no quadro (opcional)

Só com **Cursor**. Sem isso o programa já funciona.

`git commit` no terminal do Cursor fica gravado pra entrar no resumo do épico. Sem aviso na tela.

Guia: [cursor/HOOKS.md](cursor/HOOKS.md).

## Atualizar

Baixa de novo a pasta (ou `git pull`) e roda o **`instalar.bat`** outra vez. Seus dados não apagam.

---

## Para quem desenvolve

```powershell
pnpm desktop          # janela a partir do clone
pnpm start            # http://127.0.0.1:5173
```

CLI: `remind`, `ingest-commit`, `refresh-jira`, `import-jira`.

`.env` na raiz é opcional (CLI / overrides). O app lê Jira e Gemini do Settings.

Plano: [questlog-PLAN.md](questlog-PLAN.md).
