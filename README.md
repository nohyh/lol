# LoL Advanced Stats Analyzer

A powerful web application that connects directly to your League of Legends Client (LCU) to provide deep statistical analysis of your ranked performance.

## Features

- **Overall Evaluation System**: Get a tier rating (e.g., 通天代, 大腿, 正常人) based on a sophisticated scoring algorithm that considers:
  - MVP/SVP Rate
  - KDA
  - Win Rate
  - Damage Conversion Rate (Damage Share / Gold Share)
  - Team Contribution (Participation + Vision)
- **Advanced Metrics**: View stats not shown in the client, such as:
  - Damage Conversion Efficiency ("吃草挤奶指数")
  - Average Vision Score & Wards Placed
  - Gold Share & Objective Damage
- **Team Rank Analysis**: Compare your performance against your team in key areas (Gold, CS, Vision, Participation).
- **Player Search**: Analyze any player's stats by searching their Summoner Name (must be in your match history or friend list).
- **Performance**: Parallel processing of the last 50 ranked games for fast analysis.

## Prerequisites

- **Node.js**: v14 or higher.
- **League of Legends Client**: Must be running and logged in.

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the application:
   ```bash
   npm start
   ```
   This command concurrently starts the backend server (port 3001) and the frontend client (port 5173).

2. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

3. The app will automatically detect the logged-in user. You can also search for other players.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS (if used), CSS Modules.
- **Backend**: Node.js, Express.
- **Integration**: LCU API (League Client Update) via local HTTPS connection.

## License

MIT
