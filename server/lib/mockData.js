// Datos de ejemplo para evidenciar la funcionalidad
export const MOCK_UBICACION = 'Planta 2, Sala de servidores – Edificio Norte';
export const MOCK_DESCRIPCION = `Revisión y corrección del sistema de climatización del rack principal.

- Limpieza de filtros del equipo de aire acondicionado.
- Verificación de niveles de refrigerante.
- Ajuste de termostatos y comprobación de alarmas.
- Prueba de funcionamiento post-mantenimiento.`;

// PNG 1x1 mínimo (píxel gris) en base64 – para evidencia placeholder en el demo
const MINI_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function getMockFotos() {
  const buffer = Buffer.from(MINI_PNG_BASE64, 'base64');
  return [
    { buffer, name: 'evidencia_antes.png' },
    { buffer, name: 'evidencia_despues.png' },
  ];
}
