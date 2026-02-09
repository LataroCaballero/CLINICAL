import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { HCTemplatesService } from './hc-templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  UpdateVersionSchemaDto,
} from './dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller('config/hc-templates')
@Auth('ADMIN', 'PROFESIONAL')
export class HCTemplatesController {
  constructor(
    private readonly hcTemplatesService: HCTemplatesService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProfesionalId(user: any): Promise<string> {
    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException(
        'Solo profesionales pueden gestionar plantillas',
      );
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: { usuarioId: user.userId },
    });

    if (!profesional) {
      throw new ForbiddenException('Perfil profesional no encontrado');
    }

    return profesional.id;
  }

  @Get()
  async findAll(@Req() req: any) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.findAllTemplates(profesionalId);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateTemplateDto) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.createTemplate(profesionalId, dto);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.findTemplateById(id, profesionalId);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.updateTemplate(id, profesionalId, dto);
  }

  @Post(':id/archive')
  async archive(@Req() req: any, @Param('id') id: string) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.archiveTemplate(id, profesionalId);
  }

  // =====================
  // Versions
  // =====================

  @Post(':id/versions')
  async createVersion(@Req() req: any, @Param('id') id: string) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.createVersion(id, profesionalId);
  }

  @Put(':id/versions/:versionId')
  async updateVersionSchema(
    @Req() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateVersionSchemaDto,
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.updateVersionSchema(
      id,
      versionId,
      profesionalId,
      dto,
    );
  }

  @Post(':id/versions/:versionId/publish')
  async publishVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.publishVersion(id, versionId, profesionalId);
  }
}
