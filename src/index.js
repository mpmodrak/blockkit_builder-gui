import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import BlockKitBuilder from './App';

const container = document.getElementById('root');

// Make sure the container exists before trying to create a root
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BlockKitBuilder />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element. Make sure there is a <div id="root"></div> in your public/index.html file.');
}