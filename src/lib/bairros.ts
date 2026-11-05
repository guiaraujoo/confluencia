// Os 94 bairros oficiais da cidade do Recife, por Região Político-Administrativa (RPA).
// Relatos e perfis usam só esta lista: o nome fica sempre igual (com acento), os
// filtros funcionam e cada bairro pode ter a sua foto.
export const RPAS: { rpa: number; nome: string; bairros: string[] }[] = [
  {
    rpa: 1,
    nome: 'Centro',
    bairros: ['Boa Vista', 'Cabanga', 'Coelhos', 'Ilha do Leite', 'Ilha Joana Bezerra', 'Paissandu', 'Recife', 'Santo Amaro', 'Santo Antônio', 'São José', 'Soledade'],
  },
  {
    rpa: 2,
    nome: 'Norte',
    bairros: ['Água Fria', 'Alto Santa Terezinha', 'Arruda', 'Beberibe', 'Bomba do Hemetério', 'Cajueiro', 'Campina do Barreto', 'Campo Grande', 'Dois Unidos', 'Encruzilhada', 'Fundão', 'Hipódromo', 'Linha do Tiro', 'Peixinhos', 'Ponto de Parada', 'Porto da Madeira', 'Rosarinho', 'Torreão'],
  },
  {
    rpa: 3,
    nome: 'Noroeste',
    bairros: ['Aflitos', 'Alto do Mandu', 'Alto José Bonifácio', 'Alto José do Pinho', 'Apipucos', 'Brejo da Guabiraba', 'Brejo de Beberibe', 'Casa Amarela', 'Casa Forte', 'Córrego do Jenipapo', 'Derby', 'Dois Irmãos', 'Espinheiro', 'Graças', 'Guabiraba', 'Jaqueira', 'Macaxeira', 'Mangabeira', 'Monteiro', 'Morro da Conceição', 'Nova Descoberta', 'Parnamirim', 'Passarinho', 'Pau-Ferro', 'Poço da Panela', 'Santana', 'Sítio dos Pintos', 'Tamarineira', 'Vasco da Gama'],
  },
  {
    rpa: 4,
    nome: 'Oeste',
    bairros: ['Caxangá', 'Cidade Universitária', 'Cordeiro', 'Engenho do Meio', 'Ilha do Retiro', 'Iputinga', 'Madalena', 'Prado', 'Torre', 'Torrões', 'Várzea', 'Zumbi'],
  },
  {
    rpa: 5,
    nome: 'Sudoeste',
    bairros: ['Afogados', 'Areias', 'Barro', 'Bongi', 'Caçote', 'Coqueiral', 'Curado', 'Estância', 'Jardim São Paulo', 'Jiquiá', 'Mangueira', 'Mustardinha', 'San Martin', 'Sancho', 'Tejipió', 'Totó'],
  },
  {
    rpa: 6,
    nome: 'Sul',
    bairros: ['Boa Viagem', 'Brasília Teimosa', 'Cohab', 'Ibura', 'Imbiribeira', 'Ipsep', 'Jordão', 'Pina'],
  },
]

export const BAIRROS_RECIFE: string[] = RPAS.flatMap((r) => r.bairros).sort((a, b) => a.localeCompare(b, 'pt-BR'))

const chave = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const PELA_CHAVE = new Map(BAIRROS_RECIFE.map((b) => [chave(b), b]))

/** Nome oficial do bairro ("varzea" → "Várzea"), ou null se não for um bairro do Recife. */
export function bairroOficial(texto: string | null | undefined): string | null {
  if (!texto) return null
  return PELA_CHAVE.get(chave(texto)) ?? null
}
