import { apelidoExemplo } from './mock'
// Conteúdo completo dos projetos de exemplo — descrição detalhada, estimativa,
// fotos da obra, antes/depois e vídeos. Provisório: hoje a tabela `projetos`
// só tem nome/descrição curta/status/linha do tempo. Quando ela ganhar esses
// campos, este arquivo sai e o conteúdo vem do próprio projeto.
//
// Mídias: Wikimedia Commons, licenças livres, crédito exibido na tela. Fotos
// "ilustrativas" são de outro lugar e dizem isso na legenda.

export interface Midia {
  url: string
  legenda: string
  autor: string
  licenca: string
  fonte: string
  /** Foto de outro lugar, usada só para ilustrar (a legenda avisa). */
  ilustrativa?: boolean
}

export interface Estimativa {
  /** Em reais. */
  custo: number
  prazoMeses: number
  origemRecurso: string
  inicioPrevisto: string
  /** Gasto final, quando a obra terminou. */
  custoFinal?: number
}

export interface ConteudoProjeto {
  problema: string
  proposta: string[]
  beneficios: string[]
  estimativa?: Estimativa
  /** Fotos registradas durante a obra. */
  galeria?: Midia[]
  antesDepois?: { antes: Midia; depois: Midia }
  videos?: { antes?: Midia; depois?: Midia }
}

const RUA_DOS_JUDEUS_1855: Midia = {
  url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Rua_dos_Judeus_%28Recife%29_cropped.jpg/1280px-Rua_dos_Judeus_%28Recife%29_cropped.jpg',
  legenda: 'Rua dos Judeus (hoje Rua do Bom Jesus), 1855',
  autor: 'Augusto Stahl',
  licenca: 'Domínio público',
  fonte: 'https://commons.wikimedia.org/wiki/File:Rua_dos_Judeus_(Recife)_cropped.jpg',
}

const RUA_DO_BOM_JESUS_HOJE: Midia = {
  url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Rua_do_Bom_Jesus_-_Recife_Antigo_-_Recife%2C_Pernambuco%2C_Brasil.jpg/1280px-Rua_do_Bom_Jesus_-_Recife_Antigo_-_Recife%2C_Pernambuco%2C_Brasil.jpg',
  legenda: 'Rua do Bom Jesus, hoje',
  autor: 'A. Júnior',
  licenca: 'CC BY 2.0',
  fonte: 'https://commons.wikimedia.org/wiki/File:Rua_do_Bom_Jesus_-_Recife_Antigo_-_Recife,_Pernambuco,_Brasil.jpg',
}

export const CONTEUDO_PROJETO: Record<'p1' | 'p2' | 'p4' | 'p5' | 'p6', ConteudoProjeto> = {
  p1: {
    problema:
      'A Av. Norte liga Casa Amarela ao centro e concentra ônibus, ciclistas e pedestres sem separação. O asfalto está gasto, a iluminação é fraca e não há ciclovia: quem pedala divide a faixa com os ônibus.',
    proposta: [
      'Ciclovia bidirecional de 3 km, separada da pista por meio-fio e balizadores, com cruzamentos sinalizados em todos os acessos.',
      'Troca de toda a iluminação por LED, com reforço nas paradas de ônibus e travessias de pedestres.',
      'Recapeamento completo da via e novas calçadas acessíveis, com piso tátil e rampas nas esquinas.',
    ],
    beneficios: [
      'Trajeto seguro para quem pedala até o centro',
      'Menos acidentes em travessias à noite',
      'Calçadas acessíveis para quem usa cadeira de rodas',
    ],
    estimativa: {
      custo: 18_400_000,
      prazoMeses: 14,
      origemRecurso: 'Orçamento municipal + financiamento federal de mobilidade urbana',
      inicioPrevisto: '2027-01-15',
    },
  },
  p2: {
    problema:
      'A Praça do Derby perdeu uso: brinquedos quebrados, árvores sem poda bloqueando a luz e nenhum espaço para exercício. À noite, quase ninguém atravessa.',
    proposta: [
      'Novo parquinho infantil com piso emborrachado e brinquedos acessíveis.',
      'Poda técnica e plantio de novas mudas nativas, com irrigação.',
      'Academia ao ar livre e iluminação de LED em todos os caminhos.',
    ],
    beneficios: ['Praça ocupada também à noite', 'Lazer gratuito para o bairro', 'Mais sombra e árvores saudáveis'],
    estimativa: {
      custo: 2_150_000,
      prazoMeses: 6,
      origemRecurso: 'Orçamento municipal (Secretaria de Infraestrutura)',
      inicioPrevisto: '2026-08-01',
    },
    galeria: [
      {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Inaugura%C3%A7%C3%A3o_das_obras_de_reforma_da_Pra%C3%A7a_da_Matriz_em_Am%C3%A9rico_de_Campos_-_52503963081.jpg/1280px-Inaugura%C3%A7%C3%A3o_das_obras_de_reforma_da_Pra%C3%A7a_da_Matriz_em_Am%C3%A9rico_de_Campos_-_52503963081.jpg',
        legenda: 'Início da obra — reforma de praça (Américo de Campos, SP)',
        autor: 'Governo do Estado de São Paulo',
        licenca: 'CC BY 2.0',
        fonte: 'https://commons.wikimedia.org/wiki/File:Inaugura%C3%A7%C3%A3o_das_obras_de_reforma_da_Pra%C3%A7a_da_Matriz_em_Am%C3%A9rico_de_Campos_-_52503963081.jpg',
        ilustrativa: true,
      },
      {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Canteiro_de_obras_pr%C3%B3ximo_ao_Largo_da_Miseric%C3%B3rdia%2C_Acervo_do_Instituto_Moreira_Salles.jpg/1280px-Canteiro_de_obras_pr%C3%B3ximo_ao_Largo_da_Miseric%C3%B3rdia%2C_Acervo_do_Instituto_Moreira_Salles.jpg',
        legenda: 'Canteiro de obras — Largo da Misericórdia (acervo IMS)',
        autor: 'Instituto Moreira Salles',
        licenca: 'Domínio público',
        fonte: 'https://commons.wikimedia.org/wiki/File:Canteiro_de_obras_pr%C3%B3ximo_ao_Largo_da_Miseric%C3%B3rdia,_Acervo_do_Instituto_Moreira_Salles.jpg',
        ilustrativa: true,
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Reforma-da-pra%C3%A7a-da-alf%C3%A2nde.jpg',
        legenda: 'Pavimentação — reforma da Praça da Alfândega',
        autor: 'Tetraktys',
        licenca: 'CC BY-SA 3.0',
        fonte: 'https://commons.wikimedia.org/wiki/File:Reforma-da-pra%C3%A7a-da-alf%C3%A2nde.jpg',
        ilustrativa: true,
      },
    ],
  },
  p4: {
    problema:
      'Toda chuva forte alagava a Rua das Flores até a altura das calçadas. A galeria antiga estava entupida e subdimensionada para o volume de água do bairro.',
    proposta: [
      'Nova galeria pluvial com o dobro da capacidade, ligada ao canal mais próximo.',
      'Bocas de lobo a cada 30 metros e limpeza do trecho do canal.',
    ],
    beneficios: ['Fim dos alagamentos recorrentes', 'Menos casas e comércios com perdas', 'Rua transitável na chuva'],
    estimativa: {
      custo: 960_000,
      prazoMeses: 3,
      origemRecurso: 'Orçamento municipal (Secretaria de Saneamento)',
      inicioPrevisto: '2026-01-05',
      custoFinal: 1_030_000,
    },
  },
  p5: {
    problema:
      'O trecho da Rua da Aurora junto à Ponte Duarte Coelho fica escuro à noite: três postes estão apagados e os demais usam lâmpadas antigas de baixa potência. O problema chegou ao órgão por um relato de moradora no Feed.',
    proposta: [
      'Substituição de 42 luminárias por LED com telegestão (avisa sozinha quando queima).',
      'Reforço de iluminação na cabeceira da ponte e na escada de acesso ao cais.',
    ],
    beneficios: ['Rua iluminada a noite toda', 'Gasto de energia até 50% menor', 'Lâmpada queimada é trocada em até 48 h'],
    estimativa: {
      custo: 640_000,
      prazoMeses: 3,
      origemRecurso: 'Contribuição de iluminação pública (COSIP)',
      inicioPrevisto: '2026-12-01',
    },
  },
  p6: {
    problema:
      'Com o calçamento quebrado e as fachadas deterioradas, a Rua do Bom Jesus estava esvaziada e o trânsito de carros impedia o uso pelos pedestres.',
    proposta: [
      'Restauro das fachadas históricas seguindo as cores e materiais originais.',
      'Calçamento em pedra recuperado e rua aberta a pedestres aos fins de semana.',
      'Iluminação cênica e mobiliário para feiras e apresentações de rua.',
    ],
    beneficios: ['Rua ocupada por feiras e cultura', 'Patrimônio histórico preservado', 'Mais movimento para o comércio local'],
    estimativa: {
      custo: 7_800_000,
      prazoMeses: 10,
      origemRecurso: 'Orçamento municipal + programa federal de patrimônio',
      inicioPrevisto: '2025-05-15',
      custoFinal: 8_250_000,
    },
    antesDepois: { antes: RUA_DOS_JUDEUS_1855, depois: RUA_DO_BOM_JESUS_HOJE },
    videos: {
      antes: {
        url: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Resgate_do_Cinema_Silencioso_Brasileiro_-_Aspectos_Do_Brasil_-_Veneza_Americana_-_1925.webm',
        legenda: 'Recife em 1925 — filme "Veneza Americana"',
        autor: 'Cinema silencioso brasileiro (restauração)',
        licenca: 'Domínio público',
        fonte: 'https://commons.wikimedia.org/wiki/File:Resgate_do_Cinema_Silencioso_Brasileiro_-_Aspectos_Do_Brasil_-_Veneza_Americana_-_1925.webm',
      },
      depois: {
        url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Embolada_folk_music_of_Recife%2C_Pernambuco%2C_Brazil.webm',
        legenda: 'Recife hoje — embolada nas ruas',
        autor: 'Wilfredor',
        licenca: 'CC BY-SA 4.0',
        fonte: 'https://commons.wikimedia.org/wiki/File:Embolada_folk_music_of_Recife,_Pernambuco,_Brazil.webm',
      },
    },
  },
}

export const formatarReais = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** "R$ 18,4 mi" — forma curta para números grandes. */
export function reaisCurto(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`
  return formatarReais(v)
}

/** Conteúdo de um projeto da vitrine pelo id (do banco ou do mock). */
export function conteudoDoProjeto(id: string): ConteudoProjeto | undefined {
  const apelido = apelidoExemplo(id)
  return apelido && apelido in CONTEUDO_PROJETO ? CONTEUDO_PROJETO[apelido as keyof typeof CONTEUDO_PROJETO] : undefined
}
