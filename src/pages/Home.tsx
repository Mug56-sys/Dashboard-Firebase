import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../utils/Firebase";

type Task = {
  id: number;
  task: string;
};

export default function Home({ isLogged,userId }: { isLogged: boolean | null;
  userId:string
 }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [task, setTask] = useState<string>("");
  const [updateState, setUpdateState] = useState<number | null>(null);
  const [updateTask, setUpdateTask] = useState<string>("");
 
  useEffect(()=>{
    const fetchTasks=async()=>{
      if(!userId)return;
      const userDoc=await getDoc(doc(db,'users',userId));
      if(userDoc.exists()){
        setTasks(userDoc.data().tasks || [])
      }
    }
    fetchTasks()
  },[userId])

  const updateUserTasks=async(newTasks:Task[])=>{
    if(!userId)return;
    try{
      await setDoc(
        doc(db,'users',userId),
        {tasks:newTasks},
        {merge:true}
      );
    }catch(e){
      console.log(e)
    }
  }

  const handleDelete = (id: number) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    updateUserTasks(updatedTasks)
  };

  const handleUpdateTask = (id: number) => {
    if (updateTask === "") return;
    const updatedTasks=tasks.map((task)=>(
      task.id===id ? {...task,task:updateTask}:task
    ))
    setTasks(updatedTasks)
    setUpdateTask('')
    setUpdateState(null)
    updateUserTasks(updatedTasks)
  };

  const handleUpdate = (id: number) => {
    setUpdateState(null);
    setUpdateState(id);
  };

  const handleAdd = () => {
    if (task === "") return;
    const newTasks=([...tasks, { id: tasks.length + 1, task }]);
    setTasks(newTasks)
    setTask("");
    updateUserTasks(newTasks)
  };

  return (
    <div>
      {!isLogged ? (
        <p className="h-screen flex justify-center grid content-center font-bold text-3xl">
          Login/Register to get Started
        </p>
      ) : (
        <div className=" flex justify-self-center w-1/2 mt-3 border rounded-lg grid grid-row m-2 ">
          <span className=" text-3xl p-1 font-bold text-center w-full border-b">
            Dashboard
          </span>
          <div className="w-[100%] pt-1 px-1">
            <button
              className="text-xl border rounded-lg m-1 p-1 hover:bg-gray-200 w-[15%] cursor-pointer "
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
          <ol className="px-2 pr-4 max-h-50 overflow-y-scroll">
            {tasks.map((task) => (
              <li className="border rounded-lg p-2 pl-3 my-2 flex ">
                {updateState === task.id ? (
                  <div className="flex justify-end">
                    <input
                      placeholder="Update"
                      className="border justify-start flex"
                      onChange={(e)=>setUpdateTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateTask(task.id)
                        }
                      }}
                    />
                    <button
                      className="border rounded-lg w-13 p-[2px] text-[13px]  bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1"
                      onClick={() => setUpdateState(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="border rounded-lg w-13 p-[2px] text-[13px]  bg-yellow-500 mx-1 text-white border-black hover:font-bold cursor-pointer"
                      onClick={() => handleUpdateTask(task.id)}
                    >
                      Submit
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 break-words">{task.task}</span>

                    <div className="flex justify-end  ">
                      <button
                        className="border rounded-lg w-13 p-[2px] text-[13px]  bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1"
                        onClick={() => handleDelete(task.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="border rounded-lg w-13 p-[2px] text-[13px]  bg-green-500 mx-1 text-white border-black hover:font-bold cursor-pointer"
                        onClick={() => handleUpdate(task.id)}
                      >
                        Update
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
