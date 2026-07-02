export const beautifyId = (id: string): string => {
  if (!id || id.length < 10) return id;
  return `${id.slice(0, 2)}-${id.slice(2, 10)}-${id.slice(10)}`;
};
