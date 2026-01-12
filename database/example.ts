import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";



// Fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Directory
const DATABASE_DIR = path.join(__dirname, "../data/ziona.db");
const OLD_TESTAMENT_DIR = path.join(__dirname, "../data/baiboly/testamenta taloha");
const NEW_TESTAMENT_DIR = path.join(__dirname, "../data/baiboly/testamenta vaovao");

// SQLite DB
const db = new Database(DATABASE_DIR);



/* -------------------- SCHEMA -------------------- */

db.exec(`

DROP TABLE IF EXISTS meta;

DROP TABLE IF EXISTS songs;

DROP TABLE IF EXISTS verses;
DROP TABLE IF EXISTS verses_fts;


DROP TABLE IF EXISTS verses;
DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS books;


-- Create meta table
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

-- Create books list table
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  name TEXT,
  testament TEXT,
  lang TEXT,
  chapters_count INTEGER,
  order_index INTEGER
);


-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    chapter_number INTEGER,
    verses_count INTEGER,
    book_id TEXT,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verse INTEGER,
    text TEXT,
    lang TEXT,
    chapter_id TEXT,
    FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
);

-- CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts
-- USING fts5(title, lyrics, content='songs');

-- CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts
-- USING fts5(book, text, content='verses');


-- FTS (VERSES)
CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
  text,
  verse_id UNINDEXED,
  chapter_id UNINDEXED,
  book_id UNINDEXED
);

`);


/* -------------------- SCHEMA -------------------- */


// Start migration
console.log("📥 Importing Bible...");
db.exec("BEGIN");



if (!fs.existsSync(OLD_TESTAMENT_DIR)) {
    console.error("Folder not found:", OLD_TESTAMENT_DIR);
    process.exit(1);
}

console.log("Importing Old Testament from:", OLD_TESTAMENT_DIR);

// const insertVerseFTS = db.prepare(
//     // `INSERT INTO verses_fts (rowid, text, verse_id, chapter_id, book_id)
//     `INSERT INTO verses_fts (rowid, text, chapter_id, book_id)
//    VALUES (?, ?, ?, ?)`
// );

// Loop books
const oldTestamentBooks = fs.readdirSync(OLD_TESTAMENT_DIR);


const insertVerse = db.prepare(
    "INSERT INTO verses (verse, text, lang, chapter_id) VALUES (?, ?, ?, ?)"
);

const insertVerseFTS = db.prepare(
    `INSERT INTO verses_fts (rowid, text, chapter_id, book_id)
   VALUES (?, ?, ?, ?)`
);

for (const bookFile of oldTestamentBooks) {
    const filePath = path.join(OLD_TESTAMENT_DIR, bookFile);
    const raw = fs.readFileSync(filePath, "utf-8");
    const bookJson = JSON.parse(raw);

    const bookName = bookJson.meta.name;
    const meta = bookJson["meta"];
    console.log("📖 Book:", bookName);

    // const chaptersCount = Object.keys(bookJson).filter(key => key !== "meta").length;
    const chaptersCount = meta.chapter_number;

    db.prepare(
        "INSERT INTO books (id, name, testament, lang, chapters_count, order_index) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(String(bookName).toLocaleLowerCase(), bookName, "old", "mg", chaptersCount, parseInt(meta.order));

    for (const chapterNum in bookJson) {
        if (chapterNum === "meta") continue;

        const chapter = bookJson[chapterNum];

        const versesCount = Object.keys(chapter).length;

        db.prepare(
            "INSERT INTO chapters (id, chapter_number, verses_count, book_id) VALUES (?, ?, ?, ?)"
        ).run(String(bookName).toLocaleLowerCase() + "_" + chapterNum, parseInt(chapterNum), versesCount, String(bookName).toLocaleLowerCase());
        for (const verseNum in chapter) {
            const verseText = chapter[verseNum];

            console.log("chapter", chapterNum, "verse", verseNum);

            // continue

            // Insert verse into DB
            // db.prepare(
            //     "INSERT INTO verses (verse, text, chapter_id) VALUES (?, ?, ?)"
            // ).run(parseInt(verseNum), verseText, String(bookName).toLocaleLowerCase() + "_" + chapterNum);
            // // ).run(String(bookName).toLocaleLowerCase() + "_" + chapterNum + "_" + verseNum, parseInt(verseNum), verseText, String(bookName).toLocaleLowerCase() + "_" + chapterNum);
            const result = insertVerse.run(
                parseInt(verseNum, 10),
                verseText,
                "mg",
                `${bookName.toLowerCase()}_${chapterNum}`
            );

            // IMPORTANT: convert explicitly
            const verseId = Number(result.lastInsertRowid);


            // Insert verse into FTS
            insertVerseFTS.run(
                verseId,                                  // ✅ UNIQUE INTEGER
                verseText,
                `${bookName.toLowerCase()}_${chapterNum}`,
                bookName.toLowerCase()
            );
        }
    }

    // break

    // Example: insert first verse of first chapter
    // db.prepare(
    //     "INSERT INTO bible (book, chapter, verse, text) VALUES (?, ?, ?, ?)"
    // ).run(bookName, 1, 1, bookJson["1"]["1"]);
}


const newTestamentBooks = fs.readdirSync(NEW_TESTAMENT_DIR);

for (const bookFile of newTestamentBooks) {
    const filePath = path.join(NEW_TESTAMENT_DIR, bookFile);
    const raw = fs.readFileSync(filePath, "utf-8");
    const bookJson = JSON.parse(raw);

    const bookName = bookJson.meta.name;
    const meta = bookJson["meta"];
    console.log("📖 Book:", bookName);

    // const chaptersCount = Object.keys(bookJson).filter(key => key !== "meta").length;
    const chaptersCount = meta.chapter_number;

    db.prepare(
        "INSERT INTO books (id, name, testament, lang, chapters_count, order_index) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(String(bookName).toLocaleLowerCase(), bookName, "new", "mg", chaptersCount, parseInt(meta.order));

    for (const chapterNum in bookJson) {
        if (chapterNum === "meta") continue;

        const chapter = bookJson[chapterNum];

        const versesCount = Object.keys(chapter).length;

        db.prepare(
            "INSERT INTO chapters (id, chapter_number, verses_count, book_id) VALUES (?, ?, ?, ?)"
        ).run(String(bookName).toLocaleLowerCase() + "_" + chapterNum, parseInt(chapterNum), versesCount, String(bookName).toLocaleLowerCase());
        for (const verseNum in chapter) {
            const verseText = chapter[verseNum];

            console.log("chapter", chapterNum, "verse", verseNum);

            // continue

            // Insert verse into DB
            // db.prepare(
            //     "INSERT INTO verses (verse, text, chapter_id) VALUES (?, ?, ?)"
            // ).run(parseInt(verseNum), verseText, String(bookName).toLocaleLowerCase() + "_" + chapterNum);
            // // ).run(String(bookName).toLocaleLowerCase() + "_" + chapterNum + "_" + verseNum, parseInt(verseNum), verseText, String(bookName).toLocaleLowerCase() + "_" + chapterNum);
            const result = insertVerse.run(
                parseInt(verseNum, 10),
                verseText,
                "mg",
                `${bookName.toLowerCase()}_${chapterNum}`
            );

            // IMPORTANT: convert explicitly
            const verseId = Number(result.lastInsertRowid);


            // Insert verse into FTS
            insertVerseFTS.run(
                verseId,                                  // ✅ UNIQUE INTEGER
                verseText,
                `${bookName.toLowerCase()}_${chapterNum}`,
                bookName.toLowerCase()
            );
        }
    }

    // break

    // Example: insert first verse of first chapter
    // db.prepare(
    //     "INSERT INTO bible (book, chapter, verse, text) VALUES (?, ?, ?, ?)"
    // ).run(bookName, 1, 1, bookJson["1"]["1"]);
}
db.exec("COMMIT");
console.log("✅ Bible migration done!");
