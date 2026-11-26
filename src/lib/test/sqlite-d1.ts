// @ts-expect-error Bun supplies SQLite at test runtime.
import type { Database } from 'bun:sqlite';

/** Run production D1 statements and batches against transactional SQLite. */
export function sqliteD1(sqlite: Database): D1Database {
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) { this.values = values; return this; }
    execute() {
      const result = sqlite.query(this.sql).run(...this.values);
      return { success: true, meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) }, results: [] };
    }
    async run() { return this.execute(); }
    async first() { return sqlite.query(this.sql).get(...this.values); }
    async all() { return { results: sqlite.query(this.sql).all(...this.values), success: true }; }
  }
  return {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => sqlite.transaction(() => statements.map((statement) => statement.execute()))(),
  } as unknown as D1Database;
}
