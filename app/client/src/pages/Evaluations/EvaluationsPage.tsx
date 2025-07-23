import throttle from "lodash/throttle";
import { SyntheticEvent, useEffect } from "react";
import { Badge, Col, Flex, Input, Layout, notification, Row, Table, TableProps } from "antd";
import styled from "styled-components";
import Paragraph from 'antd/es/typography/Paragraph';
import { JOB_EXECUTION_TOTAL_COUNT_THRESHOLD, TRANSLATIONS } from '../../constants';
import { useEvaluations } from "../Home/hooks";
import { Evaluation } from "../Home/types";
import { sortItemsByKey } from "../../utils/sortutils";
import Loading from "../Evaluator/Loading";

import { SearchProps } from "antd/es/input";
import DateTime from "../../components/DateTime/DateTime";
import EvaluateActions from "./EvaluateActions";
import { getColorCode } from "../Evaluator/util";
import { JobStatus } from "../../types";
import JobStatusIcon from "../../components/JobStatus/jobStatusIcon";
import StyledTitle from "../Evaluator/StyledTitle";


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
    font-size: 14px;
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


const EvaluationsPage: React.FC = () => {
    const { data, isLoading, isError, refetch, setSearchQuery, pagination } = useEvaluations();

    useEffect(() => {
        if (isError) {
            notification.error({
                message: 'Error',
                description: 'An error occurred while fetching evaluations'
            });
        }
    }, [isError]);

    const onSearch: SearchProps['onSearch'] = (value: unknown) => {
        throttle((value: string) => setSearchQuery(value), 500)(value);
    }
    
    const onChange = (event: SyntheticEvent) => {
        const value = (event.target as HTMLInputElement)?.value;
        throttle((value: string) => setSearchQuery(value), 500)(value);
    }

    const columns: TableProps<Evaluation>['columns'] = [
        {
            key: 'job_status',
            title: 'Status',
            dataIndex: 'job_status',
            width: 80,
            sorter: sortItemsByKey('job_status'),
            render: (status: JobStatus) => <Flex justify='center' align='center'>
                <JobStatusIcon status={status} customTooltipTitles={{"null": `Job wasn't executed because evaluated dataset total count is less than ${JOB_EXECUTION_TOTAL_COUNT_THRESHOLD}!`}}></JobStatusIcon>
            </Flex>
        },
        {
              key: 'display_name',
              title: 'Display Name',
              dataIndex: 'display_name',
              width: 150,
              sorter: sortItemsByKey('display_name'),
        }, {
              key: 'model_id',
              title: 'Model ID',
              dataIndex: 'model_id',
              width: 150,
              sorter: sortItemsByKey('model_id'),
        }, {
              key: 'average_score',
              title: 'Average Score',
              dataIndex: 'average_score',
              width: 80,
              render: (average_score) => <Badge count={average_score} color={getColorCode(average_score)} showZero />,
              sorter: sortItemsByKey('average_score'),
        },{
              key: 'use_case',
              title: 'Use Case',
              dataIndex: 'use_case',
              width: 180,
              sorter: sortItemsByKey('use_case'),
              render: (useCase) => <StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{TRANSLATIONS[useCase]}</StyledParagraph>
        }, {
              key: 'timestamp',
              title: 'Create Time',
              dataIndex: 'timestamp',
              width: 140,
              sorter: sortItemsByKey('timestamp'),
              render: (timestamp) => <DateTime dateTime={timestamp}></DateTime>
        
        }, {
            key: 'action',
            title: 'Actions',
            width: 100,
            render: (row: Evaluation) => 
              <EvaluateActions evaluation={row} refetch={refetch} />
            
          },
    ]; 
    

    return (
        <Layout>
            <StyledContent>
            <StyledTitle style={{ fontWeight: 600}}>{'Evaluations'}</StyledTitle>
            <Container>
            <Row style={{ marginBottom: 16 }}>
                <Col span={24}>
                    <Search 
                        placeholder="Search Evaluations"
                        onSearch={onSearch}
                        onChange={onChange} 
                        style={{ width: 350 }} />
                </Col>
            </Row>
            {isLoading && <Loading />}
            <StyledTable
                rowKey={(row: Evaluation) => `${row?.display_name}_${row?.evaluate_file_name}`}
                tableLayout="fixed"
                pagination={pagination}
                columns={columns}
                dataSource={data?.data || [] as Evaluation[]} 
            />
        </Container>
        </StyledContent>
        </Layout>    
    );
}

export default EvaluationsPage;