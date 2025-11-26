import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import PreviewApp from './PreviewApp';

// Determine which app to render based on the webview type
// The PreviewProvider will set a data attribute on the root element
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // Check if this is a preview panel or regular visualizer
  const viewType = container.dataset.viewType || 'visualizer';

  root.render(
    <React.StrictMode>
      {viewType === 'preview' ? <PreviewApp /> : <App />}
    </React.StrictMode>
  );
}