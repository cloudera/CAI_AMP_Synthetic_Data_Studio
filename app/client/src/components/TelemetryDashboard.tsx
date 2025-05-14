import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import axios from 'axios';
import {
  Card, Typography, Row, Col, Statistic, Select, Spin, Empty, Table, Tag, Tabs, Alert, Progress, Space, Badge, Button
} from 'antd';
import {
  DashboardOutlined, ApiOutlined, CloudServerOutlined, RocketOutlined, SyncOutlined,
  CodeOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const SUCCESS_COLOR = '#52c41a';
const ERROR_COLOR = '#f5222d';
const WARNING_COLOR = '#faad14';
const INFO_COLOR = '#1890ff';
// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#4CAF50', '#F44336', '#9C27B0'];

const TelemetryDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7);
  const [activeTab, setActiveTab] = useState('1');
  const [refreshing, setRefreshing] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [apiMetrics, setApiMetrics] = useState([]);
  const [requestGroups, setRequestGroups] = useState([]);
  const [modelMetrics, setModelMetrics] = useState([]);
  const [jobMetrics, setJobMetrics] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState([]);
  const [topEndpoints, setTopEndpoints] = useState([]);

  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [timeRange]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [
        dashboardResponse,
        apiResponse,
        modelResponse,
        jobResponse,
        systemResponse
      ] = await Promise.all([
        axios.get('/telemetry/dashboard'),
        axios.get(`/telemetry/api-metrics?days=${timeRange}`),
        axios.get(`/telemetry/model-performance?days=${timeRange}`),
        axios.get(`/telemetry/job-statistics?days=${timeRange}`),
        axios.get('/telemetry/system-metrics')
      ]);
      setDashboardData(dashboardResponse.data);
      setApiMetrics(apiResponse.data.endpoints || []);
      setRequestGroups(apiResponse.data.request_groups || []);
      setModelMetrics(modelResponse.data.models || []);
      setJobMetrics(jobResponse.data.by_job_type || []);
      setSystemMetrics(systemResponse.data.history || []);
      const sortedEndpoints = [...(apiResponse.data.endpoints || [])]
        .sort((a, b) => b.request_count - a.request_count)
        .slice(0, 5);
      setTopEndpoints(sortedEndpoints);
    } catch (err) {
      console.error("Error fetching telemetry data:", err);
      setError("Failed to load telemetry data. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };

  const formatEndpointName = (endpoint) => {
    if (!endpoint) return 'Unknown';
    const parts = endpoint.split(' ');
    if (parts.length < 2) return endpoint;
    const method = parts[0];
    let path = parts[1];
    path = path.replace('/synthesis/', '/')
               .replace('/model/', '/')
               .replace('/telemetry/', '/');
    return (
      <span>
        <Tag color={getMethodColor(method)}>{method}</Tag>
        {path}
      </span>
    );
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'blue';
      case 'POST': return 'green';
      case 'PUT': return 'orange';
      case 'DELETE': return 'red';
      default: return 'default';
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
    return `${(ms / 60000).toFixed(1)} min`;
  };

  const formatNumber = (num, decimals = 0) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Use the new request_groups data for the bar chart.
  const prepareBarChartData = () => requestGroups;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
        <Spin size="large" tip="Loading telemetry data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Telemetry Data"
        description={error}
        type="error"
        showIcon
        style={{ maxWidth: '800px', margin: '50px auto' }}
      />
    );
  }

  const apiCount = apiMetrics.reduce((sum, item) => sum + (item.request_count || 0), 0);
  const errorCount = apiMetrics.reduce((sum, item) => sum + (item.error_count || 0), 0);
  const errorRate = apiCount > 0 ? (errorCount / apiCount) * 100 : 0;
  const latestSystemMetrics = systemMetrics.length > 0 ? systemMetrics[systemMetrics.length - 1] : { cpu_percent: 0, memory_percent: 0, disk_percent: 0 };

  const endpointColumns = [
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (text) => formatEndpointName(text)
    },
    {
      title: 'Requests',
      dataIndex: 'request_count',
      key: 'requests',
      sorter: (a, b) => a.request_count - b.request_count,
      defaultSortOrder: 'descend',
      render: (count) => formatNumber(count)
    },
    {
      title: 'Avg Response Time',
      dataIndex: 'avg_response_time',
      key: 'response_time',
      sorter: (a, b) => a.avg_response_time - b.avg_response_time,
      render: (time) => formatDuration(time)
    },
    {
      title: 'Error Rate',
      key: 'error_rate',
      render: (_, record) => {
        const rate = record.request_count > 0 ? (record.error_count / record.request_count) * 100 : 0;
        let color = 'success';
        if (rate > 5) color = 'warning';
        if (rate > 10) color = 'error';
        return (
          <Progress percent={Math.round(rate)} size="small" status={color} format={(percent) => `${percent}%`} />
        );
      }
    },
    {
      title: 'Last Request',
      dataIndex: 'last_request',
      key: 'last_request',
      render: (timestamp) => formatTimestamp(timestamp)
    }
  ];

  const modelColumns = [
    {
      title: 'Model',
      dataIndex: 'model_id',
      key: 'model_id',
      render: (text) => {
        const shortName = text.split('/').pop() || text;
        return <Tag color="blue">{shortName}</Tag>;
      }
    },
    {
      title: 'Operation',
      dataIndex: 'operation_type',
      key: 'operation_type',
      render: (text) => <Tag color="green">{text}</Tag>
    },
    {
      title: 'Count',
      dataIndex: 'operation_count',
      key: 'operation_count',
      sorter: (a, b) => a.operation_count - b.operation_count,
      defaultSortOrder: 'descend',
      render: (count) => formatNumber(count)
    },
    {
      title: 'Avg Latency',
      dataIndex: 'avg_latency',
      key: 'avg_latency',
      sorter: (a, b) => a.avg_latency - b.avg_latency,
      render: (time) => formatDuration(time)
    },
    {
      title: 'Avg Input Tokens',
      dataIndex: 'avg_tokens_input',
      key: 'avg_tokens_input',
      render: (tokens) => formatNumber(tokens)
    },
    {
      title: 'Avg Output Tokens',
      dataIndex: 'avg_tokens_output',
      key: 'avg_tokens_output',
      render: (tokens) => formatNumber(tokens)
    },
    {
      title: 'Errors',
      dataIndex: 'error_count',
      key: 'error_count',
      render: (count) => <Tag color={count > 0 ? ERROR_COLOR : SUCCESS_COLOR}>{count}</Tag>
    }
  ];

  const jobColumns = [
    {
      title: 'Type',
      dataIndex: 'job_type',
      key: 'job_type',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Total Jobs',
      dataIndex: 'job_count',
      key: 'job_count',
      sorter: (a, b) => a.job_count - b.job_count,
      defaultSortOrder: 'descend',
      render: (count) => formatNumber(count)
    },
    {
      title: 'Success Rate',
      key: 'success_rate',
      render: (_, record) => {
        const rate = record.job_count > 0 ? (record.completed_count / record.job_count) * 100 : 0;
        let color = 'error';
        if (rate > 50) color = 'warning';
        if (rate > 80) color = 'success';
        return (
          <Progress percent={Math.round(rate)} size="small" status={color === 'error' ? 'exception' : color} format={(percent) => `${percent}%`} />
        );
      }
    },
    {
      title: 'Avg Duration',
      dataIndex: 'avg_duration_ms',
      key: 'avg_duration_ms',
      sorter: (a, b) => a.avg_duration_ms - b.avg_duration_ms,
      render: (time) => formatDuration(time)
    },
    {
      title: 'Avg Memory (MB)',
      dataIndex: 'avg_memory_mb',
      key: 'avg_memory_mb',
      render: (mb) => formatNumber(mb)
    },
    {
      title: 'Avg CPU Cores',
      dataIndex: 'avg_cpu_cores',
      key: 'avg_cpu_cores',
      render: (cores) => formatNumber(cores, 1)
    }
  ];

  return (
    <div className="telemetry-dashboard" style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}><DashboardOutlined /> Synthetic Data Studio Telemetry</Title>
        <Space>
          <Select value={timeRange} onChange={setTimeRange} style={{ width: 150 }}>
            <Option value={1}>Last 24 Hours</Option>
            <Option value={7}>Last 7 Days</Option>
            <Option value={30}>Last 30 Days</Option>
            <Option value={90}>Last 90 Days</Option>
          </Select>
          <Button type="primary" icon={<SyncOutlined spin={refreshing} />} onClick={() => fetchData(true)} loading={refreshing}>
            Refresh
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<><ApiOutlined /> API Requests</>}
              value={apiCount}
              valueStyle={{ color: INFO_COLOR }}
              prefix={<Badge status="processing" />}
              suffix={<Text type="secondary" style={{ fontSize: '14px' }}>last {timeRange} day{timeRange > 1 ? 's' : ''}</Text>}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Avg Response: {formatTimestamp(latestSystemMetrics.timestamp)}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<><WarningOutlined /> Error Rate</>}
              value={errorRate.toFixed(1)}
              precision={1}
              valueStyle={{ color: errorRate > 5 ? ERROR_COLOR : SUCCESS_COLOR }}
              suffix="%"
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{errorCount} errors in {apiCount} requests</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<><CloudServerOutlined /> System Load</>}
              value={latestSystemMetrics.cpu_percent || 0}
              precision={1}
              valueStyle={{
                color: latestSystemMetrics.cpu_percent > 80 ? ERROR_COLOR :
                       latestSystemMetrics.cpu_percent > 60 ? WARNING_COLOR :
                       SUCCESS_COLOR
              }}
              suffix="%"
              prefix={<Badge status={latestSystemMetrics.cpu_percent > 80 ? "error" : latestSystemMetrics.cpu_percent > 60 ? "warning" : "success"} />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Memory: {formatNumber(latestSystemMetrics.memory_percent || 0, 1)}%</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={<><RocketOutlined /> Job Success Rate</>}
              value={dashboardData?.summary?.job_success_rate?.toFixed(1) || '0.0'}
              precision={1}
              valueStyle={{
                color: dashboardData?.summary?.job_success_rate > 80 ? SUCCESS_COLOR :
                       dashboardData?.summary?.job_success_rate > 50 ? WARNING_COLOR :
                       ERROR_COLOR
              }}
              suffix="%"
              prefix={dashboardData?.summary?.job_success_rate > 80 ? <CheckCircleOutlined /> : dashboardData?.summary?.job_success_rate > 50 ? <WarningOutlined /> : <CloseCircleOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{dashboardData?.summary?.completed_jobs} of {dashboardData?.summary?.total_jobs} jobs completed</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large" style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <TabPane tab={<span><DashboardOutlined /> Overview</span>} key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title={<><CloudServerOutlined /> System Resource Usage</>} bordered={false}>
                <div style={{ height: 300 }}>
                  {systemMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={systemMetrics.slice(-48)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(time) => {
                          const date = new Date(time);
                          return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                        }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => [`${value}%`, '']} labelFormatter={(time) => `Time: ${formatTimestamp(time)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="cpu_percent" stroke="#8884d8" name="CPU %" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="memory_percent" stroke="#82ca9d" name="Memory %" />
                        <Line type="monotone" dataKey="disk_percent" stroke="#ffc658" name="Disk %" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="No system metrics data available" />
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Request Groups" bordered={false}>
                <div style={{ height: 300 }}>
                  {requestGroups.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareBarChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="requests" fill="#8884d8" name="Requests" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="No request data available" />
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24}>
              <Card title={<><ApiOutlined /> Top API Endpoints</>} bordered={false}>
                <Table columns={endpointColumns} dataSource={topEndpoints.map((endpoint, index) => ({ ...endpoint, key: index }))} size="small" pagination={false} />
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab={<span><ApiOutlined /> API Metrics</span>} key="2">
          <Card bordered={false}>
            <Table columns={endpointColumns} dataSource={apiMetrics.map((endpoint, index) => ({ ...endpoint, key: index }))} size="middle" pagination={{ pageSize: 10 }} />
          </Card>
        </TabPane>
        <TabPane tab={<span><CodeOutlined /> Model Performance</span>} key="3">
          <Card bordered={false}>
            <Table columns={modelColumns} dataSource={modelMetrics.map((model, index) => ({ ...model, key: index }))} size="middle" pagination={{ pageSize: 10 }} />
          </Card>
        </TabPane>
        <TabPane tab={<span><RocketOutlined /> Job Statistics</span>} key="4">
          <Card bordered={false}>
            <Table columns={jobColumns} dataSource={jobMetrics.map((job, index) => ({ ...job, key: index }))} size="middle" pagination={{ pageSize: 10 }} />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TelemetryDashboard;
