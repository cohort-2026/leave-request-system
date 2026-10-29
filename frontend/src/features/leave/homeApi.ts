import api from '../../lib/apiClient';

export const getHomeSummary = async () => {
  const { data } = await api.get('/home/summary');
  return data;
};

export const getMyRecentLeave = async () => {
  const { data } = await api.get('/leave/my-recent');
  return data;
};