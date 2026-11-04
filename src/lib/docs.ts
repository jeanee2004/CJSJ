// 마이페이지 서류함: 파일은 서버로 보내지 않고 이 기기 브라우저(IndexedDB)에만 저장한다.
// 서류에는 주민번호·소득 같은 민감한 정보가 많아서, 이 사이트가 가진 개인정보를 늘리지 않으려는 선택이다.
// (기기를 바꾸거나 브라우저 데이터를 지우면 사라진다)

export interface DocRow { id: string; folder: string; name: string; type: string; size: number; at: number; blob: Blob }
export type DocMeta = Omit<DocRow, 'blob'>

export const MAX_BYTES = 10 * 1024 * 1024 // 파일 하나 10MB
export const MAX_PER_FOLDER = 20
export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.hwp,.hwpx,.xls,.xlsx'
const OK_EXT = ACCEPT.split(',').map((e) => e.slice(1))

/** 올릴 수 있는 파일인지 보고, 안 되면 이유를 돌려준다 */
export function checkFile(f: { name: string; size: number }, countInFolder: number): string | null {
  const ext = f.name.toLowerCase().split('.').pop() ?? ''
  if (!OK_EXT.includes(ext)) return `${f.name}: 이 형식은 올릴 수 없어요 (PDF·사진·문서 파일만)`
  if (f.size > MAX_BYTES) return `${f.name}: 10MB보다 커요`
  if (f.size === 0) return `${f.name}: 빈 파일이에요`
  if (countInFolder >= MAX_PER_FOLDER) return `폴더마다 ${MAX_PER_FOLDER}개까지 담을 수 있어요`
  return null
}

export const sizeLabel = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`)

const dbName = (uid: string) => `cjsj-docs-${uid}` // 계정마다 따로 저장해, 같은 기기에서 다른 계정끼리 섞이지 않게 한다

function open(uid: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('NO_IDB'))
    const req = indexedDB.open(dbName(uid), 1)
    req.onupgradeneeded = () => req.result.createObjectStore('docs', { keyPath: 'id' }).createIndex('folder', 'folder')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const run = <T,>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const tx = db.transaction('docs', mode)
    const r = fn(tx.objectStore('docs'))
    tx.oncomplete = () => resolve(r.result)
    tx.onerror = tx.onabort = () => reject(tx.error)
  })

export async function listDocs(uid: string): Promise<DocMeta[]> {
  const db = await open(uid)
  try {
    const rows = await run(db, 'readonly', (s) => s.getAll() as IDBRequest<DocRow[]>)
    return rows.map(({ blob: _b, ...m }) => m).sort((a, b) => b.at - a.at)
  } finally { db.close() }
}

export async function addDoc(uid: string, folder: string, f: File): Promise<void> {
  const db = await open(uid)
  try {
    const row: DocRow = { id: crypto.randomUUID(), folder, name: f.name, type: f.type, size: f.size, at: Date.now(), blob: f }
    await run(db, 'readwrite', (s) => s.add(row))
  } finally { db.close() }
}

export async function getDocBlob(uid: string, id: string): Promise<Blob | null> {
  const db = await open(uid)
  try { return ((await run(db, 'readonly', (s) => s.get(id) as IDBRequest<DocRow | undefined>))?.blob) ?? null } finally { db.close() }
}

export async function removeDoc(uid: string, id: string): Promise<void> {
  const db = await open(uid)
  try { await run(db, 'readwrite', (s) => s.delete(id)) } finally { db.close() }
}

export async function clearDocs(uid: string): Promise<void> {
  const db = await open(uid)
  try { await run(db, 'readwrite', (s) => s.clear()) } finally { db.close() }
}
