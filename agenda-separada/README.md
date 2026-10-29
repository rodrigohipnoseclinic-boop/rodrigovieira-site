# Agenda do Dr. Rodrigo Vieira

Site separado do site principal, só para agendamentos. Endereço planejado: **agenda.rodrigovieiraterapeuta.com.br**.

| Endereço | Quem usa |
|---|---|
| `/agendar/` | Novos pacientes (avaliação; presencial por cadastro, online com Pix) |
| `/sessao/?s=…` | Cliente com link pessoal enviado por você (12 h, uso único) |
| `/painel/` | Você (administrador) e, com acesso limitado, a assistente |

O guia completo de uso e ativação está em `docs/guia.md`.

## Desenvolvimento
- `npm install`
- `npm test`: testes de regras
- `AGENDA_SEGREDO=<24+ caracteres> npm run dev`: servidor local em http://localhost:8888 (dados só na memória)
- Roteiros no navegador: `node test/e2e.mjs`, `test/e2e-pix.mjs`, `test/e2e-sessoes.mjs` e `test/e2e-prontuario.mjs` (veja o início de cada arquivo)
