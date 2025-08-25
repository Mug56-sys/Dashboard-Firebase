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
  type?: 'text' | 'task' | 'task_update';
  taskData?: {
    taskText: string;
    taskId: string;
    status?: 'pending' | 'finished' | 'deleted';
  };
};

type Chat = {
  id: string;
  participants: string[];
  participantEmails: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  updatedAt: any;
};

type Task = {
  id: string;
  task: string;
  fromUserId: string;
  fromUserEmail: string;
  toUserId: string;
  toUserEmail: string;
  status: 'pending' | 'finished' | 'deleted';
  createdAt: any;
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
  const [showTaskInput, setShowTaskInput] = useState<boolean>(false);
  const [newTask, setNewTask] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!userId) return;

      try {
        if (Notification.permission === 'denied') {
          console.log('Notifications are blocked. User needs to enable them in browser settings.');
          return;
        }
        
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
          }
        }

        if (Notification.permission === 'granted') {
          console.log("Notification permission granted.");
          
          const vapidKey = import.meta.env.VITE_VAPID_KEY;
          
          if (!vapidKey) {
            console.warn("VAPID key not found. Push notifications will not work. Set VITE_VAPID_KEY in your .env file");
            return;
          }
          
          try {
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
          } catch (tokenError) {
            console.log("Error getting FCM token:", tokenError);
          }
        }
      } catch (error) {
        console.log("An error occurred while setting up notifications:", error);
      }
    };

    setupNotifications();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received:", payload);
      if (payload.notification && Notification.permission === 'granted') {
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
    if (!userId) {
      console.log("No userId, skipping chats query");
      return;
    }

    console.log("Setting up chats listener for user:", userId);

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(
      chatsQuery, 
      (snapshot) => {
        console.log("Chats snapshot received:", snapshot.size, "chats");
        const chatsData: Chat[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log("Chat data:", doc.id, data);
          chatsData.push({
            id: doc.id,
            participants: data.participants || [],
            participantEmails: data.participantEmails || [],
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime,
            updatedAt: data.updatedAt || data.createdAt,
          } as Chat);
        });
        
        chatsData.sort((a, b) => {
          const aTime = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
          const bTime = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        
        console.log("Setting chats:", chatsData);
        setChats(chatsData);
      },
      (error) => {
        console.error("Error listening to chats:", error);
        getDocs(chatsQuery).then((snapshot) => {
          const chatsData: Chat[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            chatsData.push({
              id: doc.id,
              participants: data.participants || [],
              participantEmails: data.participantEmails || [],
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime,
              updatedAt: data.updatedAt || data.createdAt,
            } as Chat);
          });
          
          chatsData.sort((a, b) => {
            const aTime = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
            const bTime = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
          
          setChats(chatsData);
        }).catch(err => {
          console.error("Fallback query also failed:", err);
        });
      }
    );

    return () => {
      console.log("Cleaning up chats listener");
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    console.log("Setting up message listener for chat:", selectedChat.id);

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", selectedChat.id)
    );

    const unsubscribe = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        console.log("Messages snapshot received:", snapshot.size, "messages");
        const messagesData: Message[] = [];
        snapshot.docChanges().forEach((change) => {
          console.log("Message change:", change.type, change.doc.id);
        });
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            text: data.text || "",
            senderId: data.senderId || "",
            senderEmail: data.senderEmail || "",
            timestamp: data.timestamp,
            chatId: data.chatId || "",
            type: data.type || 'text',
            taskData: data.taskData || null,
          } as Message);
        });
        
        messagesData.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(0);
          const bTime = b.timestamp?.toDate?.() || new Date(0);
          return aTime.getTime() - bTime.getTime();
        });
        
        console.log("Setting messages:", messagesData.length, "messages");
        setMessages(messagesData);
      },
      (error) => {
        console.error("Error listening to messages:", error);
        getDocs(messagesQuery).then((snapshot) => {
          const messagesData: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messagesData.push({
              id: doc.id,
              text: data.text || "",
              senderId: data.senderId || "",
              senderEmail: data.senderEmail || "",
              timestamp: data.timestamp,
              chatId: data.chatId || "",
              type: data.type || 'text',
              taskData: data.taskData || null,
            } as Message);
          });
          
          messagesData.sort((a, b) => {
            const aTime = a.timestamp?.toDate?.() || new Date(0);
            const bTime = b.timestamp?.toDate?.() || new Date(0);
            return aTime.getTime() - bTime.getTime();
          });
          
          setMessages(messagesData);
        }).catch(err => {
          console.error("Fallback messages query failed:", err);
        });
      }
    );

    return () => {
      console.log("Cleaning up message listener");
      unsubscribe();
    };
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

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`; 
    
    const optimisticMessage: Message = {
      id: tempId,
      text: messageText,
      senderId: userId,
      senderEmail: userEmail,
      timestamp: { toDate: () => new Date() }, 
      chatId: selectedChat.id,
      type: 'text',
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage(""); 
    try {
      const messageData = {
        text: messageText,
        senderId: userId,
        senderEmail: userEmail,
        chatId: selectedChat.id,
        timestamp: serverTimestamp(),
        type: 'text',
      };

      console.log("Sending message:", messageData);
      const docRef = await addDoc(collection(db, "messages"), messageData);
      console.log("Message sent with ID:", docRef.id);

      await setDoc(
        doc(db, "chats", selectedChat.id),
        {
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessages(prev => prev.filter(msg => msg.id !== tempId));

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(messageText);
      alert("Failed to send message. Please try again.");
    }
  };

  const sendTask = async () => {
    if (!newTask.trim() || !selectedChat || !userId || !userEmail) return;

    const taskText = newTask.trim();
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const recipientId = selectedChat.participants.find(id => id !== userId);
    const recipientEmail = selectedChat.participantEmails.find(email => email !== userEmail);

    if (!recipientId || !recipientEmail) {
      console.error("Could not find recipient:", { recipientId, recipientEmail, selectedChat });
      return;
    }

    console.log("Sending task:", {
      taskId,
      taskText,
      fromUserId: userId,
      fromUserEmail: userEmail,
      toUserId: recipientId,
      toUserEmail: recipientEmail
    });

    try {
      const taskData: Task = {
        id: taskId,
        task: taskText,
        fromUserId: userId,
        fromUserEmail: userEmail,
        toUserId: recipientId,
        toUserEmail: recipientEmail,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("Creating task document with data:", taskData);
      await setDoc(doc(db, "tasks", taskId), taskData);
      console.log("Task document created successfully");

      const taskMessageData = {
        text: `📋 Task: ${taskText}`,
        senderId: userId,
        senderEmail: userEmail,
        chatId: selectedChat.id,
        timestamp: serverTimestamp(),
        type: 'task',
        taskData: {
          taskText: taskText,
          taskId: taskId,
          status: 'pending',
        },
      };

      console.log("Creating task message:", taskMessageData);
      await addDoc(collection(db, "messages"), taskMessageData);

      await setDoc(
        doc(db, "chats", selectedChat.id),
        {
          lastMessage: `📋 Task: ${taskText}`,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNewTask("");
      setShowTaskInput(false);
      console.log("Task sent successfully");

    } catch (error) {
      console.error("Error sending task:", error);
      alert("Failed to send task. Please try again.");
    }
  };

  const getOtherParticipantEmail = (chat: Chat) => {
    return chat.participantEmails.find((email) => email !== userEmail) || "Unknown";
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.senderId === userId;
    
    if (message.type === 'task') {
      return (
        <div
          key={message.id}
          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg border-2 ${
              isOwn
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-yellow-100 border-yellow-300 text-yellow-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="font-semibold">TASK</span>
            </div>
            <p className="text-sm mt-1">{message.taskData?.taskText}</p>
            <p className="text-xs mt-2 opacity-75">
              Status: {message.taskData?.status || 'pending'}
            </p>
            <p className="text-xs mt-1 opacity-75">
              {message.timestamp
                ? new Date(message.timestamp.toDate()).toLocaleTimeString()
                : "Sending..."}
            </p>
          </div>
        </div>
      );
    }

    if (message.type === 'task_update') {
      return (
        <div
          key={message.id}
          className="flex justify-center"
        >
          <div className="bg-gray-200 px-4 py-2 rounded-lg text-gray-700 text-sm text-center">
            <span className="italic">{message.text}</span>
            <p className="text-xs mt-1 opacity-75">
              {message.timestamp
                ? new Date(message.timestamp.toDate()).toLocaleTimeString()
                : "Just now"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-gray-300 text-black"
          }`}
        >
          <p className="text-sm">{message.text}</p>
          <p className="text-xs mt-1 opacity-75">
            {message.timestamp
              ? new Date(message.timestamp.toDate()).toLocaleTimeString()
              : "Sending..."}
          </p>
        </div>
      </div>
    );
  };

  if (!isLogged) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-3xl font-bold">Please login to access chats</p>
      </div>
    );
  }

  return (
    <div className="flex justify-self-center bg-gray-200 h-screen w-3/4 mt-2 border-[3px] rounded grid grid-rows-[auto_1fr] overflow-y-scroll">
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
                    {chat.lastMessageTime.toDate ? 
                      new Date(chat.lastMessageTime.toDate()).toLocaleString() :
                      "Just now"
                    }
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col h-screen">
          {selectedChat ? (
            <>
              <div className="bg-gray-300 p-3 border-b">
                <h3 className="font-semibold">
                  Chat with {getOtherParticipantEmail(selectedChat)}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => renderMessage(message))}
                <div ref={messagesEndRef} />
              </div>

              {showTaskInput && (
                <div className="border-t bg-yellow-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📋</span>
                    <span className="font-semibold text-yellow-700">Send Task</span>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="flex-1 border rounded-lg px-3 py-2"
                      placeholder="Enter task description..."
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          sendTask();
                        }
                        if (e.key === "Escape") {
                          setShowTaskInput(false);
                          setNewTask("");
                        }
                      }}
                    />
                    <button
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                      onClick={sendTask}
                    >
                      Send Task
                    </button>
                    <button
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                      onClick={() => {
                        setShowTaskInput(false);
                        setNewTask("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

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
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                  onClick={() => setShowTaskInput(true)}
                >
                  Send Task
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