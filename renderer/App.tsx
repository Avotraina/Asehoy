import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Container, Box, Typography, Stack, Button } from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { VersionSelector } from './components/VersionSelector';
import BookVerseSelector from './components/BookVerseSelector';
import { BibleSearch } from './components/BibleSearch';
import { DisplayVerse } from './components/DisplayVerse';

type BookOption = { id: string; label: string; testament: 'taloha' | 'vaovao' };

type Passage = {
  book: string;
  chapter: string;
  verses: string[];
};

type FormValues = {
  passages: Passage[];
};

type VersePos = { chapter: string; verse: string };

const App: React.FC = () => {
  const [version, setVersion] = useState<string>('KJV');
  const [verse, setVerse] = useState<string>('For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.');
  const [books, setBooks] = useState<BookOption[]>([]);
  const [currentPos, setCurrentPos] = useState<VersePos | null>(null);

  const methods = useForm<FormValues>({
    defaultValues: {
      passages: [{ book: '', chapter: '', verses: [] }],
    },
  });
  const passages = methods.watch('passages');
  const [currentIndex, setCurrentIndex] = useState(0);

  const formatReference = (p?: Passage) => {
    if (!p) return '';
    const bookLabel = books.find((b) => b.id === p.book)?.label ?? p.book;
    const verses = Array.isArray(p.verses) ? p.verses : [p.verses];
    const versesPart = verses.length ? `:${verses.join(',')}` : '';
    return `${bookLabel} ${p.chapter}${versesPart}`;
  };

  useEffect(() => {
    const loadBooks = async () => {
      if (!window.electronAPI?.listBooks) return;
      const list = await window.electronAPI.listBooks();
      setBooks(list);
      if (list.length > 0) {
        // seed first passage book if empty
        const first = list[0];
        const current = passages?.[0]?.book;
        if (!current) {
          methods.setValue('passages.0.book', first.id);
        }
      }
    };
    loadBooks();
  }, [methods, passages]);

  const loadAndSendVerse = async (passage: Passage | undefined, pos: VersePos | null, advance: boolean) => {
    if (!passage || !passage.book || !window.electronAPI?.readBook) return;
    const data = await window.electronAPI.readBook(passage.book);
    if (!data) return;

    // Use selected chapter or fall back to first available in the book
    const allChapters = Object.keys(data).sort((a, b) => Number(a) - Number(b));
    let chapter = passage.chapter && data[passage.chapter] ? passage.chapter : allChapters[0];
    let verseNum: string;

    // If specific verses are selected, follow that order; otherwise use all verses in chapter
    const selectedVerses =
      passage.verses && passage.verses.length
        ? [...passage.verses].sort((a, b) => Number(a) - Number(b))
        : Object.keys(data[chapter] || {}).sort((a, b) => Number(a) - Number(b));

    if (!pos || pos.chapter !== chapter || !selectedVerses.includes(pos.verse)) {
      // start from first selected verse in chosen chapter
      verseNum = selectedVerses[0];
    } else if (!advance) {
      verseNum = pos.verse;
    } else {
      // advance to next verse within selected verses
      const vIndex = selectedVerses.indexOf(pos.verse);
      if (vIndex >= 0 && vIndex < selectedVerses.length - 1) {
        verseNum = selectedVerses[vIndex + 1];
      } else {
        // loop back to first selected verse
        verseNum = selectedVerses[0];
      }
    }

    const text = data[chapter]?.[verseNum];
    if (!text) return;

    const payload = {
      verse: text,
      version,
      reference: `${formatReference(passage)}:${verseNum}`,
      verseNumber: verseNum,
    };

    setVerse(text);
    setCurrentPos({ chapter, verse: verseNum });

    if (window.electronAPI?.sendVerse) {
      window.electronAPI.sendVerse(payload);
    }
    return payload;
  };

  const handleDisplayProjection = async () => {
    const passage = passages?.[currentIndex] ?? passages?.[0];
    const payload = await loadAndSendVerse(passage, currentPos, false);
    if (payload && window.electronAPI?.openProjection) {
      await window.electronAPI.openProjection(payload);
    }
  };

  const handleNextVerse = async () => {
    const passage = passages?.[currentIndex] ?? passages?.[0];
    // ask projection to advance slide first; if it handled, do not advance verse
    try {
      const handled = await window.electronAPI?.sendProjectionCommand?.('next');
      if (handled) return;
    } catch (e) {
      // ignore and fall back to advancing verse
    }
    await loadAndSendVerse(passage, currentPos, true);
  };

  const handlePrevVerse = async () => {
    const passage = passages?.[currentIndex] ?? passages?.[0];
    if (!passage || !passage.book || !window.electronAPI?.readBook) return;
    const data = await window.electronAPI.readBook(passage.book);
    if (!data) return;

    const selectedVerses =
      passage.verses && passage.verses.length
        ? [...passage.verses].sort((a, b) => Number(a) - Number(b))
        : Object.keys(data[passage.chapter] || {}).sort((a, b) => Number(a) - Number(b));

    if (selectedVerses.length === 0) return;

    let verseNum: string;
    if (!currentPos || currentPos.chapter !== passage.chapter || !selectedVerses.includes(currentPos.verse)) {
      verseNum = selectedVerses[selectedVerses.length - 1];
    } else {
      const idx = selectedVerses.indexOf(currentPos.verse);
      verseNum = idx > 0 ? selectedVerses[idx - 1] : selectedVerses[selectedVerses.length - 1];
    }

    const text = data[passage.chapter]?.[verseNum];
    if (!text) return;

    const payload = {
      verse: text,
      version,
      reference: `${formatReference(passage)}:${verseNum}`,
      verseNumber: verseNum,
    };

    setVerse(text);
    setCurrentPos({ chapter: passage.chapter, verse: verseNum });
    if (window.electronAPI?.sendVerse) {
      window.electronAPI.sendVerse(payload);
    }
  };

  const handleSearch = (query: string) => {
    // Placeholder: In a real app, this would fetch the verse from an API
    setVerse(`Verse for "${query}" (${version})`);
  };

  return (
    <FormProvider {...methods}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Bible Verse Projector
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 4 }}>
          <VersionSelector version={version} onVersionChange={setVersion} />

          <BookVerseSelector />
          
          <BibleSearch onSearch={handleSearch} />
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" onClick={handleDisplayProjection}>
              Display on Projection
            </Button>
            <Button
              variant="outlined"
              onClick={handlePrevVerse}
              disabled={!passages || passages.length === 0}
            >
              Previous Verse
            </Button>
            <Button
              variant="outlined"
              onClick={handleNextVerse}
              disabled={!passages || passages.length === 0}
            >
              Next Verse
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => window.electronAPI?.closeProjection?.()}
            >
              Close Projection
            </Button>
          </Stack>

          <DisplayVerse verse={verse} version={version} />
        </Box>
      </Container>
    </FormProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

