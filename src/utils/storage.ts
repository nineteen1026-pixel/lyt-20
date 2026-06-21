const STORAGE_KEY = 'saving-cottage-data'

export function saveToStorage(data: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
  }
}

export function loadFromStorage<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as T
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
  }
  return fallback
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}
