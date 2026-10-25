import test from 'node:test';import assert from 'node:assert/strict';
import {generateScenarios} from './scenarios.ts';import {scoreBatch} from './scoring.ts';import {sampleChallenges} from '../src/fixtures.ts';
test('same seed yields identical cases',()=>assert.deepEqual(generateScenarios({seed:42,count:100,sampling:'random'}),generateScenarios({seed:42,count:100,sampling:'random'})));
test('different seeds change scenarios',()=>assert.notDeepEqual(generateScenarios({seed:42,count:10,sampling:'random'}),generateScenarios({seed:43,count:10,sampling:'random'})));
test('only six allowed categories',()=>{for(const s of generateScenarios({seed:7,count:100,sampling:'balanced'}))assert.deepEqual(s.context.preferences.map(p=>p.category),['feeding','walking','training','play','grooming','medication']);});
test('balanced scenarios include empty category edge case',()=>assert.ok(generateScenarios({seed:7,count:20,sampling:'balanced'}).some(s=>s.expectedPreflightReject)));
test('reject invalid scenario counts',()=>assert.throws(()=>generateScenarios({seed:2,count:0,sampling:'random'})));
test('scorer catches unauthorized participants',()=>{const s=generateScenarios({seed:2,count:1,sampling:'balanced'})[0];assert.equal(scoreBatch(s,sampleChallenges).passed,false);});
