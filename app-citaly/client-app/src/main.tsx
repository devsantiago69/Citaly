import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log("?? Iniciando aplicaci�n - Verificando token inicial:", !!localStorage.getItem('token'));

createRoot(document.getElementById("root")!).render(<App />);
