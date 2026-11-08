import { getChallengesForPet, getPet, getLevels, getRewards } from '../src/lib/db';
import { getPetRewards } from '../firebaseServices/petRewardsService';
import { requireMember } from './core';
export async function listChallenges(petId: string) { await requireMember(petId); return getChallengesForPet(petId); }
export async function rewardProgress(petId: string) {
  await requireMember(petId);
  const [pet, levels, rewards, unlocked] = await Promise.all([getPet(petId), getLevels(), getRewards(), getPetRewards(petId)]);
  return { pet, levels, rewards, unlocked };
}
/** Never trust a client to grant itself rewards without validated points. */
export async function unlockReward(_petId: string, _rewardId: string): Promise<never> {
  throw new Error('Reward unlocking requires a server-validated points check. Not yet implemented.');
}
