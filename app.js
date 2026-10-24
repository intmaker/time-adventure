'use strict';

const STORAGE_KEY = 'time-adventure-v3';
const root = document.getElementById('app');
const hello = document.getElementById('hello');

const defaultState = () => ({
  name: '',
  stars: 0,
  attempts: []
});

function loadState(){
  try{
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!parsed || !Array.isArray(parsed.attempts)) throw new Error('bad data');
    return { ...defaultState(), ...parsed };
  }catch{
    return defaultState();
  }
}

let state = loadState();
let view = 'home';
let practiceMinutes = 125;
let practiceStep = 5;
let practiceTarget = null;
let quizSession = null;
let adventureSession = null;
let dragInfo = null;
let autoNextTimer = null;

const scenes = {
  hero: 'assets/hero.jpg',
  clock: 'assets/clock_scene.jpg',
  quiz: 'assets/quiz_scene.jpg',
  bus: 'assets/bus_scene.jpg',
  rocket: 'assets/rocket_scene.jpg',
  mascot: 'assets/jjaekkagi.svg'
};

const adventureStories = [
  { title:'학교 버스 미션', image:scenes.bus, icon:'🚌', theme:'버스를 놓치지 않게 시간을 계산해요!' },
  { title:'로켓 출발 미션', image:scenes.rocket, icon:'🚀', theme:'정해진 시각에 출발하도록 도와줘요!' },
  { title:'별빛 퀴즈 미션', image:scenes.quiz, icon:'⭐', theme:'시계를 읽고 정답을 골라요!' },
  { title:'바늘 조작 미션', image:scenes.clock, icon:'🕰️', theme:'시계 바늘을 알맞게 움직여요!' },
  { title:'학교 버스 미션 2', image:scenes.bus, icon:'🎒', theme:'출발 시간과 도착 시간을 계산해요!' },
  { title:'로켓 출발 미션 2', image:scenes.rocket, icon:'🌙', theme:'몇 분 뒤에 출발하는지 맞혀요!' },
  { title:'별빛 퀴즈 미션 2', image:scenes.quiz, icon:'✨', theme:'보기 중에서 알맞은 시간을 찾으세요!' },
  { title:'바늘 조작 미션 2', image:scenes.clock, icon:'💜', theme:'문제에 맞게 시계를 완성해요!' }
];

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(v){
  return String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function rand(min,max){ return min + Math.floor(Math.random() * (max-min+1)); }
function pick(arr){ return arr[rand(0, arr.length-1)]; }
function shuffle(arr){ return [...arr].sort(() => Math.random() - 0.5); }
function pad(n){ return String(n).padStart(2,'0'); }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function clearAuto(){ if(autoNextTimer){ clearTimeout(autoNextTimer); autoNextTimer = null; } }
function setView(next){ clearAuto(); view = next; render(); window.scrollTo({ top:0, behavior:'smooth' }); }

function clockMod(minutes){
  return ((Math.round(minutes) % 720) + 720) % 720;
}

function clockHour(minutes){
  return Math.floor(clockMod(minutes) / 60) || 12;
}

function clockMinute(minutes){
  return clockMod(minutes) % 60;
}

function clockText(minutes){
  return `${clockHour(minutes)}시 ${pad(clockMinute(minutes))}분`;
}

function digitalText(minutes){
  return `${pad(clockHour(minutes))}:${pad(clockMinute(minutes))}`;
}

function sayTime(total){
  const safe = ((Math.round(total) % 1440) + 1440) % 1440;
  const h24 = Math.floor(safe / 60);
  const m = safe % 60;
  const half = h24 < 12 ? '오전' : '오후';
  const h12 = h24 % 12 || 12;
  return `${half} ${h12}시 ${m}분`;
}

function heading(title, subtitle=''){
  return `
    <div class="section-head">
      <div class="eyebrow">시간과 시각 배우기 ✨</div>
      <h2>${title}</h2>
      ${subtitle ? `<p class="muted">${subtitle}</p>` : ''}
    </div>
  `;
}

function starsText(){
  hello.textContent = `${state.name ? state.name + ' 탐험가 · ' : ''}⭐ ${state.stars}개`;
}

function menuButton(label, act, cls=''){
  return `<button class="btn ${cls}" data-act="${act}">${label}</button>`;
}

function tileCard(act, image, title, desc){
  return `
    <button class="tile image-tile" data-act="${act}">
      <img src="${image}" alt="${title} 그림" class="tile-image">
      <div class="tile-body">
        <strong>${title}</strong>
        <small>${desc}</small>
      </div>
    </button>
  `;
}

function record(mode, correct, hinted=false, starGain=0){
  state.attempts.push({ mode, correct, hinted, at: Date.now() });
  if(correct && starGain > 0) state.stars += starGain;
  saveState();
  starsText();
}

function renderClockSVG(minutes, { interactive=false, context='practice' } = {}){
  const value = clockMod(minutes);
  const hourAngle = (Math.floor(value / 60) % 12) * 30 + (value % 60) / 2;
  const minuteAngle = (value % 60) * 6;
  let marks = '';
  for(let i=1;i<=12;i++){
    const angle = i * Math.PI / 6;
    const x = 150 + 108 * Math.sin(angle);
    const y = 158 - 108 * Math.cos(angle);
    marks += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" class="clock-number">${i}</text>`;
  }
  return `
    <svg class="clock ${interactive ? 'interactive-clock' : ''}" data-clock-context="${context}" viewBox="0 0 300 300" role="img" aria-label="${clockText(minutes)} 시계">
      <circle cx="150" cy="150" r="142" fill="#d8cdff"></circle>
      <circle cx="150" cy="150" r="130" fill="#fffdf8"></circle>
      ${marks}
      <line class="hand hour-hand" x1="150" y1="150" x2="150" y2="95" stroke="#6550cf" stroke-width="11" stroke-linecap="round" transform="rotate(${hourAngle} 150 150)"></line>
      <line class="hand minute-hand" x1="150" y1="150" x2="150" y2="62" stroke="#f07a8f" stroke-width="8" stroke-linecap="round" transform="rotate(${minuteAngle} 150 150)"></line>
      <circle cx="150" cy="150" r="11" fill="#5d4c9d"></circle>
    </svg>
  `;
}

function updateClockDom(svg, minutes, syncMode){
  const value = clockMod(minutes);
  const hourAngle = (Math.floor(value / 60) % 12) * 30 + (value % 60) / 2;
  const minuteAngle = (value % 60) * 6;
  const hourHand = svg.querySelector('.hour-hand');
  const minuteHand = svg.querySelector('.minute-hand');
  if(hourHand) hourHand.setAttribute('transform', `rotate(${hourAngle} 150 150)`);
  if(minuteHand) minuteHand.setAttribute('transform', `rotate(${minuteAngle} 150 150)`);
  if(syncMode === 'practice'){
    const digital = document.getElementById('practiceDigital');
    if(digital) digital.textContent = digitalText(value);
    const h = document.getElementById('practiceHour');
    const m = document.getElementById('practiceMinute');
    if(h) h.value = clockHour(value);
    if(m) m.value = clockMinute(value);
  }
  if(syncMode === 'quiz'){
    const digital = document.getElementById('quizDigital');
    if(digital) digital.textContent = digitalText(value);
    const h = document.getElementById('quizHour');
    const m = document.getElementById('quizMinute');
    if(h) h.value = clockHour(value);
    if(m) m.value = clockMinute(value);
  }
}

function extractAngle(event, svg){
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 300 - 150;
  const y = ((event.clientY - rect.top) / rect.height) * 300 - 150;
  return { angle: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, radius: Math.hypot(x,y) };
}

function getContextMinutes(context){
  if(context === 'practice') return practiceMinutes;
  if(context === 'quiz' && quizSession?.current?.kind === 'set') return quizSession.current.userMinutes;
  return 0;
}

function setContextMinutes(context, minutes){
  const value = clockMod(minutes);
  if(context === 'practice') practiceMinutes = value;
  if(context === 'quiz' && quizSession?.current?.kind === 'set') quizSession.current.userMinutes = value;
}

function beginDrag(event, svg){
  const context = svg.dataset.clockContext;
  const info = extractAngle(event, svg);
  dragInfo = {
    context,
    svg,
    hand: info.radius > 88 ? 'minute' : 'hour'
  };
  svg.setPointerCapture(event.pointerId);
  moveDrag(event);
}

function moveDrag(event){
  if(!dragInfo) return;
  const { context, svg, hand } = dragInfo;
  const info = extractAngle(event, svg);
  let value = getContextMinutes(context);
  let hour = Math.floor(clockMod(value) / 60) % 12;
  let minute = clockMod(value) % 60;
  if(hand === 'minute'){
    const nextMinute = Math.round(info.angle / 6) % 60;
    if(minute > 45 && nextMinute < 15) hour = (hour + 1) % 12;
    if(minute < 15 && nextMinute > 45) hour = (hour + 11) % 12;
    minute = nextMinute;
  }else{
    const nextHour = Math.round(info.angle / 30) % 12;
    hour = nextHour;
  }
  value = hour * 60 + minute;
  if(practiceStep === 5 && context === 'practice') value = Math.round(value / 5) * 5;
  setContextMinutes(context, value);
  updateClockDom(svg, value, context);
}

function endDrag(){
  dragInfo = null;
}

function startPracticeTarget(){
  const units = practiceStep === 5 ? [0,5,10,15,20,25,30,35,40,45,50,55] : Array.from({length:60}, (_,i)=>i);
  practiceTarget = rand(1,12) * 60 % 720 + pick(units);
  if(practiceTarget === 0) practiceTarget = 720;
}

function homePage(){
  root.innerHTML = `
    <section class="hero-panel">
      <img src="${scenes.hero}" alt="시계 요정과 아이들이 시간을 배우는 그림" class="hero-image">
      <div class="hero-copy">
        <div class="eyebrow">초등 2학년 수학 · 시간과 시각</div>
        <h1>째깍째깍! 시간 탐험대</h1>
        <p>시계 바늘을 움직이고, 퀴즈를 풀고, 모험 속에서 시간을 익혀 보세요.</p>
        <div class="field slim-field">
          <label class="label" for="name">탐험가 이름</label>
          <input id="name" maxlength="14" value="${esc(state.name)}" placeholder="이름을 입력해 줘요">
        </div>
        <div class="actions">${menuButton('탐험 시작하기 🚀','start')}</div>
      </div>
    </section>
  `;
}

function menuPage(){
  root.innerHTML = `
    ${heading(`${esc(state.name || '친구')} 탐험가, 오늘은 무엇을 할까?`, '시간과 시각만 골라서 재미있게 배워 보아요!')}
    <section class="banner-card">
      <img src="${scenes.hero}" alt="시간 탐험대 대표 그림" class="banner-image">
      <div class="banner-copy">
        <h3>시계 요정 째깍이와 함께 떠나는 시간 공부</h3>
        <p>메뉴를 눌러서 시계 바늘 움직이기, 시계 퀴즈, 시간 모험 퀴즈를 해 보세요.</p>
      </div>
    </section>
    <section class="tiles tiles-3">
      ${tileCard('clock', scenes.clock, '시계를 움직여 봐요', '바늘을 직접 움직이며 시간을 맞혀요.')}
      ${tileCard('quiz', scenes.quiz, '시계 퀴즈', '시계를 읽고 정답을 골라요.')}
      ${tileCard('adventure', scenes.bus, '시간 모험 퀴즈', '그림과 함께 더 재미있는 모험 퀴즈!')}
    </section>
    <div class="actions center stack-mobile">
      ${menuButton('학습 기록 보기 📊','result','secondary')}
      ${menuButton('이름 바꾸기','home','secondary')}
    </div>
  `;
}

function clockPage(){
  if(practiceTarget === null) startPracticeTarget();
  root.innerHTML = `
    ${heading('🕰️ 시계를 움직여 봐요', '시침과 분침을 직접 움직여 목표 시각을 만들어 보세요.')}
    <div class="cols feature-cols">
      <section class="panel feature-art">
        <img src="${scenes.clock}" alt="시계 바늘을 움직이는 아이 그림" class="scene-image">
        <div class="bubble-note">${practiceStep === 5 ? '5분 단위로 차근차근 연습 중!' : '1분 단위까지 세밀하게 연습 중!'}</div>
      </section>
      <section class="panel clock-play-panel">
        <div class="mission-box">
          <span class="pill">오늘의 목표</span>
          <div class="target-time big-target">${clockText(practiceTarget)}</div>
          <p class="muted">아래 시계를 움직여 같은 시간으로 만들어 주세요.</p>
        </div>
        <div class="clock-box">
          ${renderClockSVG(practiceMinutes, { interactive:true, context:'practice' })}
          <div id="practiceDigital" class="time-big">${digitalText(practiceMinutes)}</div>
        </div>
        <div class="controls-row">
          <label class="mini-field">시
            <input id="practiceHour" type="number" min="1" max="12" value="${clockHour(practiceMinutes)}">
          </label>
          <label class="mini-field">분
            <input id="practiceMinute" type="number" min="0" max="59" value="${clockMinute(practiceMinutes)}">
          </label>
          ${menuButton('정답 확인','checkClock')}
        </div>
        <div class="actions wrap-actions">
          ${menuButton('5분씩 연습','step5','secondary small')}
          ${menuButton('1분까지 연습','step1','secondary small')}
          ${menuButton('새로운 목표 받기','newClockTask','pink small')}
          ${menuButton('학습 메뉴','menu','secondary small')}
        </div>
        <div id="clockFeedback" aria-live="polite"></div>
      </section>
    </div>
  `;
  hookClocks();
}

function questionPrompt(content){
  return `<div class="question-prompt">${content}</div>`;
}

function makeReadQuestion(level){
  const steps = [30, 5, 5, 1];
  const step = steps[level] || 5;
  const time = rand(1,12) * 60 % 720 + step * rand(0, Math.floor(59/step));
  const answer = clockMod(time || 720);
  const options = [answer];
  const deltas = step === 1 ? [2,5,10,15,-5,-10] : [step, step*2, step*3, -step, -step*2, 60];
  for(const delta of deltas){
    let candidate = clockMod(answer + delta);
    if(candidate === 0) candidate = 720;
    if(!options.includes(candidate)) options.push(candidate);
    if(options.length === 4) break;
  }
  while(options.length < 4){
    let candidate = clockMod(answer + rand(1,11) * 5);
    if(candidate === 0) candidate = 720;
    if(!options.includes(candidate)) options.push(candidate);
  }
  return { kind:'read', prompt:'시계를 보고 알맞은 시간을 골라 보세요!', time:answer, answer, options:shuffle(options), hinted:false, solved:false };
}

function makeSetQuestion(level){
  const steps = [30, 5, 5, 1];
  const step = steps[level] || 5;
  let target = rand(1,12) * 60 % 720 + step * rand(0, Math.floor(59/step));
  if(target === 0) target = 720;
  let userMinutes = rand(1,12) * 60 % 720;
  return { kind:'set', prompt:'바늘을 움직여 아래 시각을 만들어 보세요!', target, answer:target, userMinutes, hinted:false, solved:false };
}

function buildQuizSession(){
  return {
    index: 0,
    correct: 0,
    questions: Array.from({length:10}, (_,i) => Math.random() < 0.45 ? makeReadQuestion(Math.min(3, Math.floor(i/3))) : makeSetQuestion(Math.min(3, Math.floor(i/3))))
  };
}

function quizPage(){
  if(!quizSession) quizSession = buildQuizSession();
  const q = quizSession.questions[quizSession.index];
  quizSession.current = q;
  const progress = (quizSession.index / quizSession.questions.length) * 100;
  root.innerHTML = `
    ${heading('❓ 시계 퀴즈', '그림을 보며 시계를 읽고, 바늘도 움직여 보세요!')}
    <section class="banner-card quiz-banner">
      <img src="${scenes.quiz}" alt="시계 퀴즈 그림" class="banner-image small-banner">
      <div class="banner-copy">
        <div class="row spread"><strong>${quizSession.index + 1} / ${quizSession.questions.length} 문제</strong><span class="pill">⭐ ${state.stars}</span></div>
        <div class="progress"><span style="width:${progress}%"></span></div>
        ${q.kind === 'set'
          ? questionPrompt(`<span class="question-instruction">바늘을 움직여</span><strong class="target-time">${clockText(q.target)}</strong><span class="question-instruction">을 만들어 보세요!</span>`)
          : questionPrompt(`<span class="question-instruction">시계를 보고</span><strong class="target-time target-time-small">몇 시 몇 분인지</strong><span class="question-instruction">골라 보세요!</span>`)
        }
      </div>
    </section>
    <section class="panel quiz-panel">
      <div class="clock-box ${q.kind === 'read' ? 'quiz-read-layout' : ''}">
        ${renderClockSVG(q.kind === 'read' ? q.time : q.userMinutes, { interactive:q.kind==='set', context:'quiz' })}
        ${q.kind === 'set' ? `<div id="quizDigital" class="time-big">${digitalText(q.userMinutes)}</div>` : ''}
      </div>
      ${q.kind === 'read' ? `
        <div class="choices image-choices">
          ${q.options.map((opt, idx) => `<button class="choice" data-choice="${idx}">${clockText(opt)}</button>`).join('')}
        </div>
      ` : `
        <div class="controls-row quiz-control-row">
          <label class="mini-field">시
            <input id="quizHour" type="number" min="1" max="12" value="${clockHour(q.userMinutes)}">
          </label>
          <label class="mini-field">분
            <input id="quizMinute" type="number" min="0" max="59" value="${clockMinute(q.userMinutes)}">
          </label>
          ${menuButton('정답 확인','checkQuizClock')}
        </div>
      `}
      <div class="actions wrap-actions center">
        ${menuButton('💡 힌트','hintQuiz','secondary small')}
        ${menuButton('학습 메뉴','menu','secondary small')}
      </div>
      <div id="feedback" aria-live="polite"></div>
    </section>
  `;
  hookClocks();
}

function showQuizHint(){
  const q = quizSession.current;
  q.hinted = true;
  const msg = q.kind === 'set'
    ? `긴 바늘은 분, 짧은 바늘은 시를 나타내요. 목표는 ${clockText(q.target)}예요.`
    : `긴 바늘이 먼저 몇 분인지 알려 줘요. 그다음 짧은 바늘이 몇 시 근처인지 살펴보세요.`;
  document.getElementById('feedback').innerHTML = `<div class="hint">💡 ${msg}</div>`;
}

function quizCorrectMessage(extra=''){ return `<div class="feedback success-box">🎉 정답이에요! ${extra}<br><span class="smalltext">잠시 후 다음 문제로 자동 이동해요.</span></div>`; }

function finishQuiz(){
  const score = quizSession.correct;
  root.innerHTML = `
    ${heading('🎉 시계 퀴즈 완료!', `${quizSession.questions.length}문제 중 ${score}문제 정답!`) }
    <section class="hero-panel hero-finish">
      <img src="${scenes.quiz}" alt="퀴즈 완료 그림" class="hero-image">
      <div class="hero-copy">
        <h3>${score >= 8 ? '정말 멋진 시간 박사예요!' : '끝까지 도전해서 멋져요!'}</h3>
        <p>틀린 문제도 다시 풀어 본 것이 아주 중요해요.</p>
        <div class="actions wrap-actions">
          ${menuButton('다시 10문제 풀기','restartQuiz')}
          ${menuButton('학습 기록 보기','result','secondary')}
          ${menuButton('학습 메뉴','menu','secondary')}
        </div>
      </div>
    </section>
  `;
}

function gradeQuiz(value){
  const q = quizSession.current;
  if(q.solved) return;
  const correct = value === q.answer;
  if(correct){
    q.solved = true;
    quizSession.correct += 1;
    record('시계 퀴즈', true, q.hinted, q.hinted ? 1 : 2);
    document.getElementById('feedback').innerHTML = quizCorrectMessage(q.kind === 'set' ? `${clockText(q.target)}을(를) 잘 만들었어요!` : `${clockText(q.answer)}이(가) 맞아요!`);
    autoNextTimer = setTimeout(() => {
      clearAuto();
      quizSession.index += 1;
      if(quizSession.index >= quizSession.questions.length) finishQuiz();
      else quizPage();
    }, 1500);
  }else{
    q.hinted = q.hinted || false;
    record('시계 퀴즈', false, q.hinted, 0);
    document.getElementById('feedback').innerHTML = `<div class="feedback warn">조금만 더 생각해 보세요! 다시 도전할 수 있어요.</div>`;
  }
}

function buildAdventureSession(){
  return {
    index: 0,
    correct: 0,
    missions: adventureStories.map((story, i) => createAdventureMission(story, i))
  };
}

function createAdventureMission(story, index){
  const type = index % 2 === 0 ? 'end' : 'duration';
  const start = rand(7, 18) * 60 + pick([0,10,20,30,40,50]);
  const amount = pick([10,15,20,25,30,35,40,45,50,60]);
  const end = start + amount;
  let prompt = '';
  let answer = 0;
  let options = [];
  if(type === 'end'){
    prompt = `${sayTime(start)}에 시작했어요. ${amount}분 뒤에는 몇 시 몇 분일까요?`;
    answer = ((end % 1440) + 1440) % 1440;
    options = [answer, answer + 10, answer - 10, answer + 30].map(v => ((v % 1440) + 1440) % 1440);
    options = [...new Set(options)].slice(0,4);
    while(options.length < 4){
      const v = ((answer + pick([20,-20,40,-40,50])) % 1440 + 1440) % 1440;
      if(!options.includes(v)) options.push(v);
    }
  }else{
    prompt = `${sayTime(start)}에 시작해서 ${sayTime(end)}에 끝났어요. 모두 몇 분 동안 했을까요?`;
    answer = amount;
    options = [answer, answer+10, Math.max(5, answer-10), answer+20];
    options = [...new Set(options)].slice(0,4);
    while(options.length < 4){
      const v = pick([5,10,15,20,25,30,35,40,45,50,60,70]);
      if(!options.includes(v)) options.push(v);
    }
  }
  return {
    ...story,
    type,
    start,
    amount,
    end,
    prompt,
    answer,
    options: shuffle(options),
    hinted:false,
    solved:false
  };
}

function adventurePage(){
  if(!adventureSession) adventureSession = buildAdventureSession();
  const mission = adventureSession.missions[adventureSession.index];
  const progress = (adventureSession.index / adventureSession.missions.length) * 100;
  root.innerHTML = `
    ${heading('🌟 시간 모험 퀴즈', '그림 속 이야기를 읽고 시간을 계산해 보세요!')}
    <section class="panel adventure-panel">
      <div class="row spread"><span class="pill">${mission.icon} ${mission.title}</span><strong>${adventureSession.index + 1} / ${adventureSession.missions.length} 미션</strong></div>
      <div class="progress"><span style="width:${progress}%"></span></div>
      <img src="${mission.image}" alt="${mission.title} 그림" class="adventure-image">
      <div class="mission-story-box">
        <h3>${mission.theme}</h3>
        <div class="question mission-question">${mission.prompt}</div>
      </div>
      <div class="choices mission-choices">
        ${mission.options.map((opt, idx) => `<button class="choice choice-big" data-adventure-choice="${idx}">${mission.type === 'end' ? sayTime(opt) : opt + '분'}</button>`).join('')}
      </div>
      <div class="actions wrap-actions center">
        ${menuButton('💡 힌트','advHint','secondary small')}
        ${menuButton('학습 메뉴','menu','secondary small')}
      </div>
      <div id="advFeedback" aria-live="polite"></div>
    </section>
  `;
}

function showAdventureHint(){
  const mission = adventureSession.missions[adventureSession.index];
  mission.hinted = true;
  const msg = mission.type === 'end'
    ? '시작 시각에서 분을 먼저 더해 보세요. 60분이 넘으면 1시간이 커져요.'
    : '시작 시각부터 끝 시각까지 10분씩 세어 보세요.';
  document.getElementById('advFeedback').innerHTML = `<div class="hint">💡 ${msg}</div>`;
}

function adventureAnswer(choiceIndex){
  const mission = adventureSession.missions[adventureSession.index];
  if(mission.solved) return;
  const picked = mission.options[choiceIndex];
  const correct = picked === mission.answer;
  if(correct){
    mission.solved = true;
    adventureSession.correct += 1;
    record('시간 모험 퀴즈', true, mission.hinted, mission.hinted ? 1 : 2);
    document.getElementById('advFeedback').innerHTML = quizCorrectMessage(mission.type === 'end' ? `정답은 ${sayTime(mission.answer)}이에요!` : `정답은 ${mission.answer}분이에요!`);
    autoNextTimer = setTimeout(() => {
      clearAuto();
      adventureSession.index += 1;
      if(adventureSession.index >= adventureSession.missions.length) finishAdventure();
      else adventurePage();
    }, 1600);
  }else{
    record('시간 모험 퀴즈', false, mission.hinted, 0);
    document.getElementById('advFeedback').innerHTML = `<div class="feedback warn">조금만 더 생각해 볼까요? 다시 눌러 볼 수 있어요.</div>`;
  }
}

function finishAdventure(){
  const score = adventureSession.correct;
  root.innerHTML = `
    ${heading('🏁 시간 모험 완료!', `${adventureSession.missions.length}개의 모험 중 ${score}개 성공!`) }
    <section class="hero-panel hero-finish">
      <img src="${score % 2 === 0 ? scenes.rocket : scenes.bus}" alt="시간 모험 완료 그림" class="hero-image">
      <div class="hero-copy">
        <h3>${score >= 6 ? '정말 멋진 시간 모험가예요!' : '끝까지 모험을 해내서 훌륭해요!'}</h3>
        <p>그림을 보며 시간을 계산하는 힘이 점점 커지고 있어요.</p>
        <div class="actions wrap-actions">
          ${menuButton('다시 모험하기','restartAdventure')}
          ${menuButton('학습 기록 보기','result','secondary')}
          ${menuButton('학습 메뉴','menu','secondary')}
        </div>
      </div>
    </section>
  `;
}

function resultPage(){
  const attempts = state.attempts;
  const totalCorrect = attempts.filter(a => a.correct).length;
  const noHint = attempts.filter(a => a.correct && !a.hinted).length;
  const total = attempts.length;
  const groups = ['시계 놀이터','시계 퀴즈','시간 모험 퀴즈'].map(name => {
    const arr = attempts.filter(a => a.mode === name);
    return { name, count: arr.length, rate: arr.length ? Math.round(arr.filter(x => x.correct).length / arr.length * 100) : 0 };
  });
  root.innerHTML = `
    ${heading('📊 학습 기록', '정답도 중요하지만, 다시 도전한 경험이 더 중요해요!')}
    <section class="stats-grid">
      <div class="panel stat-card"><span class="stat-label">⭐ 모은 별</span><strong class="stat-number">${state.stars}</strong></div>
      <div class="panel stat-card"><span class="stat-label">✏️ 문제 풀이</span><strong class="stat-number">${total}</strong></div>
      <div class="panel stat-card"><span class="stat-label">✅ 맞힌 횟수</span><strong class="stat-number">${totalCorrect}</strong></div>
      <div class="panel stat-card"><span class="stat-label">💡 힌트 없이 성공</span><strong class="stat-number">${noHint}</strong></div>
    </section>
    <section class="panel">
      <h3>영역별 성취 보기</h3>
      ${groups.map(g => `
        <div class="progress-card">
          <div class="row spread"><strong>${g.name}</strong><span>${g.count}회 · ${g.rate}%</span></div>
          <div class="line"><span style="width:${g.rate}%"></span></div>
        </div>
      `).join('')}
      <p class="smalltext muted">기록과 별은 이 브라우저에만 저장돼요.</p>
    </section>
    <div class="actions center wrap-actions">
      ${menuButton('기록 초기화','resetRecords','secondary')}
      ${menuButton('학습 메뉴','menu')}
    </div>
  `;
}

function hookClocks(){
  document.querySelectorAll('.interactive-clock').forEach(svg => {
    svg.onpointerdown = (event) => beginDrag(event, svg);
    svg.onpointermove = (event) => { if(dragInfo) moveDrag(event); };
    svg.onpointerup = endDrag;
    svg.onpointercancel = endDrag;
    svg.onlostpointercapture = endDrag;
  });
}

function render(){
  starsText();
  switch(view){
    case 'home': homePage(); break;
    case 'menu': menuPage(); break;
    case 'clock': clockPage(); break;
    case 'quiz': quizPage(); break;
    case 'adventure': adventurePage(); break;
    case 'result': resultPage(); break;
    default: homePage();
  }
}

function handleAction(action){
  switch(action){
    case 'home': setView('home'); break;
    case 'start': {
      const nameField = document.getElementById('name');
      state.name = nameField && nameField.value.trim() ? nameField.value.trim() : '시간 탐험가';
      saveState();
      setView('menu');
      break;
    }
    case 'menu': setView('menu'); break;
    case 'clock': setView('clock'); break;
    case 'quiz': quizSession = null; setView('quiz'); break;
    case 'adventure': adventureSession = null; setView('adventure'); break;
    case 'result': setView('result'); break;
    case 'step5': practiceStep = 5; practiceMinutes = Math.round(practiceMinutes / 5) * 5; clockPage(); break;
    case 'step1': practiceStep = 1; clockPage(); break;
    case 'newClockTask': startPracticeTarget(); clockPage(); break;
    case 'checkClock': {
      const ok = clockMod(practiceMinutes) === clockMod(practiceTarget);
      record('시계 놀이터', ok, false, ok ? 2 : 0);
      document.getElementById('clockFeedback').innerHTML = `
        <div class="feedback ${ok ? 'success-box' : 'warn'}">
          ${ok ? `🎉 성공! ${clockText(practiceTarget)}을(를) 잘 만들었어요.` : `아직 달라요. 목표는 ${clockText(practiceTarget)}이에요. 다시 움직여 보세요!`}
        </div>
      `;
      if(ok) startPracticeTarget();
      break;
    }
    case 'checkQuizClock': {
      if(quizSession?.current?.kind === 'set') gradeQuiz(clockMod(quizSession.current.userMinutes));
      break;
    }
    case 'hintQuiz': showQuizHint(); break;
    case 'restartQuiz': quizSession = null; setView('quiz'); break;
    case 'advHint': showAdventureHint(); break;
    case 'restartAdventure': adventureSession = null; setView('adventure'); break;
    case 'resetRecords':
      if(confirm('학습 기록과 별을 모두 지울까요?')){
        state.stars = 0;
        state.attempts = [];
        saveState();
        resultPage();
        starsText();
      }
      break;
  }
}

root.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-choice]');
  if(choice && quizSession?.current?.kind === 'read'){
    gradeQuiz(quizSession.current.options[Number(choice.dataset.choice)]);
    return;
  }
  const advChoice = event.target.closest('[data-adventure-choice]');
  if(advChoice && adventureSession){
    adventureAnswer(Number(advChoice.dataset.adventureChoice));
    return;
  }
  const actionButton = event.target.closest('[data-act]');
  if(actionButton) handleAction(actionButton.dataset.act);
});

root.addEventListener('input', (event) => {
  if(event.target.id === 'practiceHour' || event.target.id === 'practiceMinute'){
    const h = clamp(Number(document.getElementById('practiceHour').value) || 12, 1, 12);
    const m = clamp(Number(document.getElementById('practiceMinute').value) || 0, 0, 59);
    practiceMinutes = clockMod(h % 12 * 60 + m);
    const svg = document.querySelector('[data-clock-context="practice"]');
    if(svg) updateClockDom(svg, practiceMinutes, 'practice');
  }
  if(event.target.id === 'quizHour' || event.target.id === 'quizMinute'){
    if(quizSession?.current?.kind !== 'set') return;
    const h = clamp(Number(document.getElementById('quizHour').value) || 12, 1, 12);
    const m = clamp(Number(document.getElementById('quizMinute').value) || 0, 0, 59);
    quizSession.current.userMinutes = clockMod(h % 12 * 60 + m);
    const svg = document.querySelector('[data-clock-context="quiz"]');
    if(svg) updateClockDom(svg, quizSession.current.userMinutes, 'quiz');
  }
});

document.getElementById('homeBtn').addEventListener('click', () => setView(state.name ? 'menu' : 'home'));
render();