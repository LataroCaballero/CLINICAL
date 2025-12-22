import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTurnoDto } from "./dto/create-turno.dto";
import { EstadoTurno } from "@prisma/client";
import { getDayRange } from "@/src/common/utils/date-range";

@Injectable()
export class TurnosService {
    constructor(private readonly prisma: PrismaService) { }

    async crearTurno(dto: CreateTurnoDto) {
        const inicio = new Date(dto.inicio);
        if (Number.isNaN(inicio.getTime())) {
            throw new BadRequestException("Fecha/hora de inicio inválida.");
        }

        // 1) Validar existencia de entidades (MVP: mínimo indispensable)
        const [paciente, profesional, tipoTurno] = await Promise.all([
            this.prisma.paciente.findUnique({ where: { id: dto.pacienteId }, select: { id: true } }),
            this.prisma.profesional.findUnique({ where: { id: dto.profesionalId }, select: { id: true } }),
            this.prisma.tipoTurno.findUnique({
                where: { id: dto.tipoTurnoId },
                select: { id: true, duracionDefault: true },
            }),
        ]);

        if (!paciente) throw new NotFoundException("Paciente no encontrado.");
        if (!profesional) throw new NotFoundException("Profesional no encontrado.");
        if (!tipoTurno) throw new NotFoundException("Tipo de turno no encontrado.");

        // 2) Calcular fin (MVP)
        const duracionMin = tipoTurno.duracionDefault ?? 30;
        if (duracionMin <= 0) {
            throw new BadRequestException("La duración por defecto del tipo de turno es inválida.");
        }

        const fin = new Date(inicio.getTime() + duracionMin * 60 * 1000);

        // 3) Validar solapamiento (para ese profesional)
        const turnoSolapado = await this.prisma.turno.findFirst({
            where: {
                profesionalId: dto.profesionalId,
                // Excluir cancelados del conflicto (MVP)
                estado: { not: EstadoTurno.CANCELADO },
                // Overlap: existente.inicio < nuevoFin AND existente.fin > nuevoInicio
                inicio: { lt: fin },
                fin: { gt: inicio },
            },
            select: { id: true, inicio: true, fin: true, estado: true },
        });

        if (turnoSolapado) {
            throw new BadRequestException(
                `El profesional ya tiene un turno que se solapa en ese horario (${turnoSolapado.estado}).`,
            );
        }

        // 4) Crear turno
        return this.prisma.turno.create({
            data: {
                pacienteId: dto.pacienteId,
                profesionalId: dto.profesionalId,
                tipoTurnoId: dto.tipoTurnoId,
                inicio,
                fin,
                estado: dto.estado ?? EstadoTurno.PENDIENTE,
                observaciones: dto.observaciones?.trim() || null,

                // MVP: no tocamos automatizaciones / cirugías / finanzas
                // notificacionEnviada queda false por default
                // esCirugia queda false por default
            },
            include: {
                paciente: { select: { id: true, nombreCompleto: true } },
                profesional: { include: { usuario: { select: { nombre: true, apellido: true } } } },
                tipoTurno: { select: { id: true, nombre: true, duracionDefault: true } },
            },
        });
    }

    async obtenerTurnosPorPaciente(pacienteId: string) {
        const ahora = new Date();

        return this.prisma.turno.findMany({
            where: {
                pacienteId,
                estado: { not: EstadoTurno.CANCELADO },
                fin: { gte: ahora },
            },
            orderBy: {
                inicio: "asc",
            },
            take: 10,
            select: {
                id: true,
                inicio: true,
                fin: true,
                estado: true,
                observaciones: true,
                profesional: {
                    include: {
                        usuario: {
                            select: {
                                nombre: true,
                                apellido: true,
                            },
                        },
                    },
                },
                tipoTurno: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
            },
        });
    }

    async cancelarTurno(turnoId: string) {
        const turno = await this.prisma.turno.findUnique({
            where: { id: turnoId },
            select: { id: true, estado: true },
        });

        if (!turno) {
            throw new NotFoundException("Turno no encontrado.");
        }

        if (
            turno.estado === EstadoTurno.CANCELADO ||
            turno.estado === EstadoTurno.FINALIZADO
        ) {
            throw new BadRequestException(
                `No se puede cancelar un turno en estado ${turno.estado}.`,
            );
        }

        return this.prisma.turno.update({
            where: { id: turnoId },
            data: {
                estado: EstadoTurno.CANCELADO,
            },
        });
    }

    async finalizarTurno(turnoId: string) {
        const turno = await this.prisma.turno.findUnique({
            where: { id: turnoId },
            select: { id: true, estado: true },
        });

        if (!turno) {
            throw new NotFoundException("Turno no encontrado.");
        }

        if (
            turno.estado === EstadoTurno.CANCELADO ||
            turno.estado === EstadoTurno.FINALIZADO
        ) {
            throw new BadRequestException(
                `No se puede finalizar un turno en estado ${turno.estado}.`,
            );
        }

        return this.prisma.turno.update({
            where: { id: turnoId },
            data: {
                estado: EstadoTurno.FINALIZADO,
            },
        });
    }

    async obtenerAgendaDiaria(
        profesionalId: string,
        fechaISO: string,
    ) {
        const fecha = new Date(fechaISO);
        if (Number.isNaN(fecha.getTime())) {
            throw new BadRequestException("Fecha inválida.");
        }

        const { start, end } = getDayRange(fecha);

        return this.prisma.turno.findMany({
            where: {
                profesionalId,
                inicio: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                inicio: "asc",
            },
            select: {
                id: true,
                inicio: true,
                fin: true,
                estado: true,
                observaciones: true,
                paciente: {
                    select: {
                        id: true,
                        nombreCompleto: true,
                    },
                },
                tipoTurno: {
                    select: {
                        id: true,
                        nombre: true,
                        duracionDefault: true,
                    },
                },
            },
        });
    }

    async obtenerTurnosPorRango(
        profesionalId: string,
        desdeISO: string,
        hastaISO: string,
    ) {
        const desde = new Date(desdeISO);
        const hasta = new Date(hastaISO);

        if (
            Number.isNaN(desde.getTime()) ||
            Number.isNaN(hasta.getTime())
        ) {
            throw new BadRequestException("Fechas inválidas.");
        }

        // Normalizamos rango completo de días
        desde.setHours(0, 0, 0, 0);
        hasta.setHours(23, 59, 59, 999);

        return this.prisma.turno.findMany({
            where: {
                profesionalId,
                inicio: {
                    gte: desde,
                    lte: hasta,
                },
                // MVP: incluimos cancelados para contexto visual
                // si luego querés ocultarlos en UI, se filtra ahí
            },
            orderBy: {
                inicio: "asc",
            },
            select: {
                id: true,
                inicio: true,
                fin: true,
                estado: true,
                observaciones: true,
                paciente: {
                    select: {
                        id: true,
                        nombreCompleto: true,
                    },
                },
                tipoTurno: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
            },
        });
    }
}