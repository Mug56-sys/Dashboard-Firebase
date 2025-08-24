import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  setDoc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db, messaging } from "../utils/Firebase";
import { getToken, onMessage } from "firebase/messaging";

type User = {
  uid: string;
  email: string;
  displayName?: string;
  fcmToken?: string;
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  senderEmail: string;
  timestamp: any;
  chatId: string;
};

type Chat = {
  id: string;
  participants: string[];
  participantEmails: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  updatedAt: any;
};

export default function Chats({
  userId,
  userEmail,
  isLogged,
}: {
  userId: string;
  userEmail: string;
  isLogged: boolean | null;
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!userId) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          console.log("Notification permission granted.");
          
          const vapidKey = import.meta.env.VITE_VAPID_KEY;
          
          if (!vapidKey) {
            console.warn("VAPID key not found. Push notifications will not work.");
            return;
          }
          
          const currentToken = await getToken(messaging, { vapidKey });
          
          if (currentToken) {
            await setDoc(
              doc(db, "users", userId),
              { fcmToken: currentToken },
              { merge: true }
            );
            console.log("FCM token saved:", currentToken);
          } else {
            console.log("No registration token available.");
          }
        }
      } catch (error) {
        console.log("An error occurred while setting up notifications:", error);
      }
    };

    setupNotifications();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received:", payload);
      if (payload.notification) {
        new Notification(payload.notification.title || "New Message", {
          body: payload.notification.body,
          icon: "/favicon.ico",
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim() === "") {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const usersQuery = query(collection(db, "users"), limit(50));
        const snapshot = await getDocs(usersQuery);
        const users: User[] = [];
        
        snapshot.forEach((doc) => {
          if (doc.id !== userId) {
            const userData = doc.data();
            const userEmail = userData.email?.toLowerCase() || "";
            const searchTerm = searchQuery.toLowerCase().trim();
            
            if (userEmail.includes(searchTerm)) {
              users.push({
                uid: doc.id,
                email: userData.email,
                displayName: userData.displayName,
                fcmToken: userData.fcmToken,
              });
            }
          }
        });
        
        users.sort((a, b) => {
          const aEmail = a.email.toLowerCase();
          const bEmail = b.email.toLowerCase();
          const searchTerm = searchQuery.toLowerCase().trim();
          
          const aExact = aEmail.startsWith(searchTerm) ? 0 : 1;
          const bExact = bEmail.startsWith(searchTerm) ? 0 : 1;
          
          return aExact - bExact;
        });
        
        setSearchResults(users.slice(0, 10)); 
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300); 
    return () => clearTimeout(timeoutId);
  }, [searchQuery, userId]);

  useEffect(() => {
    if (!userId) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsData: Chat[] = [];
      snapshot.forEach((doc) => {
        chatsData.push({
          id: doc.id,
          ...doc.data(),
        } as Chat);
      });
      setChats(chatsData);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data(),
        } as Message);
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startChat = async (otherUser: User) => {
    if (!userId || !userEmail) return;

    try {
      const existingChatQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", userId)
      );
      const existingChats = await getDocs(existingChatQuery);
      
      let existingChat = null;
      existingChats.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants.includes(otherUser.uid)) {
          existingChat = { id: doc.id, ...chatData };
        }
      });

      if (existingChat) {
        setSelectedChat(existingChat as Chat);
      } else {
        const chatData = {
          participants: [userId, otherUser.uid],
          participantEmails: [userEmail, otherUser.email],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const chatRef = await addDoc(collection(db, "chats"), chatData);
        const newChat: Chat = {
          id: chatRef.id,
          participants: [userId, otherUser.uid],
          participantEmails: [userEmail, otherUser.email],
          updatedAt: new Date(),
        };
        setSelectedChat(newChat);
      }

      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !userId || !userEmail) return;

    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage.trim(),
        senderId: userId,
        senderEmail: userEmail,
        chatId: selectedChat.id,
        timestamp: serverTimestamp(),
      });

      await setDoc(
        doc(db, "chats", selectedChat.id),
        {
          lastMessage: newMessage.trim(),
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getOtherParticipantEmail = (chat: Chat) => {
    return chat.participantEmails.find((email) => email !== userEmail) || "Unknown";
  };

  if (!isLogged) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-3xl font-bold">Please login to access chats</p>
      </div>
    );
  }

  return (
    <div className="flex justify-self-center bg-gray-200 h-screen w-3/4 mt-2 border-[3px] rounded grid grid-rows-[auto_1fr]">
      <div className="text-white bg-blue-400 h-12 border-b border-black px-4 flex items-center justify-between text-xl">
        <span>Your Chats</span>
        <div className="relative">
          <input
            type="text"
            className="bg-white border rounded-lg m-3 text-black text-lg p-1 w-64"
            placeholder="🔍 Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.trim() !== "" && (
            <div className="absolute top-full left-3 right-3 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {isSearching ? (
                <div className="p-3 text-black text-center">
                  <span>Searching for "{searchQuery}"...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.uid}
                    className="p-3 text-black hover:bg-gray-100 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                    onClick={() => startChat(user)}
                  >
                    <div>
                      <div className="font-medium">{user.email}</div>
                      {user.displayName && (
                        <div className="text-sm text-gray-600">
                          {user.displayName}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-blue-600">
                      Click to chat
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-black text-center text-gray-600">
                  No users found with email containing "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
        <span className="bg-red-500 px-2 py-1 rounded text-sm">
          {userEmail}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_3fr] h-full">
        <div className="border-r bg-gray-100 flex flex-col overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-600">
              No chats yet. Search for users to start chatting!
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`border-b p-3 cursor-pointer hover:bg-gray-300 ${
                  selectedChat?.id === chat.id ? "bg-blue-100" : ""
                }`}
                onClick={() => setSelectedChat(chat)}
              >
                <div className="font-semibold text-sm">
                  {getOtherParticipantEmail(chat)}
                </div>
                {chat.lastMessage && (
                  <div className="text-xs text-gray-600 truncate mt-1">
                    {chat.lastMessage}
                  </div>
                )}
                {chat.lastMessageTime && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(chat.lastMessageTime.toDate()).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col h-full">
          {selectedChat ? (
            <>
              <div className="bg-gray-300 p-3 border-b">
                <h3 className="font-semibold">
                  Chat with {getOtherParticipantEmail(selectedChat)}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === userId
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 text-black"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {message.timestamp &&
                          new Date(message.timestamp.toDate()).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-4 flex space-x-2">
                <input
                  type="text"
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                />
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  onClick={sendMessage}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}