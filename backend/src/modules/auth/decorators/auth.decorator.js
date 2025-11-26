"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = Auth;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("./roles.decorator");
const jwt_roles_guard_1 = require("../guards/jwt-roles.guard");
function Auth(...roles) {
    return (0, common_1.applyDecorators)((0, roles_decorator_1.Roles)(...roles), (0, common_1.UseGuards)(jwt_roles_guard_1.JwtRolesGuard));
}
//# sourceMappingURL=auth.decorator.js.map