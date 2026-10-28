(()=>{
 const KEY='stone-garden-scores-v1',levels=['easy','medium','hard'];
 const blank=()=>({played:0,wins:0,losses:0,draws:0,streak:0,best:0});
 let saved=true,state;try{state=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
 if(!state||state.version!==1)state={version:1,stats:Object.fromEntries(levels.map(l=>[l,blank()])),ids:[],queue:[],nickname:'',token:(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(20)),x=>x.toString(16).padStart(2,'0')).join(''))};
 const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));saved=true}catch{saved=false}};
 let submitMessage='';
 const latestRound=()=>window.StoneGardenLastRound?.()||state.lastRound;
 function queueRound(data){if(!data||data.mode!=='computer'||data.assisted)return false;if(!state.queue.some(x=>x.game===data.game))state.queue.push({game:data.game,level:data.level,result:data.result,moves:data.moves});persist();return true}
 let level='easy',tab='personal',loading=false,onlineRows=[],onlineError='',syncing=false,requestId=0;
 const button=document.createElement('button');button.className='help-button';button.textContent='♜ Leaderboard';button.id='openScores';button.setAttribute('aria-haspopup','dialog');document.querySelector('.title-help').append(button);
 const dialog=document.createElement('dialog');dialog.id='scoresDialog';dialog.setAttribute('aria-labelledby','scoresTitle');
 dialog.innerHTML='<form method="dialog"><button class="close-rules" aria-label="Close leaderboard">✕</button></form><span class="eyebrow">STONE GARDEN</span><h2 id="scoresTitle">The garden records</h2><div class="seg scores-tabs"><button id="personalScores">My stats</button><button id="onlineScores">Online</button></div><label for="scoreLevel">Difficulty</label><select id="scoreLevel"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><div id="scoreContent" aria-live="polite"></div><p id="scoreNotice" class="tiny"></p>';
 document.body.append(dialog);const $=id=>document.getElementById(id);
 function cell(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
 function paint(){
  $('personalScores').classList.toggle('active',tab==='personal');$('onlineScores').classList.toggle('active',tab==='online');$('scoreLevel').value=level;
  const root=$('scoreContent');root.replaceChildren();
  if(tab==='personal'){
   const stats=state.stats[level]||blank(),grid=document.createElement('div');grid.className='score-grid';
   for(const [label,n]of [['Wins',stats.wins],['Losses',stats.losses],['Draws',stats.draws],['Played',stats.played],['Current streak',stats.streak],['Best streak',stats.best]]){const box=document.createElement('div');box.append(cell('strong',n),cell('span',label));grid.append(box)}root.append(grid);
   root.append(cell('p','Computer rounds on this device. Hints and undo are allowed in personal stats. A draw or loss resets your win streak.'));
  }else{
   const note=cell('p','Community standings · most wins, then fewest losses. Only finished computer rounds without hints or undo are submitted.');note.className='tiny';root.append(note);
   if(loading)root.append(cell('p','Loading the garden records…'));
   else if(onlineError)root.append(cell('p',onlineError));
   else if(!onlineRows.length)root.append(cell('p','No wins recorded at this difficulty yet. Be the first!'));
   else{const table=document.createElement('table');table.className='scores-table';const head=document.createElement('tr');for(const title of ['Rank','Player','Wins','Losses','Draws'])head.append(cell('th',title));const thead=document.createElement('thead');thead.append(head);table.append(thead);const body=document.createElement('tbody');onlineRows.forEach((row,i)=>{const tr=document.createElement('tr');for(const value of [i+1,row.nickname,row.wins,row.losses,row.draws])tr.append(cell('td',value));body.append(tr)});table.append(body);const wrap=document.createElement('div');wrap.className='scores-scroll';wrap.append(table);root.append(wrap)}
   const form=document.createElement('form');form.className='score-join';const label=cell('label','Your public nickname');label.htmlFor='scoreNickname';const input=document.createElement('input');input.id='scoreNickname';input.name='nickname';input.maxLength=20;input.minLength=2;input.required=true;input.autocomplete='nickname';input.value=state.nickname;input.placeholder='e.g. JadeFox';
   const info=cell('p','Joining shares your nickname and future unassisted round results on this public board. No account or email needed. Your identity is saved on this device.');info.className='tiny';const join=cell('button',state.nickname?'Save nickname':'Join online leaderboard');join.type='submit';join.className='primary';form.append(label,input,info,join);
   form.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(!/^[\p{L}\p{N} _-]{2,20}$/u.test(name)){input.setCustomValidity('Use 2–20 letters, numbers, spaces, underscores or hyphens.');input.reportValidity();return}input.setCustomValidity('');state.nickname=name;submitMessage='Joined as '+name+'. You can now submit your latest eligible round.';persist();paint();sync()};input.oninput=()=>input.setCustomValidity('');root.append(form);
   if(state.nickname){
     const joined=cell('p','Joined as '+state.nickname);root.append(joined);
     const last=latestRound(),eligible=last&&last.mode==='computer'&&!last.assisted;
     const send=cell('button',eligible?'Submit latest round ('+last.level+')':'Play a round to submit a score');send.className='primary';send.type='button';send.disabled=!eligible||syncing;
     send.onclick=()=>{queueRound(latestRound());submitMessage='Submitting your latest round…';paint();sync()};root.append(send);
     if(last?.assisted)root.append(cell('p','Your latest round used a hint or undo, so it counts only in My stats.'));
     if(state.queue.length){const retry=cell('button','Retry pending submissions');retry.className='end-view';retry.onclick=()=>sync();root.append(retry)}
   }
   if(submitMessage){const message=cell('p',submitMessage);message.setAttribute('role','status');root.append(message)}
   if(state.nickname){const leave=cell('button','Stop sharing future games');leave.className='end-view';leave.onclick=()=>{state.nickname='';state.queue=[];persist();paint()};root.append(leave)}
   const refresh=cell('button','Refresh standings');refresh.className='end-view';refresh.onclick=loadOnline;root.append(refresh);
  }
  $('scoreNotice').textContent=!saved?'Storage is unavailable. Personal stats last only while this page stays open.':state.queue.length?state.queue.length+' online result(s) waiting to sync. Personal stats are saved.':'Personal stats save on this device and work offline. Same-screen friend rounds are not ranked.';
 }
 async function loadOnline(){const id=++requestId;loading=true;onlineError='';paint();try{const r=await fetch('/api/leaderboard?level='+level,{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.rows))throw Error();if(id!==requestId)return;onlineRows=data.rows;loading=false;paint()}catch{if(id!==requestId)return;loading=false;onlineError=navigator.onLine?'The online board is temporarily unavailable. Your personal stats still work.':'You’re offline. Personal stats are available, and joined games will sync when you reconnect.';paint()}}
 async function sync(){
  if(syncing||!state.nickname||!state.queue.length)return;if(!navigator.onLine){submitMessage='You’re offline. Your result is saved here and will sync when you reconnect.';if(dialog.open)paint();return;}syncing=true;
  try{while(state.nickname&&state.queue.length&&navigator.onLine){const game=state.queue[0];let r;try{r=await fetch('/api/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...game,token:state.token,nickname:state.nickname})})}catch{submitMessage='Could not connect. Your result is saved on this device. Tap Retry when online.';break}
    if(!r.ok){let reason;try{reason=(await r.json()).error}catch{}submitMessage=reason||'Submission failed. Your result is kept here so you can retry.';break}
    const ack=await r.json();submitMessage=ack.duplicate?'This round was already saved—your score has not been counted twice.':'Round saved online! Only players with a win appear in the standings.';
    state.queue=state.queue.filter(x=>x.game!==game.game);persist();if(dialog.open)paint();if(state.queue.length)await new Promise(r=>setTimeout(r,1700));
  }}finally{syncing=false;if(dialog.open&&tab==='online')loadOnline()}
 }
 window.StoneScores={record(data){
  if(data.mode!=='computer'||!levels.includes(data.level)||state.ids.includes(data.game))return;
  state.lastRound={...data};
  const stats=state.stats[data.level]??=blank();stats.played++;stats[data.result==='win'?'wins':data.result==='loss'?'losses':'draws']++;stats.streak=data.result==='win'?stats.streak+1:0;stats.best=Math.max(stats.best,stats.streak);state.ids.push(data.game);state.ids=state.ids.slice(-2000);
  if(state.nickname&&!data.assisted&&data.moves.length<=512){state.queue.push({game:data.game,level:data.level,result:data.result,moves:data.moves});state.queue=state.queue.slice(-100)}persist();if(dialog.open)paint();sync();
 }};
 button.onclick=()=>{level=document.getElementById('difficulty').value;paint();dialog.showModal();if(tab==='online')loadOnline()};$('personalScores').onclick=()=>{tab='personal';requestId++;paint()};$('onlineScores').onclick=()=>{tab='online';loadOnline()};$('scoreLevel').onchange=e=>{level=e.target.value;if(tab==='online')loadOnline();else paint()};dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});window.addEventListener('online',sync);persist();sync();
})();
