import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { openDatabase } from "./database.js";
const db = openDatabase();
const server = createApp(db, {
  staticDir: fileURLToPath(new URL("../../front/dist", import.meta.url)),
  secureCookies: process.env.NODE_ENV === "production"
}).listen(Number(process.env.PORT ?? 3001), "127.0.0.1", () =>
  console.log(`Clínica Aurora: http://localhost:${process.env.PORT ?? 3001}`)
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    })
  );
