import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { User } from '../database/entities/user.entity.js';
import { Organization } from '../database/entities/organization.entity.js';
import { Role,UserStatus } from '../database/entities/domain.js';
import { DomainError } from '../common/http.js';
import { rows } from './sql.js';
import { MissionDefinition,ChallengeDefinition } from './definition.entity.js';
import { missionRulesSchema,challengeRulesSchema,badgeSchema,goalUnits } from './domain.js';
import type { MissionInputDto,ChallengeInputDto,ProgressQueryDto,MissionDefinitionDto,ChallengeDefinitionDto,MissionPageDto,ChallengePageDto } from './progress.dto.js';
export function invalid(message:string):never {throw new DomainError(422,'VALIDATION_FAILED',message);}
export function acyclic(nodes:{id:string;dependencies:string[]}[]):void {
 const map=new Map(nodes.map(n=>[n.id,n]));if(map.size!==nodes.length)invalid('Повторні ідентифікатори.');
 const visiting=new Set<string>(),done=new Set<string>();
 const visit=(id:string,depth:number):void=>{if(depth>100)invalid('Глибина передумов перевищує 100.');if(visiting.has(id))invalid('Виявлено цикл передумов.');if(done.has(id))return;const n=map.get(id);if(!n)invalid('Невідома передумова.');visiting.add(id);n.dependencies.forEach(d=>visit(d,depth+1));visiting.delete(id);done.add(id);};nodes.forEach(n=>visit(n.id,0));
}
export function missionView(d:MissionDefinition):MissionDefinitionDto {
 return {id:d.id,organizationId:d.organizationId,slug:d.slug,title:d.title,description:d.description,shortDescription:d.shortDescription,coverImage:d.coverImage,category:d.category,difficulty:d.difficulty,startsAt:d.startsAt?.toISOString()??null,endsAt:d.endsAt?.toISOString()??null,estimatedDuration:d.estimatedDuration,steps:d.rules.steps.map(s=>({...s,chainId:d.id})),prerequisites:d.rules.prerequisites,rewards:{xp:d.rewardXp,rewardPoints:d.rewardPoints,achievement:d.achievement},status:d.status};
}
export function challengeView(d:ChallengeDefinition):ChallengeDefinitionDto {
 if(!d.startsAt||!d.endsAt)throw new Error('Missing challenge period');
 return {id:d.id,organizationId:d.organizationId,slug:d.slug,title:d.title,description:d.description,coverImage:d.coverImage,category:d.category,startDate:d.startsAt.toISOString(),endDate:d.endsAt.toISOString(),goals:d.rules.goals,relatedQuestIds:d.rules.relatedQuestIds,categoryIds:d.rules.categoryIds,districts:d.rules.districts,organizationIds:d.rules.organizationIds,milestones:d.rules.milestones,rewards:{xp:d.rewardXp,rewardPoints:d.rewardPoints,achievement:d.achievement},status:d.status,createdAt:d.createdAt.toISOString()};
}
@Injectable()
export class DefinitionService {
 constructor(private readonly source:DataSource,private readonly transactions:Transactions,private readonly audit:AuditService) {}
 async assertAdmin(manager:EntityManager,actorId:string):Promise<void>{const actor=await manager.findOneBy(User,{id:actorId,status:UserStatus.ACTIVE});if(!actor?.roles.includes(Role.ADMIN))throw new DomainError(403,'FORBIDDEN','Потрібні права адміністратора.');}
 async mission(manager:EntityManager,id:string,admin=false):Promise<MissionDefinition>{const d=await manager.findOneBy(MissionDefinition,{id});if(!d||(!admin&&d.status==='DRAFT'))throw new DomainError(404,'NOT_FOUND','Місію не знайдено.');return d;}
 async challenge(manager:EntityManager,id:string,admin=false):Promise<ChallengeDefinition>{const d=await manager.findOneBy(ChallengeDefinition,{id});if(!d||(!admin&&d.status==='DRAFT'))throw new DomainError(404,'NOT_FOUND','Виклик не знайдено.');return d;}
 private async questsExist(manager:EntityManager,ids:string[],publish=false):Promise<void>{
  const unique=[...new Set(ids)];if(!unique.length)return;
  const found=rows(await manager.query(`SELECT q.id,q.lifecycle,q.moderation,q.published_at,o.moderation_status FROM quests q JOIN organizations o ON o.id=q.organization_id WHERE q.id=ANY($1::uuid[])`,[unique]));
  if(found.length!==unique.length)invalid('Визначення посилається на невідомий квест.');
  if(publish&&found.some(q=>q.lifecycle==='draft'||q.moderation!=='approved'||q.published_at===null||q.moderation_status!=='approved'))invalid('Публічне визначення може посилатися лише на опубліковані схвалені квести.');
 }
 private async base(manager:EntityManager,input:MissionInputDto|ChallengeInputDto){
  const org=await manager.findOneBy(Organization,{id:input.organizationId});if(!org)invalid('Невідома організація.');
  if(!input.rewards||![input.rewards.xp,input.rewards.rewardPoints].every(n=>Number.isInteger(n)&&n>=0&&n<=10000))invalid('Некоректна нагорода.');
  const badge=badgeSchema.safeParse(input.rewards.achievement);if(!badge.success)invalid('Некоректна відзнака.');
  return {organizationId:input.organizationId,slug:input.slug,title:input.title,description:input.description,category:input.category,coverImage:input.coverImage,rewardXp:input.rewards.xp,rewardPoints:input.rewards.rewardPoints,achievement:badge.data};
 }
 private period(start:string|null|undefined,end:string|null|undefined){const startsAt=start?new Date(start):null,endsAt=end?new Date(end):null;if((startsAt&&!Number.isFinite(startsAt.getTime()))||(endsAt&&!Number.isFinite(endsAt.getTime()))||(startsAt&&endsAt&&startsAt>endsAt))invalid('Некоректний період визначення.');return {startsAt,endsAt};}
 async saveMissionWithin(manager:EntityManager,actorId:string,input:MissionInputDto,id?:string,seedKey?:string):Promise<MissionDefinition>{
  await this.assertAdmin(manager,actorId);await manager.query("SELECT pg_advisory_xact_lock(hashtext('dniproxp:progress-definitions'))");
  const prior=id?await this.mission(manager,id,true):null;if(prior&&prior.status!=='DRAFT')throw new DomainError(409,'DEFINITION_FROZEN','Опубліковане визначення не редагується.');
  const parsed=missionRulesSchema.safeParse({steps:input.steps,prerequisites:input.prerequisites});if(!parsed.success)invalid('Некоректні етапи чи передумови місії.');const rules=parsed.data;
  if(!rules.steps.some(s=>!s.isOptional)||new Set(rules.steps.map(s=>s.questId)).size!==rules.steps.length||new Set(rules.steps.map(s=>s.order)).size!==rules.steps.length)invalid('Потрібні унікальні квести, порядок і обов’язковий етап.');
  acyclic(rules.steps.map(s=>({id:s.id,dependencies:s.prerequisiteStepIds})));
  for(const s of rules.steps)if(!s.isOptional&&s.prerequisiteStepIds.some(dep=>rules.steps.find(p=>p.id===dep)?.isOptional))invalid('Необов’язковий етап не може блокувати основний.');
  const result=manager.create(MissionDefinition,{...await this.base(manager,input),...this.period(input.startsAt,input.endsAt),id:prior?.id??randomUUID(),...(prior?{createdAt:prior.createdAt}:{}),status:'DRAFT',shortDescription:input.shortDescription,difficulty:input.difficulty,estimatedDuration:input.estimatedDuration,rules,...(seedKey?{seedKey}:{})});
  const all=await manager.find(MissionDefinition);acyclic([...all.filter(m=>m.id!==result.id),result].map(m=>({id:m.id,dependencies:m.rules.prerequisites.chainIds})));
  const quests=[...new Set([...rules.steps.map(s=>s.questId),...rules.prerequisites.questIds])];await this.questsExist(manager,quests);
  await manager.save(result);
  await manager.query('DELETE FROM mission_dependencies WHERE mission_id=$1',[result.id]);await manager.query('DELETE FROM mission_quest_links WHERE mission_id=$1',[result.id]);
  for(const questId of quests)await manager.query('INSERT INTO mission_quest_links(mission_id,quest_id) VALUES($1,$2)',[result.id,questId]);
  for(const dependency of new Set(rules.prerequisites.chainIds))await manager.query('INSERT INTO mission_dependencies(mission_id,required_mission_id) VALUES($1,$2)',[result.id,dependency]);
  await this.audit.record(manager,actorId,'MISSION_DEFINITION_SAVED','mission',result.id);return result;
 }
 async saveChallengeWithin(manager:EntityManager,actorId:string,input:ChallengeInputDto,id?:string,seedKey?:string):Promise<ChallengeDefinition>{
  await this.assertAdmin(manager,actorId);await manager.query("SELECT pg_advisory_xact_lock(hashtext('dniproxp:progress-definitions'))");
  const prior=id?await this.challenge(manager,id,true):null;if(prior&&prior.status!=='DRAFT')throw new DomainError(409,'DEFINITION_FROZEN','Опублікований виклик не редагується.');
  const parsed=challengeRulesSchema.safeParse({goals:input.goals,relatedQuestIds:input.relatedQuestIds,categoryIds:input.categoryIds??[],districts:input.districts??[],organizationIds:input.organizationIds??[],milestones:input.milestones??[25,50,75,100]});if(!parsed.success)invalid('Некоректні цілі виклику.');const rules=parsed.data;
  if(!rules.goals.some(g=>!g.isOptional)||new Set(rules.goals.map(g=>g.id)).size!==rules.goals.length||new Set(rules.goals.map(g=>g.metric)).size!==rules.goals.length||new Set(rules.relatedQuestIds).size!==rules.relatedQuestIds.length||new Set(rules.milestones).size!==rules.milestones.length)invalid('Цілі та пороги мають бути унікальними; потрібна обов’язкова ціль.');
  if(!rules.milestones.includes(100))invalid('Пороги мають містити 100% для запису завершення.');
  if(rules.goals.some(g=>goalUnits[g.metric]!==g.unit||(['TREES_PLANTED','HUMANITARIAN_UNITS'].includes(g.metric)&&!Number.isInteger(g.targetValue))))invalid('Метрика та одиниця не узгоджені.');
  await this.questsExist(manager,rules.relatedQuestIds);
  if(rules.organizationIds.length){const count=await manager.createQueryBuilder(Organization,'o').where('o.id IN (:...ids)',{ids:[...new Set(rules.organizationIds)]}).getCount();if(count!==new Set(rules.organizationIds).size)invalid('Невідома організація scope.');}
  const result=manager.create(ChallengeDefinition,{...await this.base(manager,input),...this.period(input.startDate,input.endDate),id:prior?.id??randomUUID(),...(prior?{createdAt:prior.createdAt}:{}),status:'DRAFT',rules,...(seedKey?{seedKey}:{})});if(!result.startsAt||!result.endsAt)invalid('Виклик потребує початку й завершення.');
  await manager.save(result);await manager.query('DELETE FROM challenge_quest_links WHERE challenge_id=$1',[result.id]);for(const questId of rules.relatedQuestIds)await manager.query('INSERT INTO challenge_quest_links(challenge_id,quest_id) VALUES($1,$2)',[result.id,questId]);await this.audit.record(manager,actorId,'CHALLENGE_DEFINITION_SAVED','challenge',result.id);return result;
 }
 async transitionWithin(manager:EntityManager,actorId:string,kind:'mission'|'challenge',id:string,action:'publish'|'archive'|'complete'|'cancel'){
  await this.assertAdmin(manager,actorId);await manager.query("SELECT pg_advisory_xact_lock(hashtext('dniproxp:progress-definitions'))");
  const definition=kind==='mission'?await this.mission(manager,id,true):await this.challenge(manager,id,true);
  if(action==='publish'){
   if(definition.status!=='DRAFT')throw new DomainError(409,'INVALID_TRANSITION','Визначення вже опубліковане.');
   const org=await manager.findOneBy(Organization,{id:definition.organizationId});if(org?.moderationStatus!=='approved')invalid('Організація має бути схвалена.');
   if(definition instanceof MissionDefinition){await this.questsExist(manager,[...definition.rules.steps.map(s=>s.questId),...definition.rules.prerequisites.questIds],true);for(const dep of definition.rules.prerequisites.chainIds)await this.mission(manager,dep);definition.status='PUBLISHED';}
   else {await this.questsExist(manager,definition.rules.relatedQuestIds,true);definition.status='ACTIVE';}
  }else if(definition instanceof MissionDefinition){
   if(action==='cancel'||definition.status==='DRAFT'||definition.status==='ARCHIVED')throw new DomainError(409,'INVALID_TRANSITION','Недопустимий перехід місії.');definition.status=action==='archive'?'ARCHIVED':'COMPLETED';
  }else {if(action!=='cancel'||definition.status==='DRAFT'||definition.status==='CANCELLED')throw new DomainError(409,'INVALID_TRANSITION','Недопустимий перехід виклику.');definition.status='CANCELLED';}
  if(definition instanceof MissionDefinition)await manager.save(MissionDefinition,definition);else await manager.save(ChallengeDefinition,definition);
  await this.audit.record(manager,actorId,'PROGRESS_DEFINITION_TRANSITION',kind,id,{action,status:definition.status});return definition;
 }
 saveMission(actorId:string,input:MissionInputDto,id?:string){return this.transactions.run(m=>this.saveMissionWithin(m,actorId,input,id));}
 saveChallenge(actorId:string,input:ChallengeInputDto,id?:string){return this.transactions.run(m=>this.saveChallengeWithin(m,actorId,input,id));}
 transition(actorId:string,kind:'mission'|'challenge',id:string,action:'publish'|'archive'|'complete'|'cancel'){return this.transactions.run(m=>this.transitionWithin(m,actorId,kind,id,action));}
 async listMissions(input:ProgressQueryDto,admin=false):Promise<MissionPageDto>{const query=this.source.manager.createQueryBuilder(MissionDefinition,'d');if(!admin)query.where("d.status<>'DRAFT'");if(input.category&&input.category!=='all')query.andWhere('d.category=:category',{category:input.category});if(input.search)query.andWhere('d.title ILIKE :search',{search:`%${input.search.replace(/[\\%_]/g,'\\$&')}%`});const [items,total]=await query.orderBy('d.createdAt',input.order).addOrderBy('d.id',input.order).skip((input.page-1)*input.pageSize).take(input.pageSize).getManyAndCount();return {items:items.map(missionView),total,page:input.page,pageSize:input.pageSize};}
 async listChallenges(input:ProgressQueryDto,admin=false):Promise<ChallengePageDto>{const query=this.source.manager.createQueryBuilder(ChallengeDefinition,'d');if(!admin)query.where("d.status<>'DRAFT'");if(input.category&&input.category!=='all')query.andWhere('d.category=:category',{category:input.category});if(input.search)query.andWhere('d.title ILIKE :search',{search:`%${input.search.replace(/[\\%_]/g,'\\$&')}%`});const [items,total]=await query.orderBy('d.createdAt',input.order).addOrderBy('d.id',input.order).skip((input.page-1)*input.pageSize).take(input.pageSize).getManyAndCount();return {items:items.map(challengeView),total,page:input.page,pageSize:input.pageSize};}
}
