# Agenda própria: como funciona e como ativar

O pagamento **não** passa pelo sistema: o paciente acerta diretamente com o Dr. Rodrigo.

## Endereços
- **Paciente:** `/agendar/`. O paciente escolhe a modalidade, o dia e o horário, preenche os dados e manda uma selfie ou foto.
- **Painel:** `/painel/`. Só entra quem tem login.

## Para ativar (uma vez só)
1. No Netlify, abra **Site configuration → Environment variables** e crie `AGENDA_SEGREDO` com uma frase longa e secreta (mínimo 24 caracteres). Não envie essa frase para ninguém.
2. Publique de novo (Deploys → Trigger deploy).
3. Abra `/painel/`. No primeiro acesso, informe a frase do passo 1 como "código de configuração" e crie seu usuário e senha.
4. No painel, ajuste **Horários de atendimento** e **Configurações**. O e-mail que recebe as confirmações é definido em Configurações. Se ficar vazio, as confirmações vão para o Gmail do site.

Os e-mails usam o Gmail que o site já tem configurado (`GMAIL_USUARIO` e `GMAIL_SENHA_APP`).

## O que o painel faz
| Área | Administrador | Assistente |
|---|---|---|
| Agenda (dia, semana, mês), nova consulta, transferir, cancelar | ✓ | ✓ |
| Bloquear dias ou horários, abrir horários extras | ✓ | ✓ |
| Clientes (foto, contatos, histórico) | ✓ | ✓ (sem excluir) |
| Reenviar e-mails com falha | ✓ | ✓ |
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

## Armazenamento e custo
- Os dados ficam no Netlify Blobs, que já está no plano do site. Não há custo extra nem conta nova.
- Netlify Blobs com gravação condicional: o mesmo dia não aceita duas gravações conflitantes.

## Testes
- `npm test`: 17 testes de regras (horários, bloqueios, duração, disputa pelo mesmo horário, e-mails, login, LGPD).
- `node test/servidor-dev.mjs` com `node test/e2e.mjs`: simulação completa no navegador (celular e computador), com 18 cenários aprovados.
- Antes de usar com pacientes, confirme na pré-visualização do Netlify: um agendamento real, o e-mail chegando e o login no painel.
