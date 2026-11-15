# Backend

Projeto Node.js + TypeScript. Execute os comandos dentro desta pasta:

```powershell
npm ci
npm run db:seed
npm run dev
```

API local: http://127.0.0.1:3001/api.

As rotas, permissões e exemplos de requisição estão na [documentação da API](../api/README.md).

Configuração opcional: copie `.env.example` para `.env` nesta pasta. O banco SQLite fica em `data/`.

- `npm run typecheck`: verifica TypeScript.
- `npm run typecheck:tests`: verifica a tipagem do código e dos testes.
- `npm run build`: gera o backend compilado em `dist/`.
- `npm start`: executa o backend compilado.
- `npm run test:unit`: executa somente os testes unitários em `tests/unit/`.
- `npm test`: executa os testes unitários e os testes de integração em `tests/`. Os testes de integração usam banco em memória sem alterar os dados locais.

Agendamentos e laudos foram revisados e têm testes automatizados. A clínica pode salvar e editar um rascunho por agendamento e publicá-lo; somente o paciente correspondente pode consultar o laudo publicado. As rotas de laudos ficam em `src/routes/reports.ts`.

As validações de entrada ficam em `src/validation/schemas.ts`, as regras e conversões de horários em `src/appointments/scheduling.ts` e o erro HTTP compartilhado em `src/errors/http-error.ts`.

As datas são armazenadas em UTC e os horários da clínica são interpretados no fuso de São Paulo com o deslocamento fixo UTC-03:00. A API recebe o horário no formato `2099-02-20T09:00:00-03:00`, em intervalos de 30 minutos. Esta simplificação não contempla eventual mudança futura nas regras de horário de verão.
