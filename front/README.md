# Frontend

Projeto React + TypeScript gerado a partir do template oficial do create-vite.

Requisito: Node.js 22.22.0 ou superior. O projeto foi verificado com Node.js 22.23.2.

Execute os comandos dentro desta pasta:

```powershell
npm ci
npm run dev
```

Endereço: http://localhost:4200/.

- `npm run typecheck`: verifica TypeScript.
- `npm run build`: verifica TypeScript e gera o build em `front/dist/`.
- `npm run preview`: abre uma prévia do build.

Todas as dependências e configurações do frontend pertencem a esta pasta. As telas de acesso, agendamentos e laudos estão conectadas ao backend.

Para testar o acesso, inicie o backend e execute `npm run db:seed` em `back/`. Conta fictícia da clínica: `clinica@demo.com` / `Clinica@123`. Conta fictícia de paciente: `mariana@demo.com` / `Paciente@123`.

As cores globais estão em `src/index.css` e são aplicadas aos componentes por variáveis CSS. O frontend usa o proxy `/api` para acessar o backend na porta 3001.

As rotas ficam em `src/routes/`, o layout em `src/layouts/`, cada tela e seu CSS em `src/pages/`, os tipos em `src/types/` e as chamadas HTTP em `src/services/`. O layout usa `Outlet` para renderizar a tela da rota protegida.

Os diálogos reutilizáveis ficam em `src/components/dialogs/`. O formulário de novo agendamento aparece como diálogo no computador e como painel inferior no celular. Os campos e diálogos utilizam MUI; data e horário usam os seletores do MUI X em português, com fuso de São Paulo.

A equipe pode cadastrar, consultar, filtrar e cancelar agendamentos. Para um exame agendado, pode cadastrar ou editar o rascunho do laudo e publicá-lo. O paciente consulta seus próprios exames e pode abrir os laudos publicados. Os horários são exibidos no fuso de São Paulo.

As rotas de laudos e seus estilos ficam em `src/pages/reports/`. Os ícones usados na interface vêm da biblioteca Lucide React. A publicação salva o conteúdo atual antes de publicar e solicita confirmação, pois um laudo publicado não pode ser alterado e o agendamento não pode mais ser cancelado.
