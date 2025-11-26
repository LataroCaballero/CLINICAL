"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const pacientes_controller_1 = require("./pacientes.controller");
describe('PacientesController', () => {
    let controller;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [pacientes_controller_1.PacientesController],
        }).compile();
        controller = module.get(pacientes_controller_1.PacientesController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=pacientes.controller.spec.js.map