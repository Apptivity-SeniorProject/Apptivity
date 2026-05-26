import * as SQLite from 'expo-sqlite';

type LocationGridRow = {
  grid_lat: number;
  grid_lng: number;
  sample_count: number;
  last_seen_ms: number;
};

const DB_NAME = 'apptivity-location-history.db';
const TABLE_NAME = 'location_history';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(
        `
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          recorded_at_ms INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_recorded_at_ms ON ${TABLE_NAME}(recorded_at_ms);
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_lat_lng ON ${TABLE_NAME}(lat, lng);
        `
      );
      return db;
    });
  }

  return dbPromise;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export async function insertLocationSample(lat: number, lng: number, recordedAtMs = Date.now()): Promise<void> {
  if (!isValidCoordinate(lat, lng)) {
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO ${TABLE_NAME} (lat, lng, recorded_at_ms) VALUES (?, ?, ?)`,
    [lat, lng, Math.trunc(recordedAtMs)]
  );

  await pruneLocationSamplesOlderThan(THIRTY_DAYS_MS);
}

export async function pruneLocationSamplesOlderThan(maxAgeMs: number): Promise<void> {
  const db = await getDatabase();
  const cutoff = Date.now() - maxAgeMs;
  await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE recorded_at_ms < ?`, [cutoff]);
}

export async function clearLocationHistory(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM ${TABLE_NAME}`);
}

export async function getTopLocationGrids(limit = 3): Promise<LocationGridRow[]> {
  const db = await getDatabase();
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  const rows = await db.getAllAsync<LocationGridRow>(
    `
      SELECT
        ROUND(lat, 2) AS grid_lat,
        ROUND(lng, 2) AS grid_lng,
        COUNT(*) AS sample_count,
        MAX(recorded_at_ms) AS last_seen_ms
      FROM ${TABLE_NAME}
      WHERE recorded_at_ms >= ?
      GROUP BY ROUND(lat, 2), ROUND(lng, 2)
      ORDER BY sample_count DESC, last_seen_ms DESC
      LIMIT ?
    `,
    [cutoff, limit]
  );

  return rows;
}
