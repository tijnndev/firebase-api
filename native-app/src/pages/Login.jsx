import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, setToken } from '../api/backend'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      console.log(token)
      setToken(token)
      navigate('/dashboard')
    }
  })

  const handleLogin = async () => {
    try {
      const data = await login(username, password)
      setToken(data.token)
      localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch {
      alert('Login failed')
    }
  }

  return (
    <div className="container">
      <h2>Login</h2>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Log In</button>
    </div>
  )
}
