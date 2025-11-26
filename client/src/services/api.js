import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api',
});

export const getCurrentSummoner = async () => {
    const response = await api.get('/summoner/current');
    return response.data;
};

export const getMatches = async () => {
    const response = await api.get('/matches');
    return response.data;
};

export const getMatchDetails = async (matchId) => {
    const response = await api.get(`/match/${matchId}`);
    return response.data;
};

export const getRankedStats = async () => {
    const response = await api.get('/ranked');
    return response.data;
};

export const getAdvancedStats = async (puuid = null) => {
    try {
        const url = puuid ? `/stats/advanced?puuid=${puuid}` : '/stats/advanced';
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching advanced stats:", error);
        throw error;
    }
};

export const getSummonerByName = async (name) => {
    try {
        const response = await api.get(`/summoner/by-name/${encodeURIComponent(name)}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching summoner by name:", error);
        throw error;
    }
};

export const getLatestMatchDetails = async (matchIndex = 0) => {
    // First get the match list
    const matchesResponse = await api.get('/matches');
    const matches = matchesResponse.data?.games?.games || [];

    if (matches.length === 0) {
        throw new Error('No matches found');
    }

    if (matchIndex >= matches.length) {
        throw new Error(`Match index ${matchIndex} out of range (only ${matches.length} matches available)`);
    }

    // Get the match ID at the specified index (0 = latest, 1 = second latest, etc.)
    const matchId = matches[matchIndex].gameId;

    // Then get the full details of that match
    const matchDetails = await api.get(`/match/${matchId}`);
    return matchDetails.data;
};

export default api;
