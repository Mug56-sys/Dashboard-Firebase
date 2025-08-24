import { useNavigate } from "react-router";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../utils/Firebase";

export default function Nav({ isLogged }: { isLogged: boolean | null }) {
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="grid  grid-cols-2 bg-gray-500 border-b-[3px] py-5 text-2xl px-3 ">
      <div
        className="bg-green-300 justify-self-start rounded-full px-10 grid content-center font-bold py-1 cursor-pointer relative group inline-block "
        onClick={() => {
          if (location.pathname === "/home") location.reload();
          navigate("/home");
        }}
      >
        <span>LOGO</span>
        {location.pathname !== "/home" ? (
          <span className="absolute top-full left-1/2 bg-gray-900 p-1 rounded-md hidden group-hover:block whitespace-nowrap text-[9px]  -translate-x-1/2 mb-30 text-white">
            Go back Home
          </span>
        ) : null}
      </div>
      <div className="justify-self-end w-[185px] flex justify-between ">
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
            <button
              className="bg-white cursor-pointer px-3 font-bold rounded-lg text-lg hover:bg-gray-200"
              onClick={() => {
                navigate("/chats");
              }}
            >
              Chats
            </button>
          </>
        )}
      </div>
    </div>
  );
}
