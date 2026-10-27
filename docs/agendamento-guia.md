# Agenda própria: como funciona e como ativar

O pagamento pode funcionar de dois jeitos, e a escolha fica em Configurações → Pagamento via Pix:
- **Pix desligado:** o paciente agenda direto e acerta o pagamento com o Dr. Rodrigo.
- **Pix ligado:** o paciente informa os dados e a selfie e paga o Pix. Depois que o provedor confirma o pagamento, o calendário é liberado para ele escolher o horário.

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

**Regras que o sistema garante:**
- Nunca há duas consultas sobrepostas na mesma agenda, nem quando duas pessoas confirmam ao mesmo tempo.
- Presencial e online podem usar a mesma agenda ou agendas independentes.
- A nova duração vale só para consultas novas.
- Antes de aplicar um bloqueio, o sistema avisa se há consulta marcada no período.
- Pelo painel é possível marcar fora do horário de atendimento, desde que não haja sobreposição.
- Transferências e cancelamentos avisam o paciente por e-mail. Dá para desmarcar esse aviso.

## Dados e LGPD
- O sistema guarda apenas nome, e-mail, WhatsApp e foto, com a data do consentimento.
- As fotos ficam em um armazenamento separado e só aparecem para quem está logado no painel.
- O administrador pode excluir o cadastro e a foto de um cliente. As consultas antigas ficam só com o nome.
- **Backup:** em Usuários e conta → Baixar backup. Não inclui fotos nem senhas.

## Custos
| Item | Custo |
|---|---|
| Hospedagem e banco de dados (Netlify e Netlify Blobs) | R$ 0 no plano atual. O plano gratuito tem limites mensais de uso, folgados para este volume |
| Domínio `rodrigovieiraterapeuta.com.br` | Já pago (renovação anual do registro.br, cerca de R$ 40) |
| E-mails (Gmail do site) | R$ 0, com limite de cerca de 500 por dia |
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
- `npm test`: 26 testes de regras (horários, bloqueios, duração, disputa pelo mesmo horário, e-mails, login, LGPD, Pix e chamadas ao Asaas com respostas simuladas).
- `node test/servidor-dev.mjs` com `node test/e2e.mjs`: simulação no navegador sem Pix, com 18 cenários aprovados.
- Servidor com `AGENDA_PIX_SIMULADO=1` e `node test/e2e-pix.mjs`: fluxo Pix completo no navegador, com 13 cenários aprovados.
- Antes de usar com pacientes, confirme na pré-visualização do Netlify: um agendamento real, o e-mail chegando e o login no painel.
