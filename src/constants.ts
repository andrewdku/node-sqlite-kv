/**
 * A list of journal modes SQLite supports
 */
export const journalModes = {
    Delete: "DELETE",
    Memory: "MEMORY",
    Off: "OFF",
    Persist: "PERSIST",
    Truncate: "TRUNCATE",
    WAL: "WAL",
} as const;
