import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.data')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readJsonFile<T>(filename: string, defaultValue: T): T {
  try {
    ensureDataDir()
    const filePath = path.join(DATA_DIR, filename)
    if (!fs.existsSync(filePath)) {
      return defaultValue
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`Error reading ${filename} from disk:`, err)
    return defaultValue
  }
}

export function writeJsonFile<T>(filename: string, data: T): void {
  try {
    ensureDataDir()
    const filePath = path.join(DATA_DIR, filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error(`Error writing ${filename} to disk:`, err)
  }
}
