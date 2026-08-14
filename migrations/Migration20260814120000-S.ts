import { Migration } from '@mikro-orm/migrations';

export class Migration20260814120000 extends Migration {
    public override async up(): Promise<void> {
        // Clean up orphaned entities from the Jul-9 seeding batch.
        // These duplicates cause RolleNameNotUniqueOnSskError during seeding updates,
        // silently preventing all rolle updates except Portaladministratorseeding.
        //
        // Strategy: for each entity type, if two rows share the same natural key,
        // delete the OLDER one (lower created_at). The newer one is the actively
        // referenced entity in seeding_reference.

        // 1. Delete personenkontexte referencing orphaned persons
        this.addSql(`
            DELETE FROM "personenkontext"
            WHERE person_id_id IN (
                SELECT p.id FROM "person" p
                WHERE EXISTS (
                    SELECT 1 FROM "person" p2
                    WHERE p2.familienname = p.familienname
                      AND p2.vorname = p.vorname
                      AND COALESCE(p2.ist_technisch, false) = COALESCE(p.ist_technisch, false)
                      AND p2.id <> p.id
                      AND p2.created_at > p.created_at
                )
            );
        `);

        // 2. Delete orphaned persons (older duplicate by familienname + vorname + ist_technisch)
        this.addSql(`
            DELETE FROM "person"
            WHERE id IN (
                SELECT p.id FROM "person" p
                WHERE EXISTS (
                    SELECT 1 FROM "person" p2
                    WHERE p2.familienname = p.familienname
                      AND p2.vorname = p.vorname
                      AND COALESCE(p2.ist_technisch, false) = COALESCE(p.ist_technisch, false)
                      AND p2.id <> p.id
                      AND p2.created_at > p.created_at
                )
            );
        `);

        // 3. Delete personenkontexte referencing orphaned roles
        this.addSql(`
            DELETE FROM "personenkontext"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.id <> r.id
                      AND r2.created_at > r.created_at
                )
            );
        `);

        // 4. Delete rolle_merkmal and rolle_systemrecht entries for orphaned roles
        this.addSql(`
            DELETE FROM "rolle_merkmal"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.id <> r.id
                      AND r2.created_at > r.created_at
                )
            );
        `);

        this.addSql(`
            DELETE FROM "rolle_systemrecht"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.id <> r.id
                      AND r2.created_at > r.created_at
                )
            );
        `);

        // 5. Delete rolle_service_provider and rollenmapping entries for orphaned roles
        this.addSql(`
            DELETE FROM "rolle_service_provider"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.id <> r.id
                      AND r2.created_at > r.created_at
                )
            );
        `);

        this.addSql(`
            DELETE FROM "rollenmapping"
            WHERE rolle_id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.id <> r.id
                      AND r2.created_at > r.created_at
                )
            );
        `);

        // 6. Delete orphaned roles (older duplicate by name + SSK + rollenart)
        this.addSql(`
            DELETE FROM "rolle"
            WHERE id IN (
                SELECT r.id FROM "rolle" r
                WHERE EXISTS (
                    SELECT 1 FROM "rolle" r2
                    WHERE r2.name = r.name
                      AND r2.administered_by_schulstrukturknoten = r.administered_by_schulstrukturknoten
                      AND r2.rollenart = r.rollenart
                      AND r2.id <> r.id
                      AND r2.created_at > r.created_at
                )
            );
        `);

        // 7. Clean stale seeding_reference entries whose uuid no longer exists
        this.addSql(`
            DELETE FROM "seeding_reference"
            WHERE referenced_entity_type = 'PERSON'
              AND uuid NOT IN (SELECT id::text FROM "person");
        `);

        this.addSql(`
            DELETE FROM "seeding_reference"
            WHERE referenced_entity_type = 'ROLLE'
              AND uuid NOT IN (SELECT id::text FROM "rolle");
        `);
    }

    public override async down(): Promise<void> {
        // Data cleanup is not reversible
    }
}
