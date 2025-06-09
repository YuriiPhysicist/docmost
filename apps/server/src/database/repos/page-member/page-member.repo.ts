import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import {
  PageMember,
  InsertablePageMember,
  UpdatablePageMember,
} from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithPagination } from '@docmost/db/pagination/pagination';
import { sql } from 'kysely';

@Injectable()
export class PageMemberRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findPagePermission(
    pageId: string,
    opts: { userId?: string; groupId?: string },
    trx?: KyselyTransaction,
  ): Promise<PageMember> {
    const db = dbOrTx(this.db, trx);

    let query = db
      .selectFrom('pageMembers')
      .selectAll()
      .where('pageId', '=', pageId);

    if (opts.userId) {
      query = query.where('userId', '=', opts.userId);
    } else if (opts.groupId) {
      query = query.where('groupId', '=', opts.groupId);
    } else {
      throw new Error('Either userId or groupId must be provided');
    }

    return query.executeTakeFirst();
  }

  async getPageMembersWithEffectiveRoles(
    pageId: string,
    spaceId: string,
    pagination: PaginationOptions,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);

    let query = db
      .selectFrom('spaceMembers')
      .leftJoin('users', 'users.id', 'spaceMembers.userId')
      .leftJoin('groups', 'groups.id', 'spaceMembers.groupId')
      .leftJoin('pageMembers', (join) =>
        join
          .onRef('pageMembers.pageId', '=', sql.literal(pageId))
          .on((eb) =>
            eb.or([
              eb.and([
                eb('pageMembers.userId', 'is not', null),
                eb('pageMembers.userId', '=', eb.ref('spaceMembers.userId'))
              ]),
              eb.and([
                eb('pageMembers.groupId', 'is not', null),
                eb('pageMembers.groupId', '=', eb.ref('spaceMembers.groupId'))
              ])
            ])
          )
      )
      .select([
        'spaceMembers.id as spaceMemberId',
        'spaceMembers.role as spaceRole',
        'spaceMembers.createdAt as memberSince',
        'pageMembers.id as pagePermissionId',
        'pageMembers.role as pageRole',
        'pageMembers.cascadeToChildren',
        'pageMembers.createdAt as pagePermissionCreatedAt',
        'users.id as userId',
        'users.name as userName',
        'users.email as userEmail',
        'users.avatarUrl as userAvatarUrl',
        'groups.id as groupId',
        'groups.name as groupName',
        'groups.isDefault as groupIsDefault',
      ])
      .where('spaceMembers.spaceId', '=', spaceId)
      .orderBy('spaceMembers.createdAt', 'asc');

    if (pagination.query) {
      query = query.where((eb) =>
        eb('users.name', 'ilike', `%${pagination.query}%`)
          .or('users.email', 'ilike', `%${pagination.query}%`)
          .or('groups.name', 'ilike', `%${pagination.query}%`),
      );
    }

    const result = await executeWithPagination(query, {
      page: pagination.page,
      perPage: pagination.limit,
    });

    const groupIds = result.items
      .filter(item => item.groupId)
      .map(item => item.groupId);

    let groupMembers = [];
    if (groupIds.length > 0) {
      groupMembers = await db
        .selectFrom('groupUsers')
        .innerJoin('users', 'users.id', 'groupUsers.userId')
        .select([
          'groupUsers.groupId',
          'users.id as userId',
          'users.name as userName',
          'users.email as userEmail',
          'users.avatarUrl as userAvatarUrl',
        ])
        .where('groupUsers.groupId', 'in', groupIds)
        .where('users.deletedAt', 'is', null)
        .orderBy('users.name', 'asc')
        .execute();
    }

    // Групуємо користувачів по групах
    const membersByGroup = groupMembers.reduce((acc, member) => {
      if (!acc[member.groupId]) {
        acc[member.groupId] = [];
      }
      acc[member.groupId].push({
        id: member.userId,
        name: member.userName,
        email: member.userEmail,
        avatarUrl: member.userAvatarUrl,
      });
      return acc;
    }, {} as Record<string, any[]>);

    result.items = result.items.map(item => ({
      ...item,
      groupMembers: item.groupId ? (membersByGroup[item.groupId] || []) : undefined,
    }));

    return result;
  }

  async insertPageMember(
    insertablePageMember: InsertablePageMember,
    trx?: KyselyTransaction,
  ): Promise<PageMember> {
    const db = dbOrTx(this.db, trx);

    return db
      .insertInto('pageMembers')
      .values(insertablePageMember)
      .returningAll()
      .executeTakeFirst();
  }

  async updatePageMember(
    updatablePageMember: UpdatablePageMember,
    pageMemberId: string,
    trx?: KyselyTransaction,
  ): Promise<PageMember> {
    const db = dbOrTx(this.db, trx);

    return db
      .updateTable('pageMembers')
      .set({ ...updatablePageMember, updatedAt: new Date() })
      .where('id', '=', pageMemberId)
      .returningAll()
      .executeTakeFirst();
  }

  async deletePagePermission(
    pageId: string,
    opts: { userId?: string; groupId?: string },
    trx?: KyselyTransaction,
  ): Promise<void> {
    const db = dbOrTx(this.db, trx);

    let query = db
      .deleteFrom('pageMembers')
      .where('pageId', '=', pageId);

    if (opts.userId) {
      query = query.where('userId', '=', opts.userId);
    } else if (opts.groupId) {
      query = query.where('groupId', '=', opts.groupId);
    } else {
      throw new Error('Either userId or groupId must be provided');
    }

    await query.execute();
  }

  async getPageOverrides(
    pageId: string,
    pagination: PaginationOptions,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);

    let query = db
      .selectFrom('pageMembers')
      .leftJoin('users', 'users.id', 'pageMembers.userId')
      .leftJoin('groups', 'groups.id', 'pageMembers.groupId')
      .select([
        'pageMembers.id',
        'pageMembers.pageId',
        'pageMembers.role',
        'pageMembers.inheritedFromSpaceRole',
        'pageMembers.cascadeToChildren',
        'pageMembers.createdAt',
        'pageMembers.updatedAt',
        'users.id as userId',
        'users.name as userName',
        'users.email as userEmail',
        'users.avatarUrl as userAvatarUrl',
        'groups.id as groupId',
        'groups.name as groupName',
        'groups.isDefault as groupIsDefault',
      ])
      .where('pageMembers.pageId', '=', pageId)
      .orderBy('pageMembers.createdAt', 'asc');

    if (pagination.query) {
      query = query.where((eb) =>
        eb('users.name', 'ilike', `%${pagination.query}%`)
          .or('users.email', 'ilike', `%${pagination.query}%`)
          .or('groups.name', 'ilike', `%${pagination.query}%`),
      );
    }

    return executeWithPagination(query, {
      page: pagination.page,
      perPage: pagination.limit,
    });
  }

  async getUserPagePermissions(
    userId: string,
    pageIds: string[],
    trx?: KyselyTransaction,
  ): Promise<PageMember[]> {
    if (pageIds.length === 0) return [];

    const db = dbOrTx(this.db, trx);

    const directPermissions = await db
      .selectFrom('pageMembers')
      .selectAll()
      .where('userId', '=', userId)
      .where('pageId', 'in', pageIds)
      .execute();

    const groupPermissions = await db
      .selectFrom('pageMembers')
      .innerJoin('groupUsers', 'groupUsers.groupId', 'pageMembers.groupId')
      .selectAll('pageMembers')
      .where('groupUsers.userId', '=', userId)
      .where('pageMembers.pageId', 'in', pageIds)
      .execute();

    return [...directPermissions, ...groupPermissions];
  }

  async getDescendantPages(
    parentPageId: string,
    trx?: KyselyTransaction,
  ): Promise<{ id: string }[]> {
    const db = dbOrTx(this.db, trx);

    return db
      .withRecursive('page_hierarchy', (db) =>
        db
          .selectFrom('pages')
          .select(['id'])
          .where('parentPageId', '=', parentPageId)
          .unionAll((exp) =>
            exp
              .selectFrom('pages as p')
              .select(['p.id'])
              .innerJoin('page_hierarchy as ph', 'p.parentPageId', 'ph.id'),
          ),
      )
      .selectFrom('page_hierarchy')
      .select(['id'])
      .execute();
  }
}