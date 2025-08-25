import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../utils/Firebase";

type Task = {
  id: number;
  task: string;
};

type TaskStatus = 'pending' | 'finished' | 'deleted';

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

export default function Home({ isLogged, userId, userEmail }: { 
  isLogged: boolean | null;
  userId: string;
  userEmail: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [receivedTasks, setReceivedTasks] = useState<ReceivedTask[]>([]);
  const [task, setTask] = useState<string>("");
  const [updateState, setUpdateState] = useState<number | null>(null);
  const [updateTask, setUpdateTask] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<'personal' | 'received'>('personal');
 
  useEffect(() => {
    const fetchTasks = async () => {
      if (!userId) return;
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setTasks(userDoc.data().tasks || [])
      }
    }
    fetchTasks()
  }, [userId])

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up received tasks listener for user:", userId);

    const tasksQuery = query(
      collection(db, "tasks"),
      where("toUserId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      tasksQuery, 
      (snapshot) => {
        console.log("Received tasks snapshot:", snapshot.size, "tasks");
        const tasksData: ReceivedTask[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log("Task data:", doc.id, data);
          tasksData.push({
            id: doc.id,
            task: data.task,
            fromUserId: data.fromUserId,
            fromUserEmail: data.fromUserEmail,
            toUserId: data.toUserId,
            toUserEmail: data.toUserEmail,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
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
    
    return () => unsubscribe();
  }, [userId]);

  const updateUserTasks = async (newTasks: Task[]) => {
    if (!userId) return;
    try {
      await setDoc(
        doc(db, 'users', userId),
        { tasks: newTasks },
        { merge: true }
      );
    } catch (e) {
      console.log(e);
    }
  };

  const updateReceivedTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      console.log(`Task ${taskId} status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update task status. Please try again.");
    }
  };

  const handleDelete = (id: number) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    updateUserTasks(updatedTasks);
  };

  const handleUpdateTask = (id: number) => {
    if (updateTask === "") return;
    const updatedTasks = tasks.map((task) => (
      task.id === id ? { ...task, task: updateTask } : task
    ));
    setTasks(updatedTasks);
    setUpdateTask('');
    setUpdateState(null);
    updateUserTasks(updatedTasks);
  };

  const handleUpdate = (id: number) => {
    setUpdateState(null);
    setUpdateState(id);
  };

  const handleAdd = () => {
    if (task === "") return;
    const newTasks = ([...tasks, { id: Date.now(), task }]);
    setTasks(newTasks);
    setTask("");
    updateUserTasks(newTasks);
  };

  const getStatusDisplay = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return { 
          emoji: '⏳', 
          color: 'text-yellow-700', 
          bg: 'bg-yellow-100', 
          border: 'border-yellow-300',
          label: 'Pending'
        };
      case 'finished':
        return { 
          emoji: '✅', 
          color: 'text-green-700', 
          bg: 'bg-green-100', 
          border: 'border-green-300',
          label: 'Finished'
        };
      case 'deleted':
        return { 
          emoji: '🗑️', 
          color: 'text-red-700', 
          bg: 'bg-red-100', 
          border: 'border-red-300',
          label: 'Deleted'
        };
      default:
        return { 
          emoji: '⏳', 
          color: 'text-yellow-700', 
          bg: 'bg-yellow-100', 
          border: 'border-yellow-300',
          label: 'Pending'
        };
    }
  };

  const pendingTasks = receivedTasks.filter(task => task.status === 'pending');
  const finishedTasks = receivedTasks.filter(task => task.status === 'finished');
  const deletedTasks = receivedTasks.filter(task => task.status === 'deleted');

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
        <span className="text-3xl p-1 font-bold text-center w-full block border-b">
          Dashboard
        </span>
        <div className="flex">
          <button
            className={`flex-1 p-3 text-lg font-semibold transition-colors ${
              selectedTab === 'personal'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedTab('personal')}
          >
            📝 Personal Tasks ({tasks.length})
          </button>
          <button
            className={`flex-1 p-3 text-lg font-semibold transition-colors ${
              selectedTab === 'received'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedTab('received')}
          >
            📋 Received Tasks ({receivedTasks.length})
          </button>
        </div>
      </div>

      {selectedTab === 'personal' ? (
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
            {tasks.map((task) => (
              <li key={task.id} className="border rounded-lg p-2 pl-3 my-2 flex">
                {updateState === task.id ? (
                  <div className="flex justify-end w-full">
                    <input
                      placeholder="Update"
                      className="border justify-start flex flex-1 mr-2 px-2"
                      value={updateTask}
                      onChange={(e) => setUpdateTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateTask(task.id);
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
                      onClick={() => handleUpdateTask(task.id)}
                    >
                      Submit
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 break-words">{task.task}</span>
                    <div className="flex justify-end">
                      <button
                        className="border rounded-lg w-13 p-[2px] text-[13px] bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1"
                        onClick={() => handleDelete(task.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="border rounded-lg w-13 p-[2px] text-[13px] bg-green-500 mx-1 text-white border-black hover:font-bold cursor-pointer"
                        onClick={() => handleUpdate(task.id)}
                      >
                        Update
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {tasks.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No personal tasks yet. Add one above!
              </div>
            )}
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
            {receivedTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No tasks received yet.
              </div>
            ) : (
              <div className="space-y-3">
                {receivedTasks.map((receivedTask) => {
                  const statusDisplay = getStatusDisplay(receivedTask.status);
                  return (
                    <div
                      key={receivedTask.id}
                      className={`border-2 rounded-lg p-4 ${statusDisplay.bg} ${statusDisplay.border}`}
                    >
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
                          <div>Created: {receivedTask.createdAt?.toDate ? 
                            new Date(receivedTask.createdAt.toDate()).toLocaleString() : 
                            'Just now'
                          }</div>
                          {receivedTask.updatedAt && receivedTask.updatedAt !== receivedTask.createdAt && (
                            <div>Updated: {receivedTask.updatedAt?.toDate ? 
                              new Date(receivedTask.updatedAt.toDate()).toLocaleString() : 
                              'Just now'
                            }</div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-600">Status:</label>
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
                            <option value="deleted">🗑️ Deleted</option>
                          </select>
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