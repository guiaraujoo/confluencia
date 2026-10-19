// Tarefa 3.1 do João (Semana 3, "apoio nas telas de votação"): gera o hash do
// comprovante no cliente, via Web Crypto (SHA-256) — não é mais um placeholder
// em base64. O hash não guarda a opção votada nem referência legível ao
// usuário, só serve como comprovante de que aquele voto específico ocorreu.
export async function gerarHashComprovante(projetoId: string, userId: string): Promise<string> {
  const payload = `${projetoId}:${userId}:${Date.now()}:${crypto.randomUUID()}`
  const data = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
