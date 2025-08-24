import { useNavigate } from "react-router-dom";
import "./index.css";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Nav from "./components/Nav";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Chats from "./pages/Chats";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./utils/Firebase";

function App() {
  const [userId, setUserId] = useState<string>("");
  const [isLogged, setIsLogged] = useState<boolean | null>(null);
  const [userEmail,setUserEmail]=useState<string>('')
  const navigate = useNavigate();


  useEffect(()=>{
    const auth=getAuth(app)
    const unsubscribe=onAuthStateChanged(auth,(user)=>{
      if(user){
        setUserId(user.uid)
        setUserEmail(user.email || '')
        setIsLogged(true)
      }else{
        setUserId('')
        setUserEmail('')
        setIsLogged(false)
      }
    });
    return ()=>unsubscribe()
  })

  useEffect(() => {
    console.log(isLogged);
  }, [isLogged]);

  useEffect(() => {
    console.log(location.pathname);
    if (location.pathname === "/") {
      navigate("/home");
    }
  }, []);

  return (
    <>
      <Nav isLogged={isLogged}  />
      <Routes>
        <Route path="/home" element={<Home isLogged={isLogged} userId={userId} />} />
        <Route path="*" element={<NotFound />} />
        <Route
          path="/register"
          element={<Register setUserId={setUserId} isLogged={isLogged} setIsLogged={setIsLogged} />}
        />
        <Route
          path="/login"
          element={<Login  setUserId={setUserId} setIsLogged={setIsLogged} />}
        />
        <Route
        path="/chats"
        element={<Chats userId={userId} userEmail={userEmail} isLogged={isLogged}/>}/>
      </Routes>
    </>
  );
}

export default App;
