import db from './init.js';

export function search(q: string) {
    return db
        .prepare(`SELECT title, lyrics FROM songs_fts WHERE songs_fts MATCH ? LIMIT 20`)
        .all(q);
}
