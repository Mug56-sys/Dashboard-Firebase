import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate=useNavigate()
  return (
    <>
      <div className="flex grid justify-center text-5xl  align-center pt-20 font-bold text-red-500">
        <p>THIS PAGE DOESNT EXIST</p>
        <button className="p-4 mt-10 text-2xl text-white bg-blue-500 mx-50 rounded-xl cursor-pointer hover:bg-red-500" onClick={()=>navigate('/home')}>
        Go Home
      </button>
      </div>
      
    </>
  );
}
