import { openDatabase, seed } from "./database.js";
const db = openDatabase();
seed(db);
db.close();
console.log("Banco preparado com 3 contas fictícias e 3 tipos de exame.");
