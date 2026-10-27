# Central de agendamentos: diagnóstico inicial

Data: 27/10/2026. Referência: Tua Agenda (`client.tuaagenda.com/c/RodrigoHipnoseClinica`).
Status: só análise. Nada foi desenvolvido, alterado ou migrado.

## 1. O que foi verificado

- O link público **não abriu neste ambiente**: o domínio está bloqueado pela rede da sessão. Nenhuma tela da sua página foi vista.
- Funções gerais do Tua Agenda, segundo a loja de apps: página de agendamento com link próprio, cadastro de serviços e profissionais, aviso de novo agendamento, lembretes automáticos para o cliente e opção de desligar o agendamento online.
- Pagamento antecipado ou Pix no Tua Agenda: **não encontrei confirmação**.
- O site atual (Netlify) agenda pelo WhatsApp e informa que valor e horários são passados no atendimento. Ele já tem funções serverless, Netlify Blobs e envio de e-mail (nodemailer), que podem ser reaproveitados.

## 2. O que precisa ser confirmado (capturas de tela)

1. Página pública: lista de serviços com nome, duração e preço, e cada etapa até concluir.
2. Modalidades: presencial (endereço) e online (qual plataforma de vídeo).
3. Regras de horário: dias e horas de atendimento, intervalo entre sessões, antecedência mínima e máxima.
4. Política de cancelamento e reagendamento (prazo, multa, reembolso).
5. Dados pedidos ao paciente (nome, telefone, e-mail, CPF, outros).
6. Lembretes: canal (WhatsApp, e-mail ou SMS), horário e texto.
7. Se o Tua Agenda cobra hoje algum pagamento e por qual meio.
8. Sincronização com o Google Agenda.
9. Volume: consultas por mês e quantas são avaliações.
10. Plano e custo mensal atual do Tua Agenda.
11. Se você é pessoa física ou PJ (afeta gateway, tarifas e nota fiscal).

## 3. O que reproduzir ou melhorar

| Funcionalidade | Ação |
|---|---|
| Página pública com serviços | Reproduzir no domínio próprio |
| Escolha entre presencial e online | Reproduzir, com regras de horário separadas por modalidade |
| Calendário de horários livres | Reproduzir e liberar **só depois do pagamento** |
| Confirmação e lembretes | Melhorar: e-mail mais WhatsApp, com link para Meet ou Zoom no online |
| Cancelar ou reagendar pelo paciente | Melhorar: link seguro, com prazo da política aplicado automaticamente |
| Pagamento da avaliação | Novo: Pix e cartão, confirmados por webhook |
| Painel administrativo | Novo: perfis para você e para a assistente |
| Bloqueio de agenda (férias, feriados) | Reproduzir |
| Sincronização com o Google Agenda | Recomendado, nos dois sentidos |
| Termo de consentimento e LGPD | Novo e obrigatório (dados de saúde são sensíveis) |

## 4. Pagamento obrigatório antes do calendário

Fluxo:

1. O paciente escolhe a modalidade e preenche nome, e-mail, WhatsApp e CPF. Também aceita o termo e a política.
2. O sistema cria um **pedido** com status `pendente` e gera a cobrança no gateway (Pix copia e cola ou QR, e cartão).
3. O gateway avisa o servidor por **webhook**. O servidor confere a assinatura e consulta o pagamento na API do gateway. O redirecionamento do navegador nunca é tratado como prova de pagamento.
4. O pedido passa a `pago` e gera um **crédito de uso único**, que é um token com validade de 30 dias, por exemplo.
5. O link com o token abre o calendário. Ao escolher um horário, o crédito é consumido e a consulta é criada.

Requisitos:

- Conta em gateway com API e webhook (Mercado Pago, Asaas ou Pagar.me).
- Domínio com HTTPS (já existe).
- Banco de dados transacional.
- Política escrita de reembolso, validade do crédito e não comparecimento.
- Emissão de recibo ou nota fiscal (depende de PF ou PJ).

## 5. Integração com a agenda e bloqueio de reservas duplicadas

- Use o PostgreSQL com uma restrição **EXCLUDE** sobre o intervalo de tempo de cada consulta ativa, ou uma restrição UNIQUE sobre (profissional, início) se a duração for fixa. O banco rejeita sozinho qualquer sobreposição, mesmo com dois cliques no mesmo segundo.
- Crie a consulta e consuma o crédito na **mesma transação**. Se a vaga já foi ocupada, nada é gravado e o paciente vê "horário acabou de ser ocupado, escolha outro". O crédito continua válido.
- O webhook precisa ser idempotente: o ID do pagamento é UNIQUE, então um aviso repetido não gera dois créditos.
- Google Agenda: grave cada consulta lá e leia os "ocupados" para esconder horários de compromissos pessoais.
- Presencial e online usam **a mesma agenda**, porque você não atende os dois ao mesmo tempo. A sala só entra como recurso separado se outra pessoa puder usá-la.

Como o pagamento vem antes da escolha, pode acontecer de o paciente pagar e não achar um horário que sirva. Para isso, mostre a disponibilidade dos próximos dias, só para leitura, **antes** de pagar, e defina o reembolso se nenhum horário servir.

## 6. Painel administrativo

É viável. Perfis sugeridos:

| Permissão | Você (admin) | Assistente |
|---|---|---|
| Ver e gerenciar agenda, reagendar, bloquear horários | sim | sim |
| Ver contato do paciente | sim | sim |
| Ver pagamentos | sim | só o status (pago ou pendente) |
| Fazer reembolsos, mudar preços e regras | sim | não |
| Anotações clínicas | sim | **não** |
| Gerenciar usuários e ver o log de auditoria | sim | não |

O login seria por e-mail com link mágico ou senha, mais 2FA. Toda ação fica registrada no log de auditoria. Para isso, uso o Supabase Auth com Row Level Security (RLS). Não uso o Netlify Identity, que foi descontinuado.

## 7. Arquitetura recomendada (proposta, ainda não definitiva)

- **Frontend e páginas**: o próprio site no Netlify (`/agendar` e `/painel`).
- **Backend**: Netlify Functions, como as que o site já usa (pedido, webhook, horários livres, reserva, cancelamento e lembretes agendados).
- **Banco e autenticação**: Supabase (PostgreSQL com RLS e Auth), região São Paulo. O Netlify Blobs não serve para isso, porque não tem transações nem restrições.
- **Pagamento**: Mercado Pago ou Asaas (Pix e cartão, com webhook).
- **Notificações**: e-mail pelo SMTP atual ou pelo Resend, e WhatsApp pela Cloud API oficial da Meta, com modelos de mensagem aprovados.
- **Vídeo**: link do Google Meet criado pela API do Google Agenda, ou link fixo de sala.

## 8. Custos previstos (estimativas a confirmar nas tabelas oficiais)

| Item | Faixa |
|---|---|
| Hospedagem Netlify | R$ 0 no plano atual (as funções cabem no limite gratuito) |
| Supabase | R$ 0 no plano Free. O Pro custa cerca de US$ 25/mês (~R$ 140) se quiser backups diários |
| Gateway: Pix | De 0% a cerca de 1% por transação |
| Gateway: cartão | Cerca de 3% a 5% por transação, conforme o prazo de recebimento |
| E-mail | R$ 0 (Gmail SMTP ou Resend Free, com 3 mil e-mails/mês) |
| WhatsApp Cloud API | Centavos por mensagem utilitária. Com 100 consultas/mês, fica abaixo de R$ 30/mês |
| Google Agenda e Meet | R$ 0 |
| **Total fixo** | **Entre R$ 0 e ~R$ 170/mês**, mais as taxas por pagamento |

## 9. Próxima etapa

1. Você envia as capturas e os dados da seção 2.
2. Escolhemos o gateway, comparando as tabelas oficiais conforme você seja PF ou PJ.
3. Fechamos a política de pagamento, reembolso e validade do crédito.
4. Só depois vem a arquitetura definitiva e um protótipo em ambiente de teste (sandbox do gateway), sem mexer no Tua Agenda.
