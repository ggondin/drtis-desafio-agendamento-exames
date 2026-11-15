# API de agendamento de exames e laudos

API HTTP implementada em `back/`. O endereço local padrão é `http://127.0.0.1:3001/api`. Todas as requisições e respostas com corpo usam JSON e `Content-Type: application/json`.

Para iniciar e carregar as contas e exames fictícios, consulte o [README do backend](../back/README.md). As credenciais abaixo são exclusivas da demonstração:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Clínica | `clinica@demo.com` | `Clinica@123` |
| Paciente | `mariana@demo.com` | `Paciente@123` |
| Outro paciente | `rafael@demo.com` | `Paciente@123` |

## Autenticação e permissões

Faça login em `POST /auth/login`. A resposta inclui um cookie `session` com validade de oito horas, `HttpOnly` e `SameSite=Strict`; ele é `Secure` quando `NODE_ENV=production`. Envie esse cookie nas próximas requisições. No navegador, o frontend usa `/api` na mesma origem, com encaminhamento configurado no Vite durante o desenvolvimento.

As rotas exigem sessão, exceto o login. Rotas de clínica recusam pacientes com `403`. O paciente só pode consultar seus próprios agendamentos e seus laudos publicados. O backend responde `404` para agendamento de outro paciente e para laudo inexistente ou não disponível ao paciente. O cabeçalho `Origin`, quando enviado, deve ter o mesmo host e porta da requisição; clientes diretos podem omiti-lo. O login limita tentativas por IP: 30 requisições a cada 15 minutos.

## Datas e horários

A clínica usa horários fixos de 30 minutos em UTC-03:00, adotado como fuso de São Paulo neste exercício. Informe `startsAt` com segundos e deslocamento, por exemplo `2099-02-20T09:30:00-03:00`. A resposta da lista armazena e devolve `startsAt` em UTC, como `2099-02-20T12:30:00.000Z`. O filtro de data usa a data local da clínica (`YYYY-MM-DD`). Esta simplificação com deslocamento fixo não acompanha eventual mudança futura de horário de verão.

## Rotas

Os caminhos da tabela são relativos a `/api`.

| Método | Caminho | Acesso | Resultado |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Público | Autentica e cria sessão. |
| `GET` | `/auth/me` | Clínica ou paciente | Retorna a conta da sessão. |
| `POST` | `/auth/logout` | Clínica ou paciente | Encerra a sessão. |
| `GET` | `/patients` | Clínica | Lista pacientes cadastrados. |
| `GET` | `/exam-types` | Clínica ou paciente | Lista os tipos de exame. |
| `GET` | `/appointments` | Clínica ou paciente | Lista agendamentos, respeitando o perfil. |
| `POST` | `/appointments` | Clínica | Cria um agendamento. |
| `POST` | `/appointments/:id/cancel` | Clínica | Cancela um agendamento. |
| `GET` | `/appointments/:id/report` | Clínica ou paciente correspondente | Consulta um laudo disponível para o perfil. |
| `PUT` | `/appointments/:id/report` | Clínica | Cria ou atualiza o rascunho do laudo. |
| `POST` | `/appointments/:id/report/publish` | Clínica | Publica o rascunho. |

### Sessão

`POST /api/auth/login`

```json
{
  "email": "clinica@demo.com",
  "password": "Clinica@123"
}
```

Resposta `200`, além do cookie `session`:

```json
{
  "id": 1,
  "name": "Equipe Aurora",
  "email": "clinica@demo.com",
  "role": "clinic"
}
```

`GET /api/auth/me` retorna o mesmo formato para a sessão atual. `POST /api/auth/logout` retorna `204`, sem corpo, e remove o cookie. Os valores possíveis de `role` são `clinic` e `patient`.

### Pacientes e tipos de exame

`GET /api/patients` retorna `200` com objetos contendo `id` e `name`, ordenados pelo nome. Disponível somente para a clínica.

```json
[
  { "id": 2, "name": "Mariana Costa" },
  { "id": 3, "name": "Rafael Almeida" }
]
```

`GET /api/exam-types` retorna `200` com os exames cadastrados:

```json
[
  { "id": 1, "name": "Raio-X" },
  { "id": 2, "name": "Ultrassom" },
  { "id": 3, "name": "Ressonância magnética" }
]
```

### Agendamentos

`GET /api/appointments` aceita os filtros opcionais `date` e `patientId`. Exemplo para a clínica:

```http
GET /api/appointments?date=2099-02-20&patientId=2
Cookie: session=<cookie-da-sessao>
```

Para pacientes, o backend sempre restringe os resultados à própria conta e ignora o filtro `patientId`. A resposta `200` é uma lista:

```json
[
  {
    "id": 1,
    "patientId": 2,
    "patientName": "Mariana Costa",
    "examName": "Raio-X",
    "startsAt": "2099-02-20T12:30:00.000Z",
    "status": "scheduled",
    "reportStatus": null
  }
]
```

`status` pode ser `scheduled` ou `cancelled`. Para a clínica, `reportStatus` pode ser `draft`, `published` ou `null`. Para o paciente, aparece `published` somente quando publicado; caso contrário, é `null`, inclusive para rascunhos.

`POST /api/appointments` recebe paciente, tipo de exame e horário futuro:

```json
{
  "patientId": 2,
  "examTypeId": 1,
  "startsAt": "2099-02-20T09:30:00-03:00"
}
```

Resposta `201`:

```json
{ "id": 1 }
```

Há uma sala; dois agendamentos ativos não podem ocupar o mesmo horário. O horário de um agendamento cancelado pode ser reutilizado. Data passada, paciente ou exame inválido geram `400`; horário ocupado gera `409`.

`POST /api/appointments/:id/cancel` retorna `204` sem corpo. Um agendamento com laudo publicado não pode ser cancelado e retorna `409`.

### Laudos

`PUT /api/appointments/:id/report` cria o rascunho ou atualiza o rascunho existente. Campos obrigatórios: título e profissional com até 150 caracteres; texto com até 20.000 caracteres. Espaços nas extremidades são removidos, e valores vazios são recusados.

```json
{
  "title": "Laudo de raio-X",
  "content": "Conteúdo fictício de demonstração.",
  "professional": "Dra. Pessoa Exemplo"
}
```

Resposta `200`:

```json
{ "message": "Rascunho salvo." }
```

Cada agendamento possui no máximo um laudo. Rascunhos podem ser editados e consultados pela clínica; não são disponibilizados ao paciente. Agendamentos cancelados não podem receber nem ter seus laudos editados ou publicados (`409`).

`POST /api/appointments/:id/report/publish` publica um rascunho existente e retorna `200`:

```json
{ "message": "Laudo publicado." }
```

A API registra a data de publicação em UTC. Um laudo publicado não pode ser alterado ou publicado novamente (`409`). Tentativa de publicar sem rascunho retorna `404`.

`GET /api/appointments/:id/report` retorna `200` para a clínica ou para o paciente correspondente quando o laudo estiver publicado:

```json
{
  "id": 1,
  "title": "Laudo de raio-X",
  "content": "Conteúdo fictício de demonstração.",
  "professional": "Dra. Pessoa Exemplo",
  "status": "published",
  "publishedAt": "2099-02-20T13:00:00.000Z"
}
```

Antes da publicação, a clínica recebe `status: "draft"` e `publishedAt: null`. Para o paciente, um rascunho retorna `404`, sem o conteúdo.

## Respostas de erro

Erros normalmente têm o formato abaixo; mensagens variam conforme a situação:

```json
{ "message": "Esse horário já foi reservado. Escolha outro." }
```

Erros de validação podem incluir `fields` com mensagens por campo. Respostas relevantes:

| Código | Significado |
| --- | --- |
| `400` | Dados ausentes ou inválidos, data inválida ou horário passado. |
| `401` | Credenciais incorretas ou sessão ausente/expirada. |
| `403` | Perfil sem permissão ou origem não autorizada. |
| `404` | Recurso inexistente ou não disponível para aquele paciente. |
| `409` | Conflito de horário ou operação proibida pelo estado do agendamento/laudo. |
| `429` | Limite de tentativas de login excedido. |
| `500` | Erro interno inesperado. |

## Testes

Na pasta `back/`, execute `npm run test:unit` para os testes unitários ou `npm test` para a suíte completa. Os testes de integração usam SQLite em memória e não alteram o banco local.
