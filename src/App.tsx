import { useNavigate } from 'react-router-dom'
import './index.css'
import { useEffect } from 'react'
import {  Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Nav from './components/Nav'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import Login from './pages/Login'

function App() {
const navigate=useNavigate()
useEffect(()=>{
  console.log(location.pathname)
if(location.pathname==='/'){
  navigate('/home')
}
},[])

  return (
    <>
    <Nav/>
    <Routes>
      <Route path='/home' element={ <Home />}/>
      <Route path='*' element={<NotFound/>}/>
      <Route path='/register' element={<Register/>}/>
      <Route path='/login' element={<Login/>}/>
    </Routes>
    </>
   
  )
}

export default App
