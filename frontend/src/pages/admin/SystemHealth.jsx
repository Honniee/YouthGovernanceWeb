import React, { useState, useEffect } from 'react';
import { HeaderMainContent, LoadingSpinner } from '../../components/portal_main_content';
import { ToastContainer, showErrorToast } from '../../components/universal';
import { 
  Server, 
  Database, 
  Activity, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  Wifi,
  Shield,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Download,
  Settings
} from 'lucide-react';

const SystemHealth = () => {
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [systemData, setSystemData] = useState({
    database: {
      status: 'healthy',
      connections: 12,
      responseTime: 45,
      lastBackup: '2025-01-09 14:30:00',
      size: '2.4 GB'
    },
    api: {
      status: 'healthy',
      responseTime: 120,
      uptime: '99.9%',
      totalRequests: 15420,
      errorRate: 0.2
    },
    server: {
      status: 'healthy',
      cpu: 23,
      memory: 67,
      disk: 45,
      uptime: '15 days, 8 hours'
    },
    users: {
      active: 24,
      total: 1247,
      newToday: 8,
      failedLogins: 3
    },
    alerts: [
      { id: 1, type: 'warning', message: 'High memory usage detected', time: '2 hours ago', resolved: false },
      { id: 2, type: 'info', message: 'Scheduled backup completed', time: '4 hours ago', resolved: true },
      { id: 3, type: 'error', message: 'Database connection timeout', time: '6 hours ago', resolved: true }
    ],
    recentErrors: [
      { id: 1, error: 'Connection timeout', count: 3, lastSeen: '1 hour ago', severity: 'medium' },
      { id: 2, error: 'Invalid user credentials', count: 12, lastSeen: '2 hours ago', severity: 'low' },
      { id: 3, error: 'File upload failed', count: 1, lastSeen: '3 hours ago', severity: 'high' }
    ]
  });

  const refreshData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastRefresh(new Date());
    } catch (error) {
      showErrorToast('Failed to refresh system data', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, status, trend, color = 'blue' }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        {status && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            {status}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{subtitle}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% from last hour
          </div>
        )}
      </div>
    </div>
  );

  const StatusCard = ({ title, items, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.status === 'healthy' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
            </div>
            <span className="text-sm text-gray-600">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <HeaderMainContent
        title="System Health"
        description="Monitor system performance, database status, and user activity"
      />

      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-600 font-medium">All systems operational</span>
          </div>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Database Health"
          value={systemData.database.status}
          subtitle={`${systemData.database.connections} active connections`}
          icon={Database}
          status={systemData.database.status}
          trend={-5}
          color="emerald"
        />
        <MetricCard
          title="API Performance"
          value={`${systemData.api.responseTime}ms`}
          subtitle={`${systemData.api.uptime} uptime`}
          icon={Wifi}
          status={systemData.api.status}
          trend={-12}
          color="blue"
        />
        <MetricCard
          title="Server Resources"
          value={`${systemData.server.cpu}% CPU`}
          subtitle={`${systemData.server.memory}% Memory`}
          icon={Server}
          status={systemData.server.status}
          trend={3}
          color="purple"
        />
        <MetricCard
          title="Active Users"
          value={systemData.users.active}
          subtitle={`${systemData.users.total} total users`}
          icon={Users}
          status="healthy"
          trend={8}
          color="pink"
        />
      </div>

      {/* Detailed Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database Status */}
        <StatusCard
          title="Database Status"
          icon={Database}
          color="emerald"
          items={[
            { name: 'Connection Pool', value: `${systemData.database.connections}/50`, status: 'healthy' },
            { name: 'Response Time', value: `${systemData.database.responseTime}ms`, status: 'healthy' },
            { name: 'Last Backup', value: systemData.database.lastBackup, status: 'healthy' },
            { name: 'Database Size', value: systemData.database.size, status: 'healthy' }
          ]}
        />

        {/* API Status */}
        <StatusCard
          title="API Endpoints"
          icon={Wifi}
          color="blue"
          items={[
            { name: 'Authentication', value: '200ms', status: 'healthy' },
            { name: 'User Management', value: '150ms', status: 'healthy' },
            { name: 'Survey Batches', value: '180ms', status: 'healthy' },
            { name: 'Activity Logs', value: '220ms', status: 'warning' }
          ]}
        />

        {/* Server Resources */}
        <StatusCard
          title="Server Resources"
          icon={Server}
          color="purple"
          items={[
            { name: 'CPU Usage', value: `${systemData.server.cpu}%`, status: 'healthy' },
            { name: 'Memory Usage', value: `${systemData.server.memory}%`, status: 'warning' },
            { name: 'Disk Usage', value: `${systemData.server.disk}%`, status: 'healthy' },
            { name: 'Uptime', value: systemData.server.uptime, status: 'healthy' }
          ]}
        />
      </div>

      {/* Alerts and Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {systemData.alerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${
                alert.type === 'error' ? 'bg-red-50 border-red-200' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{alert.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.resolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Logs
            </button>
          </div>
          <div className="space-y-3">
            {systemData.recentErrors.map((error) => (
              <div key={error.id} className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">{error.error}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(error.severity)}`}>
                    {error.severity}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{error.count} occurrences</span>
                  <span>{error.lastSeen}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Settings className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <Download className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Export Logs</div>
              <div className="text-sm text-gray-600">Download system logs</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <Eye className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">View Activity</div>
              <div className="text-sm text-gray-600">Check activity logs</div>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <Shield className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Security Check</div>
              <div className="text-sm text-gray-600">Run security audit</div>
            </div>
          </button>
        </div>
      </div>

      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default SystemHealth;
