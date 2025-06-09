import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageMemberRepo } from '@docmost/db/repos/page-member/page-member.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { GroupRepo } from '@docmost/db/repos/group/group.repo';
import {
  PageRole,
  SpaceRole,
  EffectivePageRole
} from '../../../common/helpers/types/permission';
import { findHighestUserSpaceRole } from '@docmost/db/repos/space/utils';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { InjectKysely } from 'nestjs-kysely';
import { executeTx } from '@docmost/db/utils';
import {
  SetPagePermissionDto
} from '../dto/page-member.dto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@Injectable()
export class PageMemberService {
  constructor(
    private pageMemberRepo: PageMemberRepo,
    private spaceMemberRepo: SpaceMemberRepo,
    private pageRepo: PageRepo,
    private userRepo: UserRepo,
    private groupRepo: GroupRepo,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async getUserEffectiveRole(
    userId: string,
    pageId: string
  ): Promise<EffectivePageRole> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const userSpaceRoles = await this.spaceMemberRepo.getUserSpaceRoles(
      userId,
      page.spaceId
    );

    const spaceRole = findHighestUserSpaceRole(userSpaceRoles);

    if (spaceRole === SpaceRole.ADMIN) {
      return PageRole.ADMIN;
    }

    const pageOverride = await this.pageMemberRepo.findPagePermission(
      pageId,
      { userId }
    );

    if (pageOverride) {
      return pageOverride.role as PageRole;
    }

    const groupOverrides = await this.pageMemberRepo.getUserPagePermissions(
      userId,
      [pageId]
    );

    if (groupOverrides.length > 0) {
      const highestGroupRole = this.findHighestPageRole(
        groupOverrides.map(o => o.role as PageRole)
      );
      return highestGroupRole;
    }

    const cascadeBlocked = await this.checkCascadeBlocked(userId, pageId);
    if (cascadeBlocked) {
      return PageRole.BLOCKED;
    }

    return spaceRole as EffectivePageRole;
  }

  async setPagePermission(
    dto: SetPagePermissionDto,
    authUserId: string,
    workspaceId: string,
  ): Promise<void> {
    const page = await this.pageRepo.findById(dto.pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (dto.userId) {
      const user = await this.userRepo.findById(dto.userId, workspaceId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    if (dto.groupId) {
      const group = await this.groupRepo.findById(dto.groupId, workspaceId);
      if (!group) {
        throw new NotFoundException('Group not found');
      }
    }

    await executeTx(this.db, async (trx) => {
      const spaceRole = await this.getTargetSpaceRole(
        dto.userId,
        dto.groupId,
        page.spaceId
      );

      if (this.isEquivalentRole(dto.role, spaceRole)) {
        await this.pageMemberRepo.deletePagePermission(
          dto.pageId,
          { userId: dto.userId, groupId: dto.groupId },
          trx
        );
        return;
      }

      if (!this.canSetRole(spaceRole, dto.role)) {
        throw new BadRequestException(
          `Cannot elevate role from ${spaceRole} to ${dto.role}`
        );
      }

      const existingOverride = await this.pageMemberRepo.findPagePermission(
        dto.pageId,
        { userId: dto.userId, groupId: dto.groupId },
        trx
      );

      if (existingOverride) {
        await this.pageMemberRepo.updatePageMember(
          {
            role: dto.role,
            cascadeToChildren: dto.cascadeToChildren || false,
            inheritedFromSpaceRole: spaceRole,
          },
          existingOverride.id,
          trx
        );
      } else {
        await this.pageMemberRepo.insertPageMember(
          {
            pageId: dto.pageId,
            userId: dto.userId,
            groupId: dto.groupId,
            role: dto.role,
            cascadeToChildren: dto.cascadeToChildren || false,
            inheritedFromSpaceRole: spaceRole,
          },
          trx
        );
      }

      if (dto.role === PageRole.BLOCKED && dto.cascadeToChildren) {
        await this.applyCascadeBlocked(dto.pageId, dto.userId, dto.groupId, trx);
      }
    });
  }

  async getPageMembersWithEffectiveRoles(
    pageId: string,
    pagination: PaginationOptions,
  ): Promise<any> {
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return this.pageMemberRepo.getPageMembersWithEffectiveRoles(
      pageId,
      page.spaceId,
      pagination
    );
  }

  private isEquivalentRole(pageRole: PageRole, spaceRole: SpaceRole): boolean {
    return pageRole === spaceRole as string;
  }

  private canSetRole(spaceRole: SpaceRole, pageRole: PageRole): boolean {
    if (pageRole === PageRole.BLOCKED) return true;

    const roleHierarchy = {
      [SpaceRole.ADMIN]: [PageRole.ADMIN, PageRole.WRITER, PageRole.READER],
      [SpaceRole.WRITER]: [PageRole.WRITER, PageRole.READER],
      [SpaceRole.READER]: [PageRole.READER],
    };

    return roleHierarchy[spaceRole]?.includes(pageRole) || false;
  }

  private async getTargetSpaceRole(
    userId?: string,
    groupId?: string,
    spaceId?: string
  ): Promise<SpaceRole> {
    if (userId) {
      const userSpaceRoles = await this.spaceMemberRepo.getUserSpaceRoles(
        userId,
        spaceId
      );
      return findHighestUserSpaceRole(userSpaceRoles) as SpaceRole;
    }

    if (groupId) {
      const groupMember = await this.spaceMemberRepo.getSpaceMemberByTypeId(
        spaceId,
        { groupId }
      );
      return groupMember?.role as SpaceRole;
    }

    throw new BadRequestException('Either userId or groupId must be provided');
  }

  private findHighestPageRole(roles: PageRole[]): PageRole {
    const hierarchy = {
      [PageRole.ADMIN]: 4,
      [PageRole.WRITER]: 3,
      [PageRole.READER]: 2,
      [PageRole.BLOCKED]: 1,
    };

    return roles.reduce((highest, current) =>
      hierarchy[current] > hierarchy[highest] ? current : highest
    );
  }

  private async checkCascadeBlocked(
    userId: string,
    pageId: string
  ): Promise<boolean> {
    const ancestors = await this.db
      .withRecursive('page_ancestors', (db) =>
        db
          .selectFrom('pages')
          .select(['id', 'parentPageId'])
          .where('id', '=', pageId)
          .unionAll((exp) =>
            exp
              .selectFrom('pages as p')
              .select(['p.id', 'p.parentPageId'])
              .innerJoin('page_ancestors as pa', 'pa.parentPageId', 'p.id'),
          ),
      )
      .selectFrom('page_ancestors')
      .select(['id'])
      .where('id', '!=', pageId)
      .execute();

    if (ancestors.length === 0) {
      return false;
    }

    const ancestorIds = ancestors.map(a => a.id);

    const cascadeBlocks = await this.pageMemberRepo.getUserPagePermissions(
      userId,
      ancestorIds
    );

    return cascadeBlocks.some(block =>
      block.role === PageRole.BLOCKED && block.cascadeToChildren
    );
  }

  private async applyCascadeBlocked(
    parentPageId: string,
    userId?: string,
    groupId?: string,
    trx?: KyselyTransaction,
  ): Promise<void> {
    const descendants = await this.pageMemberRepo.getDescendantPages(
      parentPageId,
      trx
    );

    for (const descendant of descendants) {
      await this.pageMemberRepo.insertPageMember(
        {
          pageId: descendant.id,
          userId,
          groupId,
          role: PageRole.BLOCKED,
          cascadeToChildren: true,
        },
        trx
      );
    }
  }
}