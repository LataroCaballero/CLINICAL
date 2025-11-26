"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const usuarios_service_1 = require("./usuarios.service");
describe('UsuariosService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [usuarios_service_1.UsuariosService],
        }).compile();
        service = module.get(usuarios_service_1.UsuariosService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=usuarios.service.spec.js.map