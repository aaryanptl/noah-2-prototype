import fs from 'node:fs';
const D=JSON.parse(fs.readFileSync('output/analysis/dataset.json','utf8'));
const S=new Map(D.sessions.map(s=>[s.id,s]));
const ok=v=>v==='correct'; const pct=(a,b)=>b?Math.round(100*a/b):null; const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const key=new Map();
for(const q of D.questions){ const s=S.get(q.sid); if(!s||s.subject!=='math'||!q.fv||q.fv==='non_attempt'||!q.lo)continue; const k=s.student+'|'+q.lo; if(!key.has(k))key.set(k,new Map()); const m=key.get(k); if(!m.has(q.sid))m.set(q.sid,{mode:s.mode,t:new Date(s.started_at).getTime(),n:0,c:0}); const r=m.get(q.sid); r.n++; if(ok(q.fv))r.c++; }
const series=[]; for(const m of key.values()){ const a=[...m.values()].sort((x,y)=>x.t-y.t); if(a.length>=2)series.push(a); }
// 1. How well does each SOURCE mode predict the next DIAGNOSTIC measurement? (pairs: one source session -> next diagnostic on same LO)
console.log('Source mode → next diagnostic on same LO: MAE and mean bias (source acc - diagnostic acc)');
for(const src of ['diagnostic','homework','practice','placement']){ const err=[],bias=[]; for(const a of series){ for(let i=1;i<a.length;i++){ if(a[i].mode!=='diagnostic')continue; const p=a[i-1]; if(p.mode!==src||p.n<3||a[i].n<3)continue; const x=100*p.c/p.n,y=100*a[i].c/a[i].n; err.push(Math.abs(x-y)); bias.push(x-y);} } console.log('  ',src.padEnd(11),'MAE',mean(err).toFixed(1),'bias',mean(bias).toFixed(1),'n',err.length); }
// same but predicting next HOMEWORK (the workhorse), from each source
console.log('Source mode → next homework on same LO:');
for(const src of ['diagnostic','homework','practice']){ const err=[],bias=[]; for(const a of series){ for(let i=1;i<a.length;i++){ if(a[i].mode!=='homework')continue; const p=a[i-1]; if(p.mode!==src||p.n<3||a[i].n<3)continue; const x=100*p.c/p.n,y=100*a[i].c/a[i].n; err.push(Math.abs(x-y)); bias.push(x-y);} } console.log('  ',src.padEnd(11),'MAE',mean(err).toFixed(1),'bias',mean(bias).toFixed(1),'n',err.length); }
// 2. Decay: accuracy change vs gap in days between consecutive measurements (any mode, both >=3 q)
console.log('Gap between measurements → mean change in LO accuracy (next - prev):');
const gb={'0-1d':[], '2-7d':[], '8-21d':[], '22-45d':[], '46d+':[]};
for(const a of series){ for(let i=1;i<a.length;i++){ const p=a[i-1],c=a[i]; if(p.n<3||c.n<3)continue; const d=(c.t-p.t)/864e5; const b=d<=1?'0-1d':d<=7?'2-7d':d<=21?'8-21d':d<=45?'22-45d':'46d+'; gb[b].push(100*c.c/c.n-100*p.c/p.n); } }
for(const [b,v] of Object.entries(gb)) console.log('  ',b.padEnd(7),'Δ',mean(v).toFixed(1),'n',v.length);
// decay conditional on being high before (>=80): does a high score hold over time?
console.log('When previous LO acc >= 80 → P(next >= 80) by gap:');
const gb2={'0-1d':[], '2-7d':[], '8-21d':[], '22-45d':[], '46d+':[]};
for(const a of series){ for(let i=1;i<a.length;i++){ const p=a[i-1],c=a[i]; if(p.n<3||c.n<3||p.c/p.n<0.8)continue; const d=(c.t-p.t)/864e5; const b=d<=1?'0-1d':d<=7?'2-7d':d<=21?'8-21d':d<=45?'22-45d':'46d+'; gb2[b].push(c.c/c.n>=0.8?1:0); } }
for(const [b,v] of Object.entries(gb2)) console.log('  ',b.padEnd(7),pct(v.reduce((s,x)=>s+x,0),v.length)+'%','n',v.length);
// 3. Sanity: platform stored progress_student_lo score vs our cumulative first-response accuracy
{ const cum=new Map(); for(const [k,m] of key){ let c=0,n=0; for(const r of m.values()){c+=r.c;n+=r.n;} cum.set(k,{c,n}); } let d=[],n=0; for(const p of D.plo){ const x=cum.get(p.student+'|'+p.lo); if(!x||x.n<3||p.score==null)continue; d.push(+p.score-100*x.c/x.n); n++; } console.log('Stored progress_student_lo.score minus cumulative first-response accuracy: mean',mean(d).toFixed(1),'| stored higher by >10 in',pct(d.filter(x=>x>10).length,d.length)+'% of LOs (n='+n+')'); }
// 4. Sessions: how long does a 15-q diagnostic take, and do students run out (stop reason)?
{ const h={}; for(const s of D.sessions){ if(s.subject!=='math')continue; const k=s.mode+':'+s.stop; h[k]=(h[k]||0)+1; } console.log('Stop reasons (completed sessions):',h); }
