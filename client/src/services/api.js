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

export const getMatchDetails = async (gameId) => {
    const response = await api.get(`/match/${gameId}`);
    return response.data;
};

export const getRankedStats = async () => {
    const response = await api.get('/ranked');
    return response.data;
};

export default api;
