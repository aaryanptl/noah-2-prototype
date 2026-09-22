import fs from 'node:fs';
const D=JSON.parse(fs.readFileSync('output/analysis/dataset.json','utf8'));
const S=new Map(D.sessions.map(s=>[s.id,s]));
const math=D.sessions.filter(s=>s.subject==='math');
// attach questions
const bySid=new Map(); for(const q of D.questions){ if(!bySid.has(q.sid))bySid.set(q.sid,[]); bySid.get(q.sid).push(q); }
const pct=(a,b)=>b?Math.round(100*a/b):null;
const ok=v=>v==='correct';
function sessionScore(qs, which='fv'){ const ans=qs.filter(q=>q[which]&&q[which]!=='non_attempt'); return {acc:pct(ans.filter(q=>ok(q[which])).length,ans.length), n:ans.length, slots:qs.length}; }
// ---- A. flows per student-topic (topic-scoped only)
const st=new Map();
for(const s of math){ if(s.scope!=='topic')continue; const qs=bySid.get(s.id)||[]; const topics=[...new Set(qs.map(q=>q.topic))]; for(const t of topics){ const k=s.student+'|'+t; if(!st.has(k))st.set(k,[]); st.get(k).push({...s, qs:qs.filter(q=>q.topic===t)}); } }
for(const a of st.values()) a.sort((x,y)=>new Date(x.started_at)-new Date(y.started_at));
const hist={}; for(const a of st.values()){ const k=Math.min(a.length,6); hist[k]=(hist[k]||0)+1; }
console.log('A. student-topic pairs by #completed sessions:', hist, 'total', st.size);
const seqHist={}; for(const a of st.values()){ if(a.length<2)continue; const seq=a.map(s=>s.mode[0]).join(''); seqHist[seq]=(seqHist[seq]||0)+1; }
console.log('   top flow sequences (d=diagnostic h=homework p=practice):', Object.entries(seqHist).sort((a,b)=>b[1]-a[1]).slice(0,15));
const byMode={}; for(const a of st.values()){ const m=a.map(s=>s.mode); const k=[...new Set(m)].sort().join('+'); byMode[k]=(byMode[k]||0)+1;}
console.log('   pairs by flow mix:', byMode);
// ---- B. test-retest: two diagnostics on same topic
let pairs=[]; for(const a of st.values()){ const d=a.filter(s=>s.mode==='diagnostic'); for(let i=1;i<d.length;i++){ const x=sessionScore(d[i-1].qs), y=sessionScore(d[i].qs); if(x.n>=8&&y.n>=8) pairs.push({a:x.acc,b:y.acc, gapDays:(new Date(d[i].started_at)-new Date(d[i-1].completed_at))/864e5, between:a.filter(s=>new Date(s.started_at)>new Date(d[i-1].completed_at)&&new Date(s.started_at)<new Date(d[i].started_at)).map(s=>s.mode)}); } }
console.log('B. diagnostic→diagnostic pairs (>=8 answered each):', pairs.length);
const buckets=[[0,40],[40,60],[60,70],[70,80],[80,90],[90,101]];
console.log('   first-score bucket → mean second, P(second>=80), P(second>=70), n');
for(const [lo,hi] of buckets){ const p=pairs.filter(x=>x.a>=lo&&x.a<hi); if(!p.length)continue; console.log('   ',`${lo}-${hi-1}`.padEnd(7), (p.reduce((s,x)=>s+x.b,0)/p.length).toFixed(1).padStart(6), pct(p.filter(x=>x.b>=80).length,p.length).toString().padStart(5)+'%', pct(p.filter(x=>x.b>=70).length,p.length).toString().padStart(5)+'%', p.length); }
const withP=pairs.filter(x=>x.between.includes('practice')||x.between.includes('homework')), noP=pairs.filter(x=>!x.between.length);
const mean=a=>a.length?(a.reduce((s,x)=>s+x,0)/a.length):NaN;
console.log('   delta (second-first): with practice/homework between:', mean(withP.map(x=>x.b-x.a)).toFixed(1),'n',withP.length,'| nothing between:', mean(noP.map(x=>x.b-x.a)).toFixed(1),'n',noP.length);
// ---- E. accuracy by mode (first response, final response, partial rate, retries)
console.log('E. accuracy by mode (math, completed sessions)');
for(const mode of ['placement','diagnostic','homework','practice']){ const qs=D.questions.filter(q=>{const s=S.get(q.sid);return s&&s.subject==='math'&&s.mode===mode&&q.fv;}); const ans=qs.filter(q=>q.fv!=='non_attempt'); const first=pct(ans.filter(q=>ok(q.fv)).length,ans.length), fin=pct(ans.filter(q=>ok(q.lv)).length,ans.length); const partial=pct(ans.filter(q=>q.fv==='partial').length,ans.length); const retried=pct(ans.filter(q=>q.n>1).length,ans.length); const na=pct(qs.filter(q=>q.fv==='non_attempt').length,qs.length); console.log('   ',mode.padEnd(11),'first',first,'final',fin,'partial',partial+'%','retried',retried+'%','non_attempt',na+'%','q',qs.length); }
// ---- G. accuracy by difficulty, and hard-accuracy for high scorers (diagnostic)
console.log('G. first-response accuracy by difficulty (diagnostic):');
for(const d of ['easy','medium','hard']){ const qs=D.questions.filter(q=>{const s=S.get(q.sid);return s&&s.subject==='math'&&s.mode==='diagnostic'&&q.diff===d&&q.fv&&q.fv!=='non_attempt';}); console.log('   ',d.padEnd(7),pct(qs.filter(q=>ok(q.fv)).length,qs.length)+'%',qs.length); }
// among sessions with overall >=80: hard accuracy
let hardHi=[],hardMid=[]; for(const s of math){ if(s.mode!=='diagnostic')continue; const qs=bySid.get(s.id)||[]; const sc=sessionScore(qs); if(sc.n<8)continue; const h=qs.filter(q=>q.diff==='hard'&&q.fv&&q.fv!=='non_attempt'); if(!h.length)continue; const acc=h.filter(q=>ok(q.fv)).length/h.length; (sc.acc>=80?hardHi:hardMid).push(acc);} 
console.log('   hard-question accuracy when session>=80:',(100*mean(hardHi)).toFixed(0)+'%','n',hardHi.length,'| session<80:',(100*mean(hardMid)).toFixed(0)+'%','n',hardMid.length);
// ---- C. questions per LO per diagnostic session
const perLo={}; let losWith3=0, losTotal=0; for(const s of math){ if(s.mode!=='diagnostic')continue; const qs=bySid.get(s.id)||[]; const m={}; for(const q of qs){ m[q.lo]=(m[q.lo]||0)+1; } for(const n of Object.values(m)){ losTotal++; if(n>=3)losWith3++; const k=Math.min(n,6); perLo[k]=(perLo[k]||0)+1; } }
console.log('C. questions per LO in a diagnostic session:', perLo, 'LOs with >=3:', pct(losWith3,losTotal)+'%');
const losPerSession={}; for(const s of math){ if(s.mode!=='diagnostic')continue; const qs=bySid.get(s.id)||[]; const k=Math.min(new Set(qs.map(q=>q.lo)).size,8); losPerSession[k]=(losPerSession[k]||0)+1; }
console.log('   LOs covered per diagnostic session:', losPerSession);
// LOs per topic in curriculum (math)
const loPerTopic={}; for(const lo of D.los){ loPerTopic[lo.topic]=(loPerTopic[lo.topic]||0)+1; } const mathTopics=new Set(D.topics.filter(t=>t.subject==='math'||t.subject==='Math'||t.subject==='Maths').map(t=>t.id)); const h2={}; for(const [t,n] of Object.entries(loPerTopic)){ if(mathTopics.size&&!mathTopics.has(+t))continue; const k=Math.min(n,8); h2[k]=(h2[k]||0)+1;} console.log('   LOs per topic (curriculum):', h2, 'subjects seen:', [...new Set(D.topics.map(t=>t.subject))]);
