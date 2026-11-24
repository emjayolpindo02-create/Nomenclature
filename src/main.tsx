import {createRoot} from 'react-dom/client';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import App from './App.tsx';
import './index.css';
import {registerOfflineServiceWorker} from './utils/registerOfflineSW';

registerOfflineServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
