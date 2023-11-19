const { NODE_ENV } = process.env;

export const isDevMode = NODE_ENV?.toLowerCase() === "dev";
