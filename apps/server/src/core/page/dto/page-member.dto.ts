import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { PageRole } from '../../../common/helpers/types/permission';

export class PageIdDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;
}

export class SetPagePermissionDto extends PageIdDto {
  @ValidateIf((o) => !o.groupId)
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ValidateIf((o) => !o.userId)
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsEnum(PageRole)
  role: PageRole;

  @IsOptional()
  @IsBoolean()
  cascadeToChildren?: boolean;
}

export class BulkSetPagePermissionsDto extends PageIdDto {
  @IsArray()
  permissions: SetPagePermissionDto[];
}

export interface PagePermissionResponse {
  id: string;
  pageId: string;
  role: PageRole;
  inheritedFromSpaceRole?: string;
  cascadeToChildren: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  group?: {
    id: string;
    name: string;
    isDefault: boolean;
    memberCount?: number;
  };
}

export interface EffectivePermissionResponse {
  pageId: string;
  userId: string;
  effectiveRole: PageRole;
  source: 'space' | 'page_direct' | 'page_inherited';
  inheritedFromPageId?: string;
}