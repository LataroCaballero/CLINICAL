import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";

export function useObjecionSuggest(query: string) {
    return useQuery({
        queryKey: ["objeciones", query],
        queryFn: async () => {
            const q = query.trim();

            const url =
                q.length === 0
                    ? `/pacientes/objeciones/suggest?query=` // backend debería devolver todas
                    : `/pacientes/objeciones/suggest?query=${q}`;

            const { data } = await axios.get(url);
            return data;
        },
    });
}
