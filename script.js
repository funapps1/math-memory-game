(() => {
  const boardEl = document.getElementById('board');
  const startBtn = document.getElementById('startBtn');
  const movesEl = document.getElementById('moves');
  const matchesEl = document.getElementById('matches');
  const starsEl = document.getElementById('stars');
  const messageEl = document.getElementById('message');
  const gridSizeEl = document.getElementById('gridSize');
  const opsEl = document.getElementById('ops');
  const tileSizeEl = document.getElementById('tileSize');
  const muteBtn = document.getElementById('muteBtn');

  let tileCount = 16;
  let tiles = [];
  let first = null, second = null;
  let moves = 0, matches = 0;
  let canClick = true;
  let stars = 3;
  let voiceEnabled = true;

  function speak(msg){
    if(!voiceEnabled) return;
    try{const u=new SpeechSynthesisUtterance(msg);speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}
  }

  function setTileSize(px){
    document.documentElement.style.setProperty('--tile-size', px+'px');
  }

  tileSizeEl.addEventListener('change', ()=> setTileSize(tileSizeEl.value));
  setTileSize(tileSizeEl.value);

  muteBtn.addEventListener('click', ()=>{voiceEnabled=!voiceEnabled;muteBtn.textContent = voiceEnabled? 'Mute Voice':'Unmute Voice'});

  function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a}

  function generateProblems(count, ops){
    const problems = [];
    const seenKeys = new Set();
    const seenValues = new Set();
    // Ensure each numeric value is unique to avoid ambiguous matches
    let attempts = 0;
    while(problems.length < count && attempts < 10000){
      attempts++;
      const a = randInt(1,12);
      const b = randInt(1,12);
      const useOp = ops === 'both' ? (Math.random()<0.5? 'add':'sub') : ops;
      let text, value;
      if(useOp === 'add'){
        text = `${a} + ${b}`;
        value = a + b;
      } else { // sub
        const x = Math.max(a,b), y = Math.min(a,b);
        text = `${x} - ${y}`;
        value = x - y;
      }
      const key = text + '=' + value;
      if(seenKeys.has(key) || seenValues.has(value)) continue;
      seenKeys.add(key);
      seenValues.add(value);
      problems.push({text, value});
    }
    return problems;
  }

  function buildBoard(size){
    tileCount = size*size;
    boardEl.innerHTML = '';
    const cols = size;
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
    const pairCount = tileCount/2;
    const problems = generateProblems(pairCount, opsEl.value);
    tiles = [];
    problems.forEach((p, idx)=>{
      tiles.push({id:idx+'a', kind:'expr', label:p.text, value:p.value});
      tiles.push({id:idx+'b', kind:'value', label:String(p.value), value:p.value});
    });
    // shuffle
    for(let i=tiles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]]}

    tiles.forEach((t)=>{
      const div = document.createElement('button');
      div.className = 'tile hidden';
      div.dataset.id = t.id;
      div.dataset.value = t.value;
      div.innerHTML = `<div class="tileContent">?</div>`;
      div.addEventListener('click', ()=> onTileClick(div,t));
      boardEl.appendChild(div);
    });
  }

  function onTileClick(el, t){
    if(!canClick) return;
    if(el.classList.contains('match') || el === first) return;
    reveal(el, t);
    if(!first){ first = {el,t}; return }
    second = {el,t};
    moves++;
    movesEl.textContent = moves;
    canClick = false;
    const matched = (first.t.value === second.t.value) && (first.t.id.slice(0,-1) !== second.t.id.slice(0,-1));
    if(matched){
      first.el.classList.add('match'); second.el.classList.add('match');
      matches++;
      matchesEl.textContent = matches;
      speakRandomMatch();
      setTimeout(()=>{first = second = null; canClick = true; checkWin();}, 400);
    } else {
      updateStars();
      setTimeout(()=>{
        hide(first.el); hide(second.el); first = second = null; canClick = true;
      },700);
    }
  }

  function reveal(el,t){ el.classList.remove('hidden'); el.querySelector('.tileContent').textContent = t.label }
  function hide(el){ el.classList.add('hidden'); el.querySelector('.tileContent').textContent = '?' }

  function updateStars(){
    const thresholds = {16:[20,30],36:[50,80]};
    const size = Math.sqrt(tileCount);
    const th = thresholds[tileCount] || [Math.floor(tileCount*1.2), Math.floor(tileCount*1.8)];
    if(moves > th[1]) stars = 1;
    else if(moves > th[0]) stars = 2;
    else stars = 3;
    starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
  }

  function checkWin(){
    if(matches === tileCount/2){
      messageEl.textContent = `You win! Moves: ${moves}. Stars: ${stars}`;
      speak(`Congratulations! You won with ${stars} star${stars>1?'s':''} and ${moves} moves.`);
      startBtn.textContent = 'Play Again';
    }
  }

  function speakRandomMatch(){
    const phrases = ['Nice match!','Great one!','Well done!','Keep it up!'];
    const p = phrases[Math.floor(Math.random()*phrases.length)];
    speak(p);
    messageEl.textContent = p;
  }

  startBtn.addEventListener('click', ()=>{
    const size = parseInt(gridSizeEl.value,10);
    buildBoard(size);
    moves = 0; matches = 0; stars = 3; movesEl.textContent='0'; matchesEl.textContent='0'; starsEl.textContent='★★★';
    messageEl.textContent = 'Find all matching expressions and values.';
    startBtn.textContent = 'Restart';
    speak('Game started. Good luck!');
  });

  // initial build
  buildBoard(4);

})();
