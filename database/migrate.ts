import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = 'ziona.db';
const SONGS_DIR = './data/songs';
const BIBLE_DIR = './data/bible';
const OLD_TESTAMENT_BOOKS_DIR = '../data/baiboly/Testamenta Taloha';
const NEW_TESTAMENT_BOOKS_DIR = '../data/baiboly/Testamenta Vaovao';

const db = new Database(DB_PATH);

/* -------------------- SCHEMA -------------------- */

db.exec(`
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT,
  lyrics TEXT,
  lang TEXT
);

CREATE TABLE IF NOT EXISTS verses (
  id TEXT PRIMARY KEY,
  book TEXT,
  chapter INTEGER,
  verse INTEGER,
  text TEXT,
  lang TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts
USING fts5(title, lyrics, content='songs');

CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts
USING fts5(book, text, content='verses');
`);

/* -------------------- CHECK FLAG -------------------- */

const initialized = db
    .prepare(`SELECT value FROM meta WHERE key='initialized'`)
    .get() as { value: string } | undefined;

if (initialized?.value === 'true') {
    console.log('✔ Database already initialized. Skipping migration.');
    process.exit(0);
}


/* -------------------- PREPARE STATEMENTS -------------------- */

const insertSong = db.prepare(`
  INSERT OR IGNORE INTO songs (id, title, lyrics, lang)
  VALUES (?, ?, ?, ?)
`);

const insertVerse = db.prepare(`
  INSERT OR IGNORE INTO verses (id, book, chapter, verse, text, lang)
  VALUES (?, ?, ?, ?, ?, ?)
`);


/* -------------------- IMPORT BIBLE -------------------- */

console.log('📥 Importing Bible...');
db.exec('BEGIN');

const OLD_TESTAMENT_DIR = path.join(
    __dirname,
    "../data/baiboly/testamenta taloha"
);

console.log('Importing Old Testament...', OLD_TESTAMENT_DIR);

// Loop through all JSON files in the Testamenta Taloha directory
for (const file of fs.readdirSync(OLD_TESTAMENT_DIR )) {
    if (!file.endsWith('.json')) continue;

    const bookData = JSON.parse(
        fs.readFileSync(path.join(OLD_TESTAMENT_DIR, file), 'utf8')
    );

    console.log(bookData.book);

    break

    // const book = bookData.book;
    // const lang = bookData.lang ?? 'en';

    // for (const ch of bookData.chapters) {
    //     for (const v of ch.verses) {
    //         const id = `${book}_${ch.chapter}_${v.verse}_${lang}`;

    //         insertVerse.run(
    //             id,
    //             book,
    //             ch.chapter,
    //             v.verse,
    //             v.text,
    //             lang
    //         );
    //     }
    // }
}