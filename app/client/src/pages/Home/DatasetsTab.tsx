import throttle from 'lodash/throttle';
import { Col, Flex, Input, Row, Table, TableProps, Tooltip, notification } from 'antd';
import { SearchProps } from 'antd/es/input';
import styled from 'styled-components';
import { useDatasets } from './hooks';
import Loading from '../Evaluator/Loading';
import { Dataset } from '../Evaluator/types';
import Paragraph from 'antd/es/typography/Paragraph';
import { JOB_EXECUTION_TOTAL_COUNT_THRESHOLD } from '../../constants';
import DateTime from '../../components/DateTime/DateTime';
import DatasetActions from './DatasetActions';
import { sortItemsByKey } from '../../utils/sortutils';
import { SyntheticEvent, useEffect } from 'react';
import DatasetExportModal, { ExportResult } from '../../components/Export/ExportModal';
import React from 'react';
import { JobStatus } from '../../types';
import JobStatusIcon from '../../components/JobStatus/jobStatusIcon';
import { useUseCaseMapping } from '../../api/hooks';

const { Search } = Input;

const Container = styled.div`
  background-color: #ffffff;
  padding: 1rem;
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

const DatasetsTab: React.FC = () => {
    const { data, isLoading, isError, refetch, setSearchQuery, pagination } = useDatasets();
    const { getUseCaseName } = useUseCaseMapping();
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
            sorter: sortItemsByKey('display_name'),
        }, {
            key: 'generate_file_name',
            title: 'Dataset Name',
            dataIndex: 'generate_file_name',
            sorter: sortItemsByKey('generate_file_name'),
            width: 250,
            render: (generate_file_name: string) => <Tooltip title={generate_file_name}><StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{generate_file_name}</StyledParagraph></Tooltip>
        }, {
            key: 'model_id',
            title: 'Model',
            dataIndex: 'model_id',
            sorter: sortItemsByKey('model_id'),
            width: 250,
            render: (modelId: string) => <Tooltip title={modelId}><StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{modelId}</StyledParagraph></Tooltip>
        }, {
            key: 'num_questions',
            title: 'Questions Per Topic',
            dataIndex: 'num_questions',
            align: 'center',
            sorter: sortItemsByKey('num_questions'),
            width: 120
        }, 
        {
            key: 'total_count',
            title: 'Total Count',
            dataIndex: 'total_count',
            align: 'center',
            sorter: sortItemsByKey('total_count'),
            width: 80
        }, {
            key: 'completed_rows',
            title: 'Completed Rows',
            dataIndex: 'completed_rows',
            align: 'center',
            sorter: sortItemsByKey('completed_rows'),
            width: 100,
            render: (completed_rows: number | null) => <>{completed_rows != null ? completed_rows : 'N/A'}</>
        }, {
            key: 'use_case',
            title: 'Use Case',
            dataIndex: 'use_case',
            sorter: sortItemsByKey('use_case'),
            render: (useCase: string) => getUseCaseName(useCase)
        }, {
            key: 'timestamp',
            title: 'Creation Time',
            dataIndex: 'timestamp',
            defaultSortOrder: 'descend',
            sorter: sortItemsByKey('timestamp'),
            render: (timestamp: string | null) => <>{timestamp == null ? 'N/A' : <DateTime dateTime={timestamp}/>}</>
        }, {
            key: '7',
            title: 'Actions',
            width: 150,
            render: (row: Dataset) => (
                <DatasetActions dataset={row} refetch={refetch} setToggleDatasetExportModal={setToggleDatasetExportModal}/>
            )
        },
    ];

    return (
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
    )
}

export default DatasetsTab;