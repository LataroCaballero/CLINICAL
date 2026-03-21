import data from './zonas-diagnostico.json';

type ZonasData = {
  zonas_diagnosticos: Record<string, { diagnosticos: string[] }>;
  tratamientos: Record<string, { tratamientos: string[] }>;
};

const typed = data as ZonasData;

export const ZONAS = Object.keys(typed.zonas_diagnosticos);
export const CATEGORIAS_TRATAMIENTO = Object.keys(typed.tratamientos);

export function getSubzonas(zona: string): string[] {
  return typed.zonas_diagnosticos[zona]?.diagnosticos ?? [];
}

export function getTratamientosCategoria(categoria: string): string[] {
  return typed.tratamientos[categoria]?.tratamientos ?? [];
}
