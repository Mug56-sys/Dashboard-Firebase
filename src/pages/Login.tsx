
export default function Login() {
  return (
    <div className="bg-gray-100 text-2xl w-1/3  mt-5 border rounded-xl p-5 grid flex justify-self-center gap-y-2">
      <span className="text-5xl font-bold justify-self-center">Login</span>
      <span className="text-xl font-semibold">Email</span>
      <input className="border rounded-lg "/>
      <span className="text-xl font-semibold">Password</span>
      <input className="border rounded-lg "/>
      <button className="bg-blue-500 justify-self-left w-1/4 p-1 text-base rounded-lg text-white cursor-pointer">Login</button>
    </div>
  )
}
