module.exports = {
    version: 36,
    description: 'Create sync_metadata table for incremental sync tracking',
    up(db) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS sync_metadata (
                table_name   TEXT PRIMARY KEY,
                last_pull_at TEXT,
                last_push_at TEXT,
                updated_at   TEXT DEFAULT (datetime('now'))
            )
        `);
    },
    down(db) {
        db.exec('DROP TABLE IF EXISTS sync_metadata');
    }
};
