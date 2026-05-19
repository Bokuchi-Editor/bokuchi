import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { storeApi } from '../api/storeApi';
import './TypingGame.css';

interface Props {
  mode: 'light' | 'dark';
}

type Phase = 'title' | 'playing' | 'result';

type WordClass = '' | 'syntax' | 'brand';

interface FallingWord {
  text: string;
  typed: number;
  x: number;
  y: number;
  width: number;
  el: HTMLDivElement;
  typedEl: HTMLSpanElement;
  restEl: HTMLSpanElement;
}

const WORDS: Array<readonly [string, WordClass]> = [
  // brand
  ['bokuchi', 'brand'], ['markdown', 'brand'],
  // syntax
  ['heading', 'syntax'], ['bold', 'syntax'], ['italic', 'syntax'],
  ['list', 'syntax'], ['table', 'syntax'], ['link', 'syntax'],
  ['image', 'syntax'], ['code', 'syntax'], ['fence', 'syntax'],
  ['quote', 'syntax'], ['header', 'syntax'], ['footer', 'syntax'],
  ['anchor', 'syntax'], ['bullet', 'syntax'], ['ordered', 'syntax'],
  ['inline', 'syntax'], ['indent', 'syntax'], ['escape', 'syntax'],
  ['emphasis', 'syntax'], ['hyperlink', 'syntax'],
  ['paragraph', 'syntax'], ['checkbox', 'syntax'],
  ['blockquote', 'syntax'], ['strikethrough', 'syntax'],
  // features & concepts
  ['preview', ''], ['render', ''], ['format', ''],
  ['document', ''], ['section', ''], ['title', ''], ['subtitle', ''],
  ['caption', ''], ['divider', ''], ['ruler', ''], ['emoji', ''],
  ['footnote', ''], ['citation', ''], ['reference', ''],
  ['highlight', ''], ['underline', ''], ['callout', ''],
  ['math', ''], ['equation', ''], ['formula', ''], ['latex', ''],
  ['mermaid', ''], ['diagram', ''], ['flowchart', ''],
  ['column', ''], ['row', ''], ['cell', ''], ['draft', ''],
  // short warm-up
  ['md', 'syntax'], ['tip', ''], ['note', ''],
  ['alt', 'syntax'], ['url', 'syntax'], ['tag', 'syntax'],
];

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ESCAPES[c] || c);

const TypingGame: React.FC<Props> = ({ mode }) => {
  const { t } = useTranslation();

  // React state — only for things that drive rendering of the static UI
  const [phase, setPhase] = useState<Phase>('title');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [wpm, setWpm] = useState(0);
  const [inputText, setInputText] = useState('');
  const [finalStats, setFinalStats] = useState({
    score: 0, words: 0, accuracy: 0, wpm: 0,
    bestCombo: 0, isNewHigh: false, prevHigh: 0,
  });

  // Refs — for things that change every frame
  const stageRef    = useRef<HTMLDivElement>(null);
  const layerRef    = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const rafRef      = useRef<number>(0);

  // Game state in a single ref to avoid re-renders during the loop
  const g = useRef({
    startedAt: 0,
    lastFrame: 0,
    spawnTimer: 0,
    words: [] as FallingWord[],
    target: null as FallingWord | null,
    input: '',
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: 3,
    typedChars: 0,
    correctChars: 0,
    wordsCleared: 0,
    highScore: 0,
  });

  // Latest phase for the global key handler (set on every render)
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  // --------------------------------------------------------------------------
  // Load high score once
  // --------------------------------------------------------------------------
  useEffect(() => {
    storeApi
      .loadTypingGameHighScore()
      .then(v => { g.current.highScore = v; })
      .catch(() => { /* ignore */ });
  }, []);

  // --------------------------------------------------------------------------
  // Wire everything inside one effect that runs once on mount.
  // Closures capture refs (always fresh) and setState (always stable).
  // --------------------------------------------------------------------------
  useEffect(() => {
    const reset = () => {
      if (layerRef.current) layerRef.current.innerHTML = '';
      g.current.startedAt = 0;
      g.current.lastFrame = 0;
      g.current.spawnTimer = 0;
      g.current.words = [];
      g.current.target = null;
      g.current.input = '';
      g.current.score = 0;
      g.current.combo = 0;
      g.current.bestCombo = 0;
      g.current.lives = 3;
      g.current.typedChars = 0;
      g.current.correctChars = 0;
      g.current.wordsCleared = 0;
      setScore(0);
      setCombo(0);
      setLives(3);
      setWpm(0);
      setInputText('');
    };

    const spawnWord = () => {
      const layer = layerRef.current;
      if (!layer) return;
      let pick: readonly [string, WordClass] = WORDS[0];
      for (let i = 0; i < 10; i++) {
        pick = WORDS[Math.floor(Math.random() * WORDS.length)];
        if (!g.current.words.some(w => w.text === pick[0])) break;
      }
      const [text, cls] = pick;
      const el = document.createElement('div');
      el.className = 'tg-word' + (cls ? ' ' + cls : '');
      el.innerHTML =
        `<span class="tg-typed"></span><span class="tg-rest">${escapeHtml(text)}</span>`;
      layer.appendChild(el);

      const width = el.offsetWidth;
      const stageW = layer.clientWidth;
      const x = Math.random() * Math.max(stageW - width - 40, 20) + 20;
      el.style.left = x + 'px';
      el.style.top = '-30px';

      g.current.words.push({
        text, typed: 0, x, y: -30, width,
        el,
        typedEl: el.querySelector('.tg-typed') as HTMLSpanElement,
        restEl:  el.querySelector('.tg-rest')  as HTMLSpanElement,
      });
    };

    const findTarget = (ch: string): FallingWord | null => {
      let best: FallingWord | null = null;
      for (const w of g.current.words) {
        if (w.text[0] === ch && (!best || w.y > best.y)) best = w;
      }
      return best;
    };

    const showPop = (x: number, y: number, text: string) => {
      const layer = layerRef.current;
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'tg-pop';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.textContent = text;
      layer.appendChild(el);
      setTimeout(() => el.remove(), 700);
    };

    const flashStage = () => {
      const el = stageRef.current;
      if (!el) return;
      el.classList.remove('miss');
      void el.offsetWidth;
      el.classList.add('miss');
    };

    const onTypo = () => {
      if (g.current.combo !== 0) {
        g.current.combo = 0;
        setCombo(0);
      }
      const el = g.current.target ? g.current.target.el : inputBarRef.current;
      if (!el) return;
      el.classList.remove('typo');
      void el.offsetWidth;
      el.classList.add('typo');
    };

    const releaseTarget = () => {
      const t = g.current.target;
      if (t) {
        t.typed = 0;
        t.typedEl.textContent = '';
        t.restEl.textContent  = t.text;
        t.el.classList.remove('target');
        g.current.target = null;
      }
      g.current.input = '';
      setInputText('');
    };

    const checkComplete = () => {
      const t = g.current.target;
      if (!t || t.typed < t.text.length) return;
      t.el.classList.add('exploding');
      setTimeout(() => t.el.remove(), 300);
      g.current.words = g.current.words.filter(w => w !== t);

      g.current.combo++;
      g.current.bestCombo = Math.max(g.current.bestCombo, g.current.combo);
      setCombo(g.current.combo);

      const base  = t.text.length * 10;
      const bonus = Math.floor(base * (g.current.combo - 1) * 0.1);
      const gained = base + bonus;
      g.current.score += gained;
      g.current.wordsCleared++;
      setScore(g.current.score);
      showPop(t.x + t.width / 2, t.y, '+' + gained);

      g.current.target = null;
      g.current.input  = '';
      setInputText('');
    };

    const handleKey = (ch: string) => {
      g.current.typedChars++;

      if (!g.current.target) {
        const target = findTarget(ch);
        if (!target) { onTypo(); return; }
        g.current.target = target;
        target.typed = 1;
        target.typedEl.textContent = target.text[0];
        target.restEl.textContent  = target.text.slice(1);
        target.el.classList.add('target');
        g.current.input = ch;
        g.current.correctChars++;
        setInputText(g.current.input);
        checkComplete();
        return;
      }

      const target = g.current.target;
      const expected = target.text[target.typed];
      if (ch === expected) {
        target.typed++;
        target.typedEl.textContent = target.text.slice(0, target.typed);
        target.restEl.textContent  = target.text.slice(target.typed);
        g.current.input += ch;
        g.current.correctChars++;
        setInputText(g.current.input);
        checkComplete();
      } else {
        onTypo();
      }
    };

    const gameOver = () => {
      for (const w of g.current.words) w.el.remove();
      g.current.words = [];
      g.current.target = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      const minutes = Math.max((performance.now() - g.current.startedAt) / 60000, 0.0001);
      const finalWpm = Math.round(g.current.correctChars / 5 / minutes);
      const finalAcc = g.current.typedChars > 0
        ? Math.round((g.current.correctChars / g.current.typedChars) * 100)
        : 0;

      const prevHigh  = g.current.highScore;
      const isNewHigh = g.current.score > prevHigh;
      if (isNewHigh) {
        g.current.highScore = g.current.score;
        storeApi.saveTypingGameHighScore(g.current.score).catch(() => {});
      }

      setFinalStats({
        score: g.current.score,
        words: g.current.wordsCleared,
        accuracy: finalAcc,
        wpm: finalWpm,
        bestCombo: g.current.bestCombo,
        isNewHigh,
        prevHigh,
      });
      setPhase('result');
    };

    const loop = (now: number) => {
      if (phaseRef.current !== 'playing') return;

      const dt = Math.min(now - g.current.lastFrame, 64);
      g.current.lastFrame = now;

      const elapsed = (now - g.current.startedAt) / 1000;
      const speed = 28 + Math.min(elapsed * 0.9, 75);
      const interval = Math.max(2400 - elapsed * 12, 850);

      g.current.spawnTimer += dt;
      if (g.current.spawnTimer >= interval) {
        g.current.spawnTimer = 0;
        spawnWord();
      }

      const stage = stageRef.current;
      if (!stage) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const groundY = stage.clientHeight - 80;

      for (const w of [...g.current.words]) {
        w.y += (speed * dt) / 1000;
        w.el.style.top = w.y + 'px';
        if (w.y >= groundY) {
          w.el.remove();
          g.current.words = g.current.words.filter(x => x !== w);
          if (g.current.target === w) {
            g.current.target = null;
            g.current.input = '';
            setInputText('');
          }
          g.current.lives--;
          setLives(g.current.lives);
          g.current.combo = 0;
          setCombo(0);
          flashStage();
          if (g.current.lives <= 0) {
            gameOver();
            return;
          }
        }
      }

      if (g.current.startedAt) {
        const minutes = Math.max((now - g.current.startedAt) / 60000, 0.0001);
        setWpm(Math.round(g.current.correctChars / 5 / minutes));
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    const startGame = () => {
      reset();
      const now = performance.now();
      g.current.startedAt = now;
      g.current.lastFrame = now;
      setPhase('playing');
      // phaseRef is updated via the assignment on next render, but we want
      // the loop to see 'playing' immediately. Push it now.
      phaseRef.current = 'playing';
      rafRef.current = requestAnimationFrame(loop);
    };

    const showTitle = () => {
      setPhase('title');
      phaseRef.current = 'title';
    };

    // Key handler — branches on the current phase
    const onKeyDown = (e: KeyboardEvent) => {
      // Let global shortcuts (Cmd+N etc.) pass through
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const ph = phaseRef.current;
      if (ph === 'title') {
        if (e.key === 'Escape') return;
        if (e.key.length === 1 || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (ph === 'result') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showTitle();
        }
        return;
      }
      // playing
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        releaseTarget();
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        handleKey(e.key);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      // No need to clear layer — React unmounts the whole tree.
    };
  }, []);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  const hearts = [0, 1, 2].map(i => (
    <span key={i} className={'tg-heart' + (i >= lives ? ' lost' : '')}>♥</span>
  ));

  return (
    <div className="typing-game" data-skin={mode} ref={stageRef}>
      <div className="tg-hud">
        <div className="tg-group">
          <div><span className="tg-label">SCORE</span><span className="tg-value">{score}</span></div>
          <div><span className="tg-label">WPM</span><span className="tg-value">{wpm}</span></div>
          <div className={'tg-combo' + (combo >= 3 ? ' active' : '')}>
            <span className="tg-label">COMBO</span>
            <span className="tg-value">{combo}</span>
          </div>
        </div>
        <div className="tg-group">
          <div><span className="tg-label">LIVES</span>{hearts}</div>
        </div>
      </div>

      <div className="tg-words-layer" ref={layerRef} />

      <div className="tg-input-bar" ref={inputBarRef}>
        <span className="tg-prompt">&gt;</span>
        <div className="tg-input">{inputText}<span className="tg-cursor" /></div>
      </div>

      {phase === 'title' && (
        <div className="tg-overlay">
          <div className="tg-title-screen">
            <h1>BOKUCHI TYPING</h1>
            <div className="tg-sub">{t('game.tagline')}</div>
            <div className="tg-start">PRESS ANY KEY TO START</div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="tg-overlay">
          <div className="tg-result-screen">
            <h1>GAME OVER</h1>
            <div className="tg-score-label">SCORE</div>
            <div className="tg-score-value">{finalStats.score}</div>
            <div className={'tg-best' + (finalStats.isNewHigh ? ' new' : '')}>
              {finalStats.isNewHigh
                ? (finalStats.prevHigh > 0 ? '★ NEW HIGH SCORE ★' : 'FIRST RECORD')
                : 'HIGH ' + Math.max(finalStats.score, finalStats.prevHigh)}
            </div>
            <div className="tg-result-grid">
              <div><div className="k">WORDS</div><div className="v">{finalStats.words}</div></div>
              <div><div className="k">WPM</div><div className="v">{finalStats.wpm}</div></div>
              <div><div className="k">ACCURACY</div><div className="v">{finalStats.accuracy}%</div></div>
              <div><div className="k">BEST COMBO</div><div className="v">{finalStats.bestCombo}</div></div>
            </div>
            <div className="tg-continue">
              <span className="tg-key">Enter</span> or <span className="tg-key">Space</span> to continue
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingGame;
