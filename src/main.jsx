import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { IS_EMBED } from './embed'
if (IS_EMBED) document.documentElement.classList.add('embed')
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
