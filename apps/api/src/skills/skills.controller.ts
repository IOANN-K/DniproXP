import { Controller,Get,Param,ParseUUIDPipe,Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiOkResponse,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard } from '../auth/authorization.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { SkillProgressEngine } from './skill-progress.engine.js';
import { IdentityPageQueryDto,SkillDefinitionDto,SkillDefinitionPageDto,SkillProgressPageDto,SkillEvidencePageDto,PublicSkillPageDto } from './skills.dto.js';
const uuid = new ParseUUIDPipe({ version: '4' });
@ApiTags('Skills') @ApiErrors() @Controller('skills')
export class SkillsController {
  constructor(private readonly engine: SkillProgressEngine) {}
  @Get() @ApiOkResponse({ type: SkillDefinitionPageDto })
  list(@Query() q: IdentityPageQueryDto) { return this.engine.definitions(q); }
  @Get(':id') @ApiOkResponse({ type: SkillDefinitionDto })
  get(@Param('id',uuid) id: string) { return this.engine.definition(id); }
}
@ApiTags('My Skills') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('users/me/skills')
export class MySkillsController {
  constructor(private readonly engine: SkillProgressEngine) {}
  @Get() @ApiOkResponse({ type: SkillProgressPageDto })
  list(@CurrentUser() a: Principal,@Query() q: IdentityPageQueryDto) { return this.engine.own(a.user.id,q); }
  @Get(':id/evidence') @ApiOkResponse({ type: SkillEvidencePageDto })
  evidence(@CurrentUser() a: Principal,@Param('id',uuid) id: string,@Query() q: IdentityPageQueryDto) { return this.engine.evidence(a.user.id,id,q); }
}
@ApiTags('Public Skills') @ApiErrors() @Controller('users')
export class PublicSkillsController {
  constructor(private readonly engine: SkillProgressEngine) {}
  @Get(':id/skills') @ApiOkResponse({ type: PublicSkillPageDto })
  get(@Param('id',uuid) id: string,@Query() q: IdentityPageQueryDto) { return this.engine.public(id,q); }
}
