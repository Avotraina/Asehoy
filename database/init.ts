import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';


const DB_PATH = 'ziona.db';
const SONGS_DIR = './data/songs';
const BIBLE_DIR = '../data/baiboly';
const OLD_TESTAMENT_BOOKS_DIR = '../data/baiboly/Testamenta Taloha';
const NEW_TESTAMENT_BOOKS_DIR = '../data/baiboly/Testamenta Vaovao';

const db = new Database(DB_PATH);


// const db = new Database('ziona.db');

db.exec(`
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT,
  lyrics TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts
USING fts5(title, lyrics, content='songs');
`);

export default db;




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


/* -------------------- IMPORT SONGS -------------------- */

console.log('📥 Importing songs...');
db.exec('BEGIN');

for (const file of fs.readdirSync(SONGS_DIR)) {
  if (!file.endsWith('.json')) continue;

  const song = JSON.parse(
    fs.readFileSync(path.join(SONGS_DIR, file), 'utf8')
  );

  insertSong.run(
    song.id,
    song.title,
    song.lyrics,
    song.lang ?? 'en'
  );
}

db.exec('COMMIT');
console.log('✔ Songs imported');


/* -------------------- IMPORT BIBLE -------------------- */

// Import old testament books
console.log('📥 Importing old testament...');

for (const [chapterKey, chapterValue] of Object.entries(rota)) {
  if (chapterKey === "meta") continue;

  const chapter = Number(chapterKey);

  for (const [verseKey, text] of Object.entries(chapterValue)) {
    insertVerse.run(bookId, chapter, Number(verseKey), text);
  }
}

for (const file of fs.readdirSync(OLD_TESTAMENT_BOOKS_DIR)) {
  if (!file.endsWith('.json')) continue;

  const bookData = JSON.parse(
    fs.readFileSync(path.join(OLD_TESTAMENT_BOOKS_DIR, file), 'utf8')
  );

  const book = bookData.book;
  const lang = bookData.lang ?? 'en';

  for (const ch of bookData.chapters) {
    for (const v of ch.verses) {
      const id = `${book}_${ch.chapter}_${v.verse}_${lang}`;

      insertVerse.run(
        id,
        book,
        ch.chapter,
        v.verse,
        v.text,
        lang
      );
    }
  }
}

// Import new testament books
console.log('📥 Importing new testament...');

for (const file of fs.readdirSync(NEW_TESTAMENT_BOOKS_DIR)) {
  if (!file.endsWith('.json')) continue;

  const bookData = JSON.parse(
    fs.readFileSync(path.join(NEW_TESTAMENT_BOOKS_DIR, file), 'utf8')
  );

  const book = bookData.book;
  const lang = bookData.lang ?? 'en';

  for (const ch of bookData.chapters) {
    for (const v of ch.verses) {
      const id = `${book}_${ch.chapter}_${v.verse}_${lang}`;

      insertVerse.run(
        id,
        book,
        ch.chapter,
        v.verse,
        v.text,
        lang
      );
    }
  }
}
// console.log('📥 Importing Bible...');
// db.exec('BEGIN');

// for (const file of fs.readdirSync(BIBLE_DIR)) {
//   if (!file.endsWith('.json')) continue;

//   const bookData = JSON.parse(
//     fs.readFileSync(path.join(BIBLE_DIR, file), 'utf8')
//   );

//   const book = bookData.book;
//   const lang = bookData.lang ?? 'en';

//   for (const ch of bookData.chapters) {
//     for (const v of ch.verses) {
//       const id = `${book}_${ch.chapter}_${v.verse}_${lang}`;

//       insertVerse.run(
//         id,
//         book,
//         ch.chapter,
//         v.verse,
//         v.text,
//         lang
//       );
//     }
//   }
// }

// db.exec('COMMIT');
// console.log('✔ Bible imported');

/* -------------------- FINALIZE -------------------- */

db.prepare(`
  INSERT OR REPLACE INTO meta (key, value)
  VALUES ('initialized', 'true')
`).run();

console.log('🎉 Migration complete!');
db.close();










type VerseMap = Record<string, string>;
type ChapterMap = Record<string, VerseMap>;

interface BookMeta {
  name: string;
  order: number;
  chapter_number: number;
}

interface BibleBook extends ChapterMap {
  meta: BookMeta;
}
