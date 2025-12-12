import { Controller, Delete, Get, Param, Post, Query, Body } from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { CreateTratamientoDto } from './dto/create-tratamiento.dto';

@Controller('tratamientos')
export class TratamientosController {
    constructor(private readonly tratamientosService: TratamientosService) { }

    @Get()
    findAll(@Query('q') q?: string) {
        return this.tratamientosService.findAll(q);
    }

    @Post()
    create(@Body() dto: CreateTratamientoDto) {
        return this.tratamientosService.create(dto.nombre);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tratamientosService.remove(id);
    }

}
