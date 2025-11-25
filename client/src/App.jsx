import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';

function App() {
  const [summoner, setSummoner] = useState(null);

  return (
    <div className="container">
      <Dashboard onSummonerLoaded={setSummoner} />

      {summoner && (
        <Analysis summoner={summoner} />
      )}
    </div>
  );
}

export default App;
