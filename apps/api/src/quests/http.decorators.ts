import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/authorization.js';
import { Role } from '../database/entities/domain.js';
export function OrganizerRoute(summary: string) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.ORGANIZER),
    ApiBearerAuth(),
    ApiOperation({
      summary,
      description:
        'Active staff membership of this organization is mandatory. ADMIN has no scope bypass.',
    }),
  );
}
export function VolunteerRoute() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(Role.VOLUNTEER),
    ApiBearerAuth(),
  );
}
