import { useEffect, useMemo, useState } from "react";
import { getUserInfo, isLoggedIn } from "../services/auth.service";
import { socketIo } from "../socket/socket.oi";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "../redux/apis/notification.api";
import { NotificationItem } from "../models/notification";

export const useNotifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isAuthed = isLoggedIn();
  const user = getUserInfo();

  const { data, isFetching, refetch } = useGetNotificationsQuery(undefined, {
    skip: !isAuthed,
  });
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!isAuthed || !user?.userId) {
      return;
    }

    socketIo.auth = { token: localStorage.getItem("accessToken") || "" };
    socketIo.connect();

    const handleNotification = (notification: NotificationItem) => {
      setLiveNotifications((prev) => [notification, ...prev]);
    };

    socketIo.on("notification:new", handleNotification);
    return () => {
      socketIo.off("notification:new", handleNotification);
      socketIo.disconnect();
    };
  }, [isAuthed, user?.userId]);

  const notifications = useMemo(() => {
    const combined = [...(liveNotifications || []), ...(data || [])];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item._id)) {
        return false;
      }
      seen.add(item._id);
      return true;
    });
  }, [data, liveNotifications]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const toggle = () => {
    setIsOpen((prev) => !prev);
    if (!data && isAuthed) {
      void refetch();
    }
  };

  const close = () => setIsOpen(false);

  const markAsRead = async (notificationId: string) => {
    await markNotificationRead(notificationId).unwrap();
  };

  return {
    notifications,
    unreadCount,
    isOpen,
    isFetching,
    toggle,
    close,
    markAsRead,
  };
};