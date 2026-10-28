export const UNREAD_COUNTS_CHANGED = "careerlink:unread-counts-changed";

export const emitUnreadCountsChanged = () => {
  window.dispatchEvent(new Event(UNREAD_COUNTS_CHANGED));
};
