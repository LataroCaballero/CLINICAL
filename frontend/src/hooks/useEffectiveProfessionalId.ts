import { useProfessionalContext } from '@/store/professional-context.store';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useEffectiveProfessionalId(): string | null {
    const { selectedProfessionalId } = useProfessionalContext();
    const { data: user } = useCurrentUser();

    if (!user) return null;

    // Profesional → siempre su propio profesionalId
    if (user.rol === 'PROFESIONAL') {
        return user.profesionalId;
    }

    // Admin / Secretaria / Facturador
    return selectedProfessionalId;
}