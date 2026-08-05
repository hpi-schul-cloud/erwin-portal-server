import { Injectable } from '@nestjs/common';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { RolleID } from '../../../shared/types/aggregate-ids.types.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';

@Injectable()
export class RollenMappingService {
    public constructor(
        private readonly serviceProviderRepo: ServiceProviderRepo,
        private readonly personenKontextService: PersonenkontextService,
        private readonly logger: ClassLogger,
    ) {}

    public async getRoleOnServiceProviderByClientName(clientName: string, userId: string): Promise<RolleID | null> {
        const serviceProvider: Option<ServiceProvider<true>> = await this.serviceProviderRepo.findByName(clientName);

        if (!serviceProvider) {
            this.logger.warning(`Couldn't find serviceProvider with name ${clientName}`);
            return null;
        }

        const personenkontexte: Personenkontext<true>[] =
            await this.personenKontextService.findPersonenkontexteByPersonId(userId);
        const roleId: RolleID | null =
            personenkontexte.find(
                (pk: Personenkontext<true>) => pk.organisationId === serviceProvider.providedOnSchulstrukturknoten,
            )?.rolleId ?? null;

        if (!roleId) {
            this.logger.warning(`Couldn't find role for user ${userId} and serviceprovider ${serviceProvider.id}`);
        }

        return roleId;
    }
}
