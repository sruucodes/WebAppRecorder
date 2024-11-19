import React from 'react';
import WebRecorder from './components/webrecorder';
import './App.css';
import SkeletonTracker from './components/skeletonTracker';

function App() {
  return (
    <div className="App">
      <h1>WebRecorder - Video Recorder</h1>
      {/* <WebRecorder /> */}
      <SkeletonTracker/>   
       </div>
  );
}

export default App;
