"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const usuarios_controller_1 = require("./usuarios.controller");
describe('UsuariosController', () => {
    let controller;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [usuarios_controller_1.UsuariosController],
        }).compile();
        controller = module.get(usuarios_controller_1.UsuariosController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=usuarios.controller.spec.js.map