"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const pacientes_service_1 = require("./pacientes.service");
describe('PacientesService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [pacientes_service_1.PacientesService],
        }).compile();
        service = module.get(pacientes_service_1.PacientesService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=pacientes.service.spec.js.map