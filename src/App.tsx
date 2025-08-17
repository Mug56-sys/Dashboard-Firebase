import { useNavigate } from 'react-router-dom'
import './index.css'
import { useEffect } from 'react'
import {  Route, Routes } from 'react-router-dom'
import Home from './pages/Home'

function App() {
const navigate=useNavigate()
useEffect(()=>{
  console.log(location.pathname)
if(location.pathname==='/'){
  navigate('/home')
}
},[])

  return (
   <Routes>
      <Route path='/home' element={ <Home />}/>
    </Routes>
  )
}

export default App
