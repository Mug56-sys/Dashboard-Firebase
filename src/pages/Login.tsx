import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { app,db } from "../utils/Firebase";
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import GoogleButton from '../assets/GoogleButton.png'

export default function Login({
  setIsLogged,
  setUserId
}: {
  setIsLogged: React.Dispatch<React.SetStateAction<boolean | null>>;
  setUserId:React.Dispatch<React.SetStateAction<string>>
}) {
  const provider = new GoogleAuthProvider();
  const auth = getAuth(app);
  const navigate = useNavigate();
  const [login, setLogin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const handleSubmit = (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    console.log(password + ": 1 :" + login);
    if (!login.includes("@")) return;
    if (password === "" || login === "") return;
    if (password.length < 8) return;

    signInWithEmailAndPassword(auth, login, password)
      .then((userCred) => {
        console.log(userCred);
        setUserId(userCred.user.uid)
        setIsLogged(true)
        navigate("/home");
      })
      .catch((e) => {
        alert("Error while Logging in: " + e.message);
        return;
      });

    setLogin("");
    setPassword("");
  };
  useEffect(() => {
    emailRef.current?.focus();
  }, []);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    nextRef: React.RefObject<HTMLElement | null>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const handleGoogleLog=()=>{
  signInWithPopup(auth, provider).then(async(result)=>{
     const user=result.user;
   setUserId(user.uid);
    setIsLogged(true);
    navigate("/home");
  }).catch((e)=>{
    console.log(e)
  })
  

  }

  return (
    <div className="bg-gray-100 text-2xl min-w-1/3  mt-5 border rounded-xl p-5 grid flex justify-self-center gap-y-2">
      <span className="text-5xl font-bold justify-self-center">Login</span>
      <span className="text-xl font-semibold ">Email</span>
      <input
        ref={emailRef}
        type="email"
        className="border rounded-lg p-1 text-base"
        placeholder="Email..."
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, passwordRef)}
      />
      {!login.includes("@") && login !== "" ? (
        <p className="text-red-600 text-sm">Provide real Email</p>
      ) : null}
      <span className="text-xl font-semibold">Password</span>
      <input
        ref={passwordRef}
        type="password"
        className="border rounded-lg p-1 text-base"
        placeholder="Password..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, submitRef)}
      />
      {password.length < 8 && login !== "" ? (
        <p className="text-red-600 text-sm">
          Passwords need to be longer than 8 characters
        </p>
      ) : null}
       <div className="flex">
      <button
        ref={submitRef}
        className="bg-blue-500 justify-self-left w-1/4 p-1 text-lg rounded-lg text-white cursor-pointer h-[45px] hover:bg-blue-600"
        onClick={(e) => {
          handleSubmit(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit(e);
        }}
      >
        Login
      </button>
       <button
        className=" ml-5 w-1/4 p-[1px]  cursor-pointer min-w-[200px   min-h-[45px]"
        
         onClick={() => {
          handleGoogleLog();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleGoogleLog();
        }}
      >
        <img src={GoogleButton} className="min-w-[200px] p-[2px] rounded-lg hover:bg-gray-500"/>
      </button>
        </div>
      {password === "" || login === "" ? (
        <p className="text-red-600 text-sm">Provide all data</p>
      ) : null}
    </div>
  );
}
