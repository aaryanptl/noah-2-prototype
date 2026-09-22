import fs from 'node:fs';
import {Client} from 'pg';
for(const file of ['.env','.env.local']) if(fs.existsSync(file)) for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=/^([\w_]+)=(.*)$/.exec(line);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
const url=process.env.MAIN_DATABASE_READ_ONLY_URL;
if(!url){console.log('MAIN_DATABASE_READ_ONLY_URL: NOT SET');process.exit(1);}
console.log('MAIN_DATABASE_READ_ONLY_URL: set, host='+new URL(url).host);
const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
await c.connect();
const sql=process.argv[2];
const r=await c.query(sql);
console.log(JSON.stringify(r.rows,null,1).slice(0,20000));
await c.end();
