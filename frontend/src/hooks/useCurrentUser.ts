import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useCurrentUser() {
    return useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data } = await api.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`);
            return data;
        },
    });
}