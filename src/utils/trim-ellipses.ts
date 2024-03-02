export const trimEllipse = (input: string, length: number): string => {
  return input.length > length ? input.substring(0, length - 3) + '...' : input;
};
