import { useNavigate } from "react-router-dom";
import "./index.css";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Nav from "./components/Nav";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import Login from "./pages/Login";

function App() {
  const [userId, setUserId] = useState<string>("");
  const [isLogged, setIsLogged] = useState<boolean | null>(null);
  const navigate = useNavigate();

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
      <Nav setIsLogged={setIsLogged} isLogged={isLogged} setUserId={setUserId} />
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
      </Routes>
    </>
  );
}

export default App;
