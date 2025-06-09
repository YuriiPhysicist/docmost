import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('page_members')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`)
    )
    .addColumn('page_id', 'uuid', (col) =>
      col.references('pages.id').onDelete('cascade').notNull()
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade')
    )
    .addColumn('group_id', 'uuid', (col) =>
      col.references('groups.id').onDelete('cascade')
    )
    .addColumn('role', 'varchar', (col) =>
      col.notNull().check(sql`role IN ('admin', 'writer', 'reader', 'blocked')`)
    )
    .addColumn('inherited_from_space_role', 'varchar', (col) => col)
    .addColumn('cascade_to_children', 'boolean', (col) =>
      col.defaultTo(false).notNull()
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addCheckConstraint(
      'check_user_or_group',
      sql`(("user_id" IS NOT NULL AND "group_id" IS NULL) OR ("user_id" IS NULL AND "group_id" IS NOT NULL))`
    )
    .addUniqueConstraint('unique_page_user', ['page_id', 'user_id'])
    .addUniqueConstraint('unique_page_group', ['page_id', 'group_id'])
    .execute();

  await db.schema
    .createIndex('page_members_page_id_idx')
    .on('page_members')
    .column('page_id')
    .execute();

  await db.schema
    .createIndex('page_members_user_id_idx')
    .on('page_members')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('page_members_group_id_idx')
    .on('page_members')
    .column('group_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('page_members').execute();
}