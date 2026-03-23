/**
 * A list of journal modes SQLite supports
 */
export const JournalModes = {
    Delete: "DELETE",
    Memory: "MEMORY",
    OFF: "OFF",
    Persist: "PERSIST",
    Truncate: "TRUNCATE",
    WAL: "WAL",
} as const;
