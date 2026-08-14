import { Migration } from '@mikro-orm/migrations';

export class Migration20260810120000 extends Migration {
    public override async up(): Promise<void> {
        // Remove duplicate (virtual_id, referenced_entity_type) rows that exist due to the
        // old PK allowing multiple entries per seeding-id + entity-type combination.
        // Keep only the row with the highest ctid (last inserted) for each pair.
        this.addSql(`
            DELETE FROM "seeding_reference" a
            USING "seeding_reference" b
            WHERE a.virtual_id = b.virtual_id
              AND a.referenced_entity_type = b.referenced_entity_type
              AND a.ctid < b.ctid;
        `);

        // Replace the incorrect PK (virtual_id, uuid) with (virtual_id, referenced_entity_type).
        // The old key allowed multiple rows for the same seeding-id + entity-type combination
        // (different uuids), causing duplicate entities to be created on every deployment.
        // The uuid column is kept as a plain non-null column.
        this.addSql('ALTER TABLE "seeding_reference" DROP CONSTRAINT "seeding_reference_pkey";');
        this.addSql(
            'ALTER TABLE "seeding_reference" ADD CONSTRAINT "seeding_reference_pkey" PRIMARY KEY ("virtual_id", "referenced_entity_type");',
        );
    }

    public override async down(): Promise<void> {
        this.addSql('ALTER TABLE "seeding_reference" DROP CONSTRAINT "seeding_reference_pkey";');
        this.addSql(
            'ALTER TABLE "seeding_reference" ADD CONSTRAINT "seeding_reference_pkey" PRIMARY KEY ("virtual_id", "uuid");',
        );
    }
}
