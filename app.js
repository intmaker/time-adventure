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
let compareStart = 9*60+20;
let compareEnd = 10*60+35;
let converterHours = 1;
let converterMinutes = 25;
let converterTotal = 85;
let practiceStep = 5;
let practiceTarget = null;
let quizSession = null;
let adventureSession = null;
let adventureMode = 'duration';
let formatSession = null;
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
  if(syncMode === 'compareStart' || syncMode === 'compareEnd'){
    const id=syncMode==='compareStart'?'Start':'End';
    const hourInput=document.getElementById('compare'+id+'Hour');
    const minuteInput=document.getElementById('compare'+id+'Minute');
    if(hourInput) hourInput.value=clockHour(value);
    if(minuteInput) minuteInput.value=clockMinute(value);
    refreshCompare();
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
  if(context === 'compareStart') return compareStart;
  if(context === 'compareEnd') return compareEnd;
  if(context === 'quiz' && quizSession?.current?.kind === 'set') return quizSession.current.userMinutes;
  return 0;
}

function setContextMinutes(context, minutes){
  const value = clockMod(minutes);
  if(context === 'practice') practiceMinutes = value;
  if(context === 'compareStart') compareStart = value;
  if(context === 'compareEnd') compareEnd = value;
  if(context === 'quiz' && quizSession?.current?.kind === 'set') quizSession.current.userMinutes = value;
}

function beginDrag(event, svg){
  const context = svg.dataset.clockContext;
  const info = extractAngle(event, svg);
  // The minute hand is 88 SVG units long, while the hour hand is 55.
  // Select by distance to the actual hand segment, not an unreachable radius threshold.
  const current = clockMod(getContextMinutes(context));
  const minuteAngle = (current % 60) * 6;
  const hourAngle = (Math.floor(current / 60) % 12) * 30 + (current % 60) / 2;
  const distanceToHand = (angle, length) => {
    const diff = Math.abs((info.angle - angle + 540) % 360 - 180) * Math.PI / 180;
    const projected = Math.max(0, Math.min(length, info.radius * Math.cos(diff)));
    return Math.sqrt(info.radius ** 2 + projected ** 2 - 2 * info.radius * projected * Math.cos(diff));
  };
  const minuteDist = distanceToHand(minuteAngle, 88);
  const hourDist = distanceToHand(hourAngle, 55);
  dragInfo = {
    context,
    svg,
    hand: minuteDist <= hourDist ? 'minute' : 'hour'
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
 root.innerHTML=heading(`${esc(state.name||'친구')} 탐험가, 시간 공부를 시작해요!`,'초등학교 2학년 시간과 시각 · 일곱 가지 학습과 놀이')+
 '<section class="tiles tiles-3">'+
 tileCard('clock',scenes.clock,'① 시계 놀이터·두 시계 비교','시계 바늘 놀이와 두 시각 사이의 시간 계산')+
 tileCard('convertplay',scenes.rocket,'② 시간·분 변환 놀이터','시간과 분을 넣고 전체 분으로 바꿔요!')+
 tileCard('quiz',scenes.clock,'③ 시계 읽기·맞추기','시계를 읽고 직접 바늘을 움직여요.')+
 tileCard('before',scenes.quiz,'④ 몇 시 몇 분 전','정각까지 남은 시간과 이전 시각을 알아봐요.')+
 tileCard('duration',scenes.bus,'⑤ 걸린 시간','시작 시각과 끝 시각 사이를 계산해요.')+
 tileCard('unit',scenes.rocket,'⑥ 시간 단위 변환','1시간=60분! 시간과 분을 바꿔요.')+
 tileCard('format',scenes.hero,'⑦ 오전·오후와 24시간제','오전·오후와 12시간제·24시간제를 익혀요.')+
 '</section><div class="actions center">'+menuButton('학습 기록','result','secondary')+'</div>';
}

function clockPage(){
  if(practiceTarget === null) startPracticeTarget();
  root.innerHTML = `
    ${heading('🕰️ 시계를 움직여 봐요', '시침과 분침을 직접 움직여 목표 시각을 만들어 보세요.')}
    <div class="cols feature-cols">
      <section class="panel feature-art">
        <img src="${scenes.clock}" alt="시계 바늘을 움직이는 아이 그림" class="scene-image">
        <button class="btn dual-clock-cta" data-act="twoClocks">🕰️🕰️ 두 시계 비교 놀이 <span>두 시계의 시간 차이 계산하기 →</span></button>
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


function compareDuration(){
 const start=clockMod(compareStart),end=clockMod(compareEnd);
 return (end-start+720)%720;
}
function refreshCompare(){
 const total=compareDuration(),h=Math.floor(total/60),m=total%60;
 const result=document.getElementById('compareResult');
 if(result)result.innerHTML='<strong>'+h+'시간 '+m+'분</strong><span> = '+total+'분</span>';
 const startLabel=document.getElementById('compareStartLabel');
 const endLabel=document.getElementById('compareEndLabel');
 if(startLabel)startLabel.textContent=clockText(compareStart);
 if(endLabel)endLabel.textContent=clockText(compareEnd);
}
function twoClocksPage(){
 root.innerHTML=heading('🕰️ 시계 놀이터 · 두 시계 비교','두 시계를 움직여 시작 시각부터 끝 시각까지 얼마나 지났는지 알아봐요.')+
 '<section class="panel"><p class="muted">끝 시각이 시작 시각보다 앞서면 12시간제 시계의 다음 바퀴로 계산합니다. 하루 이상 걸린 시간은 이 놀이에서 다루지 않아요.</p>'+
 '<div class="two-clocks">'+
 compareClockBlock('Start','시작 시각',compareStart,'compareStart')+
 compareClockBlock('End','끝 시각',compareEnd,'compareEnd')+
 '</div><div id="compareResult" class="compare-result" aria-live="polite"></div>'+
 '<div class="actions center">'+menuButton('예시: 9시 20분 → 10시 35분','sampleCompare','secondary')+
 menuButton('5분 추가','comparePlus5','secondary')+menuButton('학습 메뉴','menu','secondary')+'</div></section>';
 hookClocks();refreshCompare();
}
function compareClockBlock(id,title,time,context){
 return '<div class="compare-clock-card"><h3>'+title+'</h3><div class="clock-box">'+renderClockSVG(time,{interactive:true,context})+'</div>'+
 '<strong id="compare'+id+'Label" class="time-big">'+clockText(time)+'</strong>'+
 '<div class="controls-row"><label class="mini-field">시 <input type="number" min="1" max="12" id="compare'+id+'Hour" value="'+clockHour(time)+'"></label>'+
 '<label class="mini-field">분 <input type="number" min="0" max="59" id="compare'+id+'Minute" value="'+clockMinute(time)+'"></label></div></div>';
}
function converterPage(){
 root.innerHTML=heading('⏳ 시간·분 변환 놀이터','시간과 분을 직접 입력하고 전체 몇 분인지 살펴보세요.')+
 '<section class="panel convert-panel"><div class="conversion-illustration">⏰ ✨ 🧮</div><h3>시간 + 분 → 전체 분</h3>'+
 '<div class="controls-row"><label class="mini-field">시간 <input id="converterHours" type="number" min="0" max="48" value="'+converterHours+'"></label>'+
 '<label class="mini-field">분 <input id="converterMinutes" type="number" min="0" max="59" value="'+converterMinutes+'"></label></div>'+
 '<div class="conversion-result" id="toMinutesResult"></div>'+
 '<hr><h3>전체 분 → 몇 시간 몇 분</h3>'+
 '<div class="controls-row"><label class="mini-field">전체 분 <input id="converterTotal" type="number" min="0" max="2880" value="'+converterTotal+'"></label></div>'+
 '<div class="conversion-result" id="toHoursResult"></div>'+
 '<div class="actions center">'+menuButton('예시: 85분','convert85','secondary')+menuButton('예시: 2시간','convert120','secondary')+menuButton('학습 메뉴','menu','secondary')+'</div></section>';
 refreshConverter();
}
function refreshConverter(){
 const a=document.getElementById('toMinutesResult'),b=document.getElementById('toHoursResult');
 if(a)a.textContent=converterHours+'시간 '+converterMinutes+'분 = '+(converterHours*60+converterMinutes)+'분';
 if(b)b.textContent=converterTotal+'분 = '+Math.floor(converterTotal/60)+'시간 '+(converterTotal%60)+'분';
}

function questionPrompt(content){
  return `<div class="question-prompt">${content}</div>`;
}


function uniqueClockOptions(answer, step=5){
  const canonical=clockMod(answer), vals=[canonical];
  for(const d of [step,-step,2*step,-2*step,60,-60,15,-15,30,-30,120]){
    const x=clockMod(canonical+d);
    if(!vals.includes(x))vals.push(x);
    if(vals.length===4)break;
  }
  return shuffle(vals);
}
function makeReadQuestion(level){
 const minutePools=[[0,30],[0,5,10,15,20,25,30,35,40,45,50,55],[5,10,15,20,25,30,35,40,45,50,55],[2,7,12,18,23,28,36,43,54]];
 const minute=pick(minutePools[Math.min(level,3)]);
 const answer=clockMod(rand(1,12)*60+minute);
 return {kind:'read',prompt:'시계를 보고 알맞은 시각을 골라 보세요!',time:answer,answer,options:uniqueClockOptions(answer,level===3?1:5),hinted:false,solved:false};
}
function makeSetQuestion(level){
 const minutePools=[[0,30],[0,5,10,15,20,25,30,35,40,45,50,55],[5,10,15,20,25,30,35,40,45,50,55],[2,7,12,18,23,28,36,43,54]];
 const target=clockMod(rand(1,12)*60+pick(minutePools[Math.min(level,3)]));
 return {kind:'set',prompt:'시침과 분침을 움직여 보세요!',target,answer:target,userMinutes:clockMod(rand(1,12)*60),hinted:false,solved:false};
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
  const correct = q.kind === 'set' || q.kind === 'read' ? clockMod(value) === clockMod(q.answer) : value === q.answer;
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
    missions: adventureStories.map((story, i) => createAdventureMission(story, i, adventureMode))
  };
}


function createAdventureMission(story,index,mode='duration'){
 const category=mode==='before'?2:mode==='unit'?3:1;
 const minuteChoices=[10,15,20,25,30,35,40,45,50,55];
 const start=rand(7,17)*60+pick([0,10,15,20,25,30,40,45,50]);
 const amount=pick(minuteChoices);
 const end=start+amount;
 let type,answer,prompt,options;
 if(category===0){
  type='end';answer=end;
  prompt=sayTime(start)+'에 출발했어요. '+amount+'분 뒤에는 몇 시 몇 분일까요?';
  options=shuffle([answer,answer+10,answer-10,answer+20]);
 }else if(category===1){
  type='duration';answer=amount;
  prompt=sayTime(start)+'에 시작해 '+sayTime(end)+'에 끝났어요. 걸린 시간은 몇 분일까요?';
  options=shuffle([amount,amount+10,Math.max(5,amount-10),amount+20]);
 }else if(category===2){
  type='before';answer=start-amount;
  prompt=sayTime(start)+'보다 '+amount+'분 전은 몇 시 몇 분일까요?';
  options=shuffle([answer,answer+10,answer-10,answer+20]);
 }else{
  type='unit';
  const variant=rand(0,2);
  if(variant===0){
   answer=60+amount;
   prompt='1시간 '+amount+'분은 모두 몇 분일까요?';
   options=shuffle([answer,amount,answer+10,answer-10]);
  }else if(variant===1){
   answer=120;
   prompt='2시간은 모두 몇 분일까요?';
   options=shuffle([120,60,90,100]);
  }else{
   const all=60+amount;
   answer='1시간 '+amount+'분';
   prompt=all+'분을 몇 시간 몇 분으로 나타내면?';
   options=shuffle([answer,'1시간 '+(amount+10)+'분',amount+'분','2시간 '+amount+'분']);
  }
 }
 const unique=[...new Set(options)];
 let v=1;
 while(unique.length<4){const candidate=typeof answer==='number'?answer+(v++*5):answer+' ('+(v++)+')';if(!unique.includes(candidate))unique.push(candidate);}
 return {...story,type,start,amount,end,prompt,answer,options:shuffle(unique.slice(0,4)),hinted:false,solved:false};
}

function adventurePage(){
  if(!adventureSession) adventureSession = buildAdventureSession();
  const mission = adventureSession.missions[adventureSession.index];
  const progress = (adventureSession.index / adventureSession.missions.length) * 100;
  root.innerHTML = `
    ${heading(adventureMode==='before'?'⏪ 몇 시 몇 분 전':adventureMode==='unit'?'⏳ 시간 단위 변환':'⏱️ 걸린 시간','그림을 보고 문제를 읽은 뒤 알맞은 답을 골라 보세요!')}
    <section class="panel adventure-panel">
      <div class="row spread"><span class="pill">${mission.icon} ${mission.title}</span><strong>${adventureSession.index + 1} / ${adventureSession.missions.length} 미션</strong></div>
      <div class="progress"><span style="width:${progress}%"></span></div>
      <img src="${mission.image}" alt="${mission.title} 그림" class="adventure-image">
      <div class="mission-story-box">
        <h3>${mission.theme}</h3>
        <div class="question mission-question">${mission.prompt}</div>
      </div>
      <div class="choices mission-choices">
        ${mission.options.map((opt, idx) => `<button class="choice choice-big" data-adventure-choice="${idx}">${['end','before'].includes(mission.type) ? sayTime(opt) : mission.type==='unit'&&typeof opt==='string'?opt:opt+'분'}</button>`).join('')}
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
  const msg = mission.type === 'end' ? '시작 시각에 분을 더해 보세요. 60분이 되면 1시간이 늘어요.' : mission.type === 'duration' ? '시작부터 끝까지 몇 분인지 세어 보세요.' : mission.type === 'before' ? '시계 바늘을 거꾸로 움직이는 것을 생각해 보세요.' : '1시간은 60분이에요.';
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
    record(adventureMode==='before'?'몇 시 몇 분 전':adventureMode==='unit'?'시간 단위 변환':'걸린 시간', true, mission.hinted, mission.hinted ? 1 : 2);
    document.getElementById('advFeedback').innerHTML = quizCorrectMessage(['end','before'].includes(mission.type) ? `정답은 ${sayTime(mission.answer)}이에요!` : typeof mission.answer==='string'?`정답은 ${mission.answer}이에요!`:`정답은 ${mission.answer}분이에요!`);
    autoNextTimer = setTimeout(() => {
      clearAuto();
      adventureSession.index += 1;
      if(adventureSession.index >= adventureSession.missions.length) finishAdventure();
      else adventurePage();
    }, 1600);
  }else{
    record(adventureMode==='before'?'몇 시 몇 분 전':adventureMode==='unit'?'시간 단위 변환':'걸린 시간', false, mission.hinted, 0);
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


function twelveHourLabel(h,m){
  // Spell out the noon and midnight boundaries for early learners.
  if(h===0) return m===0 ? '자정(밤 12시)' : '밤 12시 '+pad(m)+'분(자정 '+m+'분 뒤)';
  if(h===12) return m===0 ? '정오(낮 12시)' : '낮 12시 '+pad(m)+'분';
  const prefix=h<12?'오전':'오후';
  return prefix+' '+(h%12)+'시 '+pad(m)+'분';
}
function twentyFourLabel(h,m){return pad(h) + ':' + pad(m);}
function buildFormatSession(){
 const questions=[];
 for(let i=0;i<12;i++){
   const level=i%3;
   const special=[0,12,1,11,13,23];
   const h=i<6?special[i]:rand(0,23);
   const m=pick([0,10,15,20,30,40,45,50]);
   const options=[];
   let answer,prompt,hint;
   if(level===0){
     answer=twentyFourLabel(h,m);
     prompt=twelveHourLabel(h,m)+'을 24시간제로 바꾸면?';
     hint='오전 1~11시는 그대로 쓰고, 오후 1~11시는 12를 더해요. 자정은 00시, 정오는 12시예요.';
     for(let d of [0,1,-1,12,-12,2,11]){const v=twentyFourLabel((h+d+24)%24,m);if(!options.includes(v))options.push(v);if(options.length===4)break;}
   }else if(level===1){
     answer=twelveHourLabel(h,m);
     prompt=twentyFourLabel(h,m)+'를 오전·오후로 나타내면?';
     hint='00시는 밤 12시(자정), 12시는 낮 12시(정오)로 읽어요. 다른 시각은 오전·오후를 구별해요.';
     for(const dh of [0,12,1,-1,11,2]){
       const label=twelveHourLabel((h+dh+24)%24,m);
       if(!options.includes(label))options.push(label);
       if(options.length===4)break;
     }
   }else{
     answer=h<12?'오전':'오후';
     prompt=twentyFourLabel(h,m)+'는 오전일까요, 오후일까요?';
     hint='자정은 하루가 시작되는 밤 12시, 정오는 한낮의 12시예요. 그 사이가 오전, 정오 뒤가 오후예요.';
     options.push('오전','오후','정오','자정');
     if(h===0&&m===0) {answer='자정';prompt='24시간제 00:00은 무엇일까요?';}
     if(h===12&&m===0){answer='정오';prompt='24시간제 12:00은 무엇일까요?';}
   }
   questions.push({prompt,answer,options:shuffle(options),hint,solved:false,hinted:false});
 }
 return {index:0,correct:0,questions};
}
function formatPage(){
 if(!formatSession)formatSession=buildFormatSession();
 const q=formatSession.questions[formatSession.index];
 root.innerHTML=heading('🌞 오전·오후와 24시간','12시간제와 24시간제를 구분하고 서로 바꿔 봐요!')+
 '<section class="panel format-panel"><div class="row spread"><span class="pill">🌞🌙 시간 변환 탐험</span><strong>'+(formatSession.index+1)+' / 12 문제</strong></div>'+
 '<div class="progress"><span style="width:'+(formatSession.index/12*100)+'%"></span></div>'+
 '<div class="format-visual"><div class="format-sun">☀️<small>오전</small></div><div class="format-display">'+esc(q.prompt)+'</div><div class="format-moon">🌙<small>오후</small></div></div>'+
 '<div class="choices format-choices">'+q.options.map((v,i)=>'<button class="choice" data-format-choice="'+i+'">'+esc(v)+'</button>').join('')+'</div>'+
 '<div class="actions center">'+menuButton('💡 힌트','hintFormat','secondary small')+menuButton('학습 메뉴','menu','secondary small')+'</div><div id="formatFeedback" aria-live="polite"></div></section>';
}
function showFormatHint(){const q=formatSession.questions[formatSession.index];q.hinted=true;document.getElementById('formatFeedback').innerHTML='<div class="hint">💡 '+esc(q.hint)+'</div>';}
function answerFormat(i){
 const q=formatSession.questions[formatSession.index];
 if(q.solved)return;
 if(q.options[i]===q.answer){
  q.solved=true;formatSession.correct++;
  record('오전·오후와 24시간',true,q.hinted,q.hinted?1:2);
  document.getElementById('formatFeedback').innerHTML='<div class="feedback success-box">🎉 정답이에요! '+esc(q.answer)+'<br><span class="smalltext">다음 문제로 이동해요.</span></div>';
  autoNextTimer=setTimeout(()=>{clearAuto();formatSession.index++;if(formatSession.index===12)finishFormat();else formatPage();},1500);
 }else{
  record('오전·오후와 24시간',false,q.hinted,0);
  document.getElementById('formatFeedback').innerHTML='<div class="feedback warn">아쉬워요! 오전과 오후를 한 번 더 살펴보세요.</div>';
 }
}
function finishFormat(){
 root.innerHTML=heading('🎉 시간 변환 탐험 완료!',formatSession.correct+' / 12문제 정답')+
 '<div class="panel" style="text-align:center"><div style="font-size:76px">🏆⏰</div><h2>오전·오후 시간 박사!</h2><p>자정과 정오도 다시 기억해 봐요.</p>'+
 '<div class="actions center">'+menuButton('다시 풀기','restartFormat')+menuButton('학습 기록','result','secondary')+menuButton('학습 메뉴','menu','secondary')+'</div></div>';
}

function resultPage(){
  const attempts = state.attempts;
  const totalCorrect = attempts.filter(a => a.correct).length;
  const noHint = attempts.filter(a => a.correct && !a.hinted).length;
  const total = attempts.length;
  const groups = ['시계 퀴즈','몇 시 몇 분 전','걸린 시간','시간 단위 변환','오전·오후와 24시간'].map(name => {
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
    case 'twoClocks': twoClocksPage(); break;
    case 'convertplay': converterPage(); break;
    case 'quiz': quizPage(); break;
    case 'adventure': adventurePage(); break;
    case 'format': formatPage(); break;
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
    case 'convertplay': setView('convertplay'); break;
    case 'twoClocks': setView('twoClocks'); break;
    case 'sampleCompare': compareStart=9*60+20;compareEnd=10*60+35;twoClocksPage();break;
    case 'comparePlus5':compareEnd=clockMod(compareEnd+5);twoClocksPage();break;
    case 'convert85': converterHours=1;converterMinutes=25;converterTotal=85;converterPage();break;
    case 'convert120': converterHours=2;converterMinutes=0;converterTotal=120;converterPage();break;
    case 'quiz': quizSession = null; setView('quiz'); break;
    case 'adventure': adventureMode='duration';adventureSession = null; setView('adventure'); break;
    case 'duration': adventureMode='duration';adventureSession=null;setView('adventure');break;
    case 'before': adventureMode='before';adventureSession=null;setView('adventure');break;
    case 'unit': adventureMode='unit';adventureSession=null;setView('adventure');break;
    case 'format': formatSession = null; setView('format'); break;
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
    case 'hintFormat': showFormatHint(); break;
    case 'restartFormat': formatSession=null; setView('format'); break;
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
  const formatChoice = event.target.closest('[data-format-choice]');
  if(formatChoice && formatSession){ answerFormat(Number(formatChoice.dataset.formatChoice)); return; }
  const advChoice = event.target.closest('[data-adventure-choice]');
  if(advChoice && adventureSession){
    adventureAnswer(Number(advChoice.dataset.adventureChoice));
    return;
  }
  const actionButton = event.target.closest('[data-act]');
  if(actionButton) handleAction(actionButton.dataset.act);
});

root.addEventListener('input', (event) => {
  if(['compareStartHour','compareStartMinute','compareEndHour','compareEndMinute'].includes(event.target.id)){
    const isStart=event.target.id.includes('Start');const id=isStart?'Start':'End';
    const hv=document.getElementById('compare'+id+'Hour').value;
    const mv=document.getElementById('compare'+id+'Minute').value;
    const h=Number(hv),m=Number(mv);
    if(!Number.isInteger(h)||h<1||h>12||!Number.isInteger(m)||m<0||m>59)return;
    const value=clockMod((h%12)*60+m);
    if(isStart)compareStart=value;else compareEnd=value;
    const svg=document.querySelector('[data-clock-context="compare'+id+'"]');
    if(svg)updateClockDom(svg,value,'compare'+id);
    return;
  }
  if(['converterHours','converterMinutes','converterTotal'].includes(event.target.id)){
    const h=document.getElementById('converterHours'),m=document.getElementById('converterMinutes'),t=document.getElementById('converterTotal');
    const values=[Number(h.value),Number(m.value),Number(t.value)];
    if(values.some(v=>!Number.isInteger(v)||v<0))return;
    if(values[0]>48||values[1]>59||values[2]>2880)return;
    [converterHours,converterMinutes,converterTotal]=values;refreshConverter();return;
  }
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