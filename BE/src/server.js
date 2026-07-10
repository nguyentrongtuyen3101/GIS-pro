import http from "http";
import app from "./app.js";
import { appConfig } from "./config/app.config.js";

const server = http.createServer(app);

server.listen(appConfig.port, appConfig.host, () => {
  console.log(
    `🚀 Server running at http://${appConfig.host}:${appConfig.port}`
  );
});