import React from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Stack,
  Button,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { useFormContext, useFieldArray, Controller, useWatch } from 'react-hook-form';

type Passage = {
  book: string;
  chapter: string;
  verses: string[];
};

type FormValues = {
  passages: Passage[];
};

type BookOption = { id: string; label: string; testament: 'taloha' | 'vaovao' };

type BookData = Record<string, Record<string, string>>; // chapter -> verse -> text

export const BookVerseSelector: React.FC = () => {
  const { control, setValue } = useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'passages',
  });
  const watchedPassages = useWatch({ control, name: 'passages' });
  const [books, setBooks] = React.useState<BookOption[]>([]);
  const [bookData, setBookData] = React.useState<Record<string, BookData>>({});
  const [chaptersByBook, setChaptersByBook] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    const loadBooks = async () => {
      if (!window.electronAPI?.listBooks) return;
      const list = await window.electronAPI.listBooks();
      setBooks(list);
      if (list.length > 0 && !watchedPassages?.[0]?.book) {
        // seed first passage with the first book
        setValue('passages.0.book', list[0].id);
      }
    };
    loadBooks();
  }, [fields, setValue, watchedPassages]);

  const ensureBookData = React.useCallback(
    async (bookId: string): Promise<BookData | null> => {
      if (!bookId || !window.electronAPI?.readBook) return null;
      if (bookData[bookId]) return bookData[bookId];
      const data = await window.electronAPI.readBook(bookId);
      if (!data) return null;
      const chapters = Object.keys(data).sort((a, b) => Number(a) - Number(b));
      setBookData((prev) => ({ ...prev, [bookId]: data }));
      setChaptersByBook((prev) => ({ ...prev, [bookId]: chapters }));
      return data;
    },
    [bookData]
  );

  return (
    <Stack spacing={2}>
      {fields.map((field, idx) => (
        <Box key={field.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl fullWidth>
            <InputLabel id={`book-select-label-${idx}`}>Boky</InputLabel>
            <Controller
              control={control}
              name={`passages.${idx}.book`}
              render={({ field: controllerField }) => (
                <Select
                  labelId={`book-select-label-${idx}`}
                  id={`book-select-${idx}`}
                  value={controllerField.value}
                  label="Boky"
                  onChange={async (e) => {
                    const newBook = e.target.value as string;
                    controllerField.onChange(newBook);
                    const data = await ensureBookData(newBook);
                    if (data) {
                      const chapters = Object.keys(data).sort((a, b) => Number(a) - Number(b));
                      const firstChapter = chapters[0];
                      const verses = Object.keys(data[firstChapter] || {}).sort(
                        (a, b) => Number(a) - Number(b)
                      );
                      setValue(`passages.${idx}.chapter`, firstChapter);
                      setValue(`passages.${idx}.verses`, verses.length ? [verses[0]] : []);
                    }
                  }}
                  autoWidth
                >
                  {books.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id={`chapter-select-label-${idx}`}>Toko</InputLabel>
            <Controller
              control={control}
              name={`passages.${idx}.chapter`}
              render={({ field: controllerField }) => (
                <Select
                  labelId={`chapter-select-label-${idx}`}
                  id={`chapter-select-${idx}`}
                  value={controllerField.value}
                  label="Toko"
                  onChange={async (e) => {
                    const newChapter = e.target.value as string;
                    controllerField.onChange(newChapter);
                    const bookId = watchedPassages?.[idx]?.book;
                    const data = await ensureBookData(bookId);
                    if (data) {
                      const verses = Object.keys(data[newChapter] || {}).sort(
                        (a, b) => Number(a) - Number(b)
                      );
                      setValue(`passages.${idx}.verses`, verses.length ? [verses[0]] : []);
                    }
                  }}
                  autoWidth
                >
                  {(chaptersByBook[watchedPassages?.[idx]?.book || ''] || []).map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id={`verse-select-label-${idx}`}>Andininy</InputLabel>
            <Controller
              control={control}
              name={`passages.${idx}.verses`}
              render={({ field: controllerField }) => {
                const bookId = watchedPassages?.[idx]?.book || '';
                const chapter = watchedPassages?.[idx]?.chapter;
                const verses =
                  (bookId &&
                    chapter &&
                    bookData[bookId] &&
                    Object.keys(bookData[bookId][chapter] || {}).sort(
                      (a, b) => Number(a) - Number(b)
                    )) ||
                  [];
                return (
                  <Select
                    multiple
                    labelId={`verse-select-label-${idx}`}
                    id={`verse-select-${idx}`}
                    value={controllerField.value}
                    label="Andininy"
                    onChange={controllerField.onChange}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                    autoWidth
                  >
                    {verses.map((v) => (
                      <MenuItem key={v} value={v}>
                        <Checkbox checked={controllerField.value?.includes(v)} />
                        <ListItemText primary={v} />
                      </MenuItem>
                    ))}
                  </Select>
                );
              }}
            />
          </FormControl>

          <IconButton
            aria-label="remove"
            onClick={() => remove(idx)}
            size="large"
            disabled={fields.length === 1}
          >
            {/* Add a delete icon here if desired */}
          </IconButton>
        </Box>
      ))}

      <Button
        variant="outlined"
        onClick={() => {
          const first = watchedPassages?.[0];
          if (first) {
            append({ ...first });
          } else {
            append({ book: books[0]?.id || '', chapter: '', verses: [] });
          }
        }}
      >
        Add Book/Chapter 
      </Button>
    </Stack>
  );
};

export default BookVerseSelector;
