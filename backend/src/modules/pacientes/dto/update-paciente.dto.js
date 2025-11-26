"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePacienteDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_paciente_dto_1 = require("./create-paciente.dto");
class UpdatePacienteDto extends (0, mapped_types_1.PartialType)(create_paciente_dto_1.CreatePacienteDto) {
}
exports.UpdatePacienteDto = UpdatePacienteDto;
//# sourceMappingURL=update-paciente.dto.js.map