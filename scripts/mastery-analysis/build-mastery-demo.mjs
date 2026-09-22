import fs from 'node:fs';
import {Client} from 'pg';
for(const file of ['.env','.env.local']) if(fs.existsSync(file)) for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=/^([\w_]+)=(.*)$/.exec(line);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
const client=new Client({connectionString:process.env.MAIN_DATABASE_READ_ONLY_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
try{
await client.connect();
await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
await client.query("SET LOCAL statement_timeout='60s'");
const {rows}=await client.query(`
with ranked as (
 select a.*,row_number() over(partition by test_session_question_id order by submitted_at,id) first_rank,
 row_number() over(partition by test_session_question_id order by submitted_at desc,id desc) last_rank,
 count(*) over(partition by test_session_question_id) tries from attempts a
), exposure as (
 select q.id,row_number() over(partition by s.student_id,q.question_id order by coalesce(q.served_at,s.started_at),q.id) exposure_number
 from test_session_questions q join test_sessions s on s.id=q.test_session_id where q.served_at is not null
)
select s.id::text session,s.student_id student,s.started_at started,s.completed_at completed,
 c.mode::text flow,c.class_level::text grade,t.id::text topic_id,t.name topic,
 l.id::text lo_id,l.description lo,q.id::text slot,q.difficulty_band::text difficulty,
 f.verdict::text first,a.verdict::text last,coalesce(a.tries,0)::int tries,
 e.exposure_number::int exposure
from test_sessions s join test_configs c on c.id=s.test_id
join test_session_questions q on q.test_session_id=s.id
join topics t on t.id=q.topic_id join learning_objectives l on l.id=q.learning_objective_id
left join ranked f on f.test_session_question_id=q.id and f.first_rank=1
left join ranked a on a.test_session_question_id=q.id and a.last_rank=1
left join exposure e on e.id=q.id
where c.mode in ('homework','practice','diagnostic') and s.completed_at is not null
order by s.started_at,s.id,q.ordinal`);
await client.query('ROLLBACK');
const data={generated:new Date().toISOString(),rows};
const template=fs.readFileSync('scripts/mastery-analysis/mastery-demo-template.html','utf8');
fs.writeFileSync('docs/mastery-analysis/mastery-learning-real-data.html',template.replace('__DATA__',JSON.stringify(data).replaceAll('<','\\u003c')));
console.log(JSON.stringify({rows:rows.length,sessions:new Set(rows.map(r=>r.session)).size,students:new Set(rows.map(r=>r.student)).size}));
}finally{await client.end();}
