import { FC } from 'react';
import { HomeOutlined, PageviewOutlined } from '@mui/icons-material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GradingIcon from '@mui/icons-material/Grading';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { Avatar, Button, Card, Divider, Flex, List, Modal, Tabs, Table, Typography, Popover } from 'antd';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import PCModalContent from './PCModalContent'
import { GenDatasetResponse, QuestionSolution } from './types';
import { getFilesURL } from '../Evaluator/util';

const { Text, Title } = Typography;

const TabsContainer = styled(Card)`
    .ant-card-body {
        padding: 0;
    }
    margin: 20px 0px 35px;
`;

const ButtonGroup = styled(Flex)`
    margin-top: 20px;
`;
const StyledButton = styled(Button)`
    height: 35px;
    width: fit-content;
`;
const StyledTable = styled(Table)`
    .ant-table-row {
        cursor: pointer;
    }
`
interface TopicsTableProps {
    formData: GenDatasetResponse;
    topic: string;
}
const TopicsTable: FC<TopicsTableProps> = ({ formData, topic }) => {
    const cols = [
        {
            title: 'Prompts',
            dataIndex: 'prompts',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.question}</>
        },
        {
            title: 'Completions',
            dataIndex: 'completions',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.solution}</>
        },
    ]
    console.log('topic', topic);
    const dataSource = formData.results[topic];
    console.log('dataSource', dataSource);
    return (
        <StyledTable
            columns={cols}
            dataSource={dataSource}
            pagination={false}
            onRow={(record) => ({
                onClick: () => Modal.info({
                    title: 'View Details',
                    content: <PCModalContent {...record}/>,
                    closable: true,
                    icon: undefined,
                    width: 1000
                })
            })}
            rowKey={(_record, index) => `summary-examples-table-${index}`}
        />
    )
};

const getJobsURL = () => {
    const {
        VITE_WORKBENCH_URL,
        VITE_PROJECT_OWNER,
        VITE_CDSW_PROJECT
    } = import.meta.env

    return `${VITE_WORKBENCH_URL}/${VITE_PROJECT_OWNER}/${VITE_CDSW_PROJECT}/jobs`
}

interface SuccessProps {
    formData: GenDatasetResponse;
    isDemo?: boolean;
}
const Success: FC<SuccessProps> = ({ formData, isDemo = true }) => {
    console.log('Success', formData);
    const topicTabs = formData?.results && Object.keys(formData.results).map((topic, i) => ({
        key: `tab-${i}`,
        label: <Popover content={topic}><Text>{topic}</Text></Popover>,
        value: topic.replace(/\n/g, ' '),
        children: <TopicsTable formData={formData} topic={topic} />
    }));
    console.log('topicTabs', topicTabs);
    const nextStepsList = [
        {
            avatar: '',
            title: 'Review Dataset',
            description: 'Review your dataset to ensure it properly fits your usecase.',
            icon: <GradingIcon/>
        },
        {
            avatar: '',
            title: 'Evaluate Dataset',
            description: 'Use an LLM as a judge to evaluate and score your dataset.',
            icon: <AssessmentIcon/>,
        },
        {
            avatar: '',
            title: 'Fine Tuning Studio',
            description: 'Bring your dataset to Fine Tuning Studio AMP to start fine tuning your models in Cloudera AI Workbench.',
            icon: <ModelTrainingIcon/>,
        },
    ]
    
    return (
        <div>
            <Title level={2}>
                <Flex align='center' gap={10}>
                    <CheckCircleIcon style={{ color: '#178718' }}/>
                    {'Success'}
                </Flex>
            </Title>
            {isDemo ? (
                <Typography>
                {'Your data set was successfully generated. You can review your dataset in the table below.'}
                </Typography>
            ): (
                <Flex gap={20} vertical>
                    <Typography>
                        {'Your data set generation job has successfully started. Once complete, your data set will be available in your Cloudera AI Workbench Files. Click "View Job" to monitor the progress.'}
                    </Typography>
                    <StyledButton type='primary'>
                        <a href={getJobsURL()} target='_blank' rel='noreferrer'>
                            {'View Job'}
                        </a>
                    </StyledButton>
                </Flex>
            )}

            {isDemo && (
                <TabsContainer title={'Topics'}>
                    <Tabs tabPosition='left' items={topicTabs}/>
                </TabsContainer>
            )}
            <Divider/>
            <Title level={2}>{'Next Steps'}</Title>
            <List
                itemLayout="horizontal"
                dataSource={nextStepsList}
                renderItem={(item, i) => (
                    <List.Item key={`${item.title}-${i}`}>
                        <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: '#1677ff'}} icon={item.icon} />}
                            title={item.title}
                            description={item.description}
                        />
                    </List.Item>
                )}
            />

            <ButtonGroup gap={8}>
                {isDemo && (
                    <StyledButton icon={<PageviewOutlined/>}>
                        <a href={getFilesURL(formData?.export_path?.local || "")} target='_blank' rel='noreferrer'>
                            {'View in Cloudera AI Workbench'}
                        </a>
                    </StyledButton>)}
                <StyledButton icon={<HomeOutlined/>}>
                    <Link to={'/'}>{'Return Home'}</Link>
                </StyledButton>
            </ButtonGroup>
        </div>
    )
}

export default Success;