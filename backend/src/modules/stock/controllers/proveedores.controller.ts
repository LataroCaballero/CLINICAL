import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { Auth } from 'src/modules/auth/decorators/auth.decorator';
import { ProveedoresService } from '../services/proveedores.service';
import { CreateProveedorDto, UpdateProveedorDto } from '../dto';

@Auth('ADMIN', 'PROFESIONAL', 'SECRETARIA', 'FACTURADOR')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.proveedoresService.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProveedorDto) {
    return this.proveedoresService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) {
    return this.proveedoresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proveedoresService.remove(id);
  }
}
