// Does a recent-window score predict next-session accuracy as well as cumulative?
import fs from 'node:fs';
const D=JSON.parse(fs.readFileSync('output/analysis/dataset.json','utf8'));
const S=new Map(D.sessions.map(s=>[s.id,s]));
const ok=v=>v==='correct'; const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const W={placement:0,diagnostic:1,homework:0.8,practice:0.5};
const key=new Map();
for(const q of D.questions){ const s=S.get(q.sid); if(!s||s.subject!=='math'||!q.fv||q.fv==='non_attempt'||!q.lo)continue; const k=s.student+'|'+q.lo; if(!key.has(k))key.set(k,new Map()); const m=key.get(k); if(!m.has(q.sid))m.set(q.sid,{mode:s.mode,t:new Date(s.started_at).getTime(),n:0,c:0}); const r=m.get(q.sid); r.n++; if(ok(q.fv))r.c++; }
const series=[]; for(const m of key.values()){ const a=[...m.values()].sort((x,y)=>x.t-y.t); if(a.length>=2)series.push(a); }
function cumulative(h){ let c=0,n=0; for(const r of h){const w=W[r.mode]??1; c+=w*r.c; n+=w*r.n;} return n?100*c/n:null; }
function windowed(h,size){ let c=0,n=0; for(let i=h.length-1;i>=0;i--){ const r=h[i]; const w=W[r.mode]??1; if(!w)continue; const wn=w*r.n, wc=w*r.c; if(n+wn<=size){c+=wc;n+=wn;} else { const frac=(size-n)/wn; c+=wc*frac; n=size; break; } } return n?100*c/n:null; }
const scorers={cumulative, 'window 6':h=>windowed(h,6),'window 9':h=>windowed(h,9),'window 12':h=>windowed(h,12),'window 15':h=>windowed(h,15),'window 20':h=>windowed(h,20)};
console.log('MAE predicting next-session LO accuracy, by history length (weighted questions so far):');
for(const [name,fn] of Object.entries(scorers)){ const err={'<9':[],'9-20':[],'20+':[]}; for(const a of series){ for(let i=1;i<a.length;i++){ const h=a.slice(0,i); const p=fn(h); if(p==null)continue; const y=100*a[i].c/a[i].n; let n=0; for(const r of h)n+=(W[r.mode]??1)*r.n; const b=n<9?'<9':n<20?'9-20':'20+'; err[b].push(Math.abs(p-y)); } } console.log('  ',name.padEnd(12), Object.entries(err).map(([b,e])=>`${b}: ${mean(e).toFixed(2)} (n=${e.length})`).join('   ')); }
// Certification precision with windowed score: window score>=80 and total evidence>=9 -> later pooled accuracy
console.log('\nRule: score>=80 and total evidence>=9 → later pooled accuracy');
for(const [name,fn] of Object.entries(scorers)){ let later={c:0,n:0}, fired=0; for(const a of series){ for(let i=1;i<a.length;i++){ const h=a.slice(0,i); let n=0; for(const r of h)n+=(W[r.mode]??1)*r.n; if(n<9)continue; const s=fn(h); if(s==null||s<80)continue; fired++; const rest=a.slice(i); later.c+=rest.reduce((x,r)=>x+r.c,0); later.n+=rest.reduce((x,r)=>x+r.n,0); break; } } console.log('  ',name.padEnd(12),'fired',fired,'later accuracy',(100*later.c/later.n).toFixed(1)+'%'); }
