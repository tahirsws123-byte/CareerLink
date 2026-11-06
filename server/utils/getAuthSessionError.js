const getAuthSessionError = (user, sessionId) => {
  if (user.enforceTrackedSessions && !sessionId) {
    return "Please sign in again to continue";
  }

  if (sessionId && !user.securitySessions?.some((session) => session.sessionId === sessionId)) {
    return "This session has been signed out";
  }

  return null;
};

export default getAuthSessionError;
