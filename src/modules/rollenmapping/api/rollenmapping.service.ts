import { Injectable } from '@nestjs/common';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { RolleID } from '../../../shared/types/aggregate-ids.types.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { Rolle } from '../../rolle/domain/rolle.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';

@Injectable()
export class RollenMappingService {
    public constructor(
        private readonly serviceProviderRepo: ServiceProviderRepo,
        private readonly personenKontextService: PersonenkontextService,
        private readonly roleRepo: RolleRepo,
        private readonly logger: ClassLogger,
    ) {}

    public async getRoleOnServiceProviderByClientName(clientName: string, userId: string): Promise<RolleID | null> {
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findByName(clientName);

        if (!serviceProvider) {
            this.logger.warning(`Couldn't find serviceProvider with name ${clientName}`);

            return null;
        }

        // Get roles for service provider
        const rollenWithServiceProvider: Rolle<true>[] = await this.roleRepo.findRollenByServiceProviderId(
            serviceProvider.id,
        );
        const rollenIdsProvider: string[] = rollenWithServiceProvider.map((rolle: Rolle<true>) => rolle.id);

        // Get roles for user which are part of a school
        const personenkontexte: Personenkontext<true>[] =
            await this.personenKontextService.findPersonenkontexteByPersonId(userId);
        const orgs: Option<Organisation<true>>[] = await Promise.all(
            personenkontexte.map((pk: Personenkontext<true>) => pk.getOrganisation()),
        );
        const rollenIdsKontexte: RolleID[] = personenkontexte
            .filter((_: Personenkontext<true>, index: number) => orgs?.at(index)?.typ === OrganisationsTyp.SCHULE)
            .map((pk: Personenkontext<true>) => pk.rolleId);

        // Try to find intersection
        const intersections: string[] = rollenIdsProvider.filter((rolleId: string) =>
            rollenIdsKontexte.includes(rolleId),
        );

        if (intersections.length !== 1) {
            this.logger.warning(
                `No intersection found between rollenIdsProvider: ${JSON.stringify(rollenIdsProvider)} and rollenIdsKontexte: ${JSON.stringify(rollenIdsKontexte)}`,
            );

            return null;
        }

        const rolleId: string | null = intersections[0] ?? null;
        return rolleId;
    }
}
