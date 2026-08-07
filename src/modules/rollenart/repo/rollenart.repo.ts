import { Injectable } from '@nestjs/common';
import { SchulcloudRollenArt } from '../../rollenmapping/domain/lms-rollenarten.enums.js';

@Injectable()
export class RollenartRepo {
    public getAllRollenarten(): string[] {
        const schulcloudRollenArt: string[] = Object.values(SchulcloudRollenArt);
        return [...schulcloudRollenArt];
    }
}
