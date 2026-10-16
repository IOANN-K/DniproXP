import { Column,CreateDateColumn,Entity,PrimaryGeneratedColumn,Unique } from 'typeorm';
import type { PhysicalMetric } from '../progress/domain.js';
export type ContributionMetric={type:string;value:number;unit:string;provenance:string};
@Entity('impact_events') @Unique('impact_source_unique',['sourceVerifiedActivityId'])
export class ImpactEvent {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'source_verified_activity_id'}) sourceVerifiedActivityId:string;
 @Column({type:'uuid',name:'quest_id'}) questId:string;
 @Column({type:'uuid',name:'organization_id'}) organizationId:string;
 @Column({type:'uuid',name:'participant_user_id'}) participantUserId:string;
 @Column({type:'varchar'}) district:string;
 @Column({type:'varchar'}) category:string;
 @Column({type:'timestamptz',name:'occurred_at'}) occurredAt:Date;
 @Column({type:'timestamptz',name:'verified_at'}) verifiedAt:Date;
 @Column({type:'integer',name:'verified_minutes',nullable:true}) verifiedMinutes:number|null;
 @Column({type:'jsonb'}) metrics:ContributionMetric[];
 @Column({type:'varchar'}) provenance:string;
}
@Entity('impact_receipts') @Unique('receipt_source_unique',['verifiedActivityId'])
export class ImpactReceipt {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'user_id'}) userId:string;
 @Column({type:'uuid',name:'verified_activity_id'}) verifiedActivityId:string;
 @Column({type:'uuid',name:'quest_id'}) questId:string;
 @Column({type:'uuid',name:'organization_id'}) organizationId:string;
 @Column({type:'timestamptz',name:'verified_at'}) verifiedAt:Date;
 @Column({type:'integer',name:'verified_minutes',nullable:true}) verifiedMinutes:number|null;
 @Column({type:'jsonb'}) metrics:ContributionMetric[];
 @Column({type:'uuid',name:'public_reference'}) publicReference:string;
 @CreateDateColumn({type:'timestamptz',name:'issued_at'}) issuedAt:Date;
}
@Entity('collective_impact_measurements')
export class CollectiveMeasurement {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({type:'uuid',name:'quest_id'}) questId:string;
 @Column({type:'uuid',name:'organization_id'}) organizationId:string;
 @Column({type:'uuid',name:'source_verified_activity_id'}) sourceVerifiedActivityId:string;
 @Column({type:'varchar'}) category:string;
 @Column({type:'varchar'}) district:string;
 @Column({type:'varchar'}) metric:PhysicalMetric;
 @Column({type:'numeric',precision:20,scale:6}) value:string;
 @Column({type:'varchar'}) unit:string;
 @Column({type:'text'}) summary:string;
 @Column({type:'uuid',name:'verified_by_user_id'}) verifiedByUserId:string;
 @Column({type:'uuid',name:'operation_id'}) operationId:string;
 @Column({type:'uuid',name:'supersedes_id',nullable:true}) supersedesId:string|null;
 @CreateDateColumn({type:'timestamptz',name:'measured_at'}) measuredAt:Date;
}
