export type PacienteSuggest = {
  id: string;
  nombreCompleto: string;
  dni: string;
  telefono: string | null;
  fotoUrl: string | null;
  score: number;
};
