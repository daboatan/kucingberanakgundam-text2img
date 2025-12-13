import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import FlowPage from './pages/FlowPage'
import ImageGenerator from './pages/ImageGenerator'

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<ImageGenerator />} />
        <Route path="/flow" element={<FlowPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
