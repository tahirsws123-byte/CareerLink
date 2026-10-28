import { useEffect, useState } from "react";
import { Check, Clock, UserMinus, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  getConnectionStatus,
  rejectConnectionRequest,
  removeConnection,
  sendConnectionRequest,
} from "../../services/connectionServices";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export default function ConnectionActionButton({
  userId,
  initialStatus = "",
  initialConnectionId = "",
  onChanged,
}) {
  const [status, setStatus] = useState(initialStatus || "loading");
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadStatus = async () => {
      if (!userId) return;

      if (initialStatus) {
        setStatus(initialStatus);
        setConnectionId(initialConnectionId || "");
        return;
      }

      try {
        setStatus("loading");
        const data = await getConnectionStatus(userId);

        if (!ignore) {
          setStatus(data.status);
          setConnectionId(data.connectionId || "");
        }
      } catch {
        if (!ignore) {
          setStatus("none");
        }
      }
    };

    loadStatus();

    return () => {
      ignore = true;
    };
  }, [userId, initialStatus, initialConnectionId]);

  const updateLocalStatus = (nextStatus, nextConnectionId = "") => {
    setStatus(nextStatus);
    setConnectionId(nextConnectionId);
    onChanged?.(nextStatus);
  };

  const run = async (action, successMessage) => {
    if (working) return;

    try {
      setWorking(true);
      const result = await action();
      toast.success(successMessage);
      return result;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update request");
      return null;
    } finally {
      setWorking(false);
    }
  };

  if (status === "self") {
    return null;
  }

  if (status === "loading") {
    return (
      <button className={`${buttonBase} border border-line text-muted-ink`} disabled>
        Loading
      </button>
    );
  }

  if (status === "pending_received") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          className={`${buttonBase} bg-brand text-white hover:bg-brand-hover`}
          disabled={working}
          onClick={async () => {
            const result = await run(
              () => acceptConnectionRequest(connectionId),
              "Connection accepted",
            );

            if (result?.connection) {
              updateLocalStatus("connected", result.connection._id);
            }
          }}
          type="button"
        >
          <Check size={16} />
          Accept
        </button>

        <button
          className={`${buttonBase} border border-line text-muted-ink hover:bg-black/5`}
          disabled={working}
          onClick={async () => {
            const result = await run(
              () => rejectConnectionRequest(connectionId),
              "Connection request ignored",
            );

            if (result) {
              updateLocalStatus("rejected", connectionId);
            }
          }}
          type="button"
        >
          <X size={16} />
          Ignore
        </button>
      </div>
    );
  }

  if (status === "pending_sent") {
    return (
      <button
        className={`${buttonBase} border border-line text-muted-ink hover:bg-black/5`}
        disabled={working}
        onClick={async () => {
          const result = await run(
            () => cancelConnectionRequest(connectionId),
            "Connection request cancelled",
          );

          if (result) {
            updateLocalStatus("none");
          }
        }}
        type="button"
      >
        <Clock size={16} />
        Pending
      </button>
    );
  }

  if (status === "connected") {
    return (
      <button
        className={`${buttonBase} border border-line text-muted-ink hover:bg-black/5`}
        disabled={working}
        onClick={async () => {
          const result = await run(
            () => removeConnection(connectionId),
            "Connection removed",
          );

          if (result) {
            updateLocalStatus("none");
          }
        }}
        type="button"
      >
        <UserMinus size={16} />
        Remove
      </button>
    );
  }

  return (
    <button
      className={`${buttonBase} bg-brand text-white hover:bg-brand-hover`}
      disabled={working}
      onClick={async () => {
        const result = await run(
          () => sendConnectionRequest(userId),
          "Connection request sent",
        );

        if (result?.connection) {
          updateLocalStatus("pending_sent", result.connection._id);
        }
      }}
      type="button"
    >
      <UserPlus size={16} />
      Connect
    </button>
  );
}
