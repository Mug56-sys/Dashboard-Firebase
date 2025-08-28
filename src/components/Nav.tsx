import { useNavigate } from "react-router";
import { getAuth, signOut } from "firebase/auth";
import { app, db } from "../utils/Firebase";
import { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy 
} from "firebase/firestore";

type Chat = {
  id: string;
  participants: string[];
  participantEmails: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  lastReadBy?: { [userId: string]: any };
  updatedAt: any;
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

export default function Nav({ 
  isLogged, 
  userId, 
  userEmail 
}: { 
  isLogged: boolean | null;
  userId?: string;
  userEmail?: string;
}) {
  const navigate = useNavigate();
  const auth = getAuth(app);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<{
    id: string;
    message: string;
    timestamp: Date;
    type: 'message' | 'task';
  }[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    if (!userId || !isLogged) {
      setUnreadCount(0);
      setRecentNotifications([]);
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (chatsSnapshot) => {
      let totalUnread = 0;
      const newNotifications: typeof recentNotifications = [];

      for (const chatDoc of chatsSnapshot.docs) {
        const chatData = chatDoc.data() as Chat;
        const chatId = chatDoc.id;
        
        const userLastRead = chatData.lastReadBy?.[userId];
        
        
        const messagesQuery = query(
          collection(db, "messages"),
          where("chatId", "==", chatId),
          where("senderId", "!=", userId), 
          orderBy("timestamp", "desc")
        );

        try {
          const messagesSnapshot = await new Promise<any>((resolve) => {
            const unsubMessages = onSnapshot(messagesQuery, resolve);
            setTimeout(() => unsubMessages(), 100); 
          });

          let chatUnreadCount = 0;
          
          messagesSnapshot.forEach((messageDoc: any) => {
            const messageData = messageDoc.data() as Message;
            
            if (!userLastRead || (messageData.timestamp?.toDate() > userLastRead?.toDate())) {
              chatUnreadCount++;
              
              if (newNotifications.length < 5) {
                const otherUserEmail = chatData.participantEmails.find(email => email !== userEmail) || "Unknown";
                
                let notificationMessage = "";
                let notificationType: 'message' | 'task' = 'message';
                
                if (messageData.type === 'task') {
                  notificationMessage = `${otherUserEmail} sent you a task: "${messageData.taskData?.taskText || messageData.text}"`;
                  notificationType = 'task';
                } else if (messageData.type === 'task_update') {
                  notificationMessage = `Task update: ${messageData.text}`;
                } else {
                  notificationMessage = `${otherUserEmail}: ${messageData.text}`;
                }
                
                newNotifications.push({
                  id: messageDoc.id,
                  message: notificationMessage,
                  timestamp: messageData.timestamp?.toDate() || new Date(),
                  type: notificationType
                });
              }
            }
          });
          
          totalUnread += chatUnreadCount;
          
        } catch (error) {
          console.error("Error querying messages for chat:", chatId, error);
        }
      }

      setUnreadCount(totalUnread);
      
      const sortedNotifications = newNotifications
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);
      
      setRecentNotifications(sortedNotifications);
    });

    return () => unsubscribe();
  }, [userId, isLogged, userEmail]);

  const handleNavigateToChats = async () => {
    if (userId) {
      try {
        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", userId)
        );
        
        const chatsSnapshot = await new Promise<any>((resolve) => {
          const unsubscribe = onSnapshot(chatsQuery, resolve);
          setTimeout(() => unsubscribe(), 100);
        });

        const updatePromises = chatsSnapshot.docs.map((chatDoc: any) => {
          return updateDoc(doc(db, "chats", chatDoc.id), {
            [`lastReadBy.${userId}`]: serverTimestamp()
          });
        });

        await Promise.all(updatePromises);
      } catch (error) {
        console.error("Error marking chats as read:", error);
      }
    }
    
    navigate("/chats");
  };

  useEffect(() => {
    if (recentNotifications.length > 0 && Notification.permission === 'granted') {
      const latestNotification = recentNotifications[0];
      
      const now = new Date();
      const timeDiff = now.getTime() - latestNotification.timestamp.getTime();
      
      if (timeDiff < 10000) { 
        new Notification(
          latestNotification.type === 'task' ? 'New Task Received' : 'New Message',
          {
            body: latestNotification.message,
            icon: '/favicon.ico',
            tag: latestNotification.id 
          }
        );
      }
    }
  }, [recentNotifications]);

  return (
    <div className="grid grid-cols-2 bg-gray-500 border-b-[3px] py-5 text-2xl px-3 relative">
      <div
        className="bg-green-300 justify-self-start rounded-full px-10 grid content-center font-bold py-1 cursor-pointer relative group inline-block"
        onClick={() => {
          if (location.pathname === "/home") location.reload();
          navigate("/home");
        }}
      >
        <span>LOGO</span>
        {location.pathname !== "/home" ? (
          <span className="absolute top-full left-1/2 bg-gray-900 p-1 rounded-md hidden group-hover:block whitespace-nowrap text-[9px] -translate-x-1/2 mb-30 text-white">
            Go back Home
          </span>
        ) : null}
      </div>
      
      <div className="justify-self-end w-[185px] flex justify-between items-center relative">
        {!isLogged ? (
          <>
            <button
              className="bg-white cursor-pointer px-3 font-bold rounded-lg text-lg hover:bg-gray-200"
              onClick={() => navigate("/register")}
            >
              Register
            </button>
            <button
              className="bg-white cursor-pointer px-3 font-bold rounded-lg text-lg hover:bg-gray-200"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </>
        ) : (
          <>
            <button
              className="bg-white cursor-pointer px-3 font-bold rounded-lg text-lg hover:bg-gray-200"
              onClick={handleLogout}
            >
              Log Off
            </button>
            
            <div className="relative">
              <button
                className="bg-white cursor-pointer px-3 font-bold rounded-lg text-lg hover:bg-gray-200 relative"
                onClick={handleNavigateToChats}
                onMouseEnter={() => setShowNotifications(true)}
                onMouseLeave={() => setShowNotifications(false)}
              >
                Chats
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && recentNotifications.length > 0 && (
                <div 
                  className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                  onMouseEnter={() => setShowNotifications(true)}
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <div className="p-3 border-b bg-gray-50">
                    <h3 className="font-bold text-sm text-gray-800">Recent Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className="p-3 border-b hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={handleNavigateToChats}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {notification.type === 'task' ? '📋' : '💬'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 text-xs leading-4 break-words">
                              {notification.message}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 bg-gray-50 text-center">
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={handleNavigateToChats}
                    >
                      View All Chats
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}