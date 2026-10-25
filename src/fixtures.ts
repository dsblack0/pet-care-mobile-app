import type { ContextType, ChallengeType } from "./schema";
export const sample: ContextType = {
  pet: {
    id: "buddy",
    name: "Buddy",
    species: "dog",
    ageYears: 3,
    restrictions: [],
  },
  members: [
    { id: "alex", name: "Alex" },
    { id: "sam", name: "Sam" },
    { id: "jamie", name: "Jamie" },
  ],
  preferences: [
    { category: "feeding", enabled: true, memberIds: ["alex", "sam"] },
    { category: "walking", enabled: true, memberIds: ["alex", "sam", "jamie"] },
    { category: "training", enabled: true, memberIds: ["alex"] },
    { category: "play", enabled: true, memberIds: ["alex", "sam", "jamie"] },
    { category: "grooming", enabled: true, memberIds: ["sam"] },
    { category: "medication", enabled: false, memberIds: [] },
  ],
  weeklyCount: 5,
  weekStart: "2026-10-26",
  verifiedMedicationPlan: false,
  history: [
    {
      id: "h1",
      category: "walking",
      title: "Walk Buddy five times",
      status: "completed",
      metricType: "count",
      target: 5,
      week: "2026-10-19",
    },
    {
      id: "h2",
      category: "feeding",
      title: "Log feeding every day",
      status: "completed",
      metricType: "distinct_days",
      target: 7,
      week: "2026-10-19",
    },
    {
      id: "h3",
      category: "play",
      title: "Spend 180 minutes playing",
      status: "canceled",
      metricType: "duration",
      target: 180,
      week: "2026-10-19",
    },
    {
      id: "h4",
      category: "training",
      title: "Train every day",
      status: "canceled",
      metricType: "distinct_days",
      target: 7,
      week: "2026-10-12",
    },
    {
      id: "h5",
      category: "play",
      title: "Two family play sessions",
      status: "completed",
      metricType: "group_sessions",
      target: 2,
      week: "2026-10-12",
    },
  ],
};
const base=(id:string,title:string,activityType:string,goalType:ChallengeType['goalType'],goal:number,participants:string[],jointActivity=false):ChallengeType=>({
 challengeId:id,petId:sample.pet.id,participants,completedBy:[],completedAt:null,title,completionStatus:'in_progress',startDate:'2026-10-26T00:00:00.000Z',endDate:'2026-11-01T23:59:59.999Z',progress:0,goal,goalType,activityTypes:[activityType],jointActivity,pointReward:100
});
export const sampleChallenges:ChallengeType[]=[
 base('c1','Everyone walks Buddy','Walk','unique_participants',3,['alex','sam','jamie']),
 base('c2','Log feeding every day','Feed','daily',7,['alex','sam']),
 base('c3','Play with Buddy for 120 minutes','Play','duration',120,['alex','sam','jamie']),
 base('c4','Complete three family play sessions','Play','unique_activities',3,['alex','sam','jamie'],true),
 base('c5','Complete two training sessions','Train','unique_activities',2,['alex'])
];
