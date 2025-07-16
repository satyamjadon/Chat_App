import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [loading, setLoading] = useState(false);

  const { socket, axios } = useContext(AuthContext);

  // Function to get all users from sidebar
  const getUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [axios]);

  // Function to get messages for selected user
  const getMessages = useCallback(
    async (userId) => {
      if (!userId) return;

      try {
        setLoading(true);
        const { data } = await axios.get(`/api/messages/${userId}`);
        if (data.success) {
          setMessages(data.messages || []);
          // Reset unseen count for this user since we're viewing their messages
          setUnseenMessages((prev) => ({
            ...prev,
            [userId]: 0,
          }));
        } else {
          toast.error(data.message || "Failed to fetch messages");
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error(
          error.response?.data?.message || "Failed to fetch messages"
        );
      } finally {
        setLoading(false);
      }
    },
    [axios]
  );

  // Function to send message to selected user
  const sendMessage = useCallback(
    async (messageData) => {
      if (!selectedUser) {
        toast.error("No user selected");
        return;
      }

      try {
        const { data } = await axios.post(
          `/api/messages/send/${selectedUser._id}`,
          messageData
        );
        if (data.success) {
          setMessages((prevMessages) => [...prevMessages, data.newMessage]);
          return data.newMessage;
        } else {
          toast.error(data.message || "Failed to send message");
        }
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error(error.response?.data?.message || "Failed to send message");
      }
    },
    [selectedUser, axios]
  );

  // Function to mark message as seen
  const markMessageAsSeen = useCallback(
    async (messageId) => {
      try {
        await axios.put(`/api/messages/mark/${messageId}`);
      } catch (error) {
        console.error("Error marking message as seen:", error);
      }
    },
    [axios]
  );

  // Function to subscribe to messages for selected user
  const subscribeToMessages = useCallback(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        // If we're currently chatting with the sender, add to messages and mark as seen
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        markMessageAsSeen(newMessage._id);
      } else {
        // If we're not chatting with the sender, increment unseen count
        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]:
            (prevUnseenMessages[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    // Return cleanup function
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser, markMessageAsSeen]);

  // Function to unsubscribe from messages
  const unsubscribeFromMessages = useCallback(() => {
    if (socket) {
      socket.off("newMessage");
    }
  }, [socket]);

  // Function to clear current chat
  const clearCurrentChat = useCallback(() => {
    setMessages([]);
    setSelectedUser(null);
  }, []);

  // Subscribe to socket messages
  useEffect(() => {
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [subscribeToMessages]);

  // Clear messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    } else {
      setMessages([]);
    }
  }, [selectedUser, getMessages]);

  // Fetch users on mount
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const value = {
    messages,
    users,
    selectedUser,
    unseenMessages,
    loading,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    setUnseenMessages,
    clearCurrentChat,
    markMessageAsSeen,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
