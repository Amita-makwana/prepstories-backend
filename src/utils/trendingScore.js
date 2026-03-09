export const calculateTrendingScore = (upvotes, createdAt) => {
  const hours = (Date.now() - createdAt) / 3600000;
  return upvotes / Math.pow(hours + 2, 1.5);
};