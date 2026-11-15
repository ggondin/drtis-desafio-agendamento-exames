# Agendamento de exames e laudos

Aplicação para agendar exames, publicar laudos e permitir que pacientes consultem seus próprios resultados.

**Tecnologias:** React, TypeScript, Vite, Material UI, Node.js, Express e SQLite.

**Estrutura:** `front/` (interface), `back/` (API e banco) e `api/` ([documentação das rotas](api/README.md)).

**Pré-requisito:** Node.js 22.22.0 ou superior com npm.

## Instalação e execução

```powershell
git clone https://github.com/ggondin/drtis-desafio-agendamento-exames.git
cd drtis-desafio-agendamento-exames
```

Em um terminal, inicie o backend e prepare os dados fictícios:

```powershell
cd back
npm ci
npm run db:seed
npm run dev
```

Em outro terminal, a partir da pasta do projeto, inicie o frontend:

```powershell
cd front
npm ci
npm run dev
```

Acesse [http://localhost:4200/](http://localhost:4200/). A API roda em `http://127.0.0.1:3001`.

O banco é criado em `back/data/clinic.sqlite`. O seed pode ser executado novamente sem apagar dados, mas não redefine contas existentes. Em um banco novo, crie um agendamento para experimentar o fluxo.

A configuração padrão dispensa `.env`. Para personalizá-la, copie `back/.env.example` para `back/.env`. Se alterar a porta da API, ajuste também o proxy em `front/vite.config.ts`.

## Contas de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Clínica | `clinica@demo.com` | `Clinica@123` |
| Paciente | `mariana@demo.com` | `Paciente@123` |
| Outro paciente | `rafael@demo.com` | `Paciente@123` |

As contas são fictícias; utilize apenas dados de demonstração.

## Testes e build

Na pasta `back/`:

```powershell
npm test
npm run typecheck:tests
npm run build
```

`npm test` executa os testes unitários e de integração; `npm run test:unit` executa apenas os unitários. Os testes de integração usam banco em memória.

Na pasta `front/`:

```powershell
npm run build
```

O build do frontend também verifica a tipagem. Os arquivos gerados ficam em `front/dist/` e `back/dist/`. Após gerar ambos, execute `npm start` em `back/` e acesse [http://localhost:3001/](http://localhost:3001/) para testar a versão compilada.

## Decisões e limitações

- SQLite simplifica a execução local; o esquema é criado na inicialização, sem migrações versionadas. `node:sqlite` pode exibir aviso de recurso experimental.
- Um índice único impede agendamentos ativos no mesmo horário. Datas são armazenadas em UTC; a clínica usa UTC-03:00 fixo, sem ajuste automático para mudanças no horário de verão.
- A autenticação usa senhas com `scrypt`, sessões por cookie `HttpOnly` e autorização no backend. É uma implementação para demonstração, com limite de tentativas em memória e sem configuração de implantação ou HTTPS. Em produção, cookies `Secure` exigem HTTPS.
- Cada exame tem no máximo um laudo. Rascunhos são exclusivos da clínica; laudos publicados ficam disponíveis ao paciente e não podem ser editados.
- Não há cadastro de contas nem recuperação de senha. A interface não possui testes automatizados; a tela de laudo consulta a lista de agendamentos para localizar o exame.
- Desenvolvimento assistido por IA, com revisão e testes. Tempo aproximado: **2 horas**.
