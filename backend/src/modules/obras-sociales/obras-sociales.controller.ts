import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ObrasSocialesService } from './obras-sociales.service';
import { CreatePlanDto } from './dto/plan.dto';

@Controller('obras-sociales')
export class ObrasSocialesController {
    constructor(private readonly obrasSocialesService: ObrasSocialesService) { }

    @Get()
    findAll() {
        return this.obrasSocialesService.findAll();
    }

    @Post(':obraSocialId/planes')
    createPlan(
        @Param('obraSocialId') obraSocialId: string,
        @Body() dto: CreatePlanDto
    ) {
        return this.obrasSocialesService.createPlan(obraSocialId, dto);
    }

    @Delete('planes/:planId')
    deletePlan(@Param('planId') planId: string) {
        return this.obrasSocialesService.deletePlan(planId);
    }
}
