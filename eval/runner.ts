import {generateApple} from '../src/apple';
import {buildPrompt,PROMPT_VERSION} from '../src/prompt';
import {scoreBatch} from './scoring';
import type {Scenario} from './scenarios';
export type EvalResult={scenarioId:string;kind:string;repetition:number;startedAt:string;durationMs:number;passed:boolean;failures:string[];warnings:string[];error?:string;promptVersion:string;prompts:string[];rawResponses:unknown[];challenges:unknown[];context:Scenario['context'];};
export type EvalRun={runId:string;seed:number;sampling:string;repetitions:number;scenarioCount:number;createdAt:string;results:EvalResult[];total:number;complete:boolean};
export async function evaluateOne(s:Scenario,repetition:number):Promise<EvalResult>{
 const startedAt=new Date().toISOString();const start=Date.now();
 const base={scenarioId:s.id,kind:s.kind,repetition,startedAt,promptVersion:PROMPT_VERSION,context:s.context};
 if(s.expectedPreflightReject)return {...base,durationMs:0,passed:true,failures:[],warnings:['Expected no eligible challenges: model call skipped'],prompts:[],rawResponses:[],challenges:[]};
 try{
  const record=await generateApple(s.context);const score=scoreBatch(s,record.challenges);
  return {...base,durationMs:Date.now()-start,passed:score.passed,failures:score.failures,warnings:[...score.warnings,...record.errors],prompts:record.prompts,rawResponses:record.rawResponses,challenges:record.challenges};
 }catch(e){return {...base,durationMs:Date.now()-start,passed:false,failures:[],warnings:[],error:String(e),prompts:[buildPrompt(s.context,0,[])],rawResponses:[],challenges:[]};}
}
export function summarize(results:EvalResult[]){const actual=results.filter(x=>x.prompts.length||x.error);const times=actual.filter(x=>!x.error).map(x=>x.durationMs).sort((a,b)=>a-b);return {total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,modelRuns:actual.length,errors:results.filter(x=>x.error).length,medianLatencyMs:times.length?times[Math.floor(times.length/2)]:null};}
export function resultsCSV(results:EvalResult[]){const esc=(x:unknown)=>'"'+String(x??'').replace(/"/g,'""')+'"';const cols=['scenarioId','kind','repetition','startedAt','durationMs','passed','error','failures','warnings','promptVersion'];return [cols.join(','),...results.map(r=>cols.map(k=>esc(k==='failures'||k==='warnings'?(r as any)[k].join(' | '):(r as any)[k])).join(','))].join('\n');}
