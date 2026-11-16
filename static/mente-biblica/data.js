// Conteúdo do app. Versículos na tradução Almeida Revista e Corrigida (domínio público).
window.DADOS = {

  // ___ marca a palavra a completar; "ops" são as alternativas erradas
  versiculos: [
    { ref: "Salmos 23:1", t: "O Senhor é o meu ___; nada me faltará.", r: "pastor", ops: ["rei", "escudo", "amigo"] },
    { ref: "João 3:16", t: "Porque Deus amou o mundo de tal maneira que deu o seu Filho ___, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", r: "unigênito", ops: ["primogênito", "amado", "escolhido"] },
    { ref: "Filipenses 4:13", t: "Posso todas as coisas em Cristo que me ___.", r: "fortalece", ops: ["ensina", "guarda", "conduz"] },
    { ref: "Provérbios 3:5", t: "Confia no Senhor de todo o teu ___, e não te estribes no teu próprio entendimento.", r: "coração", ops: ["tempo", "esforço", "caminho"] },
    { ref: "Josué 1:9", t: "Esforça-te, e tem bom ___; não pasmes, nem te espantes, porque o Senhor teu Deus é contigo, por onde quer que andares.", r: "ânimo", ops: ["descanso", "juízo", "passo"] },
    { ref: "Isaías 41:10", t: "Não ___, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.", r: "temas", ops: ["chores", "corras", "duvides"] },
    { ref: "Romanos 8:28", t: "E sabemos que todas as coisas contribuem juntamente para o ___ daqueles que amam a Deus.", r: "bem", ops: ["fim", "alívio", "descanso"] },
    { ref: "Mateus 11:28", t: "Vinde a mim, todos os que estais cansados e ___, e eu vos aliviarei.", r: "oprimidos", ops: ["famintos", "sedentos", "perdidos"] },
    { ref: "Salmos 119:105", t: "___ para os meus pés é a tua palavra, e luz para o meu caminho.", r: "Lâmpada", ops: ["Espada", "Cajado", "Escudo"] },
    { ref: "Provérbios 22:6", t: "Ensina a criança no ___ em que deve andar, e, ainda quando for velho, não se desviará dele.", r: "caminho", ops: ["monte", "tempo", "lugar"] },
    { ref: "Gênesis 1:1", t: "No princípio criou Deus os ___ e a terra.", r: "céus", ops: ["mares", "montes", "campos"] },
    { ref: "Romanos 12:2", t: "E não vos conformeis com este mundo, mas transformai-vos pela renovação do vosso ___.", r: "entendimento", ops: ["tempo", "corpo", "caminho"] },
    { ref: "2 Timóteo 1:7", t: "Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de ___.", r: "moderação", ops: ["alegria", "justiça", "paciência"] },
    { ref: "Provérbios 4:23", t: "Sobre tudo o que se guarda, guarda o teu ___, porque dele procedem as saídas da vida.", r: "coração", ops: ["pensamento", "tesouro", "passo"] },
    { ref: "Salmos 46:1", t: "Deus é o nosso refúgio e fortaleza, socorro bem ___ na angústia.", r: "presente", ops: ["pronto", "certo", "próximo"] },
    { ref: "Mateus 6:33", t: "Mas buscai primeiro o reino de Deus, e a sua ___, e todas estas coisas vos serão acrescentadas.", r: "justiça", ops: ["glória", "paz", "vontade"] },
    { ref: "Salmos 121:2", t: "O meu socorro vem do ___, que fez os céus e a terra.", r: "Senhor", ops: ["monte", "vale", "templo"] },
    { ref: "João 8:32", t: "E conhecereis a verdade, e a verdade vos ___.", r: "libertará", ops: ["salvará", "guardará", "ensinará"] },
    { ref: "1 Pedro 5:7", t: "Lançando sobre ele toda a vossa ___, porque ele tem cuidado de vós.", r: "ansiedade", ops: ["tristeza", "culpa", "carga"] },
    { ref: "Filipenses 4:6", t: "Não estejais ___ por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.", r: "inquietos", ops: ["ociosos", "sozinhos", "cansados"] },
    { ref: "Filipenses 4:7", t: "E a ___ de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.", r: "paz", ops: ["graça", "luz", "força"] },
    { ref: "Provérbios 17:22", t: "O coração alegre serve de bom ___, mas o espírito abatido seca os ossos.", r: "remédio", ops: ["alimento", "abrigo", "tesouro"] }
  ],

  livros: [
    "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel",
    "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios",
    "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós",
    "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias",
    "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios",
    "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom",
    "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
  ],

  // em ordem cronológica
  eventos: [
    "A Criação do mundo", "O Dilúvio de Noé", "O chamado de Abraão", "José vendido ao Egito", "A travessia do Mar Vermelho",
    "Os Dez Mandamentos no Sinai", "A queda de Jericó", "Davi vence Golias", "O exílio na Babilônia",
    "O nascimento de Jesus", "A ressurreição de Jesus", "O dia de Pentecostes"
  ],

  pares: [
    { e: "🌈", n: "Aliança com Noé" }, { e: "🐟", n: "Jonas" }, { e: "🍞", n: "Pães e peixes" }, { e: "🐑", n: "Bom Pastor" },
    { e: "⭐", n: "Belém" }, { e: "🔥", n: "Sarça ardente" }, { e: "🕊️", n: "Espírito Santo" }, { e: "👑", n: "Rei Davi" },
    { e: "🦁", n: "Daniel" }, { e: "🍇", n: "Videira" }, { e: "🛶", n: "Arca de Noé" }, { e: "🏔️", n: "Monte Sinai" },
    { e: "🐍", n: "Éden" }, { e: "🕯️", n: "Luz do mundo" }
  ],

  palavras: [
    ["MOISÉS", "Libertou o povo do Egito"], ["DAVI", "Pastor que virou rei"], ["ABRAÃO", "Chamado o pai da fé"],
    ["NOÉ", "Construiu a arca"], ["ELIAS", "Profeta levado num redemoinho de fogo"], ["ESTER", "Rainha que salvou o seu povo"],
    ["RUTE", "Disse: o teu povo será o meu povo"], ["JONAS", "Passou três dias dentro de um grande peixe"],
    ["SANSÃO", "Juiz de grande força"], ["DANIEL", "Passou a noite na cova dos leões"], ["SALOMÃO", "Rei famoso pela sabedoria"],
    ["JACÓ", "Sonhou com uma escada até o céu"], ["ISAQUE", "Filho da promessa de Abraão e Sara"],
    ["DÉBORA", "Juíza e profetisa de Israel"], ["GIDEÃO", "Venceu com trezentos homens"], ["PAULO", "Apóstolo dos gentios"],
    ["PEDRO", "Pescador que negou Jesus três vezes"], ["GRAÇA", "Favor imerecido de Deus"], ["ALIANÇA", "Pacto de Deus com o seu povo"],
    ["ESPERANÇA", "Uma das três virtudes: fé, ___ e amor"], ["SABEDORIA", "Salomão a pediu a Deus"], ["EGITO", "Terra onde Israel foi escravo"],
    ["MARIA", "Mãe de Jesus"], ["ZAQUEU", "Subiu num sicômoro para ver Jesus"], ["TIMÓTEO", "Jovem discípulo de Paulo"]
  ],

  // grupos: "membros" formam o grupo; "fora" são os intrusos possíveis
  grupos: [
    { nome: "discípulos de Jesus", m: ["Pedro", "André", "Tiago", "João", "Filipe", "Tomé", "Mateus"], f: ["Davi", "Moisés", "Golias", "Elias"] },
    { nome: "patriarcas", m: ["Abraão", "Isaque", "Jacó", "José"], f: ["Pedro", "Saul", "Daniel", "Paulo"] },
    { nome: "profetas", m: ["Isaías", "Jeremias", "Ezequiel", "Daniel", "Elias", "Eliseu"], f: ["Paulo", "Salomão", "Tiago", "Pilatos"] },
    { nome: "os quatro Evangelhos", m: ["Mateus", "Marcos", "Lucas", "João"], f: ["Atos", "Romanos", "Gênesis", "Salmos"] },
    { nome: "livros da Lei (Pentateuco)", m: ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio"], f: ["Josué", "Rute", "Salmos", "Atos"] },
    { nome: "frutos do Espírito", m: ["Amor", "Paz", "Bondade", "Fé", "Mansidão"], f: ["Orgulho", "Inveja", "Ira", "Avareza"] },
    { nome: "pragas do Egito", m: ["Sangue", "Rãs", "Piolhos", "Moscas", "Gafanhotos", "Trevas"], f: ["Dilúvio", "Terremoto", "Serpentes", "Maná"] },
    { nome: "mulheres da Bíblia", m: ["Sara", "Rebeca", "Raquel", "Rute", "Ester", "Débora"], f: ["Davi", "Jonas", "Sansão", "Samuel"] },
    { nome: "reis de Israel", m: ["Saul", "Davi", "Salomão"], f: ["Moisés", "Josué", "Elias", "Pedro"] },
    { nome: "filhos de Noé", m: ["Sem", "Cam", "Jafé"], f: ["Caim", "Abel", "Isaque", "Jacó"] }
  ],

  quiz: [
    { p: "Quantos livros tem a Bíblia protestante?", o: ["66", "73", "39", "27"] },
    { p: "Qual é o primeiro livro da Bíblia?", o: ["Gênesis", "Êxodo", "Salmos", "Mateus"] },
    { p: "Quem construiu a arca?", o: ["Noé", "Moisés", "Abraão", "Jacó"] },
    { p: "Quantos discípulos Jesus escolheu?", o: ["12", "7", "10", "70"] },
    { p: "Quem derrotou o gigante Golias?", o: ["Davi", "Saul", "Sansão", "Josué"] },
    { p: "Em que cidade Jesus nasceu?", o: ["Belém", "Nazaré", "Jerusalém", "Cafarnaum"] },
    { p: "Quem foi engolido por um grande peixe?", o: ["Jonas", "Elias", "Jeremias", "Pedro"] },
    { p: "Quanto tempo choveu durante o Dilúvio?", o: ["40 dias e 40 noites", "7 dias", "3 dias", "40 anos"] },
    { p: "Quem traiu Jesus?", o: ["Judas Iscariotes", "Pedro", "Tomé", "Pilatos"] },
    { p: "Quem recebeu os Dez Mandamentos no monte Sinai?", o: ["Moisés", "Arão", "Josué", "Elias"] },
    { p: "Qual é o último livro da Bíblia?", o: ["Apocalipse", "Judas", "Atos", "Malaquias"] },
    { p: "Qual foi o primeiro milagre de Jesus, em Caná?", o: ["Transformou água em vinho", "Multiplicou os pães", "Curou um cego", "Andou sobre as águas"] },
    { p: "Quem foi lançado na cova dos leões?", o: ["Daniel", "José", "Davi", "Jó"] },
    { p: "Quantas tribos tinha Israel?", o: ["12", "10", "7", "40"] },
    { p: "Que cobrador de impostos subiu num sicômoro para ver Jesus?", o: ["Zaqueu", "Mateus", "Nicodemos", "Bartimeu"] },
    { p: "Quem escreveu grande parte das cartas do Novo Testamento?", o: ["Paulo", "Pedro", "Tiago", "João Batista"] },
    { p: "Qual rei ficou famoso pela sua sabedoria?", o: ["Salomão", "Saul", "Ezequias", "Acabe"] },
    { p: "Em que rio Jesus foi batizado?", o: ["Jordão", "Nilo", "Eufrates", "Jaboque"] },
    { p: "Quantos livros tem o Novo Testamento?", o: ["27", "39", "66", "12"] },
    { p: "Quantos livros tem o Antigo Testamento?", o: ["39", "27", "46", "66"] },
    { p: "Qual mar Moisés atravessou com o povo?", o: ["Mar Vermelho", "Mar Morto", "Mar da Galileia", "Mar Mediterrâneo"] },
    { p: "Quem foi vendido pelos próprios irmãos?", o: ["José", "Benjamim", "Esaú", "Judá"] },
    { p: "Quem foi o primeiro homem criado por Deus?", o: ["Adão", "Abel", "Sete", "Noé"] },
    { p: "Quem negou Jesus três vezes?", o: ["Pedro", "João", "André", "Tiago"] },
    { p: "Quem foi o primeiro rei de Israel?", o: ["Saul", "Davi", "Samuel", "Salomão"] },
    { p: "Quantos pães e peixes havia quando Jesus alimentou a multidão?", o: ["5 pães e 2 peixes", "7 pães e 3 peixes", "12 pães e 5 peixes", "2 pães e 5 peixes"] },
    { p: "Qual livro vem logo depois de Salmos?", o: ["Provérbios", "Jó", "Eclesiastes", "Isaías"] },
    { p: "Como se chamava a esposa de Abraão?", o: ["Sara", "Rebeca", "Raquel", "Lia"] },
    { p: "Quem perdeu a força quando o cabelo foi cortado?", o: ["Sansão", "Golias", "Gideão", "Absalão"] },
    { p: "Em que dia, depois da morte, Jesus ressuscitou?", o: ["No terceiro dia", "No primeiro dia", "No sétimo dia", "No quadragésimo dia"] },
    { p: "Quantos dias Jesus jejuou no deserto?", o: ["40", "7", "12", "3"] },
    { p: "Quem foi lançado num poço pelos irmãos e depois governou o Egito?", o: ["José", "Moisés", "Daniel", "Ló"] },
    { p: "Qual foi o primeiro livro do Novo Testamento?", o: ["Mateus", "Marcos", "Atos", "Romanos"] },
    { p: "Quem era a mãe de Samuel, que o dedicou ao Senhor?", o: ["Ana", "Rute", "Noemi", "Miriã"] }
  ],

  dicas: [
    "Aquele que guarda a Palavra no coração treina a mente para a paz.",
    "Pequenos passos todos os dias constroem uma mente firme.",
    "Renove a sua mente: um jogo de cada vez.",
    "A constância vale mais que a pressa."
  ]
};
