import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

type WorkspaceRow = {
  state_json: string;
  version: number;
  updated_at: string;
};

export type UploadRecord = {
  id: string;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size: number;
  created_at: string;
};

let database: Database.Database | null = null;

export function getDataDirectory() {
  return process.env.SCALE_CONTENT_DATA_DIR
    ? path.resolve(process.env.SCALE_CONTENT_DATA_DIR)
    : path.join(process.cwd(), "data");
}

export function getUploadsDirectory() {
  return path.join(getDataDirectory(), "uploads");
}

export function getDatabase() {
  if (database) return database;

  const dataDirectory = getDataDirectory();
  mkdirSync(getUploadsDirectory(), { recursive: true });
  database = new Database(path.join(dataDirectory, "scale-content-hq.sqlite3"));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS workspace (
      id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      storage_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return database;
}

export function getWorkspace() {
  const row = getDatabase()
    .prepare("SELECT state_json, version, updated_at FROM workspace WHERE id = ?")
    .get("main") as WorkspaceRow | undefined;

  if (!row) return null;
  return {
    state: JSON.parse(row.state_json) as unknown,
    version: row.version,
    updatedAt: row.updated_at,
  };
}

export function saveWorkspace(state: unknown) {
  const updatedAt = new Date().toISOString();
  const stateJson = JSON.stringify(state);
  getDatabase()
    .prepare(`
      INSERT INTO workspace (id, state_json, version, updated_at)
      VALUES ('main', ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        version = workspace.version + 1,
        updated_at = excluded.updated_at
    `)
    .run(stateJson, updatedAt);

  return getWorkspace();
}

export function saveUpload(upload: UploadRecord) {
  getDatabase()
    .prepare(`
      INSERT INTO uploads (id, original_name, storage_name, mime_type, size, created_at)
      VALUES (@id, @original_name, @storage_name, @mime_type, @size, @created_at)
    `)
    .run(upload);
}

export function getUpload(id: string) {
  return getDatabase()
    .prepare("SELECT * FROM uploads WHERE id = ?")
    .get(id) as UploadRecord | undefined;
}
