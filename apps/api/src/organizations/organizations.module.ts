import { Module } from '@nestjs/common';
import {
  OrganizationsController,
  AdminOrganizationsController,
} from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationAccess } from './organization-access.service.js';
@Module({
  controllers: [OrganizationsController, AdminOrganizationsController],
  providers: [OrganizationsService, OrganizationAccess],
  exports: [OrganizationAccess],
})
export class OrganizationsModule {}
