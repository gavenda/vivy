export const chunk = <T>(arr: T[], size: number): T[][] =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  [...Array(Math.ceil(arr.length / size))].map((_, i) => arr.slice(size * i, size + size * i));

export const chunkSize = (length: number, size: number): number => {
  return Math.max(1, Math.ceil(length / size));
};
