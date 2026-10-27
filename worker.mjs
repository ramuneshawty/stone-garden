const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const levels=['easy','medium','hard'];
export function validateGame(data){
 if(!data||!levels.includes(data.level)||!Array.isArray(data.moves)||data.moves.length<4||data.moves.length>512||!/^[-a-zA-Z0-9]{20,80}$/.test(data.game||''))return null;
 const adj=[[2,3],[2,4],[0,1,3,4],[0,2,4],[1,2,3]];let b=[2,2,0,1,1],p=1,result=null;const seen=new Map();
 // Repetition keys include the side to move, matching the browser game.
 seen.set(b.join('')+p,1);
 for(const move of data.moves){
  if(result||!Array.isArray(move)||move.length!==2)return null;
  const [from,to]=move;if(!Number.isInteger(from)||!Number.isInteger(to)||!adj[from]?.includes(to)||b[from]!==p||b[to]!==0)return null;
  b[to]=p;b[from]=0;p=3-p;const k=b.join('')+p;seen.set(k,(seen.get(k)||0)+1);
  const empty=b.indexOf(0);if(!adj[empty].some(i=>b[i]===p))result=p===2?'win':'loss';else if(seen.get(k)>=3)result='draw';
 }
 return result===data.result?result:null;
}
export default {async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!env.SCORES)return json({error:'Online leaderboard is not configured.'},503);
 if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin.'},403);
 if(Number(request.headers.get('Content-Length'))>24000)return json({error:'Request too large.'},413);
 try{return await env.SCORES.get(env.SCORES.idFromName('community-v1')).fetch(request)}catch{return json({error:'Online leaderboard temporarily unavailable.'},503)}
}};
export class Scores {
 constructor(ctx){this.ctx=ctx;this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, nickname TEXT NOT NULL)');this.sql.exec('CREATE TABLE IF NOT EXISTS results (game TEXT PRIMARY KEY, player TEXT NOT NULL, level TEXT NOT NULL, result TEXT NOT NULL, created INTEGER NOT NULL)');this.sql.exec('CREATE INDEX IF NOT EXISTS player_results ON results(player, level, created)')}
 async fetch(request){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/api/leaderboard'){
   const level=url.searchParams.get('level');if(!levels.includes(level))return json({error:'Choose a difficulty.'},400);
   const rows=this.sql.exec("SELECT p.nickname, SUM(CASE WHEN r.result='win' THEN 1 ELSE 0 END) AS wins, SUM(CASE WHEN r.result='loss' THEN 1 ELSE 0 END) AS losses, SUM(CASE WHEN r.result='draw' THEN 1 ELSE 0 END) AS draws FROM results r JOIN players p ON r.player=p.id WHERE r.level=? GROUP BY p.id HAVING SUM(CASE WHEN r.result='win' THEN 1 ELSE 0 END)>0 ORDER BY wins DESC, losses ASC, p.nickname ASC LIMIT 25",level).toArray();return json({rows});
  }
  if(request.method!=='POST'||url.pathname!=='/api/result')return json({error:'Not found.'},404);
  let text=await request.text();if(text.length>24000)return json({error:'Request too large.'},413);
  let data;try{data=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}
  if(!/^[-a-zA-Z0-9]{32,80}$/.test(data.token||'')||typeof data.nickname!=='string'||! /^[\p{L}\p{N} _-]{2,20}$/u.test(data.nickname.trim()))return json({error:'Use a nickname of 2–20 letters, numbers, spaces, underscores or hyphens.'},400);
  const result=validateGame(data);if(!result)return json({error:'This game could not be verified.'},400);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data.token));const id=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  return this.ctx.storage.transactionSync(()=>{
   const prior=this.sql.exec('SELECT player FROM results WHERE game=?',data.game).toArray()[0];if(prior)return prior.player===id?json({ok:true,duplicate:true}):json({error:'Game already submitted.'},409);
   const latest=this.sql.exec('SELECT created FROM results WHERE player=? ORDER BY created DESC LIMIT 1',id).toArray()[0];if(latest&&Date.now()-latest.created<1500)return json({error:'Please wait a moment before submitting another round.'},429);
   this.sql.exec('INSERT INTO players(id,nickname) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET nickname=excluded.nickname',id,data.nickname.trim());
   this.sql.exec('INSERT INTO results(game,player,level,result,created) VALUES (?,?,?,?,?)',data.game,id,data.level,result,Date.now());return json({ok:true});
  });
 }
}
