import throttle from 'lodash/throttle';
import React, { SyntheticEvent, useEffect } from 'react';
import { Col, Flex, Input, Layout, Row, Table, TableProps, Tooltip, notification } from 'antd';
import styled from 'styled-components';
import Paragraph from 'antd/es/typography/Paragraph';
import { useDatasets } from '../Home/hooks';
import { ExportResult } from '../../components/Export/ExportModal';
import { SearchProps } from 'antd/es/input';
import Loading from '../Evaluator/Loading';
import { Dataset } from '../Evaluator/types';
import { JOB_EXECUTION_TOTAL_COUNT_THRESHOLD, TRANSLATIONS } from '../../constants';
import DatasetExportModal, { ExportResult } from '../../components/Export/ExportModal';
import DateTime from '../../components/DateTime/DateTime';
import DatasetActions from './DatasetActions';
import { sortItemsByKey } from '../../utils/sortutils';

import { JobStatus } from '../../types';
import JobStatusIcon from '../../components/JobStatus/jobStatusIcon';
import StyledTitle from '../Evaluator/StyledTitle';

const { Content } = Layout;
const { Search } = Input;

const StyledContent = styled(Content)`
    padding: 24px;
    background-color: #f5f7f8;
`;

const Container = styled.div`
  background-color: #ffffff;
  padding: 1rem;
  overflow-x: auto;
`;

const StyledTable = styled(Table)`
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

const DatasetsPage: React.FC = () => {
  const { data, isLoading, isError, refetch, setSearchQuery, pagination } = useDatasets();
    const [notificationInstance, notificationContextHolder] = notification.useNotification();
    const [exportResult, setExportResult] = React.useState<ExportResult>();
    const [toggleDatasetExportModal, setToggleDatasetExportModal] = React.useState(false);
    const [datasetDetails, setDatasetDetails] = React.useState<Dataset>({} as Dataset);

    useEffect(() => {
        if (isError) {
            notification.error({
                message: 'Error',
                description: 'An error occurred while fetching datasets'
            });
        }
    }, [isError]);

    useEffect(() => {
        if (exportResult?.successMessage) {
            notificationInstance.success({
                message: `Dataset Exported to Huggingface`,
                description: "Dataset has been successfully exported."
            });
        }
        if (exportResult?.failedMessage) {
            notificationInstance.error({
                message: "Error Exporting Dataset",
                description: "There was an error exporting the dataset. Please try again."
            });
        }
    }, [exportResult, notificationInstance])

    const onSearch: SearchProps['onSearch'] = (value: unknown) => {
        throttle((value: string) => setSearchQuery(value), 500)(value);
    }

    const onChange = (event: SyntheticEvent) => {
        const value = (event.target as HTMLInputElement)?.value;
        throttle((value: string) => setSearchQuery(value), 500)(value);
    }

    const columns: TableProps<Dataset>['columns'] = [
        {
            key: 'job_status',
            title: 'Status',
            dataIndex: 'job_status',
            width: 80,
            sorter: sortItemsByKey('job_status'),
            render: (status: JobStatus) => <Flex justify='center' align='center'>
                <JobStatusIcon status={status} customTooltipTitles={{"null": `Job wasn't executed because dataset total count is less than ${JOB_EXECUTION_TOTAL_COUNT_THRESHOLD}!`}}></JobStatusIcon>
            </Flex>
        },
        {
            key: 'display_name',
            title: 'Display Name',
            dataIndex: 'display_name',
            width: 140,
            sorter: sortItemsByKey('display_name')
        }, {
            key: 'generate_file_name',
            title: 'Dataset Name',
            dataIndex: 'generate_file_name',
            width: 250,
            sorter: sortItemsByKey('generate_file_name'),
            render: (generate_file_name) => <Tooltip title={generate_file_name}><StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{generate_file_name}</StyledParagraph></Tooltip>
        }, {
            key: 'model_id',
            title: 'Model',
            dataIndex: 'model_id',
            width: 250,
            sorter: sortItemsByKey('model_id'),
            render: (modelId) => <Tooltip title={modelId}><StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{modelId}</StyledParagraph></Tooltip>
        }, {
            key: 'num_questions',
            title: 'Questions Per Topic',
            dataIndex: 'num_questions',
            width: 120,
            align: 'center',
            sorter: sortItemsByKey('num_questions')
        }, 
        {
            key: 'total_count',
            title: 'Total Count',
            dataIndex: 'total_count',
            width: 80,
            align: 'center',
            sorter: sortItemsByKey('total_count')
        }, {
            key: 'use_case',
            title: 'Use Case',
            dataIndex: 'use_case',
            width: 120,
            sorter: sortItemsByKey('use_case'),
            render: (useCase) => TRANSLATIONS[useCase]
        }, {
            key: 'timestamp',
            title: 'Creation Time',
            dataIndex: 'timestamp',
            defaultSortOrder: 'descend',
            width: 120,
            sorter: sortItemsByKey('timestamp'),
            render: (timestamp) => <>{timestamp == null ? 'N/A' : <DateTime dateTime={timestamp}/>}</>
        }, {
            key: '7',
            title: 'Actions',
            width: 100,
            render: (row: Dataset) => (
                <DatasetActions dataset={row} refetch={refetch} setToggleDatasetExportModal={setToggleDatasetExportModal}/>
            )
        },
    ];
  return (
    <Layout>
        <StyledContent>
           <StyledTitle style={{ fontWeight: 600}}>{'Datasets'}</StyledTitle>
           <Container>
            <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <Search
                        placeholder="Search Datasets"
                        onSearch={onSearch}
                        onChange={onChange}
                        style={{ width: 350 }} />
                </Col>
            </Row>
            {isLoading && <Loading />}
            <StyledTable
                rowKey={(row: Dataset) => `${row?.display_name}_${row?.generate_file_name}`}
                tableLayout="fixed"
                pagination={pagination}
                columns={columns}
                dataSource={data?.data || [] as Dataset[]}
                onRow={(row: Dataset) =>
                ({
                    onClick: () => {
                        setDatasetDetails(row);
                    }
                })}
            />
            <DatasetExportModal setExportResult={setExportResult} datasetDetails={datasetDetails} isModalActive={toggleDatasetExportModal} setIsModalActive={setToggleDatasetExportModal} />
            {notificationContextHolder}
        </Container>
            
        </StyledContent>
    </Layout>
  );
};

export default DatasetsPage; 