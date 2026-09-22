// Pulls every completed session question (math) with first/final attempt into output/analysis/dataset.json
import fs from 'node:fs';
import {Client} from 'pg';
for(const file of ['.env','.env.local']) if(fs.existsSync(file)) for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=/^([\w_]+)=(.*)$/.exec(line);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
const c=new Client({connectionString:process.env.MAIN_DATABASE_READ_ONLY_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
await c.connect();
const sessions=(await c.query(`
select ts.id, ts.student_id student, tc.mode, tc.scope, tc.class_level grade, s.name subject, ts.started_at, ts.completed_at, ts.stopped_because stop, ts.readiness_score readiness, tc.target_question_count target
from test_sessions ts join test_configs tc on tc.id=ts.test_id join subjects s on s.id=tc.subject_id
where ts.completed_at is not null`)).rows;
console.log('sessions',sessions.length);
const q=(await c.query(`
with a as (
  select test_session_question_id tsq, 
    (array_agg(verdict order by attempt_number, submitted_at, id))[1] first_verdict,
    (array_agg(verdict order by attempt_number desc, submitted_at desc, id desc))[1] final_verdict,
    (array_agg(points_awarded order by attempt_number, submitted_at, id))[1] first_pts,
    max(points_awarded) max_pts,
    count(*) attempts,
    (array_agg(time_taken_ms order by attempt_number, submitted_at, id))[1] first_ms
  from attempts group by 1)
select q.id, q.test_session_id sid, q.question_id qid, q.topic_id topic, q.learning_objective_id lo, q.difficulty_band diff, q.bloom_level bloom, q.status, q.served_at,
  a.first_verdict fv, a.final_verdict lv, a.first_pts fp, a.max_pts mp, a.attempts n, a.first_ms ms
from test_session_questions q join test_sessions ts on ts.id=q.test_session_id
left join a on a.tsq=q.id
where ts.completed_at is not null`)).rows;
console.log('questions',q.length);
const los=(await c.query(`select id, topic_id topic, code, display_name name, sequence from learning_objectives`)).rows;
const topics=(await c.query(`select id, name, grade, subject_label subject, sequence, classes from topics`)).rows;
const plo=(await c.query(`select student_id student, learning_objective_id lo, questions_asked asked, questions_attempted attempted, correct_count correct, partial_count partial, incorrect_count incorrect, points_total pts, weight_total wt, score, mastery_state state, last_attempt_at last from progress_student_lo`)).rows;
fs.mkdirSync('output/analysis',{recursive:true});
fs.writeFileSync('output/analysis/dataset.json',JSON.stringify({pulledAt:new Date().toISOString(),sessions,questions:q,los,topics,plo}));
console.log('written output/analysis/dataset.json', (fs.statSync('output/analysis/dataset.json').size/1e6).toFixed(1)+'MB');
await c.end();
