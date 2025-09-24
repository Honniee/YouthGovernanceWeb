import api from './api';

const activityLogsService = {
  async getLogs(params = {}) {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      qp.append(k, v);
    });
    const url = `/activity-logs${qp.toString() ? `?${qp.toString()}` : ''}`;
    const res = await api.get(url);
    return res?.data || res;
  }
};

export default activityLogsService;


