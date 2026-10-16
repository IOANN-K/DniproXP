import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module.js';
import { MissionProgressEngine } from '../missions/mission-progress.engine.js';
import { ChallengeProgressEngine } from '../challenges/challenge-progress.engine.js';
import { DefinitionService } from './definition.service.js';
import { ProgressService } from './progress.service.js';
import { RewardClaimsService } from './reward-claims.service.js';
import { VerifiedProgressService } from './verified-progress.service.js';

@Module({
  imports: [LedgerModule],
  providers: [DefinitionService, ProgressService, RewardClaimsService, MissionProgressEngine, ChallengeProgressEngine, VerifiedProgressService],
  exports: [DefinitionService, ProgressService, RewardClaimsService, MissionProgressEngine, ChallengeProgressEngine, VerifiedProgressService],
})
export class ProgressModule {}
