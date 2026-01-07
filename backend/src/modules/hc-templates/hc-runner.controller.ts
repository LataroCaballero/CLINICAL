import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { HCTemplatesService } from './hc-templates.service';
import { CreateEntryDto, UpdateEntryAnswersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard)
export class HCRunnerController {
  constructor(
    private readonly hcTemplatesService: HCTemplatesService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProfesionalId(user: any): Promise<string> {
    if (user.rol !== RolUsuario.PROFESIONAL) {
      throw new ForbiddenException('Solo profesionales pueden usar el runner');
    }

    const profesional = await this.prisma.profesional.findUnique({
      where: { usuarioId: user.userId },
    });

    if (!profesional) {
      throw new ForbiddenException('Perfil profesional no encontrado');
    }

    return profesional.id;
  }

  // =====================
  // Templates disponibles
  // =====================

  @Get('hc/templates/available')
  async findAvailable(@Req() req: any) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.findAvailableTemplates(profesionalId);
  }

  @Get('hc/templates/:templateId/version/:versionId')
  async getVersionSchema(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.hcTemplatesService.getVersionSchema(templateId, versionId);
  }

  // =====================
  // Entries (HC)
  // =====================

  @Post('pacientes/:pacienteId/hc/entries')
  async createEntry(
    @Req() req: any,
    @Param('pacienteId') pacienteId: string,
    @Body() dto: CreateEntryDto,
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.createEntry(pacienteId, profesionalId, dto);
  }

  @Get('pacientes/:pacienteId/hc/entries/drafts')
  async findDrafts(@Param('pacienteId') pacienteId: string) {
    return this.hcTemplatesService.findDraftEntries(pacienteId);
  }

  @Get('pacientes/:pacienteId/hc/entries/:entryId')
  async getEntry(
    @Param('pacienteId') pacienteId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.hcTemplatesService.getEntryById(pacienteId, entryId);
  }

  @Patch('pacientes/:pacienteId/hc/entries/:entryId')
  async updateAnswers(
    @Req() req: any,
    @Param('pacienteId') pacienteId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateEntryAnswersDto,
  ) {
    const profesionalId = await this.getProfesionalId(req.user);
    return this.hcTemplatesService.updateEntryAnswers(
      pacienteId,
      entryId,
      profesionalId,
      dto,
    );
  }

  @Post('pacientes/:pacienteId/hc/entries/:entryId/finalize')
  async finalizeEntry(
    @Param('pacienteId') pacienteId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.hcTemplatesService.finalizeEntry(pacienteId, entryId);
  }

  @Delete('pacientes/:pacienteId/hc/entries/:entryId')
  async deleteEntry(
    @Param('pacienteId') pacienteId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.hcTemplatesService.deleteEntry(pacienteId, entryId);
  }
}
