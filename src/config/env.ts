import dotenv from "dotenv";
dotenv.config();

const requiredEnvVariables = ["JWT_SECRET", "JWT_EXPIRES_IN"] as const;

for (const key of requiredEnvVariables) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
};
