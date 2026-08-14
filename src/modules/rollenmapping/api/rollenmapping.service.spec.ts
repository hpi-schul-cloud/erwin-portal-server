import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { DoFactory } from '../../../../test/utils/index.js';
import { ClassLogger } from '../../../core/logging/class-logger.js';
import { RolleID } from '../../../shared/types/aggregate-ids.types.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { Personenkontext } from '../../personenkontext/domain/personenkontext.js';
import { PersonenkontextService } from '../../personenkontext/domain/personenkontext.service.js';
import { RolleRepo } from '../../rolle/repo/rolle.repo.js';
import { ServiceProvider } from '../../service-provider/domain/service-provider.js';
import { ServiceProviderRepo } from '../../service-provider/repo/service-provider.repo.js';
import { RollenMappingService } from './rollenmapping.service.js';

describe('RollenMappingService', () => {
    let rollenMappingService: RollenMappingService;
    let serviceProviderRepoMock: DeepMocked<ServiceProviderRepo>;
    let personenKontextServiceMock: DeepMocked<PersonenkontextService>;
    let rollenRepoMock: DeepMocked<RolleRepo>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: ServiceProviderRepo,
                    useValue: createMock<ServiceProviderRepo>(),
                },
                {
                    provide: PersonenkontextService,
                    useValue: createMock<PersonenkontextService>(),
                },
                {
                    provide: ClassLogger,
                    useValue: createMock<ClassLogger>(),
                },
                {
                    provide: RolleRepo,
                    useValue: createMock<RolleRepo>(),
                },
                RollenMappingService,
            ],
        }).compile();

        rollenMappingService = module.get(RollenMappingService);
        serviceProviderRepoMock = module.get(ServiceProviderRepo);
        personenKontextServiceMock = module.get(PersonenkontextService);
        rollenRepoMock = module.get(RolleRepo);
    });

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe('getRoleOnServiceProviderByClientName', () => {
        it('should return RolleID if serviceProvider and personenkontext exist and match', async () => {
            const clientName: string = faker.company.name();
            const userId: string = faker.string.uuid();
            const rolleId: RolleID = faker.string.uuid();
            const spId: string = faker.string.uuid();

            const sp: ServiceProvider<true> = DoFactory.createServiceProvider(true, { id: spId });

            const personenkontexte: Personenkontext<true>[] = [
                DoFactory.createPersonenkontext(true, {
                    personId: userId,
                    organisationId: sp.providedOnSchulstrukturknoten,
                    rolleId,
                    getOrganisation() {
                        return Promise.resolve(
                            DoFactory.createOrganisation(true, {
                                typ: OrganisationsTyp.SCHULE,
                            }),
                        );
                    },
                }),
            ];

            serviceProviderRepoMock.findByName.mockResolvedValue(sp);
            rollenRepoMock.findRollenByServiceProviderId.mockResolvedValueOnce([
                DoFactory.createRolle(true, {
                    id: rolleId,
                    serviceProviderIds: [sp.id],
                }),
            ]);
            personenKontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(personenkontexte);

            const result: RolleID | null = await rollenMappingService.getRoleOnServiceProviderByClientName(
                clientName,
                userId,
            );
            expect(result).toBe(rolleId);
            expect(serviceProviderRepoMock.findByName).toHaveBeenCalledWith(clientName);
            expect(personenKontextServiceMock.findPersonenkontexteByPersonId).toHaveBeenCalledWith(userId);
        });

        it('should return null if serviceProvider does not exist', async () => {
            const clientName: string = faker.company.name();
            const userId: string = faker.string.uuid();

            serviceProviderRepoMock.findByName.mockResolvedValue(undefined);

            const result: RolleID | null = await rollenMappingService.getRoleOnServiceProviderByClientName(
                clientName,
                userId,
            );
            expect(result).toBeNull();
            expect(serviceProviderRepoMock.findByName).toHaveBeenCalledWith(clientName);
            expect(personenKontextServiceMock.findPersonenkontexteByPersonId).not.toHaveBeenCalled();
        });

        it('should return null if no matching personenkontext found', async () => {
            const clientName: string = faker.company.name();
            const userId: string = faker.string.uuid();
            const spId: string = faker.string.uuid();

            const sp: ServiceProvider<true> = DoFactory.createServiceProvider(true, { id: spId });

            const personenkontexte: Personenkontext<true>[] = [];

            serviceProviderRepoMock.findByName.mockResolvedValue(sp);
            rollenRepoMock.findRollenByServiceProviderId.mockResolvedValueOnce([DoFactory.createRolle(true)]);
            personenKontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue(personenkontexte);

            const result: RolleID | null = await rollenMappingService.getRoleOnServiceProviderByClientName(
                clientName,
                userId,
            );
            expect(result).toBeNull();
        });

        it('should return null if personenkontexte is empty', async () => {
            const clientName: string = faker.company.name();
            const userId: string = faker.string.uuid();
            const spId: string = faker.string.uuid();

            const sp: ServiceProvider<true> = DoFactory.createServiceProvider(true, { id: spId });

            serviceProviderRepoMock.findByName.mockResolvedValue(sp);
            rollenRepoMock.findRollenByServiceProviderId.mockResolvedValueOnce([DoFactory.createRolle(true)]);
            personenKontextServiceMock.findPersonenkontexteByPersonId.mockResolvedValue([]);

            const result: RolleID | null = await rollenMappingService.getRoleOnServiceProviderByClientName(
                clientName,
                userId,
            );
            expect(result).toBeNull();
        });
    });
});
