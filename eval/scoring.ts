import type {Scenario} from './scenarios';
import type {ChallengeType} from '../src/schema';
import {validateBatch} from '../src/validation';
export type Score={passed:boolean;failures:string[];warnings:string[];historyAdaptationNeedsReview:boolean};
export function scoreBatch(scenario:Scenario,challenges:ChallengeType[]):Score{
 const failures:string[]=[];const warnings:string[]=[];
 try{validateBatch({challenges},scenario.context);}catch(e){failures.push(String(e));}
 for(const c of challenges){
  if(c.activityTypes.includes('Medication'))warnings.push('Medication challenge requires safety review');
  if(c.goalType==='duration'&&c.goal>120)warnings.push('Long duration target: review feasibility');
 }
 return {passed:failures.length===0,failures,warnings,historyAdaptationNeedsReview:scenario.context.history.length>0};
}
