const adj=[[2,3],[2,4],[0,1,3,4],[0,2,4],[1,2,3]], coords=[[20,20],[80,20],[50,50],[20,80],[80,80]], names=['top left','top right','center','bottom left','bottom right'];
function legal(b,p){const e=b.indexOf(0);return adj[e].filter(i=>b[i]===p).map(i=>[i,e])}function next(b,m){const c=b.slice();c[m[1]]=c[m[0]];c[m[0]]=0;return c}function key(b,p){return b.join('')+p}
// Solve the complete position graph by retrograde analysis; unresolved states are draws.
const states=new Map();for(let e=0;e<5;e++)for(let a=0;a<5;a++)for(let c=a+1;c<5;c++){if(a===e||c===e)continue;let b=Array(5).fill(2);b[e]=0;b[a]=b[c]=1;for(let p=1;p<=2;p++)states.set(key(b,p),{b,p,v:null});}let changed=true;while(changed){changed=false;for(const s of states.values()){if(s.v!==null)continue;let ms=legal(s.b,s.p),vs=ms.map(m=>states.get(key(next(s.b,m),3-s.p)).v);if(!ms.length||vs.every(v=>v===1)){s.v=-1;changed=true}else if(vs.includes(-1)){s.v=1;changed=true}}}
function best(b,p){let ms=legal(b,p);const score=m=>-(states.get(key(next(b,m),3-p)).v??0);let max=Math.max(...ms.map(score));return ms.filter(m=>score(m)===max)}
let animating=false;let b,p,selected,history,seen,ended,mode='computer',timer=null,hintNode=-1;const $=id=>document.getElementById(id);const buttons=coords.map(([x,y],i)=>{let el=document.createElement('button');el.className='node';el.style.left=x+'%';el.style.top=y+'%';el.onclick=()=>tap(i);$('board').append(el);return el});
function reset(){clearTimeout(timer);b=[2,2,0,1,1];p=1;selected=-1;history=[];seen=[key(b,p)];ended='';hintNode=-1;render()}
function render(){buttons.forEach(el=>el.getAnimations().forEach(a=>a.cancel()));const ms=legal(b,p),ai=mode==='computer'&&p===2&&!ended;buttons.forEach((el,i)=>{el.className='node'+(b[i]?' stone '+(b[i]===1?'jade':'ivory'):'')+(selected===i?' selected':'')+(selected>=0&&ms.some(m=>m[0]===selected&&m[1]===i)?' legal':'')+(hintNode===i?' hint':'');el.setAttribute('aria-label',names[i]+': '+(b[i]===1?'jade stone':b[i]===2?'ivory stone':'empty'));el.disabled=!!ended||ai});$('moves').textContent='MOVE '+String(history.length+1).padStart(2,'0');$('turntag').textContent=ended?'GAME COMPLETE':(p===1?'JADE':'IVORY')+' TO MOVE';$('status').textContent=ended||(ai?'Thinking…':mode==='computer'?'Your turn':(p===1?'Jade':'Ivory')+'’s turn');$('detail').textContent=ended?(ended==='A peaceful draw'?'This position repeated three times. Try a new approach.':'Both opposing stones are blocked. Play another round?'):'Select a stone, then tap the glowing empty point.';$('message').textContent=ended|| (ai?'Ivory is considering the next move.':selected>=0?'Tap the glowing point to move.':'Choose '+(p===1?'a jade':'an ivory')+' stone.');$('undo').disabled=!history.length;$('hint').disabled=!!ended||ai;$('jadeLabel').textContent=mode==='computer'?'You · Jade':'Player 1 · Jade';$('ivoryLabel').textContent=mode==='computer'?'Computer · Ivory':'Player 2 · Ivory';$('difficultyWrap').hidden=mode!=='computer';renderEndScreen();}
function move(m,origin){const movingPlayer=p;history.push({b:b.slice(),p,seen:seen.slice()});b=next(b,m);p=3-p;selected=-1;hintNode=-1;seen.push(key(b,p));if(!legal(b,p).length)ended=(p===1?'Ivory':'Jade')+' wins';else if(seen.filter(k=>k===key(b,p)).length>=3)ended='A peaceful draw';render();animateMove(m,movingPlayer,origin);if(!ended&&mode==='computer'&&p===2){timer=setTimeout(()=>{let ms=$('difficulty').value==='casual'&&Math.random()<.32?legal(b,p):best(b,p);move(ms[Math.floor(Math.random()*ms.length)])},1000)}}
function tap(i){if(animating||ended||mode==='computer'&&p===2)return;if(b[i]===p){selected=selected===i?-1:i;hintNode=-1;render()}else if(!b[i]&&selected>=0){let m=legal(b,p).find(m=>m[0]===selected&&m[1]===i);if(m)move(m)}}
$('restart').onclick=reset;$('undo').onclick=()=>{clearTimeout(timer);let s=history.pop();if(mode==='computer'&&s.p===2&&history.length)s=history.pop();if(s){b=s.b;p=s.p;seen=s.seen;ended='';selected=-1;hintNode=-1;render()}};$('hint').onclick=()=>{if(animating)return;let m=best(b,p)[0];if(m){selected=m[0];hintNode=m[0];render();$('message').textContent='Try this stone. The glowing point is its destination.'}};for(const m of ['computer','friend'])$(m).onclick=()=>{mode=m;$(m).classList.add('active');$(m==='computer'?'friend':'computer').classList.remove('active');reset()};$('difficulty').onchange=reset;reset();

function animateMove(m,player,origin){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const stone=buttons[m[1]], board=$('board').getBoundingClientRect();
  const dx=origin?origin.x-board.left-coords[m[1]][0]*board.width/100:(coords[m[0]][0]-coords[m[1]][0])*board.width/100;
  const dy=origin?origin.y-board.top-coords[m[1]][1]*board.height/100:(coords[m[0]][1]-coords[m[1]][1])*board.height/100;
  animating=true; $('hint').disabled=true; stone.style.zIndex='2';
  const animation=stone.animate([
    {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`},
    {transform:'translate(-50%, -50%)'}
  ],{duration:380,easing:'cubic-bezier(.22, 1, .36, 1)'});
  const cleanup=()=>{stone.style.zIndex='';animating=false;$('hint').disabled=!!ended||(mode==='computer'&&p===2)};
  animation.onfinish=cleanup;animation.oncancel=cleanup;
}

/* Pointer dragging works with touch, pen and mouse; clicks keep tap-to-move. */
buttons.forEach((stone,i)=>{
  let drag=null, suppressUntil=0;
  const click=stone.onclick;
  stone.onclick=e=>{if(Date.now()<suppressUntil){e.preventDefault();return}click(e)};
  stone.style.touchAction='none';
  stone.addEventListener('pointerdown',e=>{
    if(!e.isPrimary||e.button!==0||animating||ended||b[i]!==p||(mode==='computer'&&p===2))return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,player:p,ghost:null};
    stone.setPointerCapture(e.pointerId);
  });
  stone.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(!drag.ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;
    if(!drag.ghost){
      selected=i;hintNode=-1;render();
      const g=stone.cloneNode(true);g.removeAttribute('aria-label');g.setAttribute('aria-hidden','true');g.tabIndex=-1;
      Object.assign(g.style,{position:'fixed',left:e.clientX+'px',top:e.clientY+'px',zIndex:'9999',pointerEvents:'none',margin:'0',outline:'none'});
      document.body.append(g);drag.ghost=g;stone.style.visibility='hidden';
    }
    drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';e.preventDefault();
  });
  function finish(e,cancelled){
    if(!drag||e.pointerId!==drag.id)return;
    const d=drag;drag=null;
    if(stone.hasPointerCapture(e.pointerId))stone.releasePointerCapture(e.pointerId);
    if(!d.ghost)return;
    suppressUntil=Date.now()+700;stone.style.visibility='';
    const rect=$('board').getBoundingClientRect();
    const candidate=legal(b,p).find(m=>m[0]===i&&Math.hypot(e.clientX-(rect.left+coords[m[1]][0]*rect.width/100),e.clientY-(rect.top+coords[m[1]][1]*rect.height/100))<=Math.max(30,Math.min(48,rect.width*.12)));
    if(!cancelled&&candidate&&d.player===p&&b[i]===p&&!ended&&!animating){
      d.ghost.remove();move(candidate,{x:e.clientX,y:e.clientY});return;
    }
    const home=stone.getBoundingClientRect();
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.ghost.remove();return}
    stone.style.visibility='hidden';
    const a=d.ghost.animate([{left:d.ghost.style.left,top:d.ghost.style.top},{left:(home.left+home.width/2)+'px',top:(home.top+home.height/2)+'px'}],{duration:180,easing:'ease-out',fill:'forwards'});
    const clean=()=>{stone.style.visibility='';d.ghost.remove()};a.onfinish=clean;a.oncancel=clean;
  }
  stone.addEventListener('pointerup',e=>finish(e,false));
  stone.addEventListener('pointercancel',e=>finish(e,true));
  stone.addEventListener('lostpointercapture',e=>{if(drag)finish(e,true)});
});
function renderEndScreen(){
  let screen=document.getElementById('endScreen');
  if(!screen){
    screen=document.createElement('div');screen.id='endScreen';screen.className='end-screen';screen.hidden=true;
    screen.innerHTML='<section class="end-card" role="dialog" aria-modal="false" aria-labelledby="endTitle"><span class="eyebrow">STONE GARDEN</span><div class="end-emblem" aria-hidden="true">石</div><h2 id="endTitle"></h2><p id="endSummary"></p><button class="primary" id="playAgain">↻ &nbsp; Play again</button><button class="end-view" id="viewBoard">View board</button></section>';
    document.querySelector('.arena').append(screen);
    document.getElementById('playAgain').onclick=()=>{reset();buttons[3].focus()};
    document.getElementById('viewBoard').onclick=()=>{screen.hidden=true;$('restart').focus()};
    screen.addEventListener('keydown',e=>{if(e.key==='Escape'){screen.hidden=true;$('restart').focus()}});
  }
  const wasHidden=screen.hidden;
  screen.hidden=!ended;
  if(ended){
    $('endTitle').textContent=ended==='A peaceful draw'?'A peaceful draw':mode==='computer'?(ended==='Jade wins'?'You win!':'Ivory wins') : ended;
    $('endSummary').textContent=ended==='A peaceful draw'?'A balanced game. Ready for another round?':mode==='computer'?(ended==='Jade wins'?'A clever trap. Your garden, your victory.':'A quiet lesson. Try a new path next round.'):'Both opposing stones are blocked. Ready to play again?';
    if(wasHidden)$('playAgain').focus({preventScroll:true});
  }
}
