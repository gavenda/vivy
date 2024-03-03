export const msToTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);

  return {
    minutes: minutes,
    seconds: seconds % 60
  };
};
