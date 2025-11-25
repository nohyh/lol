import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';

function App() {
  const [summoner, setSummoner] = useState(null);

  return (
    <div className="container">
      <div className="header" style={{ marginTop: '2rem' }}>
        <h1 style={{ color: 'var(--accent)' }}>LoL Personal Analysis</h1>
      </div>

      <Dashboard onSummonerLoaded={setSummoner} />

      {summoner && (
        <Analysis summoner={summoner} />
      )}
    </div>
  );
}

export default App;
