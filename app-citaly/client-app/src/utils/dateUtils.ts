// Utilidades para manejo consistente de fechas en toda la aplicación

/**
 * Formatea una fecha a string en formato YYYY-MM-DD
 * Usa formato local sin conversiones de zona horaria para evitar problemas
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la fecha actual
 */
export const getCurrentDate = (): Date => {
  return new Date();
};

/**
 * Obtiene el rango de fechas del mes visible
 */
export const getMonthDateRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: formatDateToString(start),
    end: formatDateToString(end)
  };
};

/**
 * Compara si dos fechas son del mismo día
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return formatDateToString(date1) === formatDateToString(date2);
};
