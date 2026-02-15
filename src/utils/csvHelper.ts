export const escapeCSV = (value: string) => {
  return `"${value.replace(/"/g, '""')}"`;
};