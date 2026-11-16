// Conteúdo ampliado. Versículos na Almeida Revista e Corrigida (domínio público).
// Regra: o texto de um versículo só aparece entre aspas quando está aqui, palavra por palavra. Onde só há a referência,
// o jogo mostra "Leia: referência", nunca um texto parafraseado como se fosse citação.
(() => {
const D = window.DADOS;

/* ---------- 1) referências para as perguntas que já existiam: pergunta -> [referência, texto opcional] ---------- */
const REF_QUIZ = {
  "Quantos livros tem a Bíblia protestante?": ["2 Timóteo 3:16", "Toda a Escritura é divinamente inspirada, e proveitosa para ensinar, para repreender, para corrigir, para instruir em justiça;"],
  "Qual é o primeiro livro da Bíblia?": ["Gênesis 1:1", "No princípio criou Deus os céus e a terra."],
  "Quem construiu a arca?": ["Gênesis 6:14"],
  "Quantos discípulos Jesus escolheu?": ["Mateus 10:2"],
  "Quem derrotou o gigante Golias?": ["1 Samuel 17:50", "Assim prevaleceu Davi contra o filisteu com uma funda e com uma pedra; e feriu o filisteu, e o matou; porém não havia espada na mão de Davi."],
  "Em que cidade Jesus nasceu?": ["Mateus 2:1", "E, tendo nascido Jesus em Belém de Judá, no tempo do rei Herodes, eis que uns magos vieram do Oriente a Jerusalém,"],
  "Quem foi engolido por um grande peixe?": ["Jonas 1:17", "E o Senhor tinha preparado um grande peixe, para que tragasse a Jonas; e esteve Jonas três dias e três noites nas entranhas do peixe."],
  "Quanto tempo choveu durante o Dilúvio?": ["Gênesis 7:12", "E a chuva foi sobre a terra quarenta dias e quarenta noites."],
  "Quem traiu Jesus?": ["Mateus 26:14"],
  "Quem recebeu os Dez Mandamentos no monte Sinai?": ["Êxodo 20:3", "Não terás outros deuses diante de mim."],
  "Qual é o último livro da Bíblia?": ["Apocalipse 22:21", "A graça de nosso Senhor Jesus Cristo seja com todos vós. Amém."],
  "Qual foi o primeiro milagre de Jesus, em Caná?": ["João 2:11", "Este princípio de sinais fez Jesus em Caná da Galileia, e manifestou a sua glória; e os seus discípulos creram nele."],
  "Quem foi lançado na cova dos leões?": ["Daniel 6:16"],
  "Quantas tribos tinha Israel?": ["Gênesis 49:28"],
  "Que cobrador de impostos subiu num sicômoro para ver Jesus?": ["Lucas 19:10", "Porque o Filho do Homem veio buscar e salvar o que se tinha perdido."],
  "Quem escreveu grande parte das cartas do Novo Testamento?": ["Romanos 1:1", "Paulo, servo de Jesus Cristo, chamado para apóstolo, separado para o evangelho de Deus,"],
  "Qual rei ficou famoso pela sua sabedoria?": ["1 Reis 3:12"],
  "Em que rio Jesus foi batizado?": ["Mateus 3:13", "Então veio Jesus da Galileia ter com João, junto do Jordão, para ser batizado por ele."],
  "Quantos livros tem o Novo Testamento?": ["2 Timóteo 3:16", "Toda a Escritura é divinamente inspirada, e proveitosa para ensinar, para repreender, para corrigir, para instruir em justiça;"],
  "Quantos livros tem o Antigo Testamento?": ["2 Timóteo 3:16", "Toda a Escritura é divinamente inspirada, e proveitosa para ensinar, para repreender, para corrigir, para instruir em justiça;"],
  "Qual mar Moisés atravessou com o povo?": ["Êxodo 14:13", "E disse Moisés ao povo: Não temais; estai quietos, e vede o livramento do Senhor, que hoje vos fará;"],
  "Quem foi vendido pelos próprios irmãos?": ["Gênesis 37:28"],
  "Quem foi o primeiro homem criado por Deus?": ["Gênesis 2:7", "E formou o Senhor Deus o homem do pó da terra, e soprou em seus narizes o fôlego da vida; e o homem foi feito alma vivente."],
  "Quem negou Jesus três vezes?": ["Mateus 26:75", "E lembrou-se Pedro das palavras de Jesus, que lhe dissera: Antes que cante o galo, negar-me-ás três vezes. E, saindo dali, chorou amargamente."],
  "Quem foi o primeiro rei de Israel?": ["1 Samuel 10:1"],
  "Quantos pães e peixes havia quando Jesus alimentou a multidão?": ["João 6:9", "Está aqui um rapaz que tem cinco pães de cevada e dois peixinhos; mas que é isto para tantos?"],
  "Qual livro vem logo depois de Salmos?": ["Provérbios 1:7", "O temor do Senhor é o princípio do conhecimento; os loucos desprezam a sabedoria e a instrução."],
  "Como se chamava a esposa de Abraão?": ["Gênesis 17:15"],
  "Quem perdeu a força quando o cabelo foi cortado?": ["Juízes 16:17"],
  "Em que dia, depois da morte, Jesus ressuscitou?": ["1 Coríntios 15:4", "E que foi sepultado, e que ressuscitou ao terceiro dia, segundo as Escrituras;"],
  "Quantos dias Jesus jejuou no deserto?": ["Mateus 4:2", "E, tendo jejuado quarenta dias e quarenta noites, depois teve fome."],
  "Quem foi lançado num poço pelos irmãos e depois governou o Egito?": ["Gênesis 41:41", "Disse mais Faraó a José: Vês aqui, tenho-te posto sobre toda a terra do Egito."],
  "Qual foi o primeiro livro do Novo Testamento?": ["Mateus 1:1", "Livro da genealogia de Jesus Cristo, filho de Davi, filho de Abraão."],
  "Quem era a mãe de Samuel, que o dedicou ao Senhor?": ["1 Samuel 1:27"]
};
D.quiz.forEach(q => { const r = REF_QUIZ[q.p]; if (r) { q.r = r[0]; if (r[1]) q.t = r[1]; } });

/* ---------- 2) perguntas novas (a primeira alternativa é a certa) ---------- */
const Q = (p, o, r, t) => ({ p, o, r, t });
D.quiz.push(
  // Novo Testamento
  Q("Quem batizou Jesus no rio Jordão?", ["João Batista", "Pedro", "Tiago", "Elias"], "Mateus 3:13", "Então veio Jesus da Galileia ter com João, junto do Jordão, para ser batizado por ele."),
  Q("Como se chama a oração que Jesus ensinou aos discípulos?", ["Pai Nosso", "Credo Apostólico", "Cântico de Maria", "Salmo 23"], "Mateus 6:9", "Portanto, vós orareis assim: Pai nosso, que estás nos céus, santificado seja o teu nome;"),
  Q("Quem declarou a Jesus: Tu és o Cristo, o Filho do Deus vivo?", ["Pedro", "João", "Tomé", "Paulo"], "Mateus 16:16", "E Simão Pedro, respondendo, disse: Tu és o Cristo, o Filho do Deus vivo."),
  Q("Qual é o maior mandamento, segundo Jesus?", ["Amar ao Senhor de todo o coração", "Guardar o sábado", "Não matar", "Honrar pai e mãe"], "Mateus 22:37", "Amarás o Senhor, teu Deus, de todo o teu coração, e de toda a tua alma, e de todo o teu pensamento."),
  Q("Jesus disse: Eu sou o ___ da vida. Qual palavra completa a frase?", ["pão", "vinho", "peixe", "caminho"], "João 6:35", "E Jesus disse-lhes: Eu sou o pão da vida; aquele que vem a mim não terá fome, e quem crê em mim nunca terá sede."),
  Q("Quem foi o primeiro mártir cristão, apedrejado por causa de Jesus?", ["Estêvão", "Tiago", "Pedro", "Barnabé"], "Atos 7:59", "E apedrejaram a Estêvão, que invocava e dizia: Senhor Jesus, recebe o meu espírito."),
  Q("Em que festa o Espírito Santo desceu sobre os discípulos?", ["Pentecostes", "Páscoa", "Tabernáculos", "Purim"], "Atos 2:4", "E todos foram cheios do Espírito Santo, e começaram a falar noutras línguas, conforme o Espírito Santo lhes concedia que falassem."),
  Q("Qual era o nome de Paulo antes de seguir a Jesus?", ["Saulo", "Simão", "Barnabé", "Silas"], "Atos 9:4", "E, caindo em terra, ouviu uma voz que lhe dizia: Saulo, Saulo, por que me persegues?"),
  Q("A caminho de qual cidade Paulo viu uma luz do céu?", ["Damasco", "Jericó", "Jerusalém", "Antioquia"], "Atos 9:3"),
  Q("Quem Jesus ressuscitou em Betânia?", ["Lázaro", "Jairo", "Nicodemos", "Simão"], "João 11:43", "E, tendo dito isto, clamou com grande voz: Lázaro, sai para fora."),
  Q("Quem pediu a Pilatos o corpo de Jesus para sepultá-lo?", ["José de Arimateia", "Nicodemos", "Pedro", "Judas"], "Mateus 27:58", "Este, indo ter com Pilatos, pediu o corpo de Jesus. Então Pilatos mandou que o corpo lhe fosse entregue."),
  Q("Quem disse: Eis o Cordeiro de Deus, que tira o pecado do mundo?", ["João Batista", "Pedro", "André", "Natanael"], "João 1:29", "No dia seguinte João viu a Jesus, que vinha para ele, e disse: Eis o Cordeiro de Deus, que tira o pecado do mundo."),
  Q("Qual discípulo só acreditou ao ver as marcas de Jesus ressuscitado?", ["Tomé", "Pedro", "Filipe", "Mateus"], "João 20:29", "Disse-lhe Jesus: Porque me viste, Tomé, creste; bem-aventurados os que não viram e creram."),
  Q("Na última ceia, o que Jesus fez aos pés dos discípulos?", ["Lavou-os", "Ungiu-os com óleo", "Beijou-os", "Cobriu-os"], "João 13:5", "Depois deitou água numa bacia e começou a lavar os pés aos discípulos, e a enxugá-los com a toalha com que estava cingido."),
  Q("Qual discípulo era cobrador de impostos?", ["Mateus", "Pedro", "João", "Tiago"], "Mateus 9:9", "E, partindo Jesus dali, viu assentado na coletoria um homem chamado Mateus, e disse-lhe: Segue-me. E ele, levantando-se, o seguiu."),
  Q("Quantas igrejas recebem mensagens no livro de Apocalipse?", ["Sete", "Doze", "Cinco", "Dez"], "Apocalipse 1:4", "João às sete igrejas que estão na Ásia: Graça e paz seja convosco da parte daquele que é, e que era, e que há de vir,"),
  Q("Qual autor de um Evangelho era médico?", ["Lucas", "Marcos", "Mateus", "João"], "Colossenses 4:14", "Lucas, o médico amado, e Demas vos saúdam."),
  Q("Que dois profetas apareceram com Jesus na transfiguração?", ["Moisés e Elias", "Isaías e Jeremias", "Davi e Salomão", "Abraão e Isaque"], "Mateus 17:3", "E eis que lhes apareceram Moisés e Elias, falando com ele."),
  Q("Qual ofício Paulo exercia para se sustentar?", ["Fazer tendas", "Pescar", "Cobrar impostos", "Trabalhar com madeira"], "Atos 18:3", "E, por ser do mesmo ofício, ficou com eles, e trabalhava; pois tinham por ofício fazer tendas."),
  Q("Para quem Paulo escreveu duas cartas, chamando-o de amado filho?", ["Timóteo", "Tito", "Filemom", "Silas"], "2 Timóteo 1:2", "A Timóteo, meu amado filho: Graça, misericórdia e paz da parte de Deus Pai e de Cristo Jesus, nosso Senhor."),
  Q("Quem Jesus encontrou andando sobre o mar, de madrugada?", ["Os discípulos no barco", "Os fariseus", "Os soldados", "A multidão na praia"], "Mateus 14:25", "Mas, à quarta vigília da noite, foi Jesus ter com eles, andando sobre o mar."),
  Q("Qual discípulo andou sobre as águas ao chamado de Jesus?", ["Pedro", "João", "André", "Tiago"], "Mateus 14:29", "E ele disse: Vem. E Pedro, descendo do barco, andou sobre as águas para ir ter com Jesus."),
  Q("Em que ilha João recebeu as visões do Apocalipse?", ["Patmos", "Creta", "Chipre", "Malta"], "Apocalipse 1:9"),
  Q("Jesus disse: Eu sou a ___ do mundo. Qual palavra completa a frase?", ["luz", "porta", "videira", "rocha"], "João 8:12", "Falou-lhes, pois, Jesus outra vez, dizendo: Eu sou a luz do mundo; quem me segue não andará em trevas, mas terá a luz da vida."),
  Q("Qual livro conta o início da igreja e a vinda do Espírito Santo?", ["Atos", "Romanos", "Hebreus", "Tiago"], "Atos 1:8", "Mas recebereis a virtude do Espírito Santo, que há de vir sobre vós; e ser-me-eis testemunhas tanto em Jerusalém como em toda a Judeia e Samaria, e até aos confins da terra."),
  Q("Em qual animal Jesus entrou em Jerusalém, aclamado pela multidão?", ["Um jumentinho", "Um cavalo", "Um camelo", "Uma carruagem"], "João 12:14"),
  Q("A que povoado dois discípulos caminhavam quando Jesus ressuscitado os encontrou?", ["Emaús", "Belém", "Cafarnaum", "Betânia"], "Lucas 24:13"),
  Q("Quem foi escolhido para ocupar o lugar de Judas entre os apóstolos?", ["Matias", "Barnabé", "Silas", "Timóteo"], "Atos 1:26"),
  Q("Qual é a primeira frase do Evangelho de João: No princípio era o ___", ["Verbo", "Espírito", "Senhor", "Mestre"], "João 1:1", "No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus."),
  Q("Em qual cidade os discípulos foram chamados cristãos pela primeira vez?", ["Antioquia", "Jerusalém", "Roma", "Éfeso"], "Atos 11:26"),
  // Antigo Testamento
  Q("Quem viveu mais anos na Bíblia, 969 anos?", ["Metusalém", "Noé", "Adão", "Enoque"], "Gênesis 5:27", "E foram todos os dias de Metusalém novecentos e sessenta e nove anos; e morreu."),
  Q("Quem foi o primeiro filho de Adão e Eva?", ["Caim", "Abel", "Sete", "Enoque"], "Gênesis 4:1", "E conheceu Adão a Eva, sua mulher, e ela concebeu e deu à luz a Caim, e disse: Alcancei do Senhor um varão."),
  Q("Quem Caim matou no campo?", ["Abel", "Sete", "Enoque", "Lameque"], "Gênesis 4:8", "E falou Caim com o seu irmão Abel; e aconteceu que, estando eles no campo, se levantou Caim contra o seu irmão Abel, e o matou."),
  Q("Em que cidade Deus confundiu a língua dos homens?", ["Babel", "Sodoma", "Nínive", "Jericó"], "Gênesis 11:9", "Por isso se chamou o seu nome Babel, porque ali confundiu o Senhor a linguagem de toda a terra; e dali o Senhor os espalhou sobre a face de toda a terra."),
  Q("Qual era o nome de Abraão antes de Deus mudá-lo?", ["Abrão", "Jacó", "Isaque", "Ló"], "Gênesis 17:5", "E não se chamará mais o teu nome Abrão, mas Abraão será o teu nome; porque por pai de muitas nações te tenho posto."),
  Q("Que nome Jacó recebeu depois de lutar com Deus?", ["Israel", "Esaú", "Judá", "Efraim"], "Gênesis 32:28", "E disse: Não se chamará mais o teu nome Jacó, mas Israel; pois como príncipe lutaste com Deus e com os homens, e prevaleceste."),
  Q("Quem interpretou os sonhos do faraó do Egito?", ["José", "Moisés", "Daniel", "Arão"], "Gênesis 41:16", "E respondeu José a Faraó, dizendo: Não está isso em mim; Deus dará resposta de paz a Faraó."),
  Q("Que alimento Deus mandou do céu para o povo no deserto?", ["Maná", "Codornizes apenas", "Mel", "Figos"], "Êxodo 16:15", "E, vendo-o os filhos de Israel, disseram uns aos outros: Que é isto? Porque não sabiam o que era. E disse-lhes Moisés: Isto é o pão que o Senhor vos deu para comer."),
  Q("Quantas pragas Deus enviou sobre o Egito?", ["Dez", "Sete", "Doze", "Quarenta"], "Êxodo 12:29"),
  Q("Quantos anos o povo andou pelo deserto?", ["Quarenta", "Sete", "Doze", "Trinta"], "Números 14:33"),
  Q("Quem sucedeu Moisés como líder do povo?", ["Josué", "Calebe", "Arão", "Samuel"], "Josué 1:1"),
  Q("Qual mulher foi juíza e profetisa em Israel?", ["Débora", "Ester", "Rute", "Noemi"], "Juízes 4:4", "E Débora, profetisa, mulher de Lapidote, julgava a Israel naquele tempo."),
  Q("Quem era a sogra de Rute?", ["Noemi", "Ana", "Sara", "Rebeca"], "Rute 1:16", "Porém Rute disse: Não me instes para que te deixe, e me aparte de ti; porque aonde quer que tu fores, irei eu, e onde quer que pousares, pousarei eu; o teu povo é o meu povo, e o teu Deus é o meu Deus."),
  Q("Com que Davi derrotou o gigante Golias?", ["Uma funda e uma pedra", "Uma espada", "Uma lança", "Um arco"], "1 Samuel 17:50", "Assim prevaleceu Davi contra o filisteu com uma funda e com uma pedra; e feriu o filisteu, e o matou; porém não havia espada na mão de Davi."),
  Q("Qual profeta subiu ao céu num redemoinho, com um carro de fogo?", ["Elias", "Eliseu", "Isaías", "Jeremias"], "2 Reis 2:11", "E aconteceu que, indo eles andando e falando, eis que um carro de fogo, com cavalos de fogo, os separou um do outro; e Elias subiu ao céu num redemoinho."),
  Q("Qual rainha arriscou a vida para salvar o seu povo?", ["Ester", "Rute", "Débora", "Maria"], "Ester 4:14", "Porque, se de todo te calares agora, socorro e livramento doutra parte virá para os judeus, mas tu e a casa de teu pai perecereis; e quem sabe se para tal tempo como este chegaste ao reino?"),
  Q("Quem disse: O Senhor o deu, e o Senhor o tomou; bendito seja o nome do Senhor?", ["Jó", "Davi", "Jeremias", "Jonas"], "Jó 1:21", "E disse: Nu saí do ventre da minha mãe, e nu tornarei para lá; o Senhor o deu, e o Senhor o tomou; bendito seja o nome do Senhor."),
  Q("Qual profeta respondeu: Eis-me aqui, envia-me a mim?", ["Isaías", "Ezequiel", "Daniel", "Oseias"], "Isaías 6:8", "Depois disto ouvi a voz do Senhor, que dizia: A quem enviarei, e quem há de ir por nós? Então disse eu: Eis-me aqui, envia-me a mim."),
  Q("Qual livro diz: Tudo tem o seu tempo determinado?", ["Eclesiastes", "Provérbios", "Salmos", "Cantares"], "Eclesiastes 3:1", "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu:"),
  Q("Qual rei construiu o primeiro Templo em Jerusalém?", ["Salomão", "Davi", "Ezequias", "Josias"], "1 Reis 6:1"),
  Q("Quem Samuel ungiu como rei depois de Saul?", ["Davi", "Salomão", "Jônatas", "Absalão"], "1 Samuel 16:13"),
  Q("Quantos amigos de Daniel foram lançados na fornalha de fogo?", ["Três", "Dois", "Quatro", "Sete"], "Daniel 3:20"),
  Q("Qual livro da Bíblia tem 150 capítulos?", ["Salmos", "Provérbios", "Isaías", "Gênesis"], "Salmos 150:6", "Tudo quanto tem fôlego louve ao Senhor. Louvai ao Senhor."),
  Q("Em que cidade o profeta Jonas pregou?", ["Nínive", "Babilônia", "Damasco", "Tiro"], "Jonas 3:3"),
  Q("Qual foi a primeira praga do Egito?", ["Água em sangue", "Rãs", "Piolhos", "Trevas"], "Êxodo 7:20")
);

/* ---------- 3) versículos novos para completar ---------- */
const V = (ref, t, r, ops) => ({ ref, t, r, ops });
D.versiculos.push(
  V("João 1:1", "No princípio era o ___, e o Verbo estava com Deus, e o Verbo era Deus.", "Verbo", ["Espírito", "Senhor", "Mestre"]),
  V("João 8:12", "Falou-lhes, pois, Jesus outra vez, dizendo: Eu sou a ___ do mundo; quem me segue não andará em trevas, mas terá a luz da vida.", "luz", ["paz", "porta", "verdade"]),
  V("João 6:35", "E Jesus disse-lhes: Eu sou o ___ da vida; aquele que vem a mim não terá fome, e quem crê em mim nunca terá sede.", "pão", ["caminho", "pastor", "filho"]),
  V("João 15:5", "Eu sou a ___, vós as varas; quem está em mim, e eu nele, esse dá muito fruto; porque sem mim nada podeis fazer.", "videira", ["porta", "luz", "rocha"]),
  V("Mateus 5:3", "Bem-aventurados os ___ de espírito, porque deles é o reino dos céus.", "pobres", ["humildes", "simples", "fracos"]),
  V("Mateus 5:9", "Bem-aventurados os ___, porque eles serão chamados filhos de Deus.", "pacificadores", ["misericordiosos", "mansos", "puros"]),
  V("Mateus 7:7", "Pedi, e dar-se-vos-á; buscai, e ___; batei, e abrir-se-vos-á.", "encontrareis", ["sereis ouvidos", "entrareis", "vereis"]),
  V("Mateus 22:39", "E o segundo, semelhante a este, é: Amarás o teu ___ como a ti mesmo.", "próximo", ["irmão", "amigo", "inimigo"]),
  V("Mateus 28:19", "Portanto, ide, ensinai todas as ___, batizando-as em nome do Pai, e do Filho, e do Espírito Santo;", "nações", ["casas", "cidades", "igrejas"]),
  V("Lucas 19:10", "Porque o Filho do Homem veio buscar e ___ o que se tinha perdido.", "salvar", ["curar", "ensinar", "chamar"]),
  V("Lucas 23:34", "E dizia Jesus: Pai, ___-lhes, porque não sabem o que fazem.", "perdoa", ["abençoa", "guarda", "ajuda"]),
  V("Atos 1:8", "Mas recebereis a virtude do Espírito Santo, que há de vir sobre vós; e ser-me-eis ___ tanto em Jerusalém como em toda a Judeia e Samaria, e até aos confins da terra.", "testemunhas", ["discípulos", "servos", "apóstolos"]),
  V("Atos 16:31", "E eles disseram: Crê no Senhor Jesus Cristo e serás ___, tu e a tua casa.", "salvo", ["curado", "abençoado", "guardado"]),
  V("Romanos 3:23", "Porque todos ___ e destituídos estão da glória de Deus;", "pecaram", ["falharam", "erraram", "caíram"]),
  V("Romanos 5:8", "Mas Deus prova o seu ___ para conosco, em que Cristo morreu por nós, sendo nós ainda pecadores.", "amor", ["poder", "perdão", "cuidado"]),
  V("Romanos 6:23", "Porque o salário do pecado é a morte, mas o dom gratuito de Deus é a ___ eterna, por Cristo Jesus, nosso Senhor.", "vida", ["paz", "glória", "salvação"]),
  V("2 Coríntios 5:17", "Assim que, se alguém está em Cristo, nova ___ é; as coisas velhas já passaram; eis que tudo se fez novo.", "criatura", ["pessoa", "vida", "obra"]),
  V("Colossenses 3:23", "E tudo quanto fizerdes, fazei-o de todo o ___, como ao Senhor, e não aos homens;", "coração", ["tempo", "esforço", "modo"]),
  V("1 Tessalonicenses 5:17", "Orai sem ___.", "cessar", ["parar", "medo", "pressa"]),
  V("Hebreus 11:6", "Ora, sem ___ é impossível agradar-lhe; porque é necessário que aquele que se aproxima de Deus creia que ele existe, e que é galardoador dos que o buscam.", "fé", ["amor", "obras", "temor"]),
  V("Hebreus 13:8", "Jesus Cristo é o mesmo, ontem, e hoje, e ___.", "eternamente", ["amanhã", "novamente", "finalmente"]),
  V("Tiago 1:5", "E, se algum de vós tem falta de ___, peça-a a Deus, que a todos dá liberalmente, e o não lança em rosto, e ser-lhe-á dada.", "sabedoria", ["fé", "força", "paz"]),
  V("1 João 1:9", "Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar os pecados e nos purificar de toda a ___.", "injustiça", ["culpa", "maldade", "vergonha"]),
  V("1 João 4:19", "Nós o amamos a ele porque ele nos amou ___.", "primeiro", ["tanto", "sempre", "muito"]),
  V("Apocalipse 21:4", "E Deus limpará de seus olhos toda a ___, e não haverá mais morte, nem pranto, nem clamor, nem dor; porque já as primeiras coisas são passadas.", "lágrima", ["tristeza", "mágoa", "angústia"]),
  V("Apocalipse 3:20", "Eis que estou à ___, e bato; se alguém ouvir a minha voz, e abrir a porta, entrarei em sua casa, e com ele jantarei, e ele comigo.", "porta", ["mesa", "entrada", "janela"]),
  V("Gênesis 1:27", "E criou Deus o homem à sua ___: à imagem de Deus o criou; macho e fêmea os criou.", "imagem", ["força", "glória", "vontade"]),
  V("Gênesis 2:7", "E formou o Senhor Deus o homem do ___ da terra, e soprou em seus narizes o fôlego da vida; e o homem foi feito alma vivente.", "pó", ["barro", "solo", "chão"]),
  V("Gênesis 9:13", "O meu ___ tenho posto nas nuvens, e será por sinal da aliança entre mim e a terra.", "arco", ["sinal", "trono", "pacto"]),
  V("Gênesis 12:1", "Ora, o Senhor disse a Abrão: Sai-te da tua ___, e da tua parentela, e da casa de teu pai, para a terra que eu te mostrarei;", "terra", ["cidade", "aldeia", "nação"]),
  V("Êxodo 20:3", "Não terás outros ___ diante de mim.", "deuses", ["amigos", "senhores", "reis"]),
  V("Deuteronômio 6:5", "E amarás o Senhor teu Deus de todo o teu coração, e de toda a tua ___, e de todas as tuas forças.", "alma", ["mente", "vida", "casa"]),
  V("Deuteronômio 31:6", "Esforçai-vos, e animai-vos; não temais, nem tenhais ___ deles; porque o Senhor teu Deus é o que vai contigo; não te deixará, nem te desamparará.", "medo", ["pressa", "dúvida", "vergonha"]),
  V("Salmos 1:1", "Bem-aventurado o homem que não anda segundo o conselho dos ___, nem se detém no caminho dos pecadores, nem se assenta na roda dos escarnecedores.", "ímpios", ["sábios", "justos", "reis"]),
  V("Salmos 27:1", "O Senhor é a minha ___ e a minha salvação; de quem hei de temer? O Senhor é a força da minha vida; de quem me hei de recear?", "luz", ["rocha", "paz", "glória"]),
  V("Salmos 91:1", "Aquele que habita no ___ do Altíssimo, à sombra do Onipotente descansará.", "esconderijo", ["monte", "templo", "abrigo"]),
  V("Salmos 51:10", "Cria em mim, ó Deus, um ___ puro, e renova em mim um espírito reto.", "coração", ["pensamento", "caminho", "corpo"]),
  V("Salmos 150:6", "Tudo quanto tem ___ louve ao Senhor. Louvai ao Senhor.", "fôlego", ["vida", "voz", "força"]),
  V("Provérbios 1:7", "O ___ do Senhor é o princípio do conhecimento; os loucos desprezam a sabedoria e a instrução.", "temor", ["amor", "dom", "nome"]),
  V("Eclesiastes 3:1", "Tudo tem o seu ___ determinado, e há tempo para todo o propósito debaixo do céu:", "tempo", ["lugar", "fim", "valor"]),
  V("Isaías 40:31", "Mas os que esperam no Senhor renovarão as suas ___, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.", "forças", ["vidas", "esperanças", "asas"]),
  V("Isaías 9:6", "Porque um menino nos nasceu, um filho se nos deu; e o principado está sobre os seus ___; e o seu nome será Maravilhoso, Conselheiro, Deus Forte, Pai da Eternidade, Príncipe da Paz.", "ombros", ["braços", "pés", "olhos"]),
  V("Jeremias 29:11", "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de ___, e não de mal, para vos dar o fim que esperais.", "paz", ["bem", "luz", "vida"]),
  V("Lamentações 3:23", "As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; novas são cada ___; grande é a tua fidelidade.", "manhã", ["dia", "noite", "hora"]),
  V("Miqueias 6:8", "Ele te declarou, ó homem, o que é bom; e que é o que o Senhor pede de ti, senão que pratiques a ___, e ames a benignidade, e andes humildemente com o teu Deus?", "justiça", ["verdade", "fé", "paz"]),
  V("Números 6:24", "O Senhor te abençoe e te ___;", "guarde", ["ensine", "ouça", "levante"])
);

/* ---------- 4) palavras embaralhadas: referências para as existentes e palavras novas ---------- */
const REF_PAL = {
  MOISÉS: ["Êxodo 3:10"], DAVI: ["1 Samuel 17:50", "Assim prevaleceu Davi contra o filisteu com uma funda e com uma pedra; e feriu o filisteu, e o matou; porém não havia espada na mão de Davi."],
  ABRAÃO: ["Gênesis 17:5", "E não se chamará mais o teu nome Abrão, mas Abraão será o teu nome; porque por pai de muitas nações te tenho posto."], NOÉ: ["Gênesis 6:14"],
  ELIAS: ["2 Reis 2:11", "E aconteceu que, indo eles andando e falando, eis que um carro de fogo, com cavalos de fogo, os separou um do outro; e Elias subiu ao céu num redemoinho."],
  ESTER: ["Ester 4:14"], RUTE: ["Rute 1:16"], JONAS: ["Jonas 1:17", "E o Senhor tinha preparado um grande peixe, para que tragasse a Jonas; e esteve Jonas três dias e três noites nas entranhas do peixe."],
  SANSÃO: ["Juízes 16:17"], DANIEL: ["Daniel 6:16"], SALOMÃO: ["1 Reis 3:12"],
  JACÓ: ["Gênesis 28:12", "E sonhou: e eis uma escada posta na terra, cujo topo tocava nos céus; e eis que os anjos de Deus subiam e desciam por ela."],
  ISAQUE: ["Gênesis 21:3"], DÉBORA: ["Juízes 4:4", "E Débora, profetisa, mulher de Lapidote, julgava a Israel naquele tempo."], GIDEÃO: ["Juízes 7:7"], PAULO: ["Romanos 1:1", "Paulo, servo de Jesus Cristo, chamado para apóstolo, separado para o evangelho de Deus,"],
  PEDRO: ["Mateus 26:75", "E lembrou-se Pedro das palavras de Jesus, que lhe dissera: Antes que cante o galo, negar-me-ás três vezes. E, saindo dali, chorou amargamente."],
  GRAÇA: ["Efésios 2:8", "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus."], ALIANÇA: ["Gênesis 9:13", "O meu arco tenho posto nas nuvens, e será por sinal da aliança entre mim e a terra."],
  ESPERANÇA: ["Romanos 15:13", "Ora, o Deus de esperança vos encha de todo o gozo e paz em crença, para que abundeis em esperança pela virtude do Espírito Santo."],
  SABEDORIA: ["Provérbios 1:7", "O temor do Senhor é o princípio do conhecimento; os loucos desprezam a sabedoria e a instrução."], EGITO: ["Êxodo 12:41"],
  MARIA: ["Lucas 1:30", "Disse-lhe então o anjo: Maria, não temas, porque achaste graça diante de Deus."], ZAQUEU: ["Lucas 19:10", "Porque o Filho do Homem veio buscar e salvar o que se tinha perdido."],
  TIMÓTEO: ["2 Timóteo 1:2", "A Timóteo, meu amado filho: Graça, misericórdia e paz da parte de Deus Pai e de Cristo Jesus, nosso Senhor."]
};
D.palavras.forEach(x => { const r = REF_PAL[x[0]]; if (r) { x[2] = r[0]; if (r[1]) x[3] = r[1]; } });
const P = (w, dica, ref, txt) => [w, dica, ref, txt];
D.palavras.push(
  P("ADÃO", "O primeiro homem, feito do pó da terra", "Gênesis 2:7", "E formou o Senhor Deus o homem do pó da terra, e soprou em seus narizes o fôlego da vida; e o homem foi feito alma vivente."),
  P("EVA", "Nome da primeira mulher", "Gênesis 3:20", "E chamou Adão o nome de sua mulher Eva, porquanto era a mãe de todos os viventes."),
  P("CAIM", "Primeiro filho de Adão e Eva", "Gênesis 4:1", "E conheceu Adão a Eva, sua mulher, e ela concebeu e deu à luz a Caim, e disse: Alcancei do Senhor um varão."),
  P("ABEL", "Irmão de Caim, que ofereceu o melhor do rebanho", "Gênesis 4:8", "E falou Caim com o seu irmão Abel; e aconteceu que, estando eles no campo, se levantou Caim contra o seu irmão Abel, e o matou."),
  P("BABEL", "Cidade da torre e das línguas confundidas", "Gênesis 11:9", "Por isso se chamou o seu nome Babel, porque ali confundiu o Senhor a linguagem de toda a terra; e dali o Senhor os espalhou sobre a face de toda a terra."),
  P("EDEN", "Jardim onde Deus colocou o homem", "Gênesis 2:8", "E plantou o Senhor Deus um jardim no Éden, do lado oriental; e pôs ali o homem que tinha formado."),
  P("JOSÉ", "Vendido pelos irmãos, tornou-se governador do Egito", "Gênesis 41:41", "Disse mais Faraó a José: Vês aqui, tenho-te posto sobre toda a terra do Egito."),
  P("JOSUÉ", "Sucessor de Moisés", "Josué 1:9", "Esforça-te, e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor teu Deus é contigo, por onde quer que andares."),
  P("SAMUEL", "Menino que ouviu a voz de Deus no templo", "1 Samuel 3:10", "E veio o Senhor, e pôs-se ali, e chamou como das outras vezes: Samuel, Samuel. Então disse Samuel: Fala, porque o teu servo ouve."),
  P("ISAÍAS", "Profeta que respondeu: Eis-me aqui", "Isaías 6:8", "Depois disto ouvi a voz do Senhor, que dizia: A quem enviarei, e quem há de ir por nós? Então disse eu: Eis-me aqui, envia-me a mim."),
  P("JEREMIAS", "Profeta chamado de chorão", "Jeremias 29:11", "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais."),
  P("JOÃO", "Discípulo que escreveu um Evangelho e o Apocalipse", "João 3:16", "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna."),
  P("TIAGO", "Autor de uma carta sobre fé e obras", "Tiago 1:5", "E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente, e o não lança em rosto, e ser-lhe-á dada."),
  P("ANDRÉ", "Pescador, irmão de Pedro", "Mateus 4:18"),
  P("TOMÉ", "Discípulo que quis ver as marcas de Jesus", "João 20:29", "Disse-lhe Jesus: Porque me viste, Tomé, creste; bem-aventurados os que não viram e creram."),
  P("LUCAS", "Médico que escreveu um Evangelho", "Colossenses 4:14", "Lucas, o médico amado, e Demas vos saúdam."),
  P("MATEUS", "Cobrador de impostos que virou discípulo", "Mateus 9:9", "E, partindo Jesus dali, viu assentado na coletoria um homem chamado Mateus, e disse-lhe: Segue-me. E ele, levantando-se, o seguiu."),
  P("ESTÊVÃO", "Primeiro mártir da igreja", "Atos 7:59", "E apedrejaram a Estêvão, que invocava e dizia: Senhor Jesus, recebe o meu espírito."),
  P("LÁZARO", "Amigo de Jesus ressuscitado em Betânia", "João 11:43", "E, tendo dito isto, clamou com grande voz: Lázaro, sai para fora."),
  P("MARTA", "Irmã de Maria e de Lázaro", "Lucas 10:41", "E, respondendo Jesus, disse-lhe: Marta, Marta, estás ansiosa e afadigada com muitas coisas;"),
  P("BELÉM", "Cidade onde Jesus nasceu", "Mateus 2:1", "E, tendo nascido Jesus em Belém de Judá, no tempo do rei Herodes, eis que uns magos vieram do Oriente a Jerusalém,"),
  P("JORDÃO", "Rio do batismo de Jesus", "Mateus 3:13", "Então veio Jesus da Galileia ter com João, junto do Jordão, para ser batizado por ele."),
  P("CALVÁRIO", "Lugar onde Jesus foi crucificado", "Lucas 23:33", "E, quando chegaram ao lugar chamado Caveira, ali o crucificaram, e aos malfeitores, um à direita e outro à esquerda."),
  P("PENTECOSTES", "Festa em que o Espírito Santo desceu", "Atos 2:4", "E todos foram cheios do Espírito Santo, e começaram a falar noutras línguas, conforme o Espírito Santo lhes concedia que falassem."),
  P("ORAÇÃO", "Conversa com Deus; Paulo diz: orai sem cessar", "1 Tessalonicenses 5:17", "Orai sem cessar."),
  P("PERDÃO", "Deus é fiel e justo para nos conceder", "1 João 1:9", "Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar os pecados e nos purificar de toda a injustiça."),
  P("SALVAÇÃO", "Dom de Deus por meio da fé em Cristo", "Atos 16:31", "E eles disseram: Crê no Senhor Jesus Cristo e serás salvo, tu e a tua casa."),
  P("VERDADE", "Jesus disse: eu sou o caminho, a ___ e a vida", "João 14:6", "Disse-lhe Jesus: Eu sou o caminho, e a verdade, e a vida; ninguém vem ao Pai, senão por mim."),
  P("ESPÍRITO", "O ___ Santo desceu sobre os discípulos", "Atos 2:4", "E todos foram cheios do Espírito Santo, e começaram a falar noutras línguas, conforme o Espírito Santo lhes concedia que falassem."),
  P("AMOR", "Deus é ___", "1 João 4:8", "Aquele que não ama não conhece a Deus, porque Deus é amor."),
  P("PAZ", "Fruto do Espírito; excede todo o entendimento", "Filipenses 4:7", "E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.")
);

/* ---------- 5) Quem não pertence?: referências e grupos novos ---------- */
const REF_GRUPO = {
  "discípulos de Jesus": ["Mateus 10:2"], "patriarcas": ["Gênesis 12:1", "Ora, o Senhor disse a Abrão: Sai-te da tua terra, e da tua parentela, e da casa de teu pai, para a terra que eu te mostrarei;"],
  "profetas": ["Hebreus 1:1", "Havendo Deus, antigamente, falado muitas vezes, e de muitas maneiras, aos pais, pelos profetas,"],
  "os quatro Evangelhos": ["João 20:31", "Estes, porém, foram escritos para que creiais que Jesus é o Cristo, o Filho de Deus, e para que, crendo, tenhais vida em seu nome."],
  "livros da Lei (Pentateuco)": ["Lucas 24:44"], "frutos do Espírito": ["Gálatas 5:22", "Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé,"],
  "pragas do Egito": ["Êxodo 8:16"], "mulheres da Bíblia": ["Rute 1:16", "Porém Rute disse: Não me instes para que te deixe, e me aparte de ti; porque aonde quer que tu fores, irei eu, e onde quer que pousares, pousarei eu; o teu povo é o meu povo, e o teu Deus é o meu Deus."],
  "reis de Israel": ["1 Samuel 8:5"], "filhos de Noé": ["Gênesis 9:18", "E os filhos de Noé, que saíram da arca, foram Sem, Cam e Jafé; e Cam é pai de Canaã."]
};
D.grupos.forEach(g => { const r = REF_GRUPO[g.nome]; if (r) { g.r = r[0]; if (r[1]) g.t = r[1]; } });
D.grupos.push(
  { nome: "livros poéticos e de sabedoria", m: ["Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares"], f: ["Rute", "Atos", "Judas", "Ester"], r: "Provérbios 1:7", t: "O temor do Senhor é o princípio do conhecimento; os loucos desprezam a sabedoria e a instrução." },
  { nome: "cartas de Paulo", m: ["Romanos", "Gálatas", "Efésios", "Filipenses", "Colossenses"], f: ["Tiago", "Judas", "1 João", "Apocalipse"], r: "Romanos 1:1", t: "Paulo, servo de Jesus Cristo, chamado para apóstolo, separado para o evangelho de Deus," },
  { nome: "cidades da Bíblia", m: ["Belém", "Nazaré", "Jericó", "Cafarnaum", "Jerusalém"], f: ["Sinai", "Jordão", "Horebe", "Carmelo"], r: "Mateus 2:1", t: "E, tendo nascido Jesus em Belém de Judá, no tempo do rei Herodes, eis que uns magos vieram do Oriente a Jerusalém," },
  { nome: "peças da armadura de Deus", m: ["Escudo da fé", "Capacete da salvação", "Espada do Espírito", "Couraça da justiça"], f: ["Lança de Golias", "Funda de Davi", "Arco de Jônatas", "Machado de Elias"], r: "Efésios 6:11", t: "Revesti-vos de toda a armadura de Deus, para que possais estar firmes contra as astutas ciladas do diabo." },
  { nome: "filhos de Jacó", m: ["Rúben", "Simeão", "Levi", "Judá", "José"], f: ["Esaú", "Isaque", "Abraão", "Caim"], r: "Gênesis 49:28" }
);

/* ---------- 6) Ordem Certa: onde cada acontecimento está na Bíblia ---------- */
D.eventosRef = {
  "A Criação do mundo": "Gênesis 1:1", "O Dilúvio de Noé": "Gênesis 7:12", "O chamado de Abraão": "Gênesis 12:1", "José vendido ao Egito": "Gênesis 37:28",
  "A travessia do Mar Vermelho": "Êxodo 14:13", "Os Dez Mandamentos no Sinai": "Êxodo 20:3", "A queda de Jericó": "Josué 6:20", "Davi vence Golias": "1 Samuel 17:50",
  "O exílio na Babilônia": "2 Reis 25:11", "O nascimento de Jesus": "Mateus 2:1", "A ressurreição de Jesus": "Mateus 28:6", "O dia de Pentecostes": "Atos 2:4"
};

/* ---------- 7) mais vocabulário para as fases da Roda de Letras (sem acentos, 3 a 7 letras) ---------- */
const MAIS = `ALTAR BATIZAR BENCAO BIBLIA BOM CANTO CULTO DIZIMO DOM DONS FALAR GLORIA IGREJA JEJUM JUSTO MESTRE MILAGRE MISSAO OVELHA PALAVRA PECADO PRECE PROFETA REZA SOCORRO TEMPLO UNGIR VINHA
ALEGRE AMIGO ANDAR ARVORE AREIA BARCO BELO BICHO BRAVO BRISA CAMPO CARNE CERTO CHAVE CHEIO CHUVA CIDADE CIMA CINCO CLARO COISA COMER CORPO CRIME DADOS DENTRO DESEJO DEVER DOIS DORMIR DURAR ENTRAR ESCOLA ESPERA ESTADO
ESTRADA ETERNO FALTA FELIZ FERIDA FICAR FILHO FILHA FORMA FRENTE GRANDE GRITO GRUPO GUERRA HERDAR HOMEM IDADE IMAGEM JARDIM JOVEM JUNTAR LAGRIMA LAVAR LEVAR LIDER LIMITE LONGO LUTAR MADEIRA MAIS MANHA MARIDO MEDIDA
MELHOR MESMO MOMENTO MOVER MULHER NAVIO NEGAR ORDEM OUTRO PAGAR PAIS PARADO PASSAR PENSAR PLANTA POBRE PODER PONTO PRAZER PRESENTE PROPRIO QUARTO RAZAO RECEBER REGRA RESPEITO ROUPA SABER SAIDA SEGREDO SEMANA SENTIR SERIO
SOMBRA SORRIR SUBIDA TENTAR TERMO TRAZER TRISTE VAZIO VELHO VENCER VIAGEM VISAO ARADO ASNO BAIXO BANCO BEBER BRACO CABRA CANSAR CEDRO CERCA CIRCO COBRA COLHER CORDA CORRER COSTA CRESCER CUIDAR DANCAR DESCER DEVAGAR DIREITO DISTANTE
DOENTE DORMIR ENSINAR ERGUER ESCADA ESCOLHER ESPADA ESPERAR ESTRELA FARDO FERRO FOGAO FUGIR GALHO GANHAR GOVERNO GRAMA HERANCA HUMILDE IRMAS JANELA JUIZO LADRAO LAMPADA LANCA LEITE LIMPAR LISTA LOUVAR MADURO MANTER MENSAGEM
METAL MISERIA MURO NEVE NOIVA NOIVO OFERTAR OLIVEIRA ONDA OSSO PADRE PALHA PASTAR PEDREIRO PEGAR PERDER PIEDADE PLANTAR PLENO POMBA PORCO POSSUIR PREGAR PRENDER PRESO PROCURAR PROMESSA PUNIR RAINHA RASO REBANHO RECOLHER REMAR RENDER RESGATE
RIQUEZA RIO RISCO ROCHA SACRIFICIO SALTAR SANGUE SECAR SEMEAR SENHOR SEPULTAR SERVIR SOCORRO SOLTAR SONHAR SUAVE SUSTENTO TABUA TECER TERRENO TESOURO TOCHA TRABALHO TREMER TRIBO TRISTEZA TROMBETA TUMULO UNGIDO VALENTE VENTRE VESTIR VIGIAR VIRGEM VOLTAR VOZES`.split(/\s+/);
window.VOCAB = [...new Set([...(window.VOCAB || []), ...MAIS.filter(w => /^[A-Z]{3,7}$/.test(w))])];
})();
