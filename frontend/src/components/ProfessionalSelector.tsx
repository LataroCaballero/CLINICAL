'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useProfesionales } from '@/hooks/useProfesionales';
import { useProfessionalContext } from '@/store/professional-context.store';

export function ProfessionalSelector() {
    const { selectedProfessionalId, setSelectedProfessionalId } =
        useProfessionalContext();

    const { data: profesionales = [], isLoading } =
        useProfesionales();

    if (isLoading) return null;

    return (
        <Select
            value={selectedProfessionalId ?? ''}
            onValueChange={(value) =>
                setSelectedProfessionalId(value || null)
            }
        >
            <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Seleccionar profesional" />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value="Todos los profesionales">
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