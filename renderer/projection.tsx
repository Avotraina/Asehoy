import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, Typography, Button } from '@mui/material';

const Projection: React.FC = () => {
  const [verse, setVerse] = useState<string>('Loading...');
  const [version, setVersion] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [verseNumber, setVerseNumber] = useState<string>('');
  const [chunks, setChunks] = useState<string[]>(['Loading...']);
  const [chunkIndex, setChunkIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const chunksRef = useRef<string[]>(chunks);
  const chunkIndexRef = useRef<number>(chunkIndex);

  const simpleChunkText = (text: string, limit = 400) => {
    if (!text) return [''];
    if (text.length <= limit) return [text];
    const words = text.split(' ');
    const result: string[] = [];
    let current = '';
    words.forEach((w) => {
      if ((current + ' ' + w).trim().length > limit) {
        result.push(current.trim());
        current = w;
      } else {
        current = (current + ' ' + w).trim();
      }
    });
    if (current) result.push(current.trim());
    return result;
  };

  const measureAndChunk = (text: string) => {
    try {
      const measureEl = measureRef.current;
      const textEl = textRef.current;
      const containerEl = containerRef.current;
      if (!measureEl || !textEl || !containerEl) return simpleChunkText(text);

      // copy computed styles that affect layout
      const comp = window.getComputedStyle(textEl);
      measureEl.style.fontSize = comp.fontSize;
      measureEl.style.fontWeight = comp.fontWeight;
      measureEl.style.lineHeight = comp.lineHeight;
      measureEl.style.letterSpacing = comp.letterSpacing;
      measureEl.style.width = comp.width === '0px' ? `${textEl.clientWidth}px` : textEl.clientWidth + 'px';
      measureEl.style.whiteSpace = 'normal';

      const availableHeight = textEl.clientHeight || Math.round(window.innerHeight * 0.7);

      // split to sentences (keep punctuation). Fallback to naive split when necessary.
      const sentenceMatches = text.match(/[^.!?]+[.!?]+[\])'"`’”]*|[^.!?]+$/g);
      const sentences = sentenceMatches && sentenceMatches.length ? sentenceMatches.map(s => s.trim()) : [text];

      const pages: string[] = [];
      let current = '';

      for (let i = 0; i < sentences.length; i++) {
        const s = sentences[i];
        const attempt = (current ? current + ' ' + s : s).trim();
        measureEl.textContent = attempt || '\u200b';
        const needed = measureEl.scrollHeight;
        if (needed > availableHeight && current) {
          pages.push(current.trim());
          // start new page with this sentence
          // if sentence itself is taller than availableHeight, split it by words
          measureEl.textContent = s || '\u200b';
          if (measureEl.scrollHeight > availableHeight) {
            // split sentence into words and paginate
            const words = s.split(' ').filter(Boolean);
            let curWords = '';
            for (let wI = 0; wI < words.length; wI++) {
              const wAttempt = (curWords ? curWords + ' ' + words[wI] : words[wI]).trim();
              measureEl.textContent = wAttempt || '\u200b';
              if (measureEl.scrollHeight > availableHeight && curWords) {
                pages.push(curWords.trim());
                curWords = words[wI];
              } else {
                curWords = wAttempt;
              }
            }
            if (curWords) pages.push(curWords.trim());
            current = '';
          } else {
            current = s;
          }
        } else {
          current = attempt;
        }
      }
      if (current) pages.push(current.trim());

      // avoid leaving a single-word orphan on its own page: if last page is a single short word, merge it with previous
      if (pages.length >= 2) {
        const lastWords = pages[pages.length - 1].split(' ').filter(Boolean);
        if (lastWords.length === 1 && lastWords[0].length < 10) {
          // merge into previous page
          pages[pages.length - 2] = (pages[pages.length - 2] + ' ' + pages[pages.length - 1]).trim();
          pages.pop();
        }
      }
      if (pages.length === 0) return [''];
      return pages;
    } catch (e) {
      return simpleChunkText(text);
    }
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onVerseUpdate((data) => {
        setVerse(data.verse);
        setVersion(data.version);
        setReference(data.reference ?? '');
        setVerseNumber((data as any).verseNumber ?? '');
        // initial simple chunk while measurement runs
        const initial = simpleChunkText(data.verse, 800);
        setChunks(initial.length ? initial : ['']);
        setChunkIndex(0);
        // measure and set appropriate chunks on next paint
        requestAnimationFrame(() => {
          const measured = measureAndChunk(data.verse);
          setChunks(measured.length ? measured : ['']);
          setChunkIndex(0);
        });
      });
      // listen for external projection commands (e.g., 'next')
      window.electronAPI.onProjectionCommand((cmd: string) => {
        if (cmd === 'next') {
          if (chunksRef.current.length > 1 && chunkIndexRef.current < chunksRef.current.length - 1) {
            setChunkIndex((i) => {
              const next = i + 1;
              window.electronAPI.projectionReply({ cmd, handled: true });
              return next;
            });
          } else {
            window.electronAPI.projectionReply({ cmd, handled: false });
          }
        } else if (cmd === 'prev') {
          if (chunksRef.current.length > 1 && chunkIndexRef.current > 0) {
            setChunkIndex((i) => {
              const prev = i - 1;
              window.electronAPI.projectionReply({ cmd, handled: true });
              return prev;
            });
          } else {
            window.electronAPI.projectionReply({ cmd, handled: false });
          }
        }
      });
    }
  }, []);

  // keep refs in sync with state
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);
  useEffect(() => {
    chunkIndexRef.current = chunkIndex;
  }, [chunkIndex]);

  // recompute when window resizes to adapt pagination
  useLayoutEffect(() => {
    const handle = () => {
      const c = measureAndChunk(verse);
      setChunks(c.length ? c : ['']);
      setChunkIndex((idx) => Math.min(idx, Math.max(0, c.length - 1)));
    };
    const ro = new ResizeObserver(handle);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', handle);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handle);
    };
  }, [verse]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        textAlign: 'center',
      }}
      ref={containerRef}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button variant="contained" color="error" onClick={() => window.electronAPI?.closeProjection?.()}>
          Close
        </Button>
      </Box>

      {version && (
        <Typography
          variant="h3"
          sx={{
            color: '#888',
            marginBottom: 4,
            fontSize: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          {version}
        </Typography>
      )}
      {reference && (
        <Typography
          variant="h4"
          sx={{
            color: '#bbb',
            marginBottom: 3,
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          }}
        >
          {reference}
        </Typography>
      )}
      <Typography
        variant="h2"
        sx={{
          color: '#fff',
          fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
          lineHeight: 1.6,
          fontWeight: 400,
          textAlign: 'left',
          width: '100%',
          maxHeight: '70vh',
          overflow: 'hidden',
        }}
        component="div"
        ref={textRef}
      >
        {verseNumber ? `${verseNumber}. ` : ''}
        {chunks[chunkIndex] ?? ''}
      </Typography>

      {/* hidden measuring element used to paginate to fit available height */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          left: -9999,
          top: 0,
          width: 'auto',
          whiteSpace: 'normal',
        }}
        aria-hidden
      />
      {chunks.length > 1 && (
        <Typography
          variant="body1"
          sx={{ color: '#aaa', marginTop: 2, fontSize: 'clamp(1rem, 2vw, 1.3rem)' }}
        >
          Slide {chunkIndex + 1} / {chunks.length}
        </Typography>
      )}
    </Box>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Projection />);
}

