'use client';

import { useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useProfesionales } from '@/hooks/useProfesionales';
import { useProfessionalContext } from '@/store/professional-context.store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ALL } from 'dns';

export function ProfessionalSelector() {
    const { selectedProfessionalId, setSelectedProfessionalId } =
        useProfessionalContext();

    const { data: profesionales = [], isLoading } = useProfesionales();
    const { data: user } = useCurrentUser();

    const ALL_PROFESSIONALS = '__ALL__';

    // Default automático según rol
    useEffect(() => {
        if (!user) return;
        if (!profesionales.length) return;

        // Si ya hay uno seleccionado (persistido), no pisar
        if (selectedProfessionalId !== null) return;

        if (user.rol === 'ADMIN' || user.rol === 'FACTURADOR') {
            setSelectedProfessionalId(null);
            return;
        }

        if (user.rol === 'SECRETARIA') {
            setSelectedProfessionalId(profesionales[0].id);
        }
    }, [
        user,
        profesionales,
        selectedProfessionalId,
        setSelectedProfessionalId,
    ]);

    if (isLoading) return null;

    return (
        <Select
            value={selectedProfessionalId ?? ALL_PROFESSIONALS}
            onValueChange={(value) => {
                if (value === ALL_PROFESSIONALS) {
                    setSelectedProfessionalId(null);
                } else {
                    setSelectedProfessionalId(value);
                }
            }}
        >
            <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Seleccionar profesional" />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value={ALL_PROFESSIONALS}>
                    Todos los profesionales
                </SelectItem>

                {profesionales.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                        {p.usuario?.nombre} {p.usuario?.apellido}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}