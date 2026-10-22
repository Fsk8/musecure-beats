import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { NearRoot } from './near/NearProvider';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NearRoot>
      <App />
    </NearRoot>
  </StrictMode>,
);
