import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/400-italic.css';
import '@fontsource/lato/700.css';
import '@fontsource/lato/700-italic.css';
import '@fontsource/lato/900.css';
import './index.css';
import BlockKitBuilder from './App';

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="bg-desk p-8 font-sans text-ink">
          <h1 className="text-3xl font-semibold">The editor hit a problem</h1>
          <pre className="mt-4 whitespace-pre-wrap text-sm">{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Boundary>
        <BlockKitBuilder />
      </Boundary>
    </React.StrictMode>,
  );
} else {
  console.error('Failed to find the root element. Make sure there is a <div id="root"></div> in your public/index.html file.');
}
