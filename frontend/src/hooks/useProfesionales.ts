import { useQuery } from "@tanstack/react-query";

export function useProfesionales() {
    return useQuery({
        queryKey: ["profesionales"],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profesionales`);
            return res.json();
        },
    });
}
