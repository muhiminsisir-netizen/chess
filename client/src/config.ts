const isViteDev = location.port === '5173'
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'

export const API_BASE = import.meta.env.VITE_API_URL ?? (isViteDev ? `${location.protocol}//${location.hostname}:3001` : '')
export const WS_URL = import.meta.env.VITE_WS_URL ?? (isViteDev ? `${protocol}//${location.hostname}:3001/ws` : `${protocol}//${location.host}/ws`)
