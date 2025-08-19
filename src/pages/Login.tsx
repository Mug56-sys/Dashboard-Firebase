import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "../utils/Firebase";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

export default function Login({
  isLogged,
  setIsLogged,
}: {
  isLogged: boolean | null;
  setIsLogged: React.Dispatch<React.SetStateAction<boolean | null>>;
}) {
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
      <button
        ref={submitRef}
        className={`bg-blue-500 justify-self-left w-1/4 p-1 text-base rounded-lg text-white cursor-pointer`}
        onClick={(e) => handleSubmit(e)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit(e);
        }}
      >
        Login
      </button>
      {password === "" || login === "" ? (
        <p className="text-red-600 text-sm">Provide all data</p>
      ) : null}
    </div>
  );
}
