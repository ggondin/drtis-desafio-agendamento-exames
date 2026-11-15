# Agendamento de exames e laudos

Aplicação web para uma clínica: a equipe agenda exames e publica laudos, e cada paciente consulta seus próprios exames e os laudos publicados. O projeto foi desenvolvido para o desafio técnico com dados fictícios.

## Tecnologias

- **Frontend:** React, TypeScript, Vite, React Router, Material UI, MUI X e Lucide React.
- **Backend:** Node.js, TypeScript, Express e Zod.
- **Banco:** SQLite, por meio do módulo `node:sqlite` do Node.js.
- **Testes:** Node Test Runner e Supertest.

O desenvolvimento foi assistido por IA, com revisão iterativa dos fluxos e execução de testes. Tempo aproximado dedicado: **2 horas**, estimativa informada ao concluir a revisão da documentação.

## Estrutura

```text
front/  Aplicação React; dependências, configuração e build próprios
back/   API Node.js; dependências, regras, testes e banco próprios
api/    Documentação das rotas e exemplos HTTP
```

A [documentação da API](api/README.md) descreve autenticação, rotas, permissões, exemplos e respostas de erro. Os detalhes de cada aplicação estão nos arquivos [front/README.md](front/README.md) e [back/README.md](back/README.md).

## Pré-requisitos

- **Node.js 22.22.0 ou superior**, com npm. A versão mínima considera a versão do React Router registrada no frontend.
- Os comandos foram verificados no Windows com Node.js **22.23.2** e npm **11.21.2**.
- Navegador moderno com JavaScript habilitado.

O módulo `node:sqlite` pode exibir um aviso de recurso experimental. No ambiente usado para a revisão, o aviso não impediu a execução ou os testes.

## Instalação e execução

Clone o repositório e acesse a pasta do projeto:

```powershell
git clone https://github.com/ggondin/drtis-desafio-agendamento-exames.git
cd drtis-desafio-agendamento-exames
```

Abra dois terminais na pasta raiz do projeto. Os exemplos usam PowerShell; em outros sistemas, use o comando equivalente para copiar arquivos.

### 1. Backend e banco de demonstração

No primeiro terminal:

```powershell
cd back
npm ci
npm run db:seed
npm run dev
```

A API inicia em `http://127.0.0.1:3001`. A estrutura do SQLite é criada automaticamente em `back/data/clinic.sqlite`; o seed adiciona três contas e três tipos de exame fictícios. Ele pode ser executado novamente sem apagar os dados existentes. Como usa inserções que ignoram conflitos, não redefine senhas ou registros já existentes.

A configuração padrão funciona sem arquivo `.env`. Para personalizá-la, copie o exemplo **dentro de `back/`**:

```powershell
Copy-Item .env.example .env
```

O exemplo contém porta, caminho do banco e ambiente, sem credenciais reais. Os caminhos relativos do banco partem de `back/`. Se mudar `PORT`, atualize também o destino do proxy em `front/vite.config.ts`.

### 2. Frontend

No segundo terminal, ainda na raiz do projeto:

```powershell
cd front
npm ci
npm run dev
```

Acesse **http://localhost:4200/**. A lista começa vazia em um banco novo: entre com a conta da clínica e crie um agendamento para experimentar o fluxo.

### Contas fictícias

| Perfil             | E-mail                   | Senha               |
| ------------------ | ------------------------ | ------------------- |
| Clínica            | `clinica@demo.com`       | `Clinica@123`       |
| Paciente           | `mariana@demo.com`       | `Paciente@123`      |
| Outro paciente     | `rafael@demo.com`        | `Paciente@123`      |

Use somente dados fictícios. Essas contas são conhecidas e existem para facilitar a avaliação.

## Testes e build

Na pasta `back/`:

```powershell
npm run test:unit
npm test
npm run typecheck:tests
npm run build
```

`npm run test:unit` executa os testes unitários; `npm test` inclui também os testes de integração. Os testes de integração usam banco em memória e não modificam `back/data/clinic.sqlite`. Na revisão, **29 testes passaram**: 15 unitários e 14 de integração.

Na pasta `front/`:

```powershell
npm run typecheck
npm run build
```

O build do frontend é gerado em `front/dist/`; o do backend, em `back/dist/`. Depois de gerar ambos, `npm start` executado em `back/` inicia a API e serve o frontend compilado no mesmo endereço local. Essa é uma alternativa para avaliação local; a execução em desenvolvimento usa os dois terminais acima.

## Decisões técnicas

- **Projetos separados:** frontend e backend têm instalações e configurações independentes. A pasta `api/` concentra o contrato HTTP.
- **SQLite:** banco local sem serviço externo, escolhido para simplificar o teste. O esquema é criado na inicialização, e o seed prepara apenas dados fictícios.
- **Conflito de horários:** um índice único parcial no banco impede que dois agendamentos ativos ocupem o mesmo horário. Cancelamentos liberam o horário para reutilização.
- **Autenticação:** senhas são armazenadas com `scrypt` e salt; sessões usam token aleatório armazenado em hash e cookie `HttpOnly` e `SameSite=Strict`, com validade de oito horas. A autorização é verificada pelo backend.
- **Laudos:** cada agendamento tem no máximo um laudo; rascunhos pertencem à clínica, e a publicação registra data e impede edição posterior e cancelamento do exame.
- **Interface:** rotas e layout são separados das telas; diálogos ficam em `front/src/components/dialogs/`. As cores globais são variáveis CSS, usadas também pelo tema do MUI. As páginas são carregadas por rota.
- **Fuso:** entrada em intervalos de 30 minutos com deslocamento fixo UTC-03:00; armazenamento em UTC e exibição em São Paulo.

## Limitações e pontos para evolução

- O deslocamento UTC-03:00 é fixo na API; uma futura mudança de horário de verão exigiria rever a conversão e os filtros.
- O projeto usa `node:sqlite`, que pode estar marcado como experimental na versão de Node utilizada. O esquema usa `CREATE TABLE IF NOT EXISTS`, sem mecanismo de migrações versionadas.
- As contas de demonstração são criadas pelo seed. Não há telas de cadastro de pacientes, recuperação de senha ou administração de contas.
- A autenticação é simplificada para o exercício: o limite de tentativas fica em memória, o servidor escuta apenas em `127.0.0.1` e não há configuração de HTTPS ou implantação. Com `NODE_ENV=production`, o cookie é marcado como `Secure` e requer uma configuração de HTTPS adequada.
- Os testes automatizados cobrem regras e integração da API. Os fluxos do frontend foram revisados manualmente no navegador, incluindo a apresentação responsiva; ainda não há uma suíte automatizada de interface.
- A tela do laudo busca a lista de agendamentos para localizar o exame selecionado; uma rota de detalhe e paginação seriam melhorias para volumes maiores.
- Conforme o escopo do desafio, não há geração de PDF, anexos, assinatura digital ou validação clínica do texto do laudo.
