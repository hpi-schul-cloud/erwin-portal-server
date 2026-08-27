import { Migration } from '@mikro-orm/migrations';

export class Migration20260818090009 extends Migration {
    public async up(): Promise<void> {
        this.addSql('alter type "rollen_art_enum" add value if not exists \'PORTALADMINMANAGER\';');
    }
}
