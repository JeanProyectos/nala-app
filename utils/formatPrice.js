/**
 * Formatea un precio con separadores de miles y decimales
 * @param {number} price - Precio a formatear
 * @returns {string} - Precio formateado (ej: 50.000.00)
 */
export function formatPrice(price) {
  if (!price && price !== 0) return '0.00';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return '0.00';
  
  // Formatear con separadores de miles y 2 decimales
  return numPrice.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un precio sin decimales (solo separadores de miles)
 * @param {number} price - Precio a formatear
 * @returns {string} - Precio formateado (ej: 50.000)
 */
export function formatPriceNoDecimals(price) {
  if (!price && price !== 0) return '0';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return '0';
  
  return numPrice.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
