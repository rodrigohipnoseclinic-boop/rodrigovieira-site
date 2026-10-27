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

## Endereços
- **Paciente:** `/agendar/`. O paciente escolhe a modalidade, o dia e o horário, preenche os dados e manda uma selfie ou foto.
- **Painel:** `/painel/`. Só entra quem tem login.

## Para ativar (uma vez só)
1. No Netlify, abra **Site configuration → Environment variables** e crie `AGENDA_SEGREDO` com uma frase longa e secreta (mínimo 24 caracteres). Não envie essa frase para ninguém.
2. Publique de novo (Deploys → Trigger deploy).
3. Abra `/painel/`. No primeiro acesso, informe a frase do passo 1 como "código de configuração" e crie seu usuário e senha.
4. No painel, ajuste **Horários de atendimento** e **Configurações**. O e-mail que recebe as confirmações é definido em Configurações. Se ficar vazio, as confirmações vão para o Gmail do site.

Os e-mails usam o Gmail que o site já tem configurado (`GMAIL_USUARIO` e `GMAIL_SENHA_APP`).

## Pix (Asaas): como ativar
1. Crie uma conta no Asaas. Comece pelo **sandbox** (ambiente de testes), que não movimenta dinheiro.
2. Crie estas variáveis no Netlify:

   | Variável | Valor |
   |---|---|
   | `ASAAS_API_KEY` | Chave de API do Asaas (do sandbox, durante os testes) |
   | `ASAAS_AMBIENTE` | `sandbox`. Mude para `producao` só no lançamento |
   | `ASAAS_WEBHOOK_TOKEN` | Uma frase secreta com pelo menos 16 caracteres |

3. No Asaas, abra **Integrações → Webhooks** e cadastre:
   - **URL:** a que aparece no painel, em Pagamentos (`…/api/agenda/webhook`).
   - **Token de autenticação:** o mesmo valor de `ASAAS_WEBHOOK_TOKEN`.
   - **Eventos:** os de cobrança.
4. No painel, abra Configurações, informe o valor da consulta e marque **Exigir Pix**.
5. No sandbox, faça um agendamento e confirme o pagamento pelo painel do Asaas. O calendário deve abrir sozinho.

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
| Bloquear dias ou horários, abrir horários extras | ✓ | ✓ |
| Clientes (foto, contatos, histórico) | ✓ | ✓ (sem excluir) |
| Reenviar e-mails com falha | ✓ | ✓ |
| Pagamentos: ver, verificar, liberar novo horário | ✓ | ✓ |
| Estornar Pix | ✓ | — |
| Horários de atendimento, duração, intervalo, preços e textos | ✓ | — |
| Usuários, registro de alterações, backup | ✓ | — |
| Prontuário (evoluções clínicas) | ✓ | — |

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
- `npm test`: 34 testes de regras (horários, bloqueios, duração, disputa pelo mesmo horário, e-mails, WhatsApp, prontuário, login, LGPD, Pix e chamadas ao Asaas com respostas simuladas).
- Servidor com `PRONTUARIO_CHAVE` e `node test/e2e-prontuario.mjs`: prontuário e WhatsApp no painel, com 6 cenários aprovados.
- `node test/servidor-dev.mjs` com `node test/e2e.mjs`: simulação no navegador sem Pix, com 21 cenários aprovados (inclui cadastro presencial e lista de espera).
- Servidor com `AGENDA_PIX_SIMULADO=1` e `node test/e2e-pix.mjs`: fluxo Pix completo no navegador, com 14 cenários aprovados.
- Antes de usar com pacientes, confirme na pré-visualização do Netlify: um agendamento real, o e-mail chegando e o login no painel.
