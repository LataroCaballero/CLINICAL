import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ProductosService } from '../services/productos.service';
import { CreateProductoDto, UpdateProductoDto } from '../dto';
import { TipoProducto } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('tipo') tipo?: TipoProducto,
    @Query('categoria') categoria?: string,
  ) {
    return this.productosService.findAll({ q, tipo, categoria });
  }

  @Get('categorias')
  getCategorias() {
    return this.productosService.getCategorias();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductoDto, @Req() req: any) {
    // Usar profesionalId del usuario actual si está disponible
    const profesionalId = req.user?.profesionalId ?? null;
    return this.productosService.create(dto, profesionalId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
