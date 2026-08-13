import { Migration } from '@mikro-orm/migrations';

export class Migration20260810120000 extends Migration {
    public override async up(): Promise<void> {
        // Delete orphaned rolle records — those whose UUID is not referenced in seeding_reference
        // but whose (name, administered_by_schulstrukturknoten, rollenart) matches a rolle that IS
        // referenced. These are leftovers from duplicate seeding runs (e.g. the July-9 batch when
        // seeding_reference already pointed at the July-10 batch created the next day).
        // Personenkontexte that point to orphaned roles are removed first to satisfy FK constraints.
        this.addSql(`
            DELETE FROM "personenkontext"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE r.id NOT IN (
                    SELECT uuid FROM "seeding_reference" WHERE referenced_entity_type = 'ROLLE'
                )
                AND EXISTS (
                    SELECT 1 FROM "rolle" r2
                    INNER JOIN "seeding_reference" sr
                        ON sr.uuid = r2.id AND sr.referenced_entity_type = 'ROLLE'
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                )
            );
        `);

        this.addSql(`
            DELETE FROM "rolle" r
            WHERE r.id NOT IN (
                SELECT uuid FROM "seeding_reference" WHERE referenced_entity_type = 'ROLLE'
            )
            AND EXISTS (
                SELECT 1 FROM "rolle" r2
                INNER JOIN "seeding_reference" sr
                    ON sr.uuid = r2.id AND sr.referenced_entity_type = 'ROLLE'
                WHERE r2.name = r.name
                  AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                  AND r2.rollenart = r.rollenart
            );
        `);

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
