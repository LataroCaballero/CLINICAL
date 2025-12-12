"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PhoneInput } from "@/components/PhoneInput";
import { EmailInput } from "@/components/EmailInput";
import { BirthDatePicker } from "@/components/BirthDatePicker";
import { PhotoUploader } from "@/components/PhotoUploader";
import { AlergiasChips } from "@/components/AlergiasChips";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { PlanCombobox } from "@/components/PlanCombobox";
import { CondicionesChips } from "@/components/CondicionesChips";
import { DiagnosticoCombobox } from "@/components/DiagnosticoCombobox";
import { TratamientoCombobox } from "@/components/TratamientosCombobox";

// ---------------- VALIDACIÓN ----------------

const schema = z.object({
    nombreCompleto: z.string().min(3),
    dni: z.string().min(7),
    telefono: z.string().min(6),
    telefonoAlternativo: z.string().optional(),
    email: z.string().refine((val) => {
        // Si está vacío, undefined o solo tiene @, es válido (es opcional)
        if (!val || val.trim() === '' || val.trim() === '@' || val.startsWith('@')) return true;
        // Si tiene valor, debe ser un email válido con parte local
        const trimmed = val.trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !trimmed.startsWith('@');
    }, {
        message: "Email inválido"
    }).optional(),
    fechaNacimiento: z.string().optional(),
    direccion: z.string().optional(),
    fotoUrl: z.union([z.string(), z.instanceof(File)]).optional(),

    obraSocialId: z.string().optional(),
    plan: z.string().optional(),
    alergias: z.string().optional(),
    condiciones: z.string().optional(),
    diagnostico: z.string().optional(),
    tratamiento: z.string().optional(),
    deriva: z.string().optional(),
    lugarIntervencion: z.string().optional(),
    profesionalId: z.string().optional(),

    consentimientoFirmado: z.boolean(),
    indicacionesEnviadas: z.boolean(),
    fechaIndicaciones: z.string().optional(),
    objetivos: z.string().optional(),

    contactoEmergenciaNombre: z.string().optional(),
    contactoEmergenciaTelefono: z.string().optional(),
    contactoEmergenciaRelacion: z.string().optional(),

    estado: z.enum([
        "ACTIVO",
        "ARCHIVADO",
        "QUIRURGICO",
        "PRESUPUESTO",
        "PRIMERA",
        "PRACTICA_CONSULTORIO"
    ])
});

type NewPacienteFormValues = z.infer<typeof schema>;


export default function NewPacienteModal({ open, onClose, onCreate, obrasSociales, profesionales }: any) {
    const [step, setStep] = useState(1);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const form = useForm<NewPacienteFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            consentimientoFirmado: false,
            indicacionesEnviadas: false,
            estado: "ACTIVO",
        },
    });

    const checkScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        setCanScrollUp(scrollTop > 0);
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1);
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        checkScroll();
        container.addEventListener("scroll", checkScroll);

        // También verificar cuando cambia el step o el contenido
        const resizeObserver = new ResizeObserver(checkScroll);
        resizeObserver.observe(container);

        return () => {
            container.removeEventListener("scroll", checkScroll);
            resizeObserver.disconnect();
        };
    }, [step, open]);



    const next = () => setStep((s) => s + 1);
    const back = () => setStep((s) => s - 1);

    const onSubmit = (data: NewPacienteFormValues) => {
        console.log("form values:", data);

        // Manejar fotoUrl: si es un File, convertirlo a URL temporal o omitirlo
        let fotoUrlValue: string | undefined = undefined;
        if (data.fotoUrl) {
            if (data.fotoUrl instanceof File) {
                // Si es un File nuevo, crear URL temporal (en producción deberías subirlo primero)
                fotoUrlValue = URL.createObjectURL(data.fotoUrl);
            } else {
                fotoUrlValue = data.fotoUrl;
            }
        }

        const payload = {
            // Datos básicos
            nombreCompleto: data.nombreCompleto,
            dni: data.dni,
            telefono: data.telefono,
            telefonoAlternativo: data.telefonoAlternativo?.trim() || undefined,
            email: (() => {
                const email = data.email?.trim();
                if (!email || email === '' || email === '@' || email.startsWith('@')) {
                    return undefined;
                }
                return email;
            })(),
            direccion: data.direccion?.trim() || undefined,
            fotoUrl: fotoUrlValue,
            fechaNacimiento: data.fechaNacimiento || undefined,

            // Obra social
            obraSocialId: data.obraSocialId || undefined,
            plan: data.plan || undefined,

            // Arrays
            alergias: data.alergias
                ? data.alergias.split(",").map(a => a.trim())
                : [],
            condiciones: data.condiciones
                ? data.condiciones.split(",").map(c => c.trim())
                : [],

            // Datos médicos
            diagnostico: data.diagnostico || undefined,
            tratamiento: data.tratamiento || undefined,
            deriva: data.deriva || undefined,
            lugarIntervencion: data.lugarIntervencion || undefined,
            // Profesional asignado
            profesionalId: data.profesionalId || undefined,

            // Consentimientos e indicaciones
            consentimientoFirmado: data.consentimientoFirmado ?? false,
            indicacionesEnviadas: data.indicacionesEnviadas ?? false,
            fechaIndicaciones: data.fechaIndicaciones || undefined,
            objetivos: data.objetivos || undefined,

            // Emergencias
            contactoEmergenciaNombre: data.contactoEmergenciaNombre || undefined,
            contactoEmergenciaTelefono: data.contactoEmergenciaTelefono || undefined,
            contactoEmergenciaRelacion: data.contactoEmergenciaRelacion || undefined,


            // Estado inicial
            estado: data.estado || "ACTIVO",
        };

        onCreate(payload); // Llama a la mutation
        onClose();
    };


    const progress = (step / 3) * 100;

    const profes = Array.isArray(profesionales) ? profesionales : [];

    const obras = Array.isArray(obrasSociales) ? obrasSociales : [];

    const obraSeleccionada = form.watch("obraSocialId");

    // ⚠️ ESTA ES LA LÍNEA CLAVE:
    const planesDisponibles =
        obras.find((o: any) => o.id === obraSeleccionada)?.planes ?? [];


    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[90vh] p-0 flex flex-col">
                <DialogHeader className={`p-6 pb-2 flex-shrink-0 transition-shadow duration-200 ${canScrollUp ? 'shadow-[inset_0_10px_10px_-10px_rgba(0,0,0,0.15)]' : ''}`}>
                    <DialogTitle>Nuevo paciente</DialogTitle>
                </DialogHeader>

                <div className="px-6 flex-shrink-0">
                    <Progress value={progress} className="mb-4" />
                </div>

                <div
                    ref={scrollContainerRef}
                    className="overflow-y-auto px-6 py-2 space-y-6 flex-1 min-h-0"
                >
                    <form
                        id="newPacienteForm"
                        onSubmit={form.handleSubmit(onSubmit, (errors) => {
                            console.error("Errores de validación:", errors);
                            console.log("Valores del formulario:", form.getValues());
                        })}
                        className="space-y-6"
                    >

                        {/* STEP 1 – DATOS PERSONALES */}
                        {step === 1 && (
                            <div className="space-y-4">

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Nombre completo</label>
                                    <Input {...form.register("nombreCompleto")} placeholder="Juan Pérez" />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">DNI</label>
                                    <Input {...form.register("dni")} placeholder="40111222" />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Teléfono principal</label>
                                    <PhoneInput
                                        value={form.watch("telefono") || ""}
                                        onChange={(v: string) => form.setValue("telefono", v)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Teléfono alternativo</label>
                                    <PhoneInput
                                        value={form.watch("telefonoAlternativo") || ""}
                                        onChange={(v: string) => form.setValue("telefonoAlternativo", v)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                                    <EmailInput
                                        value={form.watch("email") || ""}
                                        onChange={(v: string) => form.setValue("email", v)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Fecha de nacimiento</label>

                                    <BirthDatePicker
                                        value={form.watch("fechaNacimiento") || ""}
                                        onChange={(v: string) => form.setValue("fechaNacimiento", v)}
                                    />
                                </div>


                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                                    <Input {...form.register("direccion")} placeholder="Calle, ciudad..." />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Foto del paciente</label>

                                    <PhotoUploader
                                        value={form.watch("fotoUrl") || ""}
                                        onChange={(val: any) => form.setValue("fotoUrl", val)}
                                    />
                                </div>

                            </div>
                        )}

                        {/* STEP 2 – INFO MÉDICA */}
                        {step === 2 && (
                            <div className="space-y-4">

                                <div className="grid grid-cols-2">
                                    {/* OBRA SOCIAL */}
                                    <div className="grid gap-1.5">
                                        <label className="text-sm font-medium text-muted-foreground">Obra Social</label>

                                        <Select
                                            value={form.watch("obraSocialId") || ""}
                                            onValueChange={(obraId) => {
                                                form.setValue("obraSocialId", obraId);
                                                form.setValue("plan", "");
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar obra social" />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {obras.map((o: any) => (
                                                    <SelectItem key={o.id} value={o.id}>
                                                        {o.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                    </div>

                                    {/* PLAN */}
                                    {obraSeleccionada && (
                                        <div className="grid gap-1.5 animate-in fade-in slide-in-from-top-1">
                                            <label className="text-sm font-medium text-muted-foreground">Plan</label>
                                            <PlanCombobox
                                                planes={planesDisponibles}
                                                obraSocialId={obraSeleccionada}
                                                value={form.watch("plan")}
                                                onChange={(val: string) => form.setValue("plan", val)}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ALERGIAS */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Alergias</label>

                                    <AlergiasChips
                                        value={form.watch("alergias")}
                                        onChange={(val: string) => form.setValue("alergias", val)}
                                    />
                                </div>

                                {/* CONDICIONES */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Condiciones preexistentes
                                    </label>

                                    <CondicionesChips
                                        value={form.watch("condiciones")}
                                        onChange={(val: string) => form.setValue("condiciones", val)}
                                    />
                                </div>


                                {/* DIAGNOSTICO */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Diagnóstico</label>

                                    <DiagnosticoCombobox
                                        value={form.watch("diagnostico")}
                                        onChange={(v: string) => form.setValue("diagnostico", v)}
                                    />
                                </div>

                                {/* TRATAMIENTO */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Tratamiento</label>
                                    <TratamientoCombobox
                                        value={form.watch("tratamiento")}
                                        onChange={(val: string | undefined) => form.setValue("tratamiento", val)}
                                    />

                                </div>

                                {/* DERIVA */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Deriva</label>
                                    <Input {...form.register("deriva")} />
                                </div>

                                {/* LUGAR INTERVENCION */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Lugar de intervención</label>
                                    <Input {...form.register("lugarIntervencion")} />
                                </div>

                                {/* PROFESIONAL */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Profesional a cargo</label>

                                    <Select
                                        value={form.watch("profesionalId") || ""}
                                        onValueChange={(v) => form.setValue("profesionalId", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar profesional" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {profes.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.usuario?.nombre} {p.usuario?.apellido}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                </div>

                            </div>
                        )}

                        {/* STEP 3 – CONSENTIMIENTOS Y OTROS */}
                        {step === 3 && (
                            <div className="space-y-4">

                                {/* CONSENTIMIENTO */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Consentimiento firmado
                                    </label>
                                    <Checkbox
                                        checked={form.watch("consentimientoFirmado")}
                                        onCheckedChange={(v) => form.setValue("consentimientoFirmado", Boolean(v))}
                                    />
                                </div>

                                {/* INDICACIONES */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Indicaciones enviadas
                                    </label>
                                    <Checkbox
                                        checked={form.watch("indicacionesEnviadas")}
                                        onCheckedChange={(v) => form.setValue("indicacionesEnviadas", Boolean(v))}
                                    />
                                </div>

                                {form.watch("indicacionesEnviadas") && (
                                    <div className="grid gap-1.5">
                                        <label className="text-sm font-medium text-muted-foreground">Fecha de indicaciones</label>
                                        <Input type="date" {...form.register("fechaIndicaciones")} />
                                    </div>
                                )}

                                {/* OBJETIVOS */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Objetivos del paciente</label>
                                    <Input {...form.register("objetivos")} placeholder="Ej: Bajar dolor…" />
                                </div>

                                {/* CONTACTO EMERGENCIA */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Nombre contacto emergencia</label>
                                    <Input {...form.register("contactoEmergenciaNombre")} />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Teléfono emergencia</label>
                                    <Input {...form.register("contactoEmergenciaTelefono")} />
                                </div>

                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Relación</label>
                                    <Input {...form.register("contactoEmergenciaRelacion")} />
                                </div>

                                {/* ESTADO */}
                                <div className="grid gap-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Estado del paciente</label>
                                    <Select onValueChange={(v) => form.setValue("estado", v as any)}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVO">Activo</SelectItem>
                                            <SelectItem value="ARCHIVADO">Archivado</SelectItem>
                                            <SelectItem value="QUIRURGICO">Quirúrgico</SelectItem>
                                            <SelectItem value="PRESUPUESTO">Presupuesto</SelectItem>
                                            <SelectItem value="PRIMERA">Primera consulta</SelectItem>
                                            <SelectItem value="PRACTICA_CONSULTORIO">Práctica en consultorio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>
                        )}
                    </form>
                </div>



                {/* FOOTER BUTTONS */}
                <div className="px-6 py-4 border-t flex justify-between bg-white">
                    {step > 1 ? (
                        <Button type="button" variant="outline" onClick={back}>
                            Atrás
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <Button type="button" onClick={next} asChild>
                            <button type="button">Siguiente</button>
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            form="newPacienteForm"
                            className="bg-blue-600 text-white"
                        >
                            Crear paciente
                        </Button>
                    )}
                </div>


            </DialogContent>
        </Dialog>
    );
}
