import { Migration } from '@mikro-orm/migrations';

export class Migration20260810120000 extends Migration {
    public override async up(): Promise<void> {
        // Delete orphaned person records caused by a seeding_reference table reset:
        // when the reference table was cleared the seeding re-created all persons fresh,
        // leaving the older batch permanently orphaned. We keep the newest person per
        // (familienname, vorname, ist_technisch) group and delete any older duplicates.
        // FK-dependent personenkontexte are removed first.
        this.addSql(`
            DELETE FROM "personenkontext"
            WHERE person_id_id IN (
                SELECT p.id FROM "person" p
                WHERE EXISTS (
                    SELECT 1 FROM "person" p2
                    WHERE p2.familienname = p.familienname
                      AND p2.vorname = p.vorname
                      AND p2.ist_technisch = p.ist_technisch
                      AND p2.created_at > p.created_at
                )
            );
        `);

        this.addSql(`
            DELETE FROM "person"
            WHERE id IN (
                SELECT p.id FROM "person" p
                WHERE EXISTS (
                    SELECT 1 FROM "person" p2
                    WHERE p2.familienname = p.familienname
                      AND p2.vorname = p.vorname
                      AND p2.ist_technisch = p.ist_technisch
                      AND p2.created_at > p.created_at
                )
            );
        `);

        // Delete orphaned rolle records using the same strategy: keep the newest per
        // (name, administered_by_schulstrukturknoten, rollenart) group.
        // Personenkontexte that reference orphaned roles are removed first.
        this.addSql(`
            DELETE FROM "personenkontext"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.created_at > r.created_at
                )
            );
        `);

        this.addSql(`
            DELETE FROM "rolle"
            WHERE id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.created_at > r.created_at
                )
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
