# Agenda própria: como funciona e como ativar

O pagamento pode funcionar de dois jeitos, e a escolha fica em Configurações → Pagamento via Pix:
- **Pix desligado:** o paciente agenda direto e acerta o pagamento com o Dr. Rodrigo.
- **Pix ligado:** o paciente informa os dados e a selfie e paga o Pix. Depois que o provedor confirma o pagamento, o calendário é liberado para ele escolher o horário.

## Quem escolhe o horário (por modalidade)
Em **Horários de atendimento**, cada modalidade tem a opção **"Paciente escolhe o horário no calendário do site"**:
- **Presencial (padrão: desmarcado):** o paciente não acessa o calendário. Ele envia o cadastro (dados, selfie e preferências de horário) e entra em **Clientes → Aguardando agendamento**. Você combina a data pelo WhatsApp e clica em **Agendar**: o cadastro já vem preenchido.
- **Online (padrão: marcado):** com o Pix ligado, o paciente paga e acessa o calendário. Se não achar um horário, pode clicar em "prefiro combinar pelo WhatsApp". O pagamento fica reservado e é vinculado automaticamente quando você agendar pelo painel.
- O servidor também bloqueia o calendário das modalidades sem acesso; não é só uma questão da página.
- Você recebe um aviso por e-mail e, se configurado, pelo WhatsApp (modelo `cliente_aguardando`) sempre que alguém entra na lista.
- Em **Clientes → + Novo cliente**, você cadastra quem não conseguiu fazer o cadastro sozinho, com a opção de já colocar na lista de espera.

## Sessões (links pessoais, só o administrador)
Na aba **Sessões** você gera um link para o cliente e envia pelo botão **WhatsApp**. Pelo link, ele vê apenas o botão **"Agendar sua sessão"**.

- **Pessoal e de uso único:** cada link permite um único agendamento. Depois de usado, não serve para agendar de novo, nem se for repassado.
- **Pix antes dos horários** (opção marcada por padrão quando a sessão tem valor): o link mostra o Pix da sessão (QR Code e copia e cola). Quando o cliente paga, o **Asaas avisa a agenda e os horários aparecem sozinhos**, sem comprovante e sem você conferir. O CPF só é pedido no primeiro Pix do cliente. Pagamento com valor menor não libera. Se ele pagou de outro jeito, use **Liberar sem Pix** na lista de links. Você recebe um e-mail a cada Pix de sessão recebido.
- Por que não pelo comprovante no WhatsApp: comprovante pode ser falsificado ou reaproveitado; a confirmação direta do banco (Asaas) é a única garantia real.
- **Validade de 12 horas** (editável): depois disso o link expira e o cliente precisa pedir um novo pelo WhatsApp. Se ele já pagou o Pix, o link não expira até ele agendar. O link já usado continua abrindo só para o cliente ver a sessão e pedir desmarcação.
- **Data liberada pelo histórico do cliente,** calculada na hora, não importa quando o link for aberto:

  | Situação do cliente | Horários a partir de | Exemplo |
  |---|---|---|
  | Nunca teve sessão | data de envio do link + **2 dias** | enviado em 28/10 → a partir de 30/10 |
  | Já teve sessão | data da **última sessão** + **22 dias** | última em 30/10 → a partir de 21/11 |

- Contam como sessão as consultas marcadas por link e as que você marcar no painel com o tipo **Sessão**. Avaliações e consultas canceladas não contam.
- Se você transferir a última sessão pela agenda, o cálculo acompanha a nova data.
- Depois da data liberada, o cliente pode escolher qualquer data mais distante.
- O bloqueio vale só para aquele link: a agenda geral e os outros clientes não são afetados.
- **Desmarcação:** o cliente não desmarca sozinho. Ele toca em "Preciso desmarcar", escreve o motivo e confirma que está de acordo com a taxa: **R$ 25** com 12 horas ou mais de antecedência, **R$ 50** com menos. Ele vê a sua chave Pix, e você recebe o pedido por e-mail e WhatsApp (modelo `pedido_desmarcacao`). A sessão continua marcada até você **Aprovar** (cancela) ou **Recusar**. O botão **Taxa paga** registra o pagamento. Para remarcar, gere um novo link.
- Consulta marcada **por você** no painel envia WhatsApp **só ao paciente**.

## Horários e bloqueios (só você)
- Em **Horários de atendimento** você define os dias e períodos em que os pacientes podem agendar.
- No painel, você pode marcar em qualquer horário. Se for **fora do horário geral** ou num bloqueio, o sistema **pergunta se você quer agendar fora do horário** antes de confirmar.
- A aba **Bloqueios** é só sua. Cada bloqueio precisa de um **título** com o motivo (férias, congresso…). Pacientes e assistente veem só "indisponível", sem o título.

## Endereços (site separado: agenda.rodrigovieiraterapeuta.com.br)
- **Novos pacientes:** `/agendar/` (o endereço principal da agenda leva para cá).
- **Sessões:** `/sessao/?s=…`, o link pessoal que só você gera.
- **Painel:** `/painel/`. Só entra quem tem login.
- O site principal e o blog continuam separados, em rodrigovieiraterapeuta.com.br.

## Para ativar (uma vez só)
1. **Criar o site no Netlify:** em app.netlify.com, clique em **Add new site → Import an existing project → GitHub** e escolha o repositório **agenda-rodrigovieira**. Não há comando de build; o Netlify lê o `netlify.toml`.
2. **Domínio:** em **Domain management → Add a domain**, adicione `agenda.rodrigovieiraterapeuta.com.br` e siga a instrução de DNS que o Netlify mostrar.
3. **Variáveis** (Site configuration → Environment variables):
   - `AGENDA_SEGREDO`: frase secreta com 24 ou mais caracteres.
   - `PRONTUARIO_CHAVE`: frase secreta com 32 ou mais caracteres. Guarde uma cópia.
   - `GMAIL_USUARIO` e `GMAIL_SENHA_APP`: as mesmas do site principal.
   - `ASAAS_API_KEY` e `ASAAS_AMBIENTE`: veja a seção do Pix.
4. Publique de novo (**Deploys → Trigger deploy**).
5. Abra `/painel/`. No primeiro acesso, use o valor de `AGENDA_SEGREDO` como código de configuração e crie seu usuário e senha.
6. No painel, ajuste **Horários de atendimento**, **Configurações** e **Sessões**.

Os e-mails usam o Gmail que o site já tem configurado (`GMAIL_USUARIO` e `GMAIL_SENHA_APP`).

## Pix (Asaas): como ativar
1. Crie uma conta de testes em **sandbox.asaas.com** e gere a chave em **Integrações → Chave de API** (começa com `$aact_hmlg_`).
2. No Netlify, crie as variáveis `ASAAS_API_KEY` (a chave) e `ASAAS_AMBIENTE` (`sandbox`; troque para `producao` só no lançamento).
3. No painel, em **Pagamentos**, clique em **Cadastrar webhook no Asaas automaticamente**. O sistema cria o aviso de pagamento na sua conta, com um token seguro derivado de `AGENDA_SEGREDO`. Não há mais nada para copiar. Se preferir definir o token, crie `ASAAS_WEBHOOK_TOKEN` (32 a 255 caracteres).
4. Em **Configurações**, informe o valor da consulta e marque **Exigir Pix**.
5. Faça um agendamento online e, no sandbox, confirme o recebimento da cobrança. O calendário deve abrir sozinho.

**Garantias:**
- O pagamento só é aceito depois que o servidor consulta o próprio Asaas. Nem o webhook nem a página de retorno bastam.
- Um pagamento vale uma única consulta.
- Se o mesmo paciente tentar de novo, o sistema reaproveita a cobrança em aberto em vez de criar outra.
- Valor pago menor que o cobrado não libera o calendário.
- O paciente recebe por e-mail um link para voltar ao calendário sem pagar de novo.

**No painel, em Pagamentos:**
- Lista de pagamentos com o status de cada um.
- Verificar status.
- Liberar novo horário (depois de cancelar a consulta).
- Estornar (só o administrador).

## WhatsApp (API oficial da Meta): como ativar
O sistema avisa pelo WhatsApp:
- **O paciente:** quando o agendamento é confirmado. Se houver modelo, também na remarcação e no cancelamento.
- **Você:** a cada novo agendamento.

Para ativar:
1. Crie a conta em **Meta Business** (business.facebook.com) e adicione o produto **WhatsApp** a um app em developers.facebook.com.
2. Cadastre o número que vai enviar as mensagens. Esse número fica ligado à API. O número de uso pessoal pode continuar no app comum se você usar um número diferente para a API, ou o modo de coexistência do WhatsApp Business, se estiver disponível para a sua conta.
3. Crie um **token de acesso permanente** (usuário do sistema) e copie o **ID do número**.
4. No Netlify, crie as variáveis `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID`.
5. Em **WhatsApp Manager → Modelos de mensagem**, crie e envie para aprovação estes modelos, na categoria **Utilidade** e no idioma **Português (BR)**:

   **`consulta_confirmada`** (vai para o paciente)
   > Olá, {{1}}! Sua consulta com {{2}} está confirmada para {{3}} às {{4}} ({{5}}). Se precisar remarcar, responda esta mensagem.

   **`novo_agendamento`** (vai para você)
   > Novo agendamento: {{1}}, em {{2}} às {{3}} ({{4}}). Telefone: {{5}}.

   Opcionais, que usam os mesmos 5 campos da confirmação: `consulta_remarcada` e `consulta_cancelada`.

   **`cliente_aguardando`** (vai para você)
   > Novo cadastro aguardando horário: {{1}}, telefone {{2}}, modalidade {{3}}. Pagamento: {{4}}.

   **`pedido_desmarcacao`** (vai para você)
   > Pedido de desmarcação: {{1}}, sessão de {{2}} às {{3}}. Taxa aceita: {{4}}. Motivo: {{5}}.
6. No painel, em Configurações → WhatsApp, marque **Enviar mensagens**, informe o seu número e confira os nomes dos modelos.

Se uma mensagem falhar, ela aparece em **Registros** com o botão **Reenviar**, igual ao e-mail.

**Custo:** a Meta cobra por mensagem de utilidade entregue, na casa de centavos (confira a tabela atual para o Brasil). Não há mensalidade.

## Prontuário (evoluções clínicas)
- Abra em **Clientes → (cliente) → Prontuário**, ou pelo botão **Prontuário** no detalhe da consulta.
- Cole a evolução, ajuste a data e salve. Cada evolução pode ser editada, copiada ou excluída.
- Cada **processo** aceita até 15 evoluções. **Iniciar novo processo** encerra o atual, que continua disponível para revisão em **Processos anteriores**.
- O acesso é **só do administrador**: a assistente não vê o prontuário.
- Todas as ações ficam no registro de alterações, sem o conteúdo do texto.
- Os textos são gravados **cifrados**. Para ativar, crie no Netlify a variável `PRONTUARIO_CHAVE`, com uma frase secreta de pelo menos 32 caracteres. **Guarde uma cópia em local seguro: sem ela, as evoluções não podem ser lidas.** Não troque essa chave depois de começar a usar.
- O backup inclui o prontuário cifrado, que só abre com a mesma chave.
- Um cliente com prontuário não pode ser excluído antes de o prontuário ser excluído. Verifique o prazo de guarda exigido pelo seu conselho profissional.

## O que o painel faz
| Área | Administrador | Assistente |
|---|---|---|
| Agenda (dia, semana, mês), nova consulta, transferir, cancelar | ✓ | ✓ |
| Bloqueios (com título do motivo) e horários extras | ✓ | — (vê só "indisponível") |
| Clientes (foto, contatos, histórico) | ✓ | ✓ (sem excluir) |
| Reenviar e-mails com falha | ✓ | ✓ |
| Pagamentos: ver, verificar, liberar novo horário | ✓ | ✓ |
| Estornar Pix | ✓ | — |
| Horários de atendimento, duração, intervalo, preços e textos | ✓ | — |
| Usuários, registro de alterações, backup | ✓ | — |
| Prontuário (evoluções clínicas) | ✓ | — |
| Sessões (links, valores, desmarcações) | ✓ | — |

**Regras que o sistema garante:**
- Nunca há duas consultas sobrepostas na mesma agenda, nem quando duas pessoas confirmam ao mesmo tempo.
- Presencial e online podem usar a mesma agenda ou agendas independentes.
- A nova duração vale só para consultas novas.
- Antes de aplicar um bloqueio, o sistema avisa se há consulta marcada no período.
- Pelo painel é possível marcar fora do horário de atendimento, desde que não haja sobreposição.
- Transferências e cancelamentos avisam o paciente por e-mail. Dá para desmarcar esse aviso.

## Dados e LGPD
- O sistema guarda nome, e-mail, WhatsApp e foto, com a data do consentimento. As evoluções clínicas que você registrar ficam cifradas e só o administrador as vê.
- As fotos ficam em um armazenamento separado e só aparecem para quem está logado no painel.
- O administrador pode excluir o cadastro e a foto de um cliente. As consultas antigas ficam só com o nome.
- **Backup:** em Usuários e conta → Baixar backup. Não inclui fotos nem senhas.

## Custos
| Item | Custo |
|---|---|
| Hospedagem e banco de dados (Netlify e Netlify Blobs) | R$ 0 no plano atual. O plano gratuito tem limites mensais de uso, folgados para este volume |
| Domínio `rodrigovieiraterapeuta.com.br` | Já pago (renovação anual do registro.br, cerca de R$ 40) |
| E-mails (Gmail do site) | R$ 0, com limite de cerca de 500 por dia |
| WhatsApp (API oficial da Meta) | Sem mensalidade. Centavos por mensagem; para cerca de 100 consultas por mês, algo em torno de R$ 5 a 20 (a confirmar) |
| Pix (Asaas) | Sem mensalidade. Tarifa por Pix recebido, de aproximadamente R$ 1 a 2; **confirme na tabela atual do Asaas** |

## Migração do Tua Agenda (ainda não iniciada)
Só começa depois que o novo sistema estiver validado em uso real. Passos:
1. Verificar no Tua Agenda quais dados dá para exportar (clientes, histórico, consultas futuras) e em que formato.
2. Importar só o necessário (cadastro de clientes e consultas futuras), sem fotos, com conferência.
3. Rodar os dois sistemas em paralelo por um período, e então trocar o link de agendamento.
4. Só depois cancelar a assinatura do Tua Agenda.

## Armazenamento
- Os dados ficam no Netlify Blobs, que já está no plano do site. Não há custo extra nem conta nova.
- Netlify Blobs com gravação condicional: o mesmo dia não aceita duas gravações conflitantes.

## Testes
- `npm test`: 43 testes de regras (horários, bloqueios, duração, disputa pelo mesmo horário, e-mails, WhatsApp, prontuário, login, LGPD, Pix e chamadas ao Asaas com respostas simuladas).
- `node test/e2e-sessoes.mjs`: links de sessão (uso único, 12 h, data pelo histórico, desmarcação com taxa).
- Servidor com `PRONTUARIO_CHAVE` e `node test/e2e-prontuario.mjs`: prontuário e WhatsApp no painel, com 6 cenários aprovados.
- `node test/servidor-dev.mjs` com `node test/e2e.mjs`: simulação no navegador sem Pix, com 21 cenários aprovados (inclui cadastro presencial e lista de espera).
- Servidor com `AGENDA_PIX_SIMULADO=1` e `node test/e2e-pix.mjs`: fluxo Pix completo no navegador, com 14 cenários aprovados.
- Antes de usar com pacientes, confirme na pré-visualização do Netlify: um agendamento real, o e-mail chegando e o login no painel.
