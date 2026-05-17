/** Normalize base URL so axios/fetch always get a full origin (avoids broken URLs like `:8002/...`). */
function normalizeApiBase(raw: string): string {
  const s = raw.trim().replace(/\/$/, '')
  if (!s) return 'http://127.0.0.1:8002'
  if (/^https?:\/\//i.test(s)) return s
  // "localhost:8002" or ":8002" (bad env) → http://localhost:8002
  const hostPort = s.replace(/^\/+/, '').replace(/^:+/, '')
  return `http://${hostPort}`
}

export const getApiUrl = () => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  if (fromEnv) {
    return normalizeApiBase(fromEnv)
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // If accessing via ngrok, use HTTPS ngrok URL (don't append :8002)
    if (hostname.includes('.ngrok.io')) {
      return `https://${hostname}`
    }
    
    // For localhost/127.0.0.1, append port 8002
    return `http://${hostname}:8002`
  }

  return 'http://127.0.0.1:8002'
}
