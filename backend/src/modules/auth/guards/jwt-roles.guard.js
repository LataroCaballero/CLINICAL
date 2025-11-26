"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtRolesGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const roles_guard_1 = require("./roles.guard");
let JwtRolesGuard = class JwtRolesGuard {
    constructor(jwtAuthGuard, rolesGuard) {
        this.jwtAuthGuard = jwtAuthGuard;
        this.rolesGuard = rolesGuard;
    }
    async canActivate(context) {
        const jwtValid = await this.jwtAuthGuard.canActivate(context);
        if (!jwtValid)
            return false;
        const roleValid = await this.rolesGuard.canActivate(context);
        return roleValid;
    }
};
exports.JwtRolesGuard = JwtRolesGuard;
exports.JwtRolesGuard = JwtRolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_auth_guard_1.JwtAuthGuard,
        roles_guard_1.RolesGuard])
], JwtRolesGuard);
//# sourceMappingURL=jwt-roles.guard.js.map