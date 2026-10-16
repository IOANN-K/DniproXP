import { Controller,Get,Param,ParseUUIDPipe,Query,UseGuards } from '@nestjs/common';
import { ApiBearerAuth,ApiOkResponse,ApiOperation,ApiTags } from '@nestjs/swagger';
import { CurrentUser,JwtAuthGuard } from '../auth/authorization.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { IdentityPageQueryDto } from '../skills/skills.dto.js';
import { ImpactService } from '../impact/impact.service.js';
import { ReceiptPageDto } from '../impact/impact.dto.js';
import { VolunteerPassportService } from './passport.service.js';
import { PublicPassportDto,PrivatePassportDto,PassportActivityPageDto } from './passport.dto.js';
@ApiTags('My Volunteer Passport') @ApiErrors() @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('users/me/passport')
export class MyPassportController {
  constructor(private readonly service: VolunteerPassportService,private readonly impact: ImpactService) {}
  @Get() @ApiOkResponse({ type: PrivatePassportDto }) @ApiOperation({ summary: 'Власний паспорт: перевірені джерела, обмежені previews і налаштування BE-01' })
  get(@CurrentUser() a: Principal) { return this.service.own(a.user.id); }
  @Get('activities') @ApiOkResponse({ type: PassportActivityPageDto })
  activities(@CurrentUser() a: Principal,@Query() q: IdentityPageQueryDto) { return this.service.activities(a.user.id,q); }
  @Get('receipts') @ApiOkResponse({ type: ReceiptPageDto })
  receipts(@CurrentUser() a: Principal,@Query() q: IdentityPageQueryDto) { return this.impact.receipts(a.user.id,q); }
}
@ApiTags('Public Volunteer Passport') @ApiErrors() @Controller('users')
export class PublicPassportController {
  constructor(private readonly service: VolunteerPassportService) {}
  @Get(':id/passport') @ApiOkResponse({ type: PublicPassportDto }) @ApiOperation({ summary: 'Завжди public projection, навіть для власника: чинні privacy flags; недоступний профіль — restricted' })
  get(@Param('id',new ParseUUIDPipe({ version: '4' })) id: string) { return this.service.public(id); }
}
