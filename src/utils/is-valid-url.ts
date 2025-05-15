export const isValidHttpUrl = (url: string) => {
  let urlObj;

  try {
    urlObj = new URL(url);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return false;
  }

  return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
};
