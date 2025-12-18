import { Section } from "./datos/Sections";
import { FieldRow } from "./datos/FieldRow";
import { MedicalChips } from "@/components/ui/MedicalChips";
import { EditableChips } from "@/components/ui/EditableChip"
import { useObrasSociales } from "@/hooks/useObrasSociales";
import { usePlanesByObraSocial } from "@/hooks/usePlanesByObrasSociales";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

export default function DatosCompletos({
    paciente,
    onBack,
}: {
    paciente: any;
    onBack: () => void;
}) {
    if (!paciente) return null;

    const [editingSection, setEditingSection] = useState<string | null>(null);

    const isEditing = (key: string) => editingSection === key;

    const [contactoForm, setContactoForm] = useState<ContactoForm>({
        telefono: paciente.telefono ?? "",
        telefonoAlternativo: paciente.telefonoAlternativo ?? null,
        email: paciente.email ?? null,
    });

    const { data: obrasSociales = [], isLoading: loadingOS } = useObrasSociales();

    const ESTADOS_PACIENTE = [
        { id: "ACTIVO", nombre: "Activo" },
        { id: "ARCHIVADO", nombre: "Archivado" },
        { id: "QUIRURGICO", nombre: "Quirúrgico" },
        { id: "PRESUPUESTO", nombre: "Presupuesto enviado" },
        { id: "PRIMERA", nombre: "Primera consulta" },
        { id: "PRACTICA_CONSULTORIO", nombre: "Práctica en consultorio" },
    ];

    /* ------- ESTADOS ------- */

    const [contactoErrors, setContactoErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const [emergenciaForm, setEmergenciaForm] = useState<EmergenciaForm>({
        contactoEmergenciaNombre: paciente.contactoEmergenciaNombre ?? "",
        contactoEmergenciaRelacion: paciente.contactoEmergenciaRelacion ?? "",
        contactoEmergenciaTelefono: paciente.contactoEmergenciaTelefono ?? "",
    });

    const [emergenciaErrors, setEmergenciaErrors] = useState<Record<string, string>>({});

    const [coberturaForm, setCoberturaForm] = useState<CoberturaForm>({
        obraSocialId: paciente.obraSocialId ?? null,
        plan: paciente.plan ?? null,
    });

    const [coberturaErrors, setCoberturaErrors] = useState<Record<string, string>>({});

    const calcularEdad = (fecha?: string) => {
        if (!fecha) return null;
        const diff = Date.now() - new Date(fecha).getTime();
        return Math.abs(new Date(diff).getUTCFullYear() - 1970);
    };

    const [clinicaForm, setClinicaForm] = useState<ClinicaForm>({
        alergias: paciente.alergias ?? [],
        condiciones: paciente.condiciones ?? [],
        diagnostico: paciente.diagnostico ?? null,
        tratamiento: paciente.tratamiento ?? null,
        deriva: paciente.deriva ?? null,
        lugarIntervencion: paciente.lugarIntervencion ?? null,
        objetivos: paciente.objetivos ?? null,
    });

    const [clinicaErrors, setClinicaErrors] = useState<Record<string, string>>({});

    const [estadoForm, setEstadoForm] = useState<EstadoForm>({
        estado: paciente.estado,
        consentimientoFirmado: paciente.consentimientoFirmado,
        indicacionesEnviadas: paciente.indicacionesEnviadas,
        fechaIndicaciones: paciente.fechaIndicaciones
            ? new Date(paciente.fechaIndicaciones).toISOString().slice(0, 10)
            : null,
    });

    const [estadoErrors, setEstadoErrors] = useState<Record<string, string>>({});

    const [personalesForm, setPersonalesForm] = useState<PersonalesForm>({
        nombreCompleto: paciente.nombreCompleto,
        fechaNacimiento: paciente.fechaNacimiento
            ? new Date(paciente.fechaNacimiento).toISOString().slice(0, 10)
            : null,
        direccion: paciente.direccion ?? null,
    });

    const [personalesErrors, setPersonalesErrors] = useState<Record<string, string>>({});

    /* ----------------------- */
    /* ------- SCHEMAS ------- */

    const contactoSchema = z.object({
        telefono: z.string().min(6, "Teléfono inválido").max(20, "Teléfono inválido"),
        telefonoAlternativo: z.string().min(6).max(20).optional().nullable(),
        email: z.string().email("Email inválido").optional().nullable(),
    });

    type ContactoForm = z.infer<typeof contactoSchema>;

    const emergenciaSchema = z.object({
        contactoEmergenciaNombre: z.string().min(2, "Nombre requerido"),
        contactoEmergenciaRelacion: z.string().min(2, "Relación requerida"),
        contactoEmergenciaTelefono: z
            .string()
            .min(6, "Teléfono inválido")
            .max(20, "Teléfono inválido"),
    });

    type EmergenciaForm = z.infer<typeof emergenciaSchema>;

    const coberturaSchema = z.object({
        obraSocialId: z.string().uuid().nullable(),
        plan: z.string().uuid().nullable(),
    });

    type CoberturaForm = z.infer<typeof coberturaSchema>;

    const clinicaSchema = z.object({
        alergias: z.array(z.string().min(2)).optional(),
        condiciones: z.array(z.string().min(2)).optional(),
        diagnostico: z.string().optional().nullable(),
        tratamiento: z.string().optional().nullable(),
        deriva: z.string().optional().nullable(),
        lugarIntervencion: z.string().optional().nullable(),
        objetivos: z.string().optional().nullable(),
    });

    type ClinicaForm = z.infer<typeof clinicaSchema>;

    const estadoSchema = z
        .object({
            estado: z.enum([
                "ACTIVO",
                "ARCHIVADO",
                "QUIRURGICO",
                "PRESUPUESTO",
                "PRIMERA",
                "PRACTICA_CONSULTORIO",
            ]),
            consentimientoFirmado: z.boolean(),
            indicacionesEnviadas: z.boolean(),
            fechaIndicaciones: z.string().optional().nullable(),
        })
        .refine(
            (data) =>
                data.indicacionesEnviadas
                    ? Boolean(data.fechaIndicaciones)
                    : data.fechaIndicaciones === null || data.fechaIndicaciones === undefined,
            {
                message:
                    "La fecha de indicaciones es obligatoria si las indicaciones fueron enviadas",
                path: ["fechaIndicaciones"],
            }
        );

    type EstadoForm = z.infer<typeof estadoSchema>;

    const personalesSchema = z.object({
        nombreCompleto: z.string().min(3, "Nombre inválido"),
        fechaNacimiento: z.string().optional().nullable(),
        direccion: z.string().optional().nullable(),
    });

    type PersonalesForm = z.infer<typeof personalesSchema>;

    /* ----------------------- */
    /* ------- HELPERS ------- */

    const startEditContacto = () => {
        setContactoErrors({});
        setContactoForm({
            telefono: paciente.telefono ?? "",
            telefonoAlternativo: paciente.telefonoAlternativo ?? null,
            email: paciente.email ?? null,
        });
        setEditingSection("contacto");
    };

    const cancelEditContacto = () => {
        setContactoErrors({});
        setEditingSection(null);
    };

    const saveContacto = async () => {
        setContactoErrors({});

        const result = contactoSchema.safeParse({
            ...contactoForm,
            // normalizamos string vacíos a null en opcionales:
            telefonoAlternativo:
                contactoForm.telefonoAlternativo?.trim() ? contactoForm.telefonoAlternativo : null,
            email: contactoForm.email?.trim() ? contactoForm.email : null,
        });

        if (!result.success) {
            const fieldErrors = result.error.flatten().fieldErrors;
            setContactoErrors({
                telefono: fieldErrors.telefono?.[0] ?? "",
                telefonoAlternativo: fieldErrors.telefonoAlternativo?.[0] ?? "",
                email: fieldErrors.email?.[0] ?? "",
            });
            return;
        }

        try {
            try {
                setSaving(true);

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pacientes/${paciente.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        section: "contacto",
                        data: result.data,
                    }),
                });

                if (!res.ok) {
                    throw new Error("Error al guardar");
                }

                toast.success("Datos de contacto actualizados correctamente");
                setEditingSection(null);
            } catch (e) {
                toast.error("No se pudieron guardar los cambios");
            } finally {
                setSaving(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const startEditEmergencia = () => {
        setEmergenciaErrors({});
        setEmergenciaForm({
            contactoEmergenciaNombre: paciente.contactoEmergenciaNombre ?? "",
            contactoEmergenciaRelacion: paciente.contactoEmergenciaRelacion ?? "",
            contactoEmergenciaTelefono: paciente.contactoEmergenciaTelefono ?? "",
        });
        setEditingSection("emergencia");
    };

    const cancelEditEmergencia = () => {
        setEmergenciaErrors({});
        setEditingSection(null);
    };

    const saveEmergencia = async () => {
        setEmergenciaErrors({});

        const result = emergenciaSchema.safeParse(emergenciaForm);

        if (!result.success) {
            const fe = result.error.flatten().fieldErrors;
            setEmergenciaErrors({
                contactoEmergenciaNombre: fe.contactoEmergenciaNombre?.[0] ?? "",
                contactoEmergenciaRelacion: fe.contactoEmergenciaRelacion?.[0] ?? "",
                contactoEmergenciaTelefono: fe.contactoEmergenciaTelefono?.[0] ?? "",
            });
            return;
        }

        try {
            setSaving(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${paciente.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        section: "emergencia",
                        data: result.data,
                    }),
                }
            );

            if (!res.ok) throw new Error();

            toast.success("Contacto de emergencia actualizado correctamente");
            setEditingSection(null);
        } catch {
            toast.error("No se pudieron guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    const startEditCobertura = () => {
        setCoberturaErrors({});
        setCoberturaForm({
            obraSocialId: paciente.obraSocialId ?? null,
            plan: paciente.plan ?? null,
        });
        setEditingSection("cobertura");
    };

    const cancelEditCobertura = () => {
        setCoberturaErrors({});
        setEditingSection(null);
    };

    const saveCobertura = async () => {
        setCoberturaErrors({});

        const result = coberturaSchema.safeParse({
            obraSocialId: coberturaForm.obraSocialId || null,
            plan: coberturaForm.plan?.trim() || null,
        });

        if (!result.success) {
            const fe = result.error.flatten().fieldErrors;
            setCoberturaErrors({
                obraSocialId: fe.obraSocialId?.[0] ?? "",
                plan: fe.plan?.[0] ?? "",
            });
            return;
        }

        try {
            setSaving(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${paciente.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        section: "cobertura",
                        data: result.data,
                    }),
                }
            );

            if (!res.ok) throw new Error();

            toast.success("Cobertura médica actualizada correctamente");
            setEditingSection(null);
        } catch {
            toast.error("No se pudieron guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    const startEditClinica = () => {
        setClinicaErrors({});
        setClinicaForm({
            alergias: paciente.alergias ?? [],
            condiciones: paciente.condiciones ?? [],
            diagnostico: paciente.diagnostico ?? null,
            tratamiento: paciente.tratamiento ?? null,
            deriva: paciente.deriva ?? null,
            lugarIntervencion: paciente.lugarIntervencion ?? null,
            objetivos: paciente.objetivos ?? null,
        });
        setEditingSection("clinica");
    };

    const cancelEditClinica = () => {
        setClinicaErrors({});
        setEditingSection(null);
    };

    const saveClinica = async () => {
        setClinicaErrors({});

        const result = clinicaSchema.safeParse(clinicaForm);

        if (!result.success) {
            setClinicaErrors({ general: "Datos clínicos inválidos" });
            return;
        }

        try {
            setSaving(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${paciente.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        section: "clinica",
                        data: result.data,
                    }),
                }
            );

            if (!res.ok) throw new Error();

            toast.success("Información clínica actualizada correctamente");
            setEditingSection(null);
        } catch {
            toast.error("No se pudieron guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    const startEditEstado = () => {
        setEstadoErrors({});
        setEstadoForm({
            estado: paciente.estado,
            consentimientoFirmado: paciente.consentimientoFirmado,
            indicacionesEnviadas: paciente.indicacionesEnviadas,
            fechaIndicaciones: paciente.fechaIndicaciones
                ? new Date(paciente.fechaIndicaciones).toISOString().slice(0, 10)
                : null,
        });
        setEditingSection("estado");
    };

    const cancelEditEstado = () => {
        setEstadoErrors({});
        setEditingSection(null);
    };

    const saveEstado = async () => {
        setEstadoErrors({});

        const normalized = {
            ...estadoForm,
            fechaIndicaciones: estadoForm.indicacionesEnviadas
                ? estadoForm.fechaIndicaciones
                : null,
        };

        const result = estadoSchema.safeParse(normalized);

        if (!result.success) {
            const fe = result.error.flatten().fieldErrors;
            setEstadoErrors({
                estado: fe.estado?.[0] ?? "",
                consentimientoFirmado: fe.consentimientoFirmado?.[0] ?? "",
                indicacionesEnviadas: fe.indicacionesEnviadas?.[0] ?? "",
                fechaIndicaciones: fe.fechaIndicaciones?.[0] ?? "",
            });
            return;
        }

        try {
            setSaving(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${paciente.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        section: "estado",
                        data: result.data,
                    }),
                }
            );

            if (!res.ok) throw new Error();

            toast.success("Estado del paciente actualizado correctamente");
            setEditingSection(null);
        } catch {
            toast.error("No se pudieron guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    const startEditPersonales = () => {
        setPersonalesErrors({});
        setPersonalesForm({
            nombreCompleto: paciente.nombreCompleto,
            fechaNacimiento: paciente.fechaNacimiento
                ? new Date(paciente.fechaNacimiento).toISOString().slice(0, 10)
                : null,
            direccion: paciente.direccion ?? null,
        });
        setEditingSection("personales");
    };

    const cancelEditPersonales = () => {
        setPersonalesErrors({});
        setEditingSection(null);
    };

    const savePersonales = async () => {
        setPersonalesErrors({});

        const normalized = {
            ...personalesForm,
            fechaNacimiento: personalesForm.fechaNacimiento || null,
            direccion: personalesForm.direccion?.trim() || null,
        };

        const result = personalesSchema.safeParse(normalized);

        if (!result.success) {
            const fe = result.error.flatten().fieldErrors;
            setPersonalesErrors({
                nombreCompleto: fe.nombreCompleto?.[0] ?? "",
                fechaNacimiento: fe.fechaNacimiento?.[0] ?? "",
                direccion: fe.direccion?.[0] ?? "",
            });
            return;
        }

        try {
            setSaving(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/pacientes/${paciente.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        section: "personales",
                        data: result.data,
                    }),
                }
            );

            if (!res.ok) throw new Error();

            toast.success("Datos personales actualizados correctamente");
            setEditingSection(null);
        } catch {
            toast.error("No se pudieron guardar los cambios");
        } finally {
            setSaving(false);
        }
    };

    /* ----------------------- */

    const obraSeleccionada = coberturaForm.obraSocialId;

    const planesDisponibles =
        obrasSociales.find((o: { id: string | null; }) => o.id === obraSeleccionada)?.planes ?? [];

    return (
        <div className="space-y-8 px-4 pb-10">
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="
      flex items-center gap-1
      text-sm text-muted-foreground
      hover:text-foreground
      transition
    "
                >
                    <ArrowLeft size={16} />
                    Volver
                </button>
            </div>
            {/* ======================
          DATOS PERSONALES
      ====================== */}
            <Section
                title="Datos personales"
                isEditing={isEditing("personales")}
                onEdit={startEditPersonales}
                onCancel={cancelEditPersonales}
                onSave={savePersonales}
            >
                <FieldRow
                    label="Nombre completo"
                    value={
                        <EditableInput
                            disabled={!isEditing("personales") || saving}
                            value={personalesForm.nombreCompleto}
                            onChange={(v) =>
                                setPersonalesForm((f) => ({ ...f, nombreCompleto: v }))
                            }
                            error={personalesErrors.nombreCompleto}
                        />
                    }
                />

                <FieldRow label="DNI" value={paciente.dni} />

                <FieldRow
                    label="Fecha de nacimiento"
                    value={
                        <EditableDate
                            disabled={!isEditing("personales") || saving}
                            value={personalesForm.fechaNacimiento}
                            onChange={(v) =>
                                setPersonalesForm((f) => ({ ...f, fechaNacimiento: v }))
                            }
                            error={personalesErrors.fechaNacimiento}
                        />
                    }
                />

                <FieldRow
                    label="Edad"
                    value={
                        paciente.fechaNacimiento
                            ? `${calcularEdad(paciente.fechaNacimiento)} años`
                            : "—"
                    }
                />

                <FieldRow
                    label="Dirección"
                    value={
                        <EditableInput
                            disabled={!isEditing("personales") || saving}
                            value={personalesForm.direccion ?? ""}
                            onChange={(v) =>
                                setPersonalesForm((f) => ({ ...f, direccion: v }))
                            }
                            error={personalesErrors.direccion}
                        />
                    }
                />
            </Section>

            {/* ======================
          CONTACTO
      ====================== */}
            <Section
                title="Datos de contacto"
                isEditing={isEditing("contacto")}
                onEdit={startEditContacto}
                onCancel={cancelEditContacto}
                onSave={saveContacto}
            >
                <FieldRow
                    label="Teléfono"
                    value={
                        <EditableInput
                            disabled={!isEditing("contacto") || saving}
                            value={contactoForm.telefono}
                            onChange={(v) => setContactoForm((f) => ({ ...f, telefono: v }))}
                            error={contactoErrors.telefono}
                        />
                    }
                />

                <FieldRow
                    label="Teléfono alternativo"
                    value={
                        <EditableInput
                            disabled={!isEditing("contacto") || saving}
                            value={contactoForm.telefonoAlternativo ?? ""}
                            onChange={(v) =>
                                setContactoForm((f) => ({ ...f, telefonoAlternativo: v }))
                            }
                            error={contactoErrors.telefonoAlternativo}
                        />
                    }
                />

                <FieldRow
                    label="Email"
                    value={
                        <EditableInput
                            disabled={!isEditing("contacto") || saving}
                            value={contactoForm.email ?? ""}
                            onChange={(v) => setContactoForm((f) => ({ ...f, email: v }))}
                            error={contactoErrors.email}
                            placeholder="nombre@correo.com"
                        />
                    }
                />
            </Section>

            {/* ======================
          EMERGENCIA
      ====================== */}
            <Section
                title="Datos de contacto de emergencia"
                isEditing={isEditing("emergencia")}
                onEdit={startEditEmergencia}
                onCancel={cancelEditEmergencia}
                onSave={saveEmergencia}
            >
                <FieldRow
                    label="Nombre"
                    value={
                        <EditableInput
                            disabled={!isEditing("emergencia") || saving}
                            value={emergenciaForm.contactoEmergenciaNombre}
                            onChange={(v) =>
                                setEmergenciaForm((f) => ({ ...f, contactoEmergenciaNombre: v }))
                            }
                            error={emergenciaErrors.contactoEmergenciaNombre}
                        />
                    }
                />

                <FieldRow
                    label="Relación"
                    value={
                        <EditableInput
                            disabled={!isEditing("emergencia") || saving}
                            value={emergenciaForm.contactoEmergenciaRelacion}
                            onChange={(v) =>
                                setEmergenciaForm((f) => ({ ...f, contactoEmergenciaRelacion: v }))
                            }
                            error={emergenciaErrors.contactoEmergenciaRelacion}
                        />
                    }
                />

                <FieldRow
                    label="Teléfono"
                    value={
                        <EditableInput
                            disabled={!isEditing("emergencia") || saving}
                            value={emergenciaForm.contactoEmergenciaTelefono}
                            onChange={(v) =>
                                setEmergenciaForm((f) => ({ ...f, contactoEmergenciaTelefono: v }))
                            }
                            error={emergenciaErrors.contactoEmergenciaTelefono}
                        />
                    }
                />
            </Section>

            {/* ======================
          COBERTURA MÉDICA
      ====================== */}
            <Section
                title="Cobertura médica"
                isEditing={isEditing("cobertura")}
                onEdit={startEditCobertura}
                onCancel={cancelEditCobertura}
                onSave={saveCobertura}
            >
                <FieldRow
                    label="Obra social"
                    value={
                        loadingOS ? (
                            <span className="text-muted-foreground">Cargando…</span>
                        ) : (
                            <EditableSelect
                                disabled={!isEditing("cobertura") || saving}
                                value={coberturaForm.obraSocialId}
                                options={obrasSociales}
                                onChange={(v) =>
                                    setCoberturaForm((f) => ({
                                        ...f,
                                        obraSocialId: v,
                                        plan: null, // 🔑 reset plan
                                    }))
                                }
                                error={coberturaErrors.obraSocialId}
                            />
                        )
                    }
                />

                <FieldRow
                    label="Plan"
                    value={
                        !obraSeleccionada ? (
                            <span className="text-muted-foreground">
                                Seleccione una obra social
                            </span>
                        ) : planesDisponibles.length === 0 ? (
                            <span className="text-muted-foreground">
                                No hay planes disponibles
                            </span>
                        ) : (
                            <EditableSelect
                                disabled={!isEditing("cobertura") || saving}
                                value={coberturaForm.plan}
                                options={planesDisponibles}
                                onChange={(v) =>
                                    setCoberturaForm((f) => ({ ...f, plan: v }))
                                }
                                error={coberturaErrors.plan}
                            />
                        )
                    }
                />
            </Section>

            {/* ======================
          INFORMACIÓN CLÍNICA
      ====================== */}
            <Section
                title="Información clínica"
                isEditing={isEditing("clinica")}
                onEdit={startEditClinica}
                onCancel={cancelEditClinica}
                onSave={saveClinica}
            >
                <FieldRow
                    label="Alergias"
                    value={
                        <EditableChips
                            items={clinicaForm.alergias ?? []}
                            disabled={!isEditing("clinica") || saving}
                            placeholder="Agregar alergia"
                            onAdd={(v) =>
                                setClinicaForm((f) => ({
                                    ...f,
                                    alergias: [...(f.alergias ?? []), v],
                                }))
                            }
                            onRemove={(idx) =>
                                setClinicaForm((f) => ({
                                    ...f,
                                    alergias: f.alergias?.filter((_, i) => i !== idx),
                                }))
                            }
                        />
                    }
                />

                <FieldRow
                    label="Condiciones preexistentes"
                    value={
                        <EditableChips
                            items={clinicaForm.condiciones ?? []}
                            disabled={!isEditing("clinica") || saving}
                            placeholder="Agregar condición"
                            onAdd={(v) =>
                                setClinicaForm((f) => ({
                                    ...f,
                                    condiciones: [...(f.condiciones ?? []), v],
                                }))
                            }
                            onRemove={(idx) =>
                                setClinicaForm((f) => ({
                                    ...f,
                                    condiciones: f.condiciones?.filter((_, i) => i !== idx),
                                }))
                            }
                        />
                    }
                />
            </Section>

            {/* ======================
          ESTADO Y SEGUIMIENTO
      ====================== */}
            <Section
                title="Estado y seguimiento"
                isEditing={isEditing("estado")}
                onEdit={startEditEstado}
                onCancel={cancelEditEstado}
                onSave={saveEstado}
            >
                <FieldRow
                    label="Estado"
                    value={
                        <EditableSelect
                            disabled={!isEditing("estado") || saving}
                            value={estadoForm.estado}
                            options={ESTADOS_PACIENTE}
                            onChange={(v) =>
                                setEstadoForm((f) => ({ ...f, estado: v as any }))
                            }
                            error={estadoErrors.estado}
                        />
                    }
                />

                <FieldRow
                    label="Consentimiento firmado"
                    value={
                        <EditableCheckbox
                            disabled={!isEditing("estado") || saving}
                            checked={estadoForm.consentimientoFirmado}
                            onChange={(v) =>
                                setEstadoForm((f) => ({ ...f, consentimientoFirmado: v }))
                            }
                        />
                    }
                />

                <FieldRow
                    label="Indicaciones enviadas"
                    value={
                        <EditableCheckbox
                            disabled={!isEditing("estado") || saving}
                            checked={estadoForm.indicacionesEnviadas}
                            onChange={(v) =>
                                setEstadoForm((f) => ({
                                    ...f,
                                    indicacionesEnviadas: v,
                                    fechaIndicaciones: v ? f.fechaIndicaciones : null,
                                }))
                            }
                        />
                    }
                />

                <FieldRow
                    label="Fecha indicaciones"
                    value={
                        <EditableDate
                            disabled={
                                !isEditing("estado") ||
                                saving ||
                                !estadoForm.indicacionesEnviadas
                            }
                            value={estadoForm.fechaIndicaciones ?? null}
                            onChange={(v) =>
                                setEstadoForm((f) => ({ ...f, fechaIndicaciones: v }))
                            }
                            error={estadoErrors.fechaIndicaciones}
                        />
                    }
                />
            </Section>

            {/* ======================
          ADMINISTRATIVO
      ====================== */}
            <Section
                title="Información administrativa"
                isEditing={isEditing("administrativa")}
                onEdit={() => setEditingSection("administrativa")}
                onCancel={() => setEditingSection(null)}
                onSave={() => {
                    // acá después pegamos el mutation
                    setEditingSection(null);
                }}
            >
                <FieldRow
                    label="Saldo cuenta corriente"
                    value={
                        paciente.cuentaCorriente
                            ? `$${paciente.cuentaCorriente.saldoActual}`
                            : null
                    }
                />
                <FieldRow
                    label="Presupuestos asociados"
                    value={paciente.presupuestos?.length}
                />
                <FieldRow
                    label="Ventas registradas"
                    value={paciente.VentaProducto?.length}
                />
            </Section>

            {/* ======================
          SISTEMA
      ====================== */}
            <Section
                title="Sistema"
                isEditing={isEditing("sistema")}
                onEdit={() => setEditingSection("sistema")}
                onCancel={() => setEditingSection(null)}
                onSave={() => {
                    // acá después pegamos el mutation
                    setEditingSection(null);
                }}
            >
                <FieldRow
                    label="Creado el"
                    value={new Date(paciente.createdAt).toLocaleString("es-AR")}
                />
                <FieldRow
                    label="Última actualización"
                    value={new Date(paciente.updatedAt).toLocaleString("es-AR")}
                />
            </Section>
        </div>
    );
}

function EditableInput({
    value,
    onChange,
    disabled,
    error,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled: boolean;
    error?: string;
    placeholder?: string;
}) {
    if (disabled) {
        return <span>{value?.trim() ? value : "—"}</span>;
    }

    return (
        <div className="w-full">
            <input
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className={[
                    "w-full px-3 py-2 rounded-xl text-sm",
                    "neu-inset",
                    "focus:outline-none",
                    error ? "ring-1 ring-red-500" : "",
                ].join(" ")}
            />
            {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>
    );
}

function EditableSelect({
    value,
    options,
    disabled,
    onChange,
    error,
}: {
    value: string | null;
    options: { id: string; nombre: string }[];
    disabled: boolean;
    onChange: (v: string | null) => void;
    error?: string;
}) {
    if (disabled) {
        const selected = options.find((o) => o.id === value);
        return <span>{selected?.nombre ?? "—"}</span>;
    }

    return (
        <div>
            <select
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className={[
                    "w-full px-3 py-2 rounded-xl text-sm",
                    "neu-inset",
                    "focus:outline-none",
                    error ? "ring-1 ring-red-500" : "",
                ].join(" ")}
            >
                <option value="">Sin obra social</option>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.nombre}
                    </option>
                ))}
            </select>
            {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>
    );
}

function EditableCheckbox({
    checked,
    disabled,
    onChange,
}: {
    checked: boolean;
    disabled: boolean;
    onChange: (v: boolean) => void;
}) {
    if (disabled) {
        return <span>{checked ? "Sí" : "No"}</span>;
    }

    return (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-primary"
        />
    );
}

function EditableDate({
    value,
    disabled,
    onChange,
    error,
}: {
    value: string | null;
    disabled: boolean;
    onChange: (v: string | null) => void;
    error?: string;
}) {
    if (disabled) {
        return <span>{value ?? "—"}</span>;
    }

    return (
        <div>
            <input
                type="date"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
                className={[
                    "px-3 py-2 rounded-xl text-sm neu-inset focus:outline-none",
                    error ? "ring-1 ring-red-500" : "",
                ].join(" ")}
            />
            {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
        </div>
    );
}