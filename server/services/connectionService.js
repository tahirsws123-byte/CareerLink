import Connection, {
  CONNECTION_STATUS,
  makeConnectionPairKey,
} from "../models/Connection.js";

export const userSummaryFields = "name headline location profilePicture publicProfileSlug";

export const getConnectionStatusPayload = (connection, viewerId) => {
  if (!connection) {
    return {
      status: "none",
      connectionId: "",
    };
  }

  const requesterId = connection.requester?._id || connection.requester;
  const recipientId = connection.recipient?._id || connection.recipient;
  const requester = requesterId?.toString();
  const recipient = recipientId?.toString();
  const viewer = viewerId.toString();

  if (connection.status === CONNECTION_STATUS.ACCEPTED) {
    return {
      status: "connected",
      connectionId: connection._id.toString(),
    };
  }

  if (connection.status === CONNECTION_STATUS.PENDING) {
    return {
      status: requester === viewer ? "pending_sent" : "pending_received",
      connectionId: connection._id.toString(),
    };
  }

  if (connection.status === CONNECTION_STATUS.REJECTED) {
    return {
      status: "rejected",
      connectionId: connection._id.toString(),
      rejectedByMe: recipient === viewer,
    };
  }

  return {
    status: "none",
    connectionId: "",
  };
};

export const findConnectionBetween = (firstUserId, secondUserId) =>
  Connection.findOne({
    pairKey: makeConnectionPairKey(firstUserId, secondUserId),
  });

export const attachConnectionStatus = async (users, viewerId) => {
  const userList = users.map((user) =>
    typeof user.toObject === "function" ? user.toObject() : user,
  );

  const pairKeys = userList.map((user) =>
    makeConnectionPairKey(viewerId, user._id),
  );

  const connections = await Connection.find({
    pairKey: {
      $in: pairKeys,
    },
  });

  const connectionByPairKey = new Map(
    connections.map((connection) => [connection.pairKey, connection]),
  );

  return userList.map((user) => {
    const payload = getConnectionStatusPayload(
      connectionByPairKey.get(makeConnectionPairKey(viewerId, user._id)),
      viewerId,
    );

    return {
      ...user,
      connectionStatus: payload.status,
      connectionId: payload.connectionId,
    };
  });
};

export const getOtherUserFromConnection = (connection, viewerId) => {
  const requesterId = connection.requester?._id || connection.requester;
  const requester = requesterId?.toString();

  return requester === viewerId.toString()
    ? connection.recipient
    : connection.requester;
};
