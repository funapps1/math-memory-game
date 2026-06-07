(() => {
  const boardEl = document.getElementById('board');
  const startBtn = document.getElementById('startBtn');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const movesEl = document.getElementById('moves');
  const matchesEl = document.getElementById('matches');
  const starsEl = document.getElementById('stars');
  const timerEl = document.getElementById('timer');
  const progressEl = document.getElementById('progress');
  const progressBarEl = document.getElementById('progressBar');
  const progressTextEl = document.getElementById('progressText');
  const messageEl = document.getElementById('message');
  const victoryOverlayEl = document.getElementById('victoryOverlay');
  const victorySummaryEl = document.getElementById('victorySummary');
  const gridSizeEl = document.getElementById('gridSize');
  const opsEl = document.getElementById('ops');
  const tileSizeEl = document.getElementById('tileSize');
  const muteBtn = document.getElementById('muteBtn');

  let tileCount = 16;
  let tiles = [];
  let first = null;
  let second = null;
  let moves = 0;
  let matches = 0;
  let stars = 3;
  let canClick = true;
  let voiceEnabled = true;
  let timerId = null;
  let secondsElapsed = 0;
  let gameActive = false;

  function speak(msg) {
    if (!voiceEnabled) return;
    try {
      const utterance = new SpeechSynthesisUtterance(msg);
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch (e) {
      // Speech synthesis is optional; ignore failures.
    }
  }

  function setTileSize(px) {
    document.documentElement.style.setProperty('--tile-size', `${px}px`);
  }

  function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function resetTimer() {
    secondsElapsed = 0;
    timerEl.textContent = formatTime(secondsElapsed);
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    resetTimer();
    timerId = setInterval(() => {
      secondsElapsed += 1;
      timerEl.textContent = formatTime(secondsElapsed);
      updateStars();
    }, 1000);
  }

  function updateProgress() {
    const totalPairs = tileCount / 2;
    const ratio = totalPairs ? matches / totalPairs : 0;
    const percent = Math.round(ratio * 100);
    progressEl.textContent = `${percent}%`;
    progressBarEl.style.width = `${percent}%`;
    progressTextEl.textContent = `${matches} / ${totalPairs} pairs matched`;
  }

  function updateStars() {
    const totalPairs = tileCount / 2;
    const slowThreshold = Math.max(15, totalPairs * 5);
    const mediumThreshold = Math.max(9, totalPairs * 3);

    if (moves > slowThreshold || secondsElapsed > slowThreshold * 2) {
      stars = 1;
    } else if (moves > mediumThreshold || secondsElapsed > mediumThreshold) {
      stars = 2;
    } else {
      stars = 3;
    }

    starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  }

  function generateProblems(count, ops) {
    const problems = [];
    const seenKeys = new Set();
    const seenValues = new Set();
    let attempts = 0;

    while (problems.length < count && attempts < 20000) {
      attempts += 1;
      const a = randInt(1, 12);
      const b = randInt(1, 12);
      const useOp = ops === 'both' ? (Math.random() < 0.5 ? 'add' : 'sub') : ops;
      let text;
      let value;

      if (useOp === 'add') {
        text = `${a} + ${b}`;
        value = a + b;
      } else {
        const x = Math.max(a, b);
        const y = Math.min(a, b);
        text = `${x} - ${y}`;
        value = x - y;
      }

      const key = `${text}=${value}`;
      if (seenKeys.has(key) || seenValues.has(value)) continue;
      seenKeys.add(key);
      seenValues.add(value);
      problems.push({ text, value });
    }

    return problems;
  }

  function buildBoard(size) {
    tileCount = size * size;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${size}, var(--tile-size))`;

    const pairCount = tileCount / 2;
    const problems = generateProblems(pairCount, opsEl.value);
    tiles = [];

    problems.forEach((problem, idx) => {
      tiles.push({ id: `${idx}a`, kind: 'expr', label: problem.text, value: problem.value });
      tiles.push({ id: `${idx}b`, kind: 'value', label: String(problem.value), value: problem.value });
    });

    for (let i = tiles.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    tiles.forEach((tile) => {
      const button = document.createElement('button');
      button.className = 'tile hidden';
      button.dataset.id = tile.id;
      button.dataset.value = String(tile.value);
      button.innerHTML = '<div class="tileContent">?</div>';
      button.addEventListener('click', () => onTileClick(button, tile));
      boardEl.appendChild(button);
    });

    updateProgress();
  }

  function reveal(el, tile) {
    el.classList.remove('hidden', 'wrong');
    el.classList.add('revealed');
    el.querySelector('.tileContent').textContent = tile.label;
  }

  function hide(el) {
    el.classList.remove('revealed', 'wrong');
    el.classList.add('hidden');
    el.querySelector('.tileContent').textContent = '?';
  }

  function finishGame() {
    gameActive = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    updateStars();
    const totalPairs = tileCount / 2;
    const summary = `Completed ${totalPairs} pairs in ${formatTime(secondsElapsed)} with ${moves} moves and ${stars} star${stars > 1 ? 's' : ''}.`;
    victorySummaryEl.textContent = summary;
    messageEl.textContent = 'Victory! Great work.';
    victoryOverlayEl.classList.remove('hidden');
    victoryOverlayEl.setAttribute('aria-hidden', 'false');
    speak(`Congratulations! You won with ${stars} star${stars > 1 ? 's' : ''}.`);
    spawnConfetti();
    startBtn.textContent = 'Play Again';
  }

  function spawnConfetti() {
    victoryOverlayEl.querySelectorAll('.confetti').forEach((node) => node.remove());
    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'];
    const count = 28;

    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${-10 - Math.random() * 30}px`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.35}s`;
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      victoryOverlayEl.appendChild(piece);
    }
  }

  function speakRandomMatch() {
    const phrases = ['Nice match!', 'Great one!', 'Well done!', 'Keep it up!', 'Excellent!'];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(phrase);
    messageEl.textContent = phrase;
  }

  function onTileClick(el, tile) {
    if (!gameActive || !canClick) return;
    if (el.classList.contains('match') || el === first?.el) return;

    reveal(el, tile);

    if (!first) {
      first = { el, tile };
      return;
    }

    second = { el, tile };
    moves += 1;
    movesEl.textContent = String(moves);
    canClick = false;

    const matched = first.tile.value === second.tile.value && first.tile.id.slice(0, -1) !== second.tile.id.slice(0, -1);

    if (matched) {
      first.el.classList.add('match');
      second.el.classList.add('match');
      matches += 1;
      matchesEl.textContent = String(matches);
      updateProgress();
      updateStars();
      speakRandomMatch();

      setTimeout(() => {
        first = null;
        second = null;
        canClick = true;
        if (matches === tileCount / 2) finishGame();
      }, 350);
    } else {
      updateStars();
      first.el.classList.add('wrong');
      second.el.classList.add('wrong');
      setTimeout(() => {
        hide(first.el);
        hide(second.el);
        first = null;
        second = null;
        canClick = true;
      }, 700);
    }
  }

  function resetScoreboard() {
    moves = 0;
    matches = 0;
    stars = 3;
    movesEl.textContent = '0';
    matchesEl.textContent = '0';
    starsEl.textContent = '★★★';
    progressEl.textContent = '0%';
    progressBarEl.style.width = '0%';
    progressTextEl.textContent = `${tileCount / 2} pairs matched`;
    messageEl.textContent = 'Find all matching expressions and values.';
  }

  function startGame() {
    const size = parseInt(gridSizeEl.value, 10);
    victoryOverlayEl.classList.add('hidden');
    victoryOverlayEl.setAttribute('aria-hidden', 'true');
    boardEl.innerHTML = '';
    first = null;
    second = null;
    canClick = true;
    gameActive = true;
    buildBoard(size);
    resetScoreboard();
    startTimer();
    startBtn.textContent = 'Restart';
    speak('Game started. Good luck!');
  }

  tileSizeEl.addEventListener('change', () => setTileSize(tileSizeEl.value));
  muteBtn.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    muteBtn.textContent = voiceEnabled ? 'Mute Voice' : 'Unmute Voice';
  });
  startBtn.addEventListener('click', startGame);
  playAgainBtn.addEventListener('click', startGame);

  setTileSize(tileSizeEl.value);
  buildBoard(4);
  progressTextEl.textContent = '0 / 8 pairs matched';
})();