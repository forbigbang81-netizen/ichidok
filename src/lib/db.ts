import { createClient, type Client } from '@libsql/client'

const globalForDb = globalThis as unknown as { libsql: Client | undefined }

function getClient(): Client {
  if (globalForDb.libsql) return globalForDb.libsql
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (process.env.NEXT_PHASE === 'phase-production-build' ||
      (process.env.NODE_ENV === 'production' && (!url || url.startsWith('file:')))) {
    const c = createClient({ url: 'file::memory:' })
    globalForDb.libsql = c
    return c
  }
  const c = createClient({
    url: url && url.startsWith('libsql://') ? url : (url || 'file:./db/custom.db'),
    authToken: url && url.startsWith('libsql://') ? (authToken || undefined) : undefined,
  })
  globalForDb.libsql = c
  return c
}

function makeWhere(where?: Record<string, unknown>): { sql: string; args: unknown[] } {
  if (!where || Object.keys(where).length === 0) return { sql: '', args: [] }
  const parts: string[] = []
  const args: unknown[] = []
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR') {
      const orParts = (v as Record<string, unknown>[]).map(clause => {
        const sub = makeWhere(clause)
        args.push(...sub.args)
        return `(${sub.sql})`
      })
      parts.push(`(${orParts.join(' OR ')})`)
    } else if (typeof v === 'object' && v !== null && 'contains' in v) {
      parts.push(`LOWER("${k}") LIKE ?`)
      args.push(`%${String((v as { contains: unknown }).contains).toLowerCase()}%`)
    } else {
      parts.push(`"${k}" = ?`)
      args.push(v)
    }
  }
  return { sql: parts.join(' AND '), args }
}

function makeOrderBy(orderBy?: string | Record<string, string>): string {
  if (!orderBy) return ''
  if (typeof orderBy === 'string') return ` ORDER BY "${orderBy}" DESC`
  const parts = Object.entries(orderBy).map(([k, v]) => `"${k}" ${v === 'asc' ? 'ASC' : 'DESC'}`)
  return ` ORDER BY ${parts.join(', ')}`
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'c'
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

const animeTable = {
  async count(where?: Record<string, unknown>): Promise<number> {
    const w = makeWhere(where)
    const sql = `SELECT COUNT(*) as count FROM "Anime"${w.sql ? ` WHERE ${w.sql}` : ''}`
    const r = await getClient().execute({ sql, args: w.args as never[] })
    return Number((r.rows[0] as Record<string, unknown>)?.count ?? 0)
  },
  async findMany(opts?: { where?: Record<string, unknown>; orderBy?: string | Record<string, string>; skip?: number; take?: number }): Promise<any[]> {
    const w = makeWhere(opts?.where)
    let sql = `SELECT * FROM "Anime"`
    const args = [...w.args] as never[]
    if (w.sql) sql += ` WHERE ${w.sql}`
    if (opts?.orderBy) sql += makeOrderBy(opts.orderBy)
    if (opts?.take) { sql += ` LIMIT ?`; args.push(opts.take as never) }
    if (opts?.skip) { sql += ` OFFSET ?`; args.push(opts.skip as never) }
    const r = await getClient().execute({ sql, args })
    return r.rows as any[]
  },
  async findFirst(opts?: { where?: Record<string, unknown>; include?: Record<string, boolean> }): Promise<any> {
    const w = makeWhere(opts?.where)
    const sql = `SELECT * FROM "Anime"${w.sql ? ` WHERE ${w.sql}` : ''} LIMIT 1`
    const r = await getClient().execute({ sql, args: w.args as never[] })
    const row = r.rows[0] as any
    if (!row) return null
    if (opts?.include?.episodes) {
      const epR = await getClient().execute({ sql: `SELECT * FROM "Episode" WHERE "animeId" = ? ORDER BY "number"`, args: [row.id] })
      row.episodes = epR.rows
    }
    if (opts?.include?.imports) {
      const impR = await getClient().execute({ sql: `SELECT * FROM "Import" WHERE "animeId" = ? ORDER BY "episode"`, args: [row.id] })
      row.imports = impR.rows
    }
    return row
  },
  async findUnique(opts: { where: Record<string, unknown> }): Promise<any> {
    return this.findFirst({ where: opts.where })
  },
  async upsert(opts: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const existing = await this.findFirst({ where: opts.where })
    if (existing) {
      const setParts = Object.entries(opts.update).map(([k]) => `"${k}" = ?`)
      const setArgs = Object.values(opts.update)
      const sql = `UPDATE "Anime" SET ${setParts.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE ${w.sql}`
      await getClient().execute({ sql, args: [...setArgs, ...w.args] as never[] })
      return this.findFirst({ where: opts.where })
    } else {
      const data = { ...opts.create }
      if (!data.id) data.id = generateId()
      if (!data.createdAt) data.createdAt = new Date().toISOString()
      if (!data.updatedAt) data.updatedAt = new Date().toISOString()
      const cols = Object.entries(data)
      const sql = `INSERT INTO "Anime" (${cols.map(([k]) => `"${k}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      await getClient().execute({ sql, args: cols.map(([, v]) => v) as never[] })
      return this.findFirst({ where: opts.where })
    }
  },
}

const episodeTable = {
  async findFirst(opts: { where: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const sql = `SELECT * FROM "Episode"${w.sql ? ` WHERE ${w.sql}` : ''} LIMIT 1`
    const r = await getClient().execute({ sql, args: w.args as never[] })
    return (r.rows[0] as any) ?? null
  },
  async upsert(opts: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const existing = await this.findFirst({ where: opts.where })
    if (existing) {
      const setParts = Object.entries(opts.update).map(([k]) => `"${k}" = ?`)
      const setArgs = Object.values(opts.update)
      const sql = `UPDATE "Episode" SET ${setParts.join(', ')} WHERE ${w.sql}`
      await getClient().execute({ sql, args: [...setArgs, ...w.args] as never[] })
    } else {
      const data = { ...opts.create }
      if (!data.id) data.id = generateId()
      const cols = Object.entries(data)
      const sql = `INSERT INTO "Episode" (${cols.map(([k]) => `"${k}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      await getClient().execute({ sql, args: cols.map(([, v]) => v) as never[] })
    }
    return this.findFirst({ where: opts.where })
  },
}

const importTable = {
  async findUnique(opts: { where: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const sql = `SELECT * FROM "Import"${w.sql ? ` WHERE ${w.sql}` : ''} LIMIT 1`
    const r = await getClient().execute({ sql, args: w.args as never[] })
    return (r.rows[0] as any) ?? null
  },
  async upsert(opts: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const existing = await this.findUnique({ where: opts.where })
    if (existing) {
      const setParts = Object.entries(opts.update).map(([k]) => `"${k}" = ?`)
      const setArgs = Object.values(opts.update)
      const sql = `UPDATE "Import" SET ${setParts.join(', ')} WHERE ${w.sql}`
      await getClient().execute({ sql, args: [...setArgs, ...w.args] as never[] })
    } else {
      const data = { ...opts.create }
      if (!data.id) data.id = generateId()
      const cols = Object.entries(data)
      const sql = `INSERT INTO "Import" (${cols.map(([k]) => `"${k}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      await getClient().execute({ sql, args: cols.map(([, v]) => v) as never[] })
    }
    return this.findUnique({ where: opts.where })
  },
}

const bookmarkTable = {
  async findMany(): Promise<any[]> {
    const r = await getClient().execute(`SELECT * FROM "Bookmark" ORDER BY "createdAt" DESC`)
    return r.rows as any[]
  },
  async findUnique(opts: { where: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const r = await getClient().execute({ sql: `SELECT * FROM "Bookmark" WHERE ${w.sql} LIMIT 1`, args: w.args as never[] })
    return (r.rows[0] as any) ?? null
  },
  async create(opts: { data: Record<string, unknown> }): Promise<any> {
    const data = { ...opts.data }
    if (!data.id) data.id = generateId()
    const cols = Object.entries(data)
    const sql = `INSERT INTO "Bookmark" (${cols.map(([k]) => `"${k}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    await getClient().execute({ sql, args: cols.map(([, v]) => v) as never[] })
    return data
  },
  async delete(opts: { where: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    await getClient().execute({ sql: `DELETE FROM "Bookmark" WHERE ${w.sql}`, args: w.args as never[] })
    return {}
  },
}

const historyTable = {
  async findMany(): Promise<any[]> {
    const r = await getClient().execute(`SELECT * FROM "History" ORDER BY "watchedAt" DESC`)
    return r.rows as any[]
  },
  async findUnique(opts: { where: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const r = await getClient().execute({ sql: `SELECT * FROM "History" WHERE ${w.sql} LIMIT 1`, args: w.args as never[] })
    return (r.rows[0] as any) ?? null
  },
  async upsert(opts: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    const existing = await this.findUnique({ where: opts.where })
    if (existing) {
      const setParts = Object.entries(opts.update).map(([k]) => `"${k}" = ?`)
      const setArgs = Object.values(opts.update)
      const sql = `UPDATE "History" SET ${setParts.join(', ')} WHERE ${w.sql}`
      await getClient().execute({ sql, args: [...setArgs, ...w.args] as never[] })
    } else {
      const data = { ...opts.create }
      if (!data.id) data.id = generateId()
      const cols = Object.entries(data)
      const sql = `INSERT INTO "History" (${cols.map(([k]) => `"${k}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      await getClient().execute({ sql, args: cols.map(([, v]) => v) as never[] })
    }
    return this.findUnique({ where: opts.where })
  },
  async deleteMany(opts?: { where?: Record<string, unknown> }): Promise<{ count: number }> {
    if (!opts?.where) { await getClient().execute(`DELETE FROM "History"`); return { count: 0 } }
    const w = makeWhere(opts.where)
    await getClient().execute({ sql: `DELETE FROM "History" WHERE ${w.sql}`, args: w.args as never[] })
    return { count: 0 }
  },
  async delete(opts: { where: Record<string, unknown> }): Promise<any> {
    const w = makeWhere(opts.where)
    await getClient().execute({ sql: `DELETE FROM "History" WHERE ${w.sql}`, args: w.args as never[] })
    return {}
  },
}

const notificationTable = {
  async findMany(): Promise<any[]> {
    const r = await getClient().execute(`SELECT * FROM "Notification" ORDER BY "createdAt" DESC`)
    return r.rows as any[]
  },
  async updateMany(opts: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }> {
    const w = makeWhere(opts.where)
    const setParts = Object.entries(opts.data).map(([k]) => `"${k}" = ?`)
    const setArgs = Object.values(opts.data)
    await getClient().execute({ sql: `UPDATE "Notification" SET ${setParts.join(', ')} WHERE ${w.sql}`, args: [...setArgs, ...w.args] as never[] })
    return { count: 0 }
  },
  async create(opts: { data: Record<string, unknown> }): Promise<any> {
    const data = { ...opts.data }
    if (!data.id) data.id = generateId()
    const cols = Object.entries(data)
    const sql = `INSERT INTO "Notification" (${cols.map(([k]) => `"${k}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    await getClient().execute({ sql, args: cols.map(([, v]) => v) as never[] })
    return data
  },
}

export const db = {
  anime: animeTable,
  episode: episodeTable,
  import: importTable,
  bookmark: bookmarkTable,
  history: historyTable,
  notification: notificationTable,
}
