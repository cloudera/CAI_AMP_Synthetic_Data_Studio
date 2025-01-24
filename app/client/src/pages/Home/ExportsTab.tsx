import { Col, Flex, Input, Row, Table, TableProps, Tooltip, Typography } from 'antd';
import React from 'react';
import DateTime from '../../components/DateTime/DateTime';
import { useGetExportJobs } from '../../api/Export/export';
import { ExportResponse } from '../../api/Export/response';
import { sortItemsByKey } from '../../utils/sortutils';
import styled from 'styled-components';
import { JobStatus } from '../../types';
import JobStatusIcon from '../../components/JobStatus/jobStatusIcon';
import { useGetJobs } from '../../api/Jobs/jobs';

const { Search } = Input;
const { Text, Link, Paragraph } = Typography;

const Container = styled.div`
  background-color: #ffffff;
  padding: 1rem;
`;

const StyledTable = styled(Table<ExportResponse>)`
  font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
  color:  #5a656d;
  .ant-table-thead > tr > th {
    color: #5a656d;
    border-bottom: 1px solid #eaebec;
    font-weight: 500;
    text-align: left;
    // background: #ffffff;
    border-bottom: 1px solid #eaebec;
    transition: background 0.3s ease; 
  }
  .ant-table-row > td.ant-table-cell {
    padding: 8px;
    padding-left: 16px;
    font-size: 13px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    color:  #5a656d;
    .ant-typography {
      font-size: 13px;
      font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    }
  }
`;


const StyledParagraph = styled(Paragraph)`
    font-size: 13px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    color:  #5a656d;
`;

const columns: TableProps<ExportResponse>['columns'] = [
    {
        key: 'job_status',
        title: 'Status',
        dataIndex: 'job_status',
        sorter: sortItemsByKey('job_status'),
        render: (status: JobStatus) => <Flex justify='center' align='center'>
            <JobStatusIcon status={status}></JobStatusIcon>
        </Flex>
    },
    {
        key: 'display_name',
        title: 'Source Dataset',
        dataIndex: 'display_name',
        sorter: sortItemsByKey('display_name'),
        render: (displayName) => <Tooltip title={displayName}><StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{displayName}</StyledParagraph></Tooltip>

    }, {
        key: 'display_export_name',
        title: 'Export Name',
        dataIndex: 'display_export_name',
        sorter: sortItemsByKey('display_export_name'),
        render: (displayExportName) => <Tooltip title={displayExportName}><StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{displayExportName}</StyledParagraph></Tooltip>
    }, {
        key: 'hf_export_path',
        title: 'Export Location',
        dataIndex: 'hf_export_path',
        sorter: sortItemsByKey('hf_export_path'),
        render: (exportPath) => <Link href={exportPath} target="_blank">{exportPath}</Link>
    },
    {
        key: 'job_name',
        title: 'Job Name',
        dataIndex: 'job_id',
        sorter: sortItemsByKey('job_name'),
        render: (jobName) => <Text>{jobName}</Text>
    },
    {
        key: 'timestamp',
        title: 'Create Time',
        dataIndex: 'timestamp',
        sorter: sortItemsByKey('timestamp'),
        render: (timestamp) => <DateTime dateTime={timestamp}></DateTime>
    }
];

const ExportsTab: React.FC = () => {
    const { isLoading, isError, data, error } = useGetExportJobs();
    const { isLoading: isJobsLoading, isError: isJobsError, data: jobsData, error: jobsError } = useGetJobs();
    const [searchTerm, setSearchTerm] = React.useState<string>('');

    const filteredData = React.useMemo(() => {
        if (!data) return [];
        return searchTerm
            ? data.filter((job: ExportResponse) =>
                job.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            :
            data;
    }, [data, searchTerm]);

    return (
        <Container>
            <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <Search
                        placeholder="Search Exports"
                        onChange={(event) => setSearchTerm(event.target.value)}
                        style={{ width: 350 }} />
                </Col>
            </Row>
            <StyledTable
                rowKey={(row) => row.id}
                columns={columns}
                tableLayout="fixed"
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true
                }}
                loading={isLoading}
                dataSource={filteredData}
            />
        </Container>
    );
};

export default ExportsTab;