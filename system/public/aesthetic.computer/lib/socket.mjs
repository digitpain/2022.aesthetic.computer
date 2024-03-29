// Socket
// Manages clientside WebSocket connections.

/* #region 🏁 todo
- [] Queue any sent messages to be received when the connection opens?
#endregion */

export class Socket {
  id; // Will be filled in with the user identifier after the first message.
  #debug;
  #killSocket = false;
  #ws;
  #reconnectTime = 1000;
  #queue = [];

  constructor(debug) {
    this.#debug = debug;
  }

  // Connects a WebSocket object and takes a handler for messages.
  connect(host, receive, reload, protocol = "wss") {
    try {
      this.#ws = new WebSocket(`${protocol}://${host}`);
    } catch {
      console.warn("📡 Connection failed");
      return;
    }

    const ws = this.#ws;

    // Send a message to the console after the first connection.
    ws.onopen = (e) => {
      // if (this.#debug) console.log("📡 Connected"); // Redundant log given an initial message from the server.
      this.#queue.forEach((q) => this.send(...q)); // Send any held messages.
      this.#reconnectTime = 1000;
    };

    // Respond to incoming messages and assume `e.data` is a JSON String.
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      this.#preReceive(msg, receive, reload);
    };

    // Recursively re-connect after every second upon close or failed connection.
    ws.onclose = (e) => {
      console.warn("📡 Disconnected...", e.reason);
      // Only reconnect if we are not killing the socket and not in development mode.
      if (this.#killSocket === false) {
        console.log("📡 Reconnecting in:", this.#reconnectTime, "ms");
        setTimeout(() => {
          this.connect(host, receive, reload, protocol);
        }, this.#reconnectTime);
        this.#reconnectTime = Math.min(this.#reconnectTime * 2, 32000);
      }
    };

    // Close on error.
    ws.onerror = (err) => {
      console.error("📡 Error:", err);
      ws.close();
    };
  }

  // Send a formatted message to the connected WebSocket server.
  // Passes silently on no connection.
  send(type, content) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify({ type, content }));
    } else {
      this.#queue.push([type, content]);
    }
  }

  // Kills the socket permanently.
  kill() {
    this.#killSocket = true;
    this.#ws?.close();
  }

  // Before passing messages to disk code, handle some system messages here.
  // Note: "reload" should only be defined when in development / debug mode.
  #preReceive({ id, type, content }, receive, reload) {
    if (type === "message") {
      // 🔴 TODO: Catch this JSON.parse error.
      const c = JSON.parse(content);
      if (c.text) {
        console.log(`📡 ${c.text}`); // Someone else has connected as...
      } else {
        // Send a self-connection message here. (You are connected as...)
        console.log(`📡 ${c.ip} → 🤹 ${c.playerCount} : @${c.id}`);
        this.id = c.id; // Set the user identifier.
      }
    } else if (type === "reload" && reload) {
      let c;
      if (typeof content === "object") {
        c = content;
      } else {
        c = JSON.parse(content);
      }
      this.kill();
      reload(c);
    } else {
      if (type === "left")
        console.log(
          `📡 ${content.id} has left. Connections open: ${content.count}`
        );
      receive?.(id, type, content); // Finally send the message to the client.
    }
  }
}
