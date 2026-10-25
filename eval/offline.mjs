import {cases} from './cases.ts';
import {validateContext,validateBatch} from '../src/validation.ts';
import {sampleChallenges} from '../src/fixtures.ts';
let failures=0;
for(const item of cases){try{validateContext(item.context);console.log('PASS',item.id,item.description);}catch(e){failures++;console.error('FAIL',item.id,e);}}
try{validateBatch({challenges:sampleChallenges},cases[0].context);console.log('PASS fixture batch');}catch(e){failures++;console.error('FAIL fixture batch',e);}
if(failures)process.exitCode=1;
