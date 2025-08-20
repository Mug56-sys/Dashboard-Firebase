export default function Home({ isLogged }: { isLogged: boolean | null }) {
  return (
    <div>
      {!isLogged ? (
        <p className="h-screen flex justify-center grid content-center font-bold text-3xl">
          Login/Register to get Started
        </p>
      ) : (
        <div className=" flex justify-self-center w-1/2 mt-3 border rounded-lg grid grid-row m-2 ">
          <span className=" text-3xl p-1 font-bold text-center w-full border-b">Dashboard</span>
          <div className="w-[100%] pt-1 px-1">
            <button className="text-xl border rounded-lg m-1 p-1 hover:bg-gray-200 w-[15%] cursor-pointer">Add Task</button>
            <input placeholder="Cook Dinner..." className="border rounded-xl text-xl p-1 mx-1 w-[82%]"/>
          </div>
          <ol className="px-2 pr-4 ">
            <li className="border rounded-lg p-2 pl-3 my-2 flex ">
              <span className="flex-1 break-words">1</span>
              <div className="flex justify-end  ">
              <button className="border rounded-lg w-13 p-[2px] text-[13px]  bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1">Delete</button>
              <button className="border rounded-lg w-13 p-[2px] text-[13px]  bg-green-500 mx-1 text-white border-black hover:font-bold cursor-pointer">Update</button>
              </div>
            </li>
            <li className="border rounded-lg p-2 pl-3 my-2 flex ">
              <span className="flex-1 break-words">1</span>
              <div className="flex justify-end  ">
              <button className="border rounded-lg w-13 p-[2px] text-[13px]  bg-red-500 text-white border-black hover:font-bold cursor-pointer mx-1">Delete</button>
              <button className="border rounded-lg w-13 p-[2px] text-[13px]  bg-green-500 mx-1 text-white border-black hover:font-bold cursor-pointer">Update</button>
              </div>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
