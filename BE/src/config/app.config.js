import dotenv from "dotenv";

dotenv.config();

export const appConfig = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || "0.0.0.0",
  env: process.env.NODE_ENV || "development",
};