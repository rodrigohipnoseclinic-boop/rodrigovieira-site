// Fases dos jogos de palavras. Letras sem acento (A-Z). Versículos: Almeida Revista e Corrigida.
window.PUZZLES = {

  // Roda de Letras: as letras da roda saem das próprias palavras
  roda: [
    { palavras: ["ALMAS", "ALMA", "SALMO", "LAMA", "SOL", "MAL", "SAL"], v: { ref: "Salmos 23:3", t: "Refrigera a minha alma; guia-me pelas veredas da justiça, por amor do seu nome." } },
    { palavras: ["GRACA", "ARCA", "CERA", "AREA", "ERA"], v: { ref: "Efésios 2:8", t: "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus." } },
    { palavras: ["AMORES", "AMOR", "MARES", "REMOS", "MAR", "ORA", "MESA"], v: { ref: "1 João 4:8", t: "Aquele que não ama não conhece a Deus, porque Deus é amor." } },
    { palavras: ["SANTOS", "SANTO", "NOTAS", "TONS", "ANOS"], v: { ref: "Isaías 6:3", t: "Santo, Santo, Santo é o Senhor dos Exércitos; toda a terra está cheia da sua glória." } },
    { palavras: ["PASTOR", "PASTO", "PORTAS", "PARTO", "PRATO", "RATOS"], v: { ref: "João 10:11", t: "Eu sou o bom pastor; o bom pastor dá a sua vida pelas ovelhas." } },
    { palavras: ["VIDAS", "VIDA", "DIAS", "VIAS", "VIA", "DIA"], v: { ref: "João 14:6", t: "Eu sou o caminho, e a verdade, e a vida; ninguém vem ao Pai, senão por mim." } }
  ],

  // Caça-palavras
  caca: [
    { tema: "Os discípulos", palavras: ["PEDRO", "ANDRE", "TIAGO", "JOAO", "FILIPE", "TOME", "MATEUS"], v: { ref: "Mateus 4:19", t: "Disse-lhes: Vinde após mim, e eu vos farei pescadores de homens." } },
    { tema: "Livros da Bíblia", palavras: ["GENESIS", "EXODO", "NUMEROS", "JOSUE", "RUTE", "SALMOS", "ATOS"], v: { ref: "2 Timóteo 3:16", t: "Toda a Escritura é divinamente inspirada, e proveitosa para ensinar, para repreender, para corrigir, para instruir em justiça." } },
    { tema: "Fruto do Espírito", palavras: ["AMOR", "GOZO", "PAZ", "FE", "BONDADE", "MANSIDAO"], v: { ref: "Gálatas 5:22", t: "Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé." } },
    { tema: "O Natal", palavras: ["MARIA", "JOSE", "BELEM", "ESTRELA", "ANJO", "PASTORES", "MAGOS"], v: { ref: "Mateus 1:21", t: "E dará à luz um filho e chamarás o seu nome Jesus; porque ele salvará o seu povo dos seus pecados." } },
    { tema: "Heróis da fé", palavras: ["NOE", "ABRAAO", "MOISES", "DAVI", "ELIAS", "ESTER", "DANIEL"], v: { ref: "Hebreus 11:1", t: "Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem." } },
    { tema: "A armadura de Deus", palavras: ["ESCUDO", "ESPADA", "CAPACETE", "COURACA", "VERDADE", "JUSTICA"], v: { ref: "Efésios 6:11", t: "Revesti-vos de toda a armadura de Deus, para que possais estar firmes contra as astutas ciladas do diabo." } }
  ],

  // Cruzadinha: [resposta, dica]
  cruz: [
    { tema: "Pessoas", palavras: [["NOE", "Construiu a arca"], ["MOISES", "Libertou Israel do Egito"], ["DAVI", "Pastor que venceu Golias"], ["RUTE", "Moabita fiel a Noemi"], ["ESTER", "Rainha que salvou o seu povo"], ["JONAS", "Profeta do grande peixe"], ["ELIAS", "Profeta do monte Carmelo"], ["PAULO", "Apóstolo dos gentios"]], v: { ref: "Provérbios 3:6", t: "Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas." } },
    { tema: "Lugares", palavras: [["BELEM", "Cidade onde Jesus nasceu"], ["NAZARE", "Cidade onde Jesus cresceu"], ["JORDAO", "Rio do batismo de Jesus"], ["SINAI", "Monte da entrega da Lei"], ["EGITO", "Terra da escravidão de Israel"], ["EDEN", "O primeiro jardim"], ["JERICO", "Cidade das muralhas que caíram"], ["GALILEIA", "Mar onde Pedro pescava"]], v: { ref: "Salmos 121:2", t: "O meu socorro vem do Senhor, que fez os céus e a terra." } },
    { tema: "Palavras da fé", palavras: [["GRACA", "Favor imerecido de Deus"], ["PAZ", "Fruto do Espírito que excede o entendimento"], ["AMOR", "Deus é ___"], ["ORACAO", "Conversa com Deus"], ["PERDAO", "Deus o concede ao que se arrepende"], ["ESPERANCA", "Âncora da alma"], ["SALVACAO", "Dom de Deus em Cristo"], ["VERDADE", "Jesus disse: Eu sou o caminho, a ___ e a vida"]], v: { ref: "Romanos 10:13", t: "Porque todo aquele que invocar o nome do Senhor será salvo." } },
    { tema: "No Novo Testamento", palavras: [["PEDRO", "Pescador que negou Jesus"], ["JUDAS", "Entregou Jesus por trinta moedas"], ["MARIA", "Mãe de Jesus"], ["ZAQUEU", "Subiu num sicômoro"], ["LAZARO", "Ressuscitado em Betânia"], ["TOME", "Discípulo que duvidou"], ["TIMOTEO", "Jovem discípulo de Paulo"], ["LUCAS", "Médico e autor de um Evangelho"]], v: { ref: "João 11:25", t: "Disse-lhe Jesus: Eu sou a ressurreição e a vida; quem crê em mim, ainda que esteja morto, viverá." } }
  ]
};
