import fs from 'node:fs';
const D=JSON.parse(fs.readFileSync('output/analysis/dataset.json','utf8'));
const S=new Map(D.sessions.map(s=>[s.id,s]));
const ok=v=>v==='correct';
const pct=(a,b)=>b?Math.round(100*a/b):null;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
// per (student, lo): chronological measurements. Each = one session's first responses on that LO.
const key=new Map();
for(const q of D.questions){ const s=S.get(q.sid); if(!s||s.subject!=='math'||!q.fv||q.fv==='non_attempt'||!q.lo)continue; const k=s.student+'|'+q.lo; if(!key.has(k))key.set(k,new Map()); const m=key.get(k); if(!m.has(q.sid))m.set(q.sid,{sid:q.sid,mode:s.mode,t:new Date(s.started_at).getTime(),n:0,c:0,pts:0,max:0,fast:0}); const r=m.get(q.sid); r.n++; if(ok(q.fv))r.c++; const mx={easy:2,medium:3,hard:4}[q.diff]||2; r.max+=mx; r.pts+=q.fp!=null?+q.fp:(ok(q.fv)?mx:0); if(q.ms!=null&&q.ms<4000&&!ok(q.fv))r.fast++; }
const series=[]; for(const [k,m] of key){ const a=[...m.values()].sort((x,y)=>x.t-y.t); if(a.length>=2)series.push({k,a}); }
console.log('student-LO series with >=2 measurements:', series.length, 'of', key.size);
// ---------- scorers over history
const W={placement:0.5,diagnostic:1,homework:0.5,practice:0}; // doc weights (placement seeds only; here 0.5 as compromise)
function scoreCum(h){ let c=0,n=0; for(const r of h){c+=r.c;n+=r.n;} return n?100*c/n:null; }
function scoreCumW(h,w=W){ let c=0,n=0; for(const r of h){const x=w[r.mode]??1; c+=x*r.c;n+=x*r.n;} return n?100*c/n:null; }
function scoreEMA(h,kfn,w=W){ let s=null,i=0; for(const r of h){ const x=w[r.mode]??1; if(!x)continue; const att=100*r.c/r.n; const k=kfn(i)*x; s=s==null?att:s+k*(att-s); i++; } return s; }
function scoreLast(h){ const m=[...h].reverse().find(r=>(W[r.mode]??1)>0); return m?100*m.c/m.n:null; }
function nMeasured(h,w=W){ let n=0; for(const r of h){ if((w[r.mode]??1)>0)n+=r.n; } return n; }
// evaluate: for each series, for each i>=1 with a valid score, compare prediction to next measurement accuracy
const scorers={ cumulative:scoreCum, cumulativeW:scoreCumW, last:scoreLast,
  'ema k=0.5':h=>scoreEMA(h,()=>0.5), 'ema k=0.35':h=>scoreEMA(h,()=>0.35),
  'ema k=1/(n+1) floor .25':h=>scoreEMA(h,i=>Math.max(0.25,1/(i+1))), 'ema k=1/(n+1) floor .15':h=>scoreEMA(h,i=>Math.max(0.15,1/(i+1))) };
console.log('\nPrediction of next-session LO accuracy (MAE, lower is better) by history length:');
for(const [name,fn] of Object.entries(scorers)){ const err={1:[],2:[],3:[]}; for(const {a} of series){ for(let i=1;i<a.length;i++){ const h=a.slice(0,i); const p=fn(h); if(p==null)continue; const y=100*a[i].c/a[i].n; const b=Math.min(i,3); err[b].push(Math.abs(p-y)); } } console.log('  ',name.padEnd(26), Object.entries(err).map(([b,e])=>`h=${b}${b==='3'?'+':''}: ${mean(e).toFixed(1)} (n=${e.length})`).join('  ')); }
// ---------- certification precision: rule "score>=T and measured questions>=N" → future pooled accuracy
console.log('\nCertification rule check: if (cumulativeW score >= T and >= N measured questions) at point i, pooled accuracy of ALL later first responses on that LO');
for(const N of [3,6,9,12]) for(const T of [70,80,90,100]){ let later={c:0,n:0}, fired=0, laterHi=0; for(const {a} of series){ for(let i=1;i<a.length;i++){ const h=a.slice(0,i); if(nMeasured(h)<N)continue; const s=scoreCumW(h); if(s==null||s<T)continue; fired++; const rest=a.slice(i); const c=rest.reduce((x,r)=>x+r.c,0), n=rest.reduce((x,r)=>x+r.n,0); later.c+=c; later.n+=n; if(c/n>=0.8)laterHi++; break; } } if(fired) console.log(`   T=${T} N=${N}: fired ${String(fired).padStart(5)} series | later pooled accuracy ${pct(later.c,later.n)}% | P(later>=80%) ${pct(laterHi,fired)}%`); }
// ---------- baseline: what does "later accuracy" look like for everyone regardless
{ let c=0,n=0; for(const {a} of series){ for(const r of a.slice(1)){c+=r.c;n+=r.n;} } console.log('   baseline later accuracy (all series, from 2nd measurement on):', pct(c,n)+'%'); }
// ---------- does the platform's stored mastery_state predict? compare stored state to pooled first-response accuracy on later sessions is not possible (no history); instead: distribution of stored score vs cumulative
// ---------- stall detection: 3 consecutive measurements with no improvement in LO accuracy, and low
let stalled=0, stalledLow=0, total3=0; for(const {a} of series){ if(a.length<3)continue; total3++; const acc=a.map(r=>100*r.c/r.n); let run=0; for(let i=1;i<acc.length;i++){ run = acc[i]<=acc[i-1]?run+1:0; if(run>=2){stalled++; if(acc[i]<60)stalledLow++; break;} } }
console.log('\nStall: series with >=3 measurements', total3, '| 3 in a row non-improving', stalled, '| and still <60', stalledLow);
// ---------- fast wrong answers
{ let fast=0,wrong=0; for(const q of D.questions){ const s=S.get(q.sid); if(!s||s.subject!=='math'||!q.fv||q.fv==='non_attempt')continue; if(!ok(q.fv)){wrong++; if(q.ms!=null&&q.ms<4000)fast++;} } console.log('Fast (<4s) wrong answers:', pct(fast,wrong)+'% of wrong answers'); }
// ---------- per-LO accuracy distribution at first measurement with exactly 3-4 questions
{ const h={}; for(const {a} of series){ const r=a[0]; if(r.n<3||r.n>4)continue; const b=Math.round(100*r.c/r.n/10)*10; h[b]=(h[b]||0)+1; } console.log('First-measurement LO accuracy distribution (3-4 Q):', h); }
