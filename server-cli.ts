export class ServerCLI {
  #socket: Bun.Socket | null = null;

  helloMessage(socket: Bun.Socket): string {
    this.#socket = socket;
    return `\n▗▄▄▄▖▗▞▀▚▖█ ▗▖  ▗▖▗▞▀▚▖   ■       ▗▄▄▖▗▞▀▚▖ ▄▄▄ ▄   ▄ ▗▞▀▚▖ ▄▄▄ 
  █  ▐▛▀▀▘█ ▐▛▚▖▐▌▐▛▀▀▘▗▄▟▙▄▖    ▐▌   ▐▛▀▀▘█    █   █ ▐▛▀▀▘█    
  █  ▝▚▄▄▖█ ▐▌ ▝▜▌▝▚▄▄▖  ▐▌       ▝▀▚▖▝▚▄▄▖█     ▀▄▀  ▝▚▄▄▖█    
  █       █ ▐▌  ▐▌       ▐▌      ▗▄▄▞▘                          
                         ▐▌\n\n`;
  }

  onCommand(text: string) {
    const command = text.split("/")[1]?.split(" ")[0]!;
    const handler = Coomands[command];

    if (handler) {
      const results = handler(text);

      if (results) this.sendMessage(results);
    }
  }

  onMessage(socket: Bun.Socket, payload: Buffer<ArrayBufferLike>) {
    this.#socket = socket;
    const base64 = payload.toBase64();
    const text = payload.toString().trim();

    if (base64 == "//T//QY=") return socket.close();

    if (text.startsWith("/")) {
      this.onCommand(text);
      return;
    }

    this.sendMessage(Coomands.help());
  }

  sendMessage(response: string, withoutSkip = false) {
    if (!this.#socket) {
      console.log("Skip send message, socket null");
      return;
    }

    if (!withoutSkip) {
      response += "\n";
    }

    this.#socket.write(response);
  }
}

const Coomands = {
  ls: (argv: string[]) => {
    return "kek";
  },

  help: () => {
    return (
      "\nCommands:\n" +
      Object.keys(Coomands)
        .map((cmd) => "/" + cmd + " - ?")
        .join("\n")
    );
  },

  clear: () => {
    return "\x1b[2J\x1b[H";
  },

  ai: () => {
    
  }
};
