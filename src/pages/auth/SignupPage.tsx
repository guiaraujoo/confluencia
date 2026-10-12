import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, FormError, Label, TextField } from '../../components/ui'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error, confirmed } = await signUp(email, password, nome)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    if (confirmed) {
      // Já voltou logado (confirmação de e-mail desativada no projeto) — mandar
      // pra /entrar aqui seria pedir pra pessoa logar de novo sem necessidade.
      navigate('/feed')
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/entrar'), 1500)
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="font-heading text-2xl font-bold text-grafite-900 mb-1">Criar conta</h1>
      <p className="text-sm text-grafite-500 mb-6">Leva menos de um minuto.</p>
      <Card>
        {success ? (
          <p className="text-sm text-status-verde-700">
            Conta criada! Se a confirmação por e-mail estiver ativa no projeto Supabase, confira sua
            caixa de entrada antes de entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <TextField required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <Label>E-mail</Label>
              <TextField
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
            <div>
              <Label>Senha</Label>
              <TextField
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
              />
            </div>
            {error && <FormError>{error}</FormError>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
        )}
      </Card>
      <p className="text-sm text-grafite-500 mt-4 text-center">
        Já tem conta?{' '}
        <Link to="/entrar" className="text-amarelo-700 font-semibold hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
