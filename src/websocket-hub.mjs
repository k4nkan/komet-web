import crypto from "node:crypto";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function acceptKey(key) {
  return crypto.createHash("sha1").update(`${key}${WS_GUID}`).digest("base64");
}

function createFrame(payload, opcode = 0x1) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;

  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length <= 65_535) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  return Buffer.concat([header, data]);
}

function closeSocket(socket) {
  if (!socket.destroyed) {
    socket.end(createFrame(Buffer.alloc(0), 0x8));
  }
}

function readFrame(buffer) {
  if (buffer.length < 2) {
    return null;
  }

  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) === 0x80;
  let length = buffer[1] & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < offset + 2) {
      return null;
    }
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) {
      return null;
    }
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  let mask;
  if (masked) {
    if (buffer.length < offset + 4) {
      return null;
    }
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + length) {
    return null;
  }

  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  if (mask) {
    for (let index = 0; index < payload.length; index += 1) {
      payload[index] ^= mask[index % 4];
    }
  }

  return { opcode, payload };
}

export function createWebSocketHub() {
  const clients = new Set();

  function remove(socket) {
    clients.delete(socket);
  }

  function send(socket, message) {
    if (socket.destroyed) {
      remove(socket);
      return;
    }

    socket.write(createFrame(JSON.stringify(message)), (error) => {
      if (error) {
        socket.destroy();
        remove(socket);
      }
    });
  }

  return {
    accept(req, socket) {
      const key = req.headers["sec-websocket-key"];
      if (!key) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      socket.write(
        [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${acceptKey(key)}`,
          "\r\n",
        ].join("\r\n"),
      );

      socket.setNoDelay(true);
      clients.add(socket);

      socket.on("data", (buffer) => {
        const frame = readFrame(buffer);
        if (!frame) {
          return;
        }

        if (frame.opcode === 0x8) {
          closeSocket(socket);
        } else if (frame.opcode === 0x9) {
          socket.write(createFrame(frame.payload, 0x0a));
        }
      });
      socket.on("close", () => remove(socket));
      socket.on("error", () => remove(socket));
    },

    broadcast(type, payload) {
      for (const socket of clients) {
        send(socket, { type, ...payload });
      }
    },

    close() {
      for (const socket of clients) {
        closeSocket(socket);
      }
      clients.clear();
    },
  };
}
