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

        if (personenkontexte.length !== 1) {
            this.logger.warning(`The personenkontext for person ${userId} is not unique.`);
            return null;
        }

        const rolleId: RolleID | null = personenkontexte[0]?.rolleId ?? null;
        if (!rolleId) {
            this.logger.warning(`Personenkontext ${personenkontexte[0]?.id} doesn't have a rolleId`);
        }

        return rolleId;
    }
}
