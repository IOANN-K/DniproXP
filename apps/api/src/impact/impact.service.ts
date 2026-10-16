import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Transactions } from '../database/database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { QuestPolicy,conflict } from '../quests/quest.policy.js';
import { VerifiedActivity } from '../ledger/ledger.entity.js';
import { Organization } from '../database/entities/organization.entity.js';
import { DomainError } from '../common/http.js';
import { rows,numeric,text,iso } from '../progress/sql.js';
import { physicalMetrics,physicalUnits } from '../progress/domain.js';
import { ChallengeProgressEngine } from '../challenges/challenge-progress.engine.js';
import { ImpactReceipt,CollectiveMeasurement } from './impact.entity.js';
import type { ImpactFilterDto,ImpactSummaryDto,ImpactOverviewDto,ImpactGroupDto,ReceiptQueryDto,ReceiptDto,ReceiptPageDto,PublicReceiptDto,MeasurementDto,CollectiveMeasurementDto } from './impact.dto.js';
@Injectable()
export class ImpactService {
 constructor(private readonly source:DataSource,private readonly transactions:Transactions,private readonly policy:QuestPolicy,private readonly audit:AuditService,private readonly challenges:ChallengeProgressEngine) {}
 private where(input:ImpactFilterDto,userId?:string) {
  const args:unknown[]=[];const conditions:string[]=[];const bind=(value:unknown)=>{args.push(value);return '$'+args.length;};
  if(input.from&&input.to&&input.from>input.to)throw new DomainError(422,'INVALID_PERIOD','Початок періоду має передувати завершенню.');
  if(input.from)conditions.push(`verified_at>=(${bind(input.from)}::date::timestamp AT TIME ZONE 'Europe/Kyiv')`);
  if(input.to)conditions.push(`verified_at<((${bind(input.to)}::date+1)::timestamp AT TIME ZONE 'Europe/Kyiv')`);
  if(input.district)conditions.push(`district=${bind(input.district)}`);
  if(input.category)conditions.push(`category=${bind(input.category)}`);
  if(input.organization)conditions.push(`organization_id=${bind(input.organization)}`);
  if(userId)conditions.push(`participant_user_id=${bind(userId)}`);
  return {args,sql:conditions.length?conditions.join(' AND '):'true'};
 }
 private async aggregate(manager:EntityManager,input:ImpactFilterDto,userId?:string,group?:'district'|'category'):Promise<ImpactSummaryDto[]|ImpactGroupDto[]> {
  const filter=this.where(input,userId),collective=this.where(input);const groupColumn=group??"'all'";
  const data=rows(await manager.query(`WITH selected AS (SELECT * FROM impact_events WHERE ${filter.sql}),
   collective_selected AS (SELECT * FROM current_collective_impact WHERE ${collective.sql.replace(/\bverified_at\b/g,'measured_at')} ${userId?'AND false':''}),
   personal AS (SELECT ${groupColumn} AS key,count(*)::text AS contributions,count(DISTINCT participant_user_id)::text AS volunteers,sum(verified_minutes)::text AS minutes,count(*) FILTER(WHERE verified_minutes IS NULL)::text AS unknown FROM selected ${group?'GROUP BY '+group:''}),
   measured AS (SELECT ${groupColumn} AS key,metric,sum(value)::text AS value FROM collective_selected GROUP BY 1,metric),
   scope AS (SELECT ${groupColumn} AS key,quest_id,organization_id FROM selected UNION SELECT ${groupColumn} AS key,quest_id,organization_id FROM collective_selected),
   dimensions AS (SELECT key,count(DISTINCT quest_id)::text AS quests,count(DISTINCT organization_id)::text AS organizations FROM scope GROUP BY key),
   keys AS (SELECT key FROM personal UNION SELECT key FROM measured)
   SELECT k.key,COALESCE(p.contributions,'0') AS contributions,COALESCE(p.volunteers,'0') AS volunteers,COALESCE(d.quests,'0') AS quests,COALESCE(d.organizations,'0') AS organizations,p.minutes,COALESCE(p.unknown,'0') AS unknown,
    COALESCE((SELECT jsonb_object_agg(metric,value) FROM measured WHERE measured.key=k.key),'{}') AS physical
   FROM keys k LEFT JOIN personal p ON p.key=k.key LEFT JOIN dimensions d ON d.key=k.key ORDER BY k.key`,filter.args));
  return data.map(row=> {
   const physical=row.physical;if(typeof physical!=='object'||physical===null||Array.isArray(physical))throw new Error('Invalid metric projection');
   const values=Object.fromEntries(Object.entries(physical));
   const summary:ImpactSummaryDto={verifiedHours:row.minutes===null?null:Math.round((numeric(row.minutes)/60+Number.EPSILON)*100)/100,unknownMinutesCount:numeric(row.unknown),verifiedContributions:numeric(row.contributions),uniqueVolunteers:numeric(row.volunteers),completedActivities:numeric(row.quests),contributingOrganizations:numeric(row.organizations),metrics:physicalMetrics.map(metric=>({type:metric,value:values[metric]===undefined?null:Math.round((numeric(values[metric])+Number.EPSILON)*100)/100,unit:physicalUnits[metric]})),provenance:'organizer-confirmation'};
   return group?{...summary,key:text(row.key)}:summary;
  });
 }
 async summary(input:ImpactFilterDto,userId?:string):Promise<ImpactOverviewDto> {
  return this.source.transaction('REPEATABLE READ',async manager=>{
  const items=await this.aggregate(manager,input,userId);const first=items[0];if(!first)throw new Error('Missing aggregate');
  const filter=this.where(input,userId);
  const trends=rows(await manager.query(`SELECT to_char(verified_at AT TIME ZONE 'Europe/Kyiv','YYYY-MM-DD') AS day,count(*)::text AS contributions,sum(verified_minutes)::text AS minutes FROM impact_events WHERE ${filter.sql} GROUP BY 1 ORDER BY 1`,filter.args)).map(row=>({day:text(row.day),contributions:numeric(row.contributions),verifiedHours:row.minutes===null?null:Math.round((numeric(row.minutes)/60+Number.EPSILON)*100)/100}));
  return {...first,trends};
  });
 }
 async groups(input:ImpactFilterDto,group:'district'|'category'):Promise<ImpactGroupDto[]> {
  const result=await this.aggregate(this.source.manager,input,undefined,group);
  return result.map(item=>{if(!('key'in item)||typeof item.key!=='string')throw new Error('Missing group');return {...item,key:item.key};});
 }
 async organization(id:string,input:ImpactFilterDto):Promise<ImpactOverviewDto> {
  const org=await this.source.manager.findOneBy(Organization,{id});if(!org||org.moderationStatus!=='approved')throw new DomainError(404,'NOT_FOUND','Організацію не знайдено.');
  return this.summary({...input,organization:id});
 }
 private receiptView(row:ImpactReceipt):ReceiptDto {return {id:row.id,userId:row.userId,verifiedActivityId:row.verifiedActivityId,questId:row.questId,organizationId:row.organizationId,verifiedAt:row.verifiedAt.toISOString(),verifiedMinutes:row.verifiedMinutes,metrics:row.metrics.map(m=>({type:m.type,value:m.value,unit:m.unit,provenance:m.provenance})),publicReference:row.publicReference,issuedAt:row.issuedAt.toISOString()};}
 async receipts(userId:string,input:ReceiptQueryDto):Promise<ReceiptPageDto> {
  const [items,total]=await this.source.manager.findAndCount(ImpactReceipt,{where:{userId},order:{issuedAt:input.order,id:input.order},skip:(input.page-1)*input.pageSize,take:input.pageSize});return {items:items.map(row=>this.receiptView(row)),total,page:input.page,pageSize:input.pageSize};
 }
 async receipt(userId:string,id:string):Promise<ReceiptDto> {
  const row=await this.source.manager.findOneBy(ImpactReceipt,{id,userId});if(!row)throw new DomainError(404,'NOT_FOUND','Квитанцію не знайдено.');return this.receiptView(row);
 }
 async publicReceipt(reference:string):Promise<PublicReceiptDto> {
  const result=rows(await this.source.query(`SELECT r.public_reference,r.verified_at,r.issued_at,r.verified_minutes,q.title,p.show_verified_hours,p.show_organizations,o.name FROM impact_receipts r JOIN user_preferences p ON p.user_id=r.user_id JOIN users u ON u.id=r.user_id JOIN quests q ON q.id=r.quest_id JOIN organizations o ON o.id=r.organization_id WHERE r.public_reference=$1 AND p.public_profile AND p.show_activity_history AND u.status='ACTIVE' AND q.published_at IS NOT NULL AND q.lifecycle<>'draft' AND q.moderation='approved' AND o.moderation_status='approved'`,[reference]));const row=result[0];if(!row)throw new DomainError(404,'NOT_FOUND','Публічне підтвердження недоступне.');
  return {valid:true,publicReference:text(row.public_reference),verifiedAt:iso(row.verified_at),issuedAt:iso(row.issued_at),questTitle:text(row.title),...(row.show_verified_hours===true?{verifiedMinutes:row.verified_minutes===null?null:numeric(row.verified_minutes)}:{}),...(row.show_organizations===true?{organizationName:text(row.name)}:{})};
 }
 async measurements(actorId:string,questId:string):Promise<CollectiveMeasurementDto[]> {
  return this.transactions.run(async manager=>{
   await this.policy.lock(manager,questId,actorId,'verify');
   const items=await manager.createQueryBuilder(CollectiveMeasurement,'m').where('m.questId=:questId',{questId}).andWhere('NOT EXISTS(SELECT 1 FROM collective_impact_measurements replacement WHERE replacement.supersedes_id=m.id)').orderBy('m.metric','ASC').getMany();
   return items.map(row=>({id:row.id,questId:row.questId,metric:row.metric,value:numeric(row.value),unit:row.unit,summary:row.summary,supersedesId:row.supersedesId,measuredAt:row.measuredAt.toISOString(),sourceVerifiedActivityId:row.sourceVerifiedActivityId,verifiedByUserId:row.verifiedByUserId}));
  });
 }
 async measure(actorId:string,questId:string,input:MeasurementDto):Promise<CollectiveMeasurementDto> {
  if(physicalUnits[input.metric]!==input.unit||(['count','units'].includes(input.unit)&&!Number.isInteger(input.value)))throw new DomainError(422,'INVALID_METRIC','Тип, одиниця та значення метрики не узгоджені.');
  return this.transactions.run(async manager=> {
   const {quest}=await this.policy.lock(manager,questId,actorId,'verify');
   const old=await manager.findOneBy(CollectiveMeasurement,{questId,operationId:input.operationId});
   const view=(row:CollectiveMeasurement):CollectiveMeasurementDto=>({id:row.id,questId:row.questId,metric:row.metric,value:numeric(row.value),unit:row.unit,summary:row.summary,supersedesId:row.supersedesId,measuredAt:row.measuredAt.toISOString(),sourceVerifiedActivityId:row.sourceVerifiedActivityId,verifiedByUserId:row.verifiedByUserId});
   if(old){if(old.metric!==input.metric||numeric(old.value)!==input.value||old.unit!==input.unit||old.summary!==input.summary||old.supersedesId!==(input.supersedesId??null))conflict('Ключ операції вже використано.','IDEMPOTENCY_CONFLICT');return view(old);}
   if(['draft','cancelled'].includes(quest.lifecycle)||quest.moderation!=='approved'||quest.archivedFrom==='cancelled')conflict('Квест недоступний для підтвердження вимірів.');
   const source=await manager.findOne(VerifiedActivity,{where:{questId},order:{verifiedAt:'ASC',id:'ASC'}});if(!source)conflict('Спочатку потрібна підтверджена участь.');
   const current=rows(await manager.query('SELECT id FROM current_collective_impact WHERE quest_id=$1 AND metric=$2',[questId,input.metric]))[0];
   if((current?text(current.id):null)!==(input.supersedesId??null))conflict('Вимір уже змінено. Онови дані.','MEASUREMENT_REVISION_CONFLICT');
   const measurement=await manager.save(CollectiveMeasurement,manager.create(CollectiveMeasurement,{questId,organizationId:source.organizationId,sourceVerifiedActivityId:source.id,category:source.categoryId,district:source.district,metric:input.metric,value:String(input.value),unit:input.unit,summary:input.summary,operationId:input.operationId,supersedesId:input.supersedesId??null,verifiedByUserId:actorId}));
   await this.audit.record(manager,actorId,'COLLECTIVE_MEASUREMENT_VERIFIED','collective_measurement',measurement.id,{questId,metric:input.metric,supersedesId:measurement.supersedesId});await this.challenges.reconcileAll(manager);return view(measurement);
  });
 }
}
