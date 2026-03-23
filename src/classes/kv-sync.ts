import type { JournalMode, KVSyncProps as KVSyncProps } from "@/types";
import { DatabaseSync } from "node:sqlite";
import { KVError } from "@/classes/kv-error";
import { deserialize, serialize } from "node:v8";
import { JournalModes } from "@/constants";
import fs from "node:fs";
import path from "node:path";

/**
 * Class representing a synchronous key-value store
 */
export class KVSync<T = any> {
    #db: DatabaseSync;

    /**
     * Instantiate a new key-value store
     * @param props KVSync options
     */
    public constructor(props?: KVSyncProps) {
        const dbPath = props?.path ?? ":memory:";

        if (dbPath !== ":memory:") {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        }

        this.#db = new DatabaseSync(dbPath, {
            open: props?.open ?? true,
        });

        if (props?.open !== false) {
            this.setJournalMode(
                props?.journalMode ??
                    (dbPath !== ":memory:" ? JournalModes.WAL : JournalModes.Delete)
            );

            this.#db.exec(
                "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value BLOB NOT NULL) STRICT;"
            );
        }
    }

    /**
     * Set a key in the database
     * @param key Key name
     * @param value Key value
     * @returns Provided value
     */
    public set<K = T>(key: string, value: K | undefined): K {
        if (!this.#db.isOpen) {
            throw new KVError("set", "Database is not open");
        }

        if (!key || typeof key !== "string") {
            throw new KVError(
                "set",
                "Key must be provided and be a non-empty string"
            );
        }

        if (value === undefined) {
            throw new KVError(
                "set",
                "Provided value is undefined, did you mean to use delete()?"
            );
        }

        this.#db
            .prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);")
            .run(key, serialize(value));

        return value;
    }

    /**
     * Get a value from the database
     * @param key Key name
     * @returns Value or null
     */
    public get<K = T>(key: string): K | null {
        if (!this.#db.isOpen) {
            throw new KVError("get", "Database is not open");
        }

        if (!key || typeof key !== "string") {
            throw new KVError(
                "get",
                "Key must be provided and be a non-empty string."
            );
        }

        const row = this.#db.prepare("SELECT value FROM kv WHERE key = ?;").get(key);
        return row ? (deserialize(row.value as any) as K) : null;
    }

    /**
     * Delete a key from the database
     * @param key Key name
     * @returns KVSync instance
     */
    public delete(key: string): KVSync {
        if (!this.#db.isOpen) {
            throw new KVError("delete", "Database is not open");
        }

        if (!key || typeof key !== "string") {
            throw new KVError(
                "delete",
                "Key must be provided and be a non-empty string."
            );
        }

        this.#db.prepare("DELETE FROM kv WHERE key = ?;").run(key);
        return this;
    }

    /**
     * Get all data in the database
     * @returns Array of objects containing keys and values
     */
    public all<K = T>(
        filter?: (key: string, value: K) => boolean
    ): { key: string; value: K }[] {
        if (!this.#db.isOpen) {
            throw new KVError("all", "Database is not open");
        }

        const rows = this.#db.prepare("SELECT key, value FROM kv;").iterate();
        const result: { key: string; value: K }[] = [];

        for (const row of rows as any) {
            const key = row.key as string;
            const value = deserialize(row.value as any) as K;

            if (!filter || filter(key, value)) {
                result.push({ key, value });
            }
        }

        return result;
    }

    /**
     * Remove all entries from the database
     */
    public clear(): KVSync {
        if (!this.#db.isOpen) {
            throw new KVError("clear", "Database is not open");
        }

        this.#db.exec("DELETE FROM kv;");
        return this;
    }

    /**
     * Update the journal mode
     * @param mode New journal mode
     */
    public setJournalMode(mode: JournalMode) {
        if (!this.#db.isOpen) {
            throw new KVError("setJournalMode", "Database is not open");
        }

        if (!Object.values(JournalModes).includes(mode)) {
            throw new KVError(
                "setJournalMode",
                `Invalid journal mode specified - received: "${mode}", expected one of: ${Object.values(JournalModes).join(", ")}`
            );
        }

        this.#db.exec(`PRAGMA journal_mode = ${mode};`);
        return this;
    }

    /**
     * Perform a transaction
     * @param callback Callback with KVSync instance
     * @returns Object containing oldValues and newValues each containing arrays of keys and values
     */
    public transaction<R>(callback: (kv: KVSync<T>) => R): {
        oldValues: { key: string; value: T | null | undefined }[];
        newValues: { key: string; value: T | null }[];
    } {
        if (!this.#db.isOpen) {
            throw new KVError("transaction", "Database is not open");
        }

        if (!callback) {
            throw new KVError(
                "transaction",
                "A callback must be provided when using transaction()."
            );
        }

        if (typeof callback !== "function") {
            throw new KVError(
                "transaction",
                `Transaction callback must be of type function. Received: ${typeof callback}`
            );
        }

        const oldMap = new Map<string, T | null | undefined>();
        const newMap = new Map<string, T | null>();
        const tx = Object.create(this);

        tx.set = <K extends T>(key: string, value: K | undefined): K | null => {
            if (!oldMap.has(key)) {
                const oldValue = this.get<K>(key);
                oldMap.set(key, oldValue === null ? undefined : oldValue);
            }

            newMap.set(key, value as K);
            return value ?? null;
        };

        tx.delete = (key: string): KVSync => {
            if (!oldMap.has(key)) {
                const oldValue = this.get<T>(key);
                oldMap.set(key, oldValue === null ? undefined : oldValue);
            }

            newMap.set(key, null);
            return tx;
        };

        try {
            this.#db.exec("BEGIN TRANSACTION;");
            callback(tx);

            for (const [key, value] of newMap.entries()) {
                if (value === null) {
                    this.delete(key);
                } else {
                    this.set(key, value);
                }
            }

            this.#db.exec("COMMIT;");
        } catch (error: any) {
            this.#db.exec("ROLLBACK;");
            throw error;
        }

        return {
            oldValues: Array.from(oldMap.entries()).map(([key, value]) => ({
                key,
                value,
            })),

            newValues: Array.from(newMap.entries()).map(([key, value]) => ({
                key,
                value,
            })),
        };
    }

    /**
     * Check if a key exists
     * @param key Key name
     * @returns Boolean representing whether a key exists
     */
    public exists(key: string): boolean {
        if (!this.#db.isOpen) {
            throw new KVError("exists", "Database is not open");
        }

        if (!key || typeof key !== "string") {
            throw new KVError(
                "exists",
                "Key must be provided and be a non-empty string."
            );
        }
        return (
            this.#db.prepare("SELECT 1 FROM kv WHERE key = ?;").get(key) !==
            undefined
        );
    }

    /**
     * Get total number of entries in the database
     */
    public size(): number {
        if (!this.#db.isOpen) {
            throw new KVError("size", "Database is not open");
        }

        return (
            this.#db.prepare("SELECT COUNT(*) as count FROM kv;").get() as {
                count: number;
            }
        ).count;
    }

    /**
     * Open the database
     */
    public open(): void {
        if (this.#db.isOpen) {
            throw new KVError("open", "Database is already open");
        }

        this.#db.exec(
            "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value BLOB NOT NULL) STRICT;"
        );
    }

    /**
     * Close the database
     */
    public close(): void {
        if (!this.#db.isOpen) {
            throw new KVError("close", "Database is not open");
        }

        this.#db.close();
    }
}
