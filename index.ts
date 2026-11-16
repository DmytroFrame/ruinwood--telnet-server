import { watch } from "fs";
import { join } from "path";
import type { ServerCLI } from "./server-cli";

const filePath = join(import.meta.dir, "./server-cli.ts");

let instance: ServerCLI | null = null;

function reloadInstance() {
  try {
    delete require.cache[require.resolve(filePath)];
    const { ServerCLI } = require(filePath);
    instance = new ServerCLI();
    console.log("Успішно перезавантажено екземпляр ServerCLI");
  } catch (err) {
    console.error("Помилка при завантаженні модуля:", err);
  }
}

reloadInstance();

watch(filePath, (eventType) => {
  if (eventType === "change") {
    console.log("Файл змінився, перезавантажуємо...");
    reloadInstance();
  }
});

Bun.listen({
  hostname: "localhost",
  port: 8080,
  socket: {
    data(socket, data) {
      instance?.onMessage(socket, data);
    },
    open(socket) {
      socket.write(instance?.helloMessage(socket)!);
    },
    close(socket, error) {
      console.log(error);
    }, // socket closed
    drain(socket) {
      console.log(socket);
    }, // socket ready for more data
    error(socket, error) {
      console.log(error);
    }, // error handler
  },
});
