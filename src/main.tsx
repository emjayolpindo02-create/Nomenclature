import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerOfflineServiceWorker} from './utils/registerOfflineSW';

registerOfflineServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
