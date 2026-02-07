import React from 'react';
import { createRoot } from 'react-dom/client';
import { DadVisualizerWebview } from './DadVisualizerWebview';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <DadVisualizerWebview />
    </React.StrictMode>
  );
}
