export const trimEllipse = (input: string | undefined, length: number): string => {
  if (!input) return '';
  return input.length > length ? input.substring(0, length - 3) + '...' : input;
};
