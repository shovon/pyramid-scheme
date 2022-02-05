audienceWss.on("connection", (ws, request) => {
  if (request.url) {
    const roomName = request.url.split("/")[2];
    let room = rooms.get(roomName) || new Tree();
    if (!rooms.has(roomName)) {
      rooms.set(roomName, room);
    }

    const id = nextId();

    const node = new Node(id, ws);

    room.insertNode(node);

    broadcastRoomState(room);

    ws.on("close", () => {
      room.removeNodeByKey(id);
      if (room.isEmpty) {
        rooms.delete(id);
      } else {
        broadcastRoomState(room);
      }
    });

    ws.on("message", (message) => {
      const parsed = JSON.parse(message.toString());
      if (typeof parsed === "object") {
        switch (parsed.type) {
          case "MESSAGE":
            {
              if (!!parsed.data?.to) {
                const destinationNode = node.adjacentNodes.find(
                  (node) => node.key === parsed.data.to
                );
                if (destinationNode) {
                  sendMessage(
                    destinationNode.value,
                    createRelayMessage(
                      { from: node.key, to: parsed.data.to },
                      parsed.data.payload
                    )
                  );
                }
              }
            }
            break;
        }
      }
    });
  } else {
    ws.close();
  }
});
