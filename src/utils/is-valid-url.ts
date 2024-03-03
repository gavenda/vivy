export const isValidHttpUrl = (url: string) => {
  let urlObj;

  try {
    urlObj = new URL(url);
  } catch (_) {
    return false;
  }

  return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
};
