import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../utils/Firebase";

type Task = {
  id: number;
  task: string;
};

type TaskStatus = "pending" | "finished" | "deleted";

type ReceivedTask = {
  id: string;
  task: string;
  fromUserId: string;
  fromUserEmail: string;
  toUserId: string;
  toUserEmail: string;
  status: TaskStatus;
  createdAt: any;
  updatedAt: any;
};

export default function Home({
  isLogged,
  userId,
  userEmail,
}: {
  isLogged: boolean | null;
  userId: string;
  userEmail: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [receivedTasks, setReceivedTasks] = useState<ReceivedTask[]>([]);
  const [task, setTask] = useState<string>("");
  const [updateState, setUpdateState] = useState<number | null>(null);
  const [updateTask, setUpdateTask] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<"personal" | "received">(
    "personal"
  );

  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return;
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setTasks(userDoc.data().tasks || []);
        } else {
          setTasks([]);
        }
      } catch (e) {
        console.error("fetchTasks error:", e);
      }
    };
    fetchTasks();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const tasksQuery = query(collection(db, "tasks"), where("toUserId", "==", userId));
    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData: ReceivedTask[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() || {};
          tasksData.push({
            id: docSnap.id,
            task: data.task || "",
            fromUserId: data.fromUserId || "",
            fromUserEmail: data.fromUserEmail || "",
            toUserId: data.toUserId || "",
            toUserEmail: data.toUserEmail || "",
            status: (data.status as TaskStatus) || "pending",
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          });
        });
        tasksData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        setReceivedTasks(tasksData);
      },
      (error) => {
        console.error("Error listening to tasks:", error);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [userId]);

  const updateUserTasks = async (newTasks: Task[]) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, "users", userId), { tasks: newTasks }, { merge: true });
    } catch (e) {
      console.log(e);
    }
  };

  const updateOriginalTaskMessage = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const messagesQuery = query(
        collection(db, "messages"), 
        where("type", "==", "task"),
        where("taskData.taskId", "==", taskId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      const updatePromises = messagesSnapshot.docs.map(async (messageDoc) => {
        const messageData = messageDoc.data();
        const updatedTaskData = {
          ...messageData.taskData,
          status: newStatus
        };
        
        return updateDoc(doc(db, "messages", messageDoc.id), {
          taskData: updatedTaskData
        });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating original task message:", error);
    }
  };

  const updateChatMessagesForTask = async (
    taskId: string,
    newStatus: TaskStatus,
    taskText: string,
    fromUserId?: string,
    toUserId?: string
  ) => {
    try {
      const messagesQuery = query(collection(db, "messages"), where("taskData.taskId", "==", taskId));
      const messagesSnapshot = await getDocs(messagesQuery);
      let chatId: string | null = null;

      if (messagesSnapshot.docs.length > 0) {
        const firstMessage = messagesSnapshot.docs[0];
        chatId = firstMessage.data().chatId || null;
      } else {
        console.log("No message referenced this task; will fallback to chat search");
      }

      const validateChatHasUser = async (cid: string | null) => {
        if (!cid) return false;
        const chatSnap = await getDoc(doc(db, "chats", cid));
        if (!chatSnap.exists()) return false;
        const data = chatSnap.data() || {};
        const participants: string[] = data.participants || [];
        return participants.includes(userId);
      };

      if (chatId) {
        const ok = await validateChatHasUser(chatId);
        if (!ok) {
          chatId = null;
        }
      }

      if (!chatId) {
        const searchUserId = fromUserId || toUserId || userId;
        if (searchUserId) {
          const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", searchUserId));
          const chatsSnap = await getDocs(chatsQuery);
          for (const chatDoc of chatsSnap.docs) {
            const data = chatDoc.data();
            const participants: string[] = data.participants || [];
            if (fromUserId && toUserId && participants.includes(fromUserId) && participants.includes(toUserId)) {
              if (participants.includes(userId)) {
                chatId = chatDoc.id;
                break;
              } else {
                continue;
              }
            }
          }
          if (!chatId) {
            for (const chatDoc of chatsSnap.docs) {
              const data = chatDoc.data();
              const participants: string[] = data.participants || [];
              if (participants.includes(userId) && (fromUserId ? participants.includes(fromUserId) : true)) {
                chatId = chatDoc.id;
                break;
              }
            }
          }
        }
      }

      if (!chatId) {
        console.warn(`No suitable chat found for task ${taskId}. Aborting posting update message.`);
        return;
      }

      const chatSnapFinal = await getDoc(doc(db, "chats", chatId));
      if (!chatSnapFinal.exists()) {
        console.warn("Final chat doc missing:", chatId);
        return;
      }
      const chatData = chatSnapFinal.data() || {};
      const participants: string[] = chatData.participants || [];
      if (!participants.includes(userId)) {
        console.warn(`User ${userId} is not a participant of chat ${chatId}. Aborting to avoid permission error.`);
        return;
      }

      const statusEmoji = newStatus === "finished" ? "✅" : newStatus === "pending" ? "⏳" : "🗑️";
      const updateMessageData = {
        text: `Task "${taskText}" marked as ${newStatus} ${statusEmoji}`,
        senderId: userId,
        senderEmail: userEmail,
        chatId,
        timestamp: serverTimestamp(),
        type: "task_update",
      };

      try {
        const added = await addDoc(collection(db, "messages"), updateMessageData);
      } catch (err: any) {
        console.error("Failed to add task_update message. Error:", err?.code, err?.message || err);
        throw err;
      }

      try {
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: updateMessageData.text,
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error("Failed to update chat lastMessage. Error:", err?.code, err?.message || err);
        throw err;
      }
    } catch (error: any) {
      console.error("Error updating chat messages for task:", error?.code, error?.message || error);
    }
  };

  const updateReceivedTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const taskToUpdate = receivedTasks.find((t) => t.id === taskId);
      if (!taskToUpdate) {
        console.warn("updateReceivedTaskStatus: task not found:", taskId);
        return;
      }
      
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      
      await updateOriginalTaskMessage(taskId, newStatus);
      
      await updateChatMessagesForTask(taskId, newStatus, taskToUpdate.task, taskToUpdate.fromUserId, taskToUpdate.toUserId);
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update task status. Please try again.");
    }
  };

  const deleteReceivedTask = async (taskId: string) => {
    try {
      const taskToDelete = receivedTasks.find((t) => t.id === taskId);
      if (!taskToDelete) {
        console.warn("deleteReceivedTask: task not found:", taskId);
        return;
      }
      
      await updateDoc(doc(db, "tasks", taskId), {
        status: "deleted",
        updatedAt: serverTimestamp(),
      });
      
      await updateOriginalTaskMessage(taskId, "deleted");
      
      await updateChatMessagesForTask(taskId, "deleted", taskToDelete.task, taskToDelete.fromUserId, taskToDelete.toUserId);
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  const handleDelete = (id: number) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    updateUserTasks(updatedTasks);
  };

  const handleUpdateTask = (id: number) => {
    if (updateTask === "") return;
    const updatedTasks = tasks.map((t) => (t.id === id ? { ...t, task: updateTask } : t));
    setTasks(updatedTasks);
    setUpdateTask("");
    setUpdateState(null);
    updateUserTasks(updatedTasks);
  };

  const handleUpdate = (id: number) => {
    setUpdateState(null);
    setUpdateState(id);
  };

  const handleAdd = () => {
    if (task === "") return;
    const newTasks = [...tasks, { id: Date.now(), task }];
    setTasks(newTasks);
    setTask("");
    updateUserTasks(newTasks);
  };

  const getStatusDisplay = (status: TaskStatus) => {
    switch (status) {
      case "pending":
        return {
          emoji: "⏳",
          color: "text-yellow-700",
          bg: "bg-yellow-100",
          border: "border-yellow-300",
          label: "Pending",
        };
      case "finished":
        return {
          emoji: "✅",
          color: "text-green-700",
          bg: "bg-green-100",
          border: "border-green-300",
          label: "Finished",
        };
      case "deleted":
        return {
          emoji: "🗑️",
          color: "text-red-700",
          bg: "bg-red-100",
          border: "border-red-300",
          label: "Deleted",
        };
      default:
        return {
          emoji: "⏳",
          color: "text-yellow-700",
          bg: "bg-yellow-100",
          border: "border-yellow-300",
          label: "Pending",
        };
    }
  };

  const pendingTasks = receivedTasks.filter((t) => t.status === "pending");
  const finishedTasks = receivedTasks.filter((t) => t.status === "finished");
  const deletedTasks = receivedTasks.filter((t) => t.status === "deleted");
  const visibleTasks = receivedTasks.filter((t) => t.status !== "deleted");

  if (!isLogged) {
    return (
      <p className="h-screen flex justify-center grid content-center font-bold text-3xl">
        Login/Register to get Started
      </p>
    );
  }

  return (
    <div className="flex justify-self-center w-4/5 mt-3 border rounded-lg grid grid-row m-2">
      <div className="border-b">
        <span className="text-3xl p-1 font-bold text-center w-full block border-b">Dashboard</span>
        <div className="flex">
          <button
            className={`flex-1 p-3 text-lg font-semibold transition-colors ${
              selectedTab === "personal" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedTab("personal")}
          >
            📝 Personal Tasks ({tasks.length})
          </button>
          <button
            className={`flex-1 p-3 text-lg font-semibold transition-colors ${
              selectedTab === "received" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedTab("received")}
          >
            📋 Received Tasks ({visibleTasks.length})
          </button>
        </div>
      </div>

      {selectedTab === "personal" ? (
        <div>
          <div className="w-[100%] pt-1 px-1">
            <button
              className="text-xl border rounded-lg m-1 p-1 hover:bg-gray-200 w-[15%] cursor-pointer"
              onClick={() => handleAdd()}
            >
              Add Task
            </button>
            <input
              placeholder="Cook Dinner..."
              className="border rounded-xl text-xl p-1 mx-1 w-[82%]"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAdd();
                }
              }}
            />
          </div>
          <ol className="px-2 pr-4 max-h-96 overflow-y-scroll">
            {tasks.map((t) => (
              <li key={t.id} className="border rounded-lg p-2 pl-3 my-2 flex">
                {updateState === t.id ? (
                  <div className="flex justify-end w-full">
                    <input
                      placeholder="Update"
                      className="border justify-start flex flex-1 mr-2 px-2"
                      value={updateTask}
                      onChange={(e) => setUpdateTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateTask(t.id);
                        }
                      }}
                    />
                    <button
                      className="border rounded-lg w-13 p-[2px] text-[13px] bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1"
                      onClick={() => setUpdateState(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="border rounded-lg w-13 p-[2px] text-[13px] bg-yellow-500 mx-1 text-white border-black hover:font-bold cursor-pointer"
                      onClick={() => handleUpdateTask(t.id)}
                    >
                      Submit
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 break-words">{t.task}</span>
                    <div className="flex justify-end">
                      <button
                        className="border rounded-lg w-13 p-[2px] text-[13px] bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1"
                        onClick={() => handleDelete(t.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="border rounded-lg w-13 p-[2px] text-[13px] bg-green-500 mx-1 text-white border-black hover:font-bold cursor-pointer"
                        onClick={() => handleUpdate(t.id)}
                      >
                        Update
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {tasks.length === 0 && <div className="text-center text-gray-500 py-8">No personal tasks yet. Add one above!</div>}
          </ol>
        </div>
      ) : (
        <div>
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⏳</span>
                <span>Pending: {pendingTasks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <span>Finished: {finishedTasks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">🗑️</span>
                <span>Deleted: {deletedTasks.length}</span>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-scroll p-2">
            {visibleTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No tasks received yet.</div>
            ) : (
              <div className="space-y-3">
                {visibleTasks.map((receivedTask) => {
                  const statusDisplay = getStatusDisplay(receivedTask.status);
                  return (
                    <div key={receivedTask.id} className={`border-2 rounded-lg p-4 ${statusDisplay.bg} ${statusDisplay.border}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📋</span>
                          <span className="font-semibold text-gray-800">Task from {receivedTask.fromUserEmail}</span>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded ${statusDisplay.bg} ${statusDisplay.color} font-medium`}>
                          {statusDisplay.emoji} {statusDisplay.label}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-3 font-medium">{receivedTask.task}</p>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          <div>
                            Created:{" "}
                            {receivedTask.createdAt?.toDate
                              ? new Date(receivedTask.createdAt.toDate()).toLocaleString()
                              : "Just now"}
                          </div>
                          {receivedTask.updatedAt && receivedTask.updatedAt !== receivedTask.createdAt && (
                            <div>
                              Updated:{" "}
                              {receivedTask.updatedAt?.toDate
                                ? new Date(receivedTask.updatedAt.toDate()).toLocaleString()
                                : "Just now"}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            className="text-xs border rounded px-2 py-1 bg-white"
                            value={receivedTask.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as TaskStatus;
                              updateReceivedTaskStatus(receivedTask.id, newStatus);
                            }}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="finished">✅ Finished</option>
                          </select>
                          <button
                            className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 font-medium"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete the task "${receivedTask.task}"? This action cannot be undone.`)) {
                                deleteReceivedTask(receivedTask.id);
                              }
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}