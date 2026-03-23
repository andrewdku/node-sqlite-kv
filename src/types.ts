import { journalModes } from "@/constants";

/**
 * SQLite journal mode
 * @default DELETE (:memory: databases)
 * @default WAL (persistent databases)
 */
export type JournalMode = (typeof journalModes)[keyof typeof journalModes];

/**
 * Configuration options for instantiating a KVSync
 */
export interface KVSyncOptions {
    path?: SQLitePath;
    journalMode?: JournalMode;
}

/**
 * File path or :memory: (for SQLite use)
 */
export type SQLitePath = ":memory:" | (string & {});
