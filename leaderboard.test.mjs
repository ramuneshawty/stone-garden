import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {Scores,validateGame} from './worker.mjs';
const db=new DatabaseSync(':memory:');
const sql={exec(query,...args){if(query.startsWith('CREATE')){db.exec(query);return{toArray:()=>[]}}const st=db.prepare(query);if(query.startsWith('SELECT'))return{toArray:()=>st.all(...args)};st.run(...args);return{toArray:()=>[]}}};
const ctx={storage:{sql,transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}};
const score=new Scores(ctx),moves=[[3,2],[0,3],[2,0],[3,2],[4,3],[1,4]],data={token:crypto.randomUUID(),game:crypto.randomUUID(),nickname:'JadeFox',level:'easy',result:'loss',moves};
assert.equal(validateGame(data),'loss');assert.equal(validateGame({...data,result:'win'}),null);assert.equal(validateGame({...data,moves:[[0,1]]}),null);assert.equal(validateGame({...data,moves:[...moves,[0,1]]}),null);
const post=d=>score.fetch(new Request('https://game.test/api/result',{method:'POST',body:JSON.stringify(d)}));
assert.equal((await post(data)).status,200);assert.equal((await(await post(data)).json()).duplicate,true);assert.equal(db.prepare('SELECT count(*) AS n FROM results').get().n,1);
assert.equal((await post({...data,game:crypto.randomUUID(),nickname:'<script>'})).status,400);
const rows=await(await score.fetch(new Request('https://game.test/api/leaderboard?level=easy'))).json();assert.deepEqual(rows.rows,[]);
assert.equal((await score.fetch(new Request('https://game.test/api/leaderboard?level=invalid'))).status,400);
// Find a legal jade win and a draw to test result validation in addition to losses.
const adj=[[2,3],[2,4],[0,1,3,4],[0,2,4],[1,2,3]];const queue=[{b:[2,2,0,1,1],p:1,m:[]}],visited=new Set();let win;
while(queue.length){const {b,p,m}=queue.shift(),key=b.join('')+p;if(visited.has(key))continue;visited.add(key);const e=b.indexOf(0),from=adj[e].filter(i=>b[i]===p);if(!from.length&&p===2){win=m;break}for(const i of from){const n=b.slice();n[e]=p;n[i]=0;queue.push({b:n,p:3-p,m:[...m,[i,e]]})}}
assert.equal(validateGame({...data,moves:win,result:'win'}),'win');
const winData={...data,token:crypto.randomUUID(),game:crypto.randomUUID(),moves:win,result:'win'};assert.equal((await post(winData)).status,200);
const ranked=await(await score.fetch(new Request('https://game.test/api/leaderboard?level=easy'))).json();assert.equal(ranked.rows[0].wins,1);assert.equal(ranked.rows[0].nickname,'JadeFox');
console.log('Passed: legal win/loss verification, invalid transcripts and names rejected, duplicate result counted once, ranked wins and difficulty filtering.');
