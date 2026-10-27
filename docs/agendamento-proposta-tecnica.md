# Sistema de agendamento: proposta técnica (Etapa 1)

Status: só proposta. Nada foi publicado e nada foi cobrado.

## Ambiente analisado
- Site estático gerado por `build.mjs` e publicado no Netlify, com Node 22.
- Funções serverless já existentes em `netlify/functions`.
- E-mail via Gmail SMTP com nodemailer (`netlify/lib/email.mjs`).
- `/admin` é o painel do blog (Decap CMS) e **não será alterado**.
- O ambiente de desenvolvimento tem PostgreSQL 16, o que permite testar localmente as travas contra reserva duplicada.

## Arquitetura
- **Páginas do paciente**: `/agendar`, em HTML e JS sem framework, no mesmo padrão do site.
- **Painel**: `/painel`, separado do `/admin`.
- **Backend**: novas Netlify Functions em `/api/agenda/*`. As chaves ficam só em variáveis de ambiente do Netlify e nunca chegam ao navegador.
- **Fuso horário**: todos os cálculos usam America/Sao_Paulo.
- **Pagamento**: o provedor Pix fica isolado num módulo próprio. Assim dá para testar com um provedor simulado e trocar de provedor sem reescrever o resto.

### Fluxo do paciente
1. O paciente preenche o formulário.
2. O sistema cria um **pedido** e uma cobrança Pix com `externalReference` igual ao id do pedido.
3. A página mostra o QR Code e o código copia e cola, e consulta o status do pedido.
4. O provedor envia o webhook, que é autenticado.
5. O servidor **consulta o pagamento na API do provedor** e marca o pedido como pago.
6. Pedido pago libera o calendário.
7. A reserva é feita numa transação que grava a consulta e consome o pedido.
8. Os e-mails ficam numa fila com status e registro de tentativas.

O link de retomada é `/agendar?p=<id>&t=<token>`. Ele fica guardado no navegador e também vai por e-mail assim que o Pix é confirmado. Se algo falhar depois do pagamento, o paciente volta por esse link sem pagar de novo.

## Banco de dados
**PostgreSQL no Supabase** (região São Paulo). O login do painel usa o Supabase Auth, com perfis `admin` e `assistente`.

Tabelas principais:
- `config` (valor, duração, intervalo, e-mail do admin, endereço)
- `agendas`
- `periodos_semanais`
- `excecoes` (bloqueios e horários extras)
- `pedidos`
- `pagamentos`
- `consultas`
- `emails`
- `auditoria`

Como cada regra é garantida:
- **Duplicidade de horário**: uma restrição `EXCLUDE USING gist (agenda_id WITH =, horario WITH &&)` vale para todas as consultas ativas. O banco rejeita qualquer sobreposição.
- **Duplicidade de webhook**: `pagamentos.provedor_id` é UNIQUE e o pedido só passa de pendente para pago uma vez.
- **Cobrança repetida**: se o pedido já tem uma cobrança pendente, o sistema reaproveita essa cobrança em vez de criar outra.
- **Duração**: cada consulta grava o próprio início e fim. Mudar a duração afeta só as consultas novas.
- **Modalidade**: cada modalidade aponta para uma agenda. Se as duas apontam para a mesma, a trava impede atendimentos simultâneos. Se apontam para agendas diferentes, as duas ficam independentes.
- **LGPD**: o sistema guarda só nome, e-mail, telefone e CPF (exigido pelo provedor Pix). Nenhum dado clínico é guardado. Há termo de aceite, um usuário de acesso restrito e registro de auditoria.

## Provedor Pix recomendado: **Asaas**
| Critério | Asaas | Mercado Pago | Efí |
|---|---|---|---|
| Taxa Pix | Valor fixo por Pix, ~R$ 1–2 (a confirmar) | ~0,5–1% (a confirmar) | ~1% (a confirmar) |
| Mensalidade | R$ 0 | R$ 0 | R$ 0 |
| Integração | Simples (REST) | Simples | Mais difícil (certificado mTLS) |
| Webhook autenticado | Token no cabeçalho | Assinatura HMAC | mTLS |
| QR Code e copia e cola | Sim | Sim | Sim |
| Consulta de status e reembolso | Sim | Sim | Sim |
| Sandbox com confirmação simulada | **Sim** | Limitado para Pix | Sim |

A taxa fixa é mais barata que a percentual em consultas acima de ~R$ 200. O sandbox do Asaas permite simular a confirmação do pagamento, o que é necessário para os testes obrigatórios.

## E-mail recomendado: **Resend**
- Plano gratuito com 3.000 e-mails por mês.
- A API registra cada envio.
- Exige configurar SPF e DKIM no domínio, o que melhora a entrega.

Alternativa sem custo nem configuração: o **Gmail SMTP que o site já usa**, com limite de cerca de 500 e-mails por dia. Ele serve para começar. O código fica preparado para trocar de serviço só mudando uma variável.

## Custos recorrentes (estimativa)
| Item | Mensal |
|---|---|
| Netlify | R$ 0 (plano atual) |
| Supabase Free | R$ 0. O plano gratuito pausa após 7 dias sem uso e não faz backup diário |
| Supabase Pro (recomendado em produção) | ~US$ 25 (~R$ 140), com backup diário |
| Resend ou Gmail | R$ 0 |
| Pix (Asaas) | ~R$ 1–2 por consulta paga |

**Total: de R$ 0 a ~R$ 140 por mês, mais ~R$ 1–2 por Pix.**

Para economizar, dá para usar o Supabase Free com uma exportação diária automática de backup. A recuperação nesse caso é manual.

## Principais riscos
1. **Paciente paga e não encontra horário.** Mitigação: mostrar uma prévia só de leitura dos dias com vaga antes do pagamento, e definir uma política de reembolso.
2. **Webhook falso ou perdido.** Mitigação: validar o token, confirmar sempre pela API do provedor e também consultar o status ativamente pela página.
3. **E-mail caindo no spam.** Mitigação: domínio autenticado ou Gmail.
4. **Free tier pausando ou sem backup.** Mitigação: usar o plano Pro ou o backup diário automático.
5. **Fuso horário e horário de verão.** Mitigação: todos os cálculos em America/Sao_Paulo, com testes automatizados.
6. **CPF obrigatório no Asaas.** Mitigação: informar o paciente na tela.

## Plano de implementação
| Etapa | Entrega | Depende de você? |
|---|---|---|
| 2 | Banco (migrations), cálculo de horários, reserva com trava, testes automatizados contra PostgreSQL local | Não |
| 3 | Fluxo do paciente com **provedor Pix simulado**, fila de e-mails, link de retomada | Não |
| 4 | Painel: agenda dia, semana e mês; configurações; bloqueios com alerta de conflito; cancelar e reagendar; logs | Não |
| 5 | Integração com o Asaas em **sandbox** e os 16 testes obrigatórios | Sim: conta sandbox no Asaas |
| 6 | Supabase real, e-mail real, deploy de **pré-visualização** | Sim: contas e variáveis no Netlify |
| 7 | Produção e primeira cobrança real | Sim: sua autorização expressa |

## O que depende de você
- PF ou PJ (define a conta Asaas e o CPF ou CNPJ).
- Criar contas no Asaas (sandbox) e no Supabase. As chaves vão direto nas variáveis do Netlify e nunca devem ser enviadas pelo chat.
- Acesso ao DNS do domínio, se optar pelo Resend.
- Endereço do atendimento presencial, valor inicial e e-mail que recebe as confirmações. Tudo isso pode ser preenchido depois, no painel.
