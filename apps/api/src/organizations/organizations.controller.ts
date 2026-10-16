import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../auth/authorization.js';
import { RateLimit, RateLimitGuard } from '../auth/rate-limit.guard.js';
import { Role, ModerationStatus } from '../database/entities/domain.js';
import { ApiErrors } from '../common/http.js';
import type { Principal } from '../common/http.js';
import { OrganizationsService } from './organizations.service.js';
import {
  AddMemberDto,
  CreateOrganizationDto,
  ManagedOrganizationDto,
  ManagedOrganizationsPageDto,
  MembershipDto,
  MembershipsPageDto,
  MembershipQueryDto,
  ModerationDto,
  OrganizationDto,
  OrganizationsPageDto,
  PaginationDto,
  UpdateMemberDto,
  UpdateOrganizationDto,
} from './organizations.dto.js';
@ApiTags('Organizations')
@ApiErrors()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}
  @Get()
  @ApiOkResponse({ type: OrganizationsPageDto })
  @ApiOperation({ summary: 'Public approved organizations only' })
  list(@Query() query: PaginationDto): Promise<OrganizationsPageDto> {
    return this.organizations.list(query);
  }
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ManagedOrganizationsPageDto })
  mine(
    @CurrentUser() actor: Principal,
    @Query() query: PaginationDto,
  ): Promise<ManagedOrganizationsPageDto> {
    return this.organizations.mine(actor.user.id, query);
  }
  @Get(':id')
  @ApiOkResponse({ type: OrganizationDto })
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<OrganizationDto> {
    return this.organizations.get(id);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit('organization-create', 10, 3600)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ManagedOrganizationDto })
  @ApiOperation({
    summary:
      'Create pending organization and OWNER membership; authenticated ACTIVE user',
  })
  create(
    @CurrentUser() actor: Principal,
    @Body() body: CreateOrganizationDto,
  ): Promise<ManagedOrganizationDto> {
    return this.organizations.create(actor.user.id, body);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ManagedOrganizationDto })
  @ApiOperation({
    summary: 'Organization OWNER or MANAGER only; edits require re-moderation',
  })
  update(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateOrganizationDto,
  ): Promise<ManagedOrganizationDto> {
    return this.organizations.update(actor.user.id, id, body);
  }
  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MembershipsPageDto })
  @ApiOperation({ summary: 'Active staff of this organization only' })
  members(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: MembershipQueryDto,
  ): Promise<MembershipsPageDto> {
    return this.organizations.members(actor.user.id, id, query);
  }
  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: MembershipDto })
  @ApiOperation({ summary: 'Organization OWNER only' })
  add(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: AddMemberDto,
  ): Promise<MembershipDto> {
    return this.organizations.addMember(actor.user.id, id, body);
  }
  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MembershipDto })
  @ApiOperation({
    summary: 'Organization OWNER only; preserve at least one active OWNER',
  })
  updateMember(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: UpdateMemberDto,
  ): Promise<MembershipDto> {
    return this.organizations.updateMember(actor.user.id, id, userId, body);
  }
  @Delete(':id/members/:userId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiOperation({ summary: 'Organization OWNER only; soft-remove membership' })
  remove(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ): Promise<void> {
    return this.organizations.removeMember(actor.user.id, id, userId);
  }
}
@ApiTags('Administration')
@ApiErrors()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/organizations')
export class AdminOrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}
  @Get('pending')
  @ApiOkResponse({ type: ManagedOrganizationsPageDto })
  @ApiOperation({ summary: 'ADMIN: moderation queue' })
  pending(@Query() query: PaginationDto): Promise<ManagedOrganizationsPageDto> {
    return this.organizations.pending(query);
  }
  @Post(':id/approve')
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedOrganizationDto })
  @ApiOperation({
    summary:
      'ADMIN: approve pending organization or reinstate suspended; no self-moderation',
  })
  approve(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ManagedOrganizationDto> {
    return this.organizations.moderate(
      actor.user.id,
      id,
      ModerationStatus.APPROVED,
      null,
    );
  }
  @Post(':id/reject')
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedOrganizationDto })
  @ApiOperation({ summary: 'ADMIN: reject pending organization with reason' })
  reject(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ModerationDto,
  ): Promise<ManagedOrganizationDto> {
    return this.organizations.moderate(
      actor.user.id,
      id,
      ModerationStatus.REJECTED,
      body.reason,
    );
  }
  @Post(':id/suspend')
  @HttpCode(200)
  @ApiOkResponse({ type: ManagedOrganizationDto })
  @ApiOperation({ summary: 'ADMIN: suspend approved organization with reason' })
  suspend(
    @CurrentUser() actor: Principal,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ModerationDto,
  ): Promise<ManagedOrganizationDto> {
    return this.organizations.moderate(
      actor.user.id,
      id,
      ModerationStatus.SUSPENDED,
      body.reason,
    );
  }
}
