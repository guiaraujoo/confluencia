import { isSupabaseConfigured, supabase } from './supabase'
import { RPAS, bairroOficial } from './bairros'

// Fotos enviadas pelas pessoas (perfil, capa, relato) e a foto da região que
// aparece no card do relato que veio sem foto.

export type TipoFoto = 'avatar' | 'capa' | 'relato'

const LADO_MAXIMO: Record<TipoFoto, number> = { avatar: 512, capa: 1800, relato: 1600 }
const LIMITE_ORIGINAL = 15 * 1024 * 1024

/** Reduz a foto (no máximo o lado do tipo) e converte para JPEG, no próprio navegador. */
async function reduzir(arquivo: File, lado: number): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não foi possível ler a imagem.'))), 'image/jpeg', 0.85),
  )
}

/**
 * Envia a foto para o bucket "fotos" (0015), na pasta da própria conta, e
 * devolve o endereço público. Sem Supabase (demonstração), devolve um endereço
 * local que vale só até recarregar a página.
 */
export async function enviarFoto(arquivo: File, tipo: TipoFoto, userId: string): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  if (arquivo.size > LIMITE_ORIGINAL) throw new Error('A imagem passa de 15 MB. Escolha uma menor.')
  const blob = await reduzir(arquivo, LADO_MAXIMO[tipo])
  if (!isSupabaseConfigured) return URL.createObjectURL(blob)
  const caminho = `${userId}/${tipo}-${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) {
    throw new Error(
      /bucket/i.test(error.message)
        ? 'O envio de fotos ainda não está ativo no banco (falta aplicar a migration 0015).'
        : `Não foi possível enviar a foto: ${error.message}`,
    )
  }
  return supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl
}

export interface FotoRegiao {
  url: string
  lugar: string
  autor: string
  licenca: string
  fonte: string
}

// Uma foto por Região Político-Administrativa, todas da Wikimedia Commons com
// licença livre. O crédito aparece no card.
const FOTO_DA_RPA: Record<number, FotoRegiao> = {
  1: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Rua_da_Aurora_-_Recife%2C_Pernambuco%2C_Brasil.jpg',
    lugar: 'Rua da Aurora',
    autor: 'Guilherme Jófili',
    licenca: 'CC BY 2.0',
    fonte: 'https://commons.wikimedia.org/wiki/File:Rua_da_Aurora_-_Recife,_Pernambuco,_Brasil.jpg',
  },
  2: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Avenida-norte-1.jpg/1280px-Avenida-norte-1.jpg',
    lugar: 'Av. Norte',
    autor: 'Abmac',
    licenca: 'Domínio público',
    fonte: 'https://commons.wikimedia.org/wiki/File:Avenida-norte-1.jpg',
  },
  3: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Parque_da_Jaqueira%2C_Recife.jpg/1280px-Parque_da_Jaqueira%2C_Recife.jpg',
    lugar: 'Parque da Jaqueira',
    autor: 'Abdias Jr',
    licenca: 'CC BY 2.0',
    fonte: 'https://commons.wikimedia.org/wiki/File:Parque_da_Jaqueira,_Recife.jpg',
  },
  4: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Instituto_Ricardo_Brennand_1.jpg/1280px-Instituto_Ricardo_Brennand_1.jpg',
    lugar: 'Instituto Ricardo Brennand, Várzea',
    autor: 'Wilfredor',
    licenca: 'CC BY-SA 4.0',
    fonte: 'https://commons.wikimedia.org/wiki/File:Instituto_Ricardo_Brennand_1.jpg',
  },
  5: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Torre_Zeppelindo_bairro_Jiquia_no_Recife%2C_a_%C3%BAnica_torre_para_atraca%C3%A7%C3%A3o_dos_dirig%C3%ADveis_Zeppelin_ainda_existente_no_mundo.jpg/1280px-Torre_Zeppelindo_bairro_Jiquia_no_Recife%2C_a_%C3%BAnica_torre_para_atraca%C3%A7%C3%A3o_dos_dirig%C3%ADveis_Zeppelin_ainda_existente_no_mundo.jpg',
    lugar: 'Torre do Zeppelin, Jiquiá',
    autor: 'Hansfotos',
    licenca: 'CC BY-SA 4.0',
    fonte: 'https://commons.wikimedia.org/wiki/File:Torre_Zeppelindo_bairro_Jiquia_no_Recife,_a_%C3%BAnica_torre_para_atraca%C3%A7%C3%A3o_dos_dirig%C3%ADveis_Zeppelin_ainda_existente_no_mundo.jpg',
  },
  6: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Boa_Viagem%2C_Recife_%2820150717-DSC05419%29.jpg/1280px-Boa_Viagem%2C_Recife_%2820150717-DSC05419%29.jpg',
    lugar: 'Boa Viagem',
    autor: 'Matti Blume',
    licenca: 'CC BY-SA 4.0',
    fonte: 'https://commons.wikimedia.org/wiki/File:Boa_Viagem,_Recife_(20150717-DSC05419).jpg',
  },
}

const RPA_DO_BAIRRO = new Map(RPAS.flatMap((r) => r.bairros.map((b) => [b, r.rpa] as const)))

/** Foto da região do bairro (RPA), ou null se o bairro não for da lista oficial. */
export function fotoDaRegiao(bairro: string | null | undefined): FotoRegiao | null {
  const oficial = bairroOficial(bairro)
  const rpa = oficial ? RPA_DO_BAIRRO.get(oficial) : undefined
  return rpa ? FOTO_DA_RPA[rpa] : null
}
