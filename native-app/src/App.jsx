import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import useTheme from './hooks/useTheme'
import './theme.css'

export default function App() {
  const [theme, toggleTheme] = useTheme()

  return (
    <BrowserRouter>
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <button onClick={toggleTheme}>
          Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </div>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
