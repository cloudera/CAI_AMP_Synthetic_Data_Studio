import { ComponentType, FC, useEffect } from 'react';
import { HomeOutlined, PageviewOutlined } from '@mui/icons-material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GradingIcon from '@mui/icons-material/Grading';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { Avatar, Button, Card, Divider, Flex, Form, List, Modal, Result, Spin, Tabs, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import PCModalContent from './PCModalContent'
import { useTriggerDatagen } from './../../api/api'
import { DEMO_MODE_THRESHOLD } from './constants'
import { GenDatasetResponse, QuestionSolution } from './types';
import { Pages } from '../../types';

const { Title } = Typography;

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
    const dataSource = formData.results[topic];

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

const getFilesURL = (fileName: string | undefined) => {
    const {
        VITE_WORKBENCH_URL,
        VITE_PROJECT_OWNER,
        VITE_CDSW_PROJECT
    } = import.meta.env
    return `${VITE_WORKBENCH_URL}/${VITE_PROJECT_OWNER}/${VITE_CDSW_PROJECT}/preview/${fileName}`
}

const getJobsURL = () => {
    const {
        VITE_WORKBENCH_URL,
        VITE_PROJECT_OWNER,
        VITE_CDSW_PROJECT
    } = import.meta.env

    return `${VITE_WORKBENCH_URL}/${VITE_PROJECT_OWNER}/${VITE_CDSW_PROJECT}/jobs`
}

// Determine if server should return dataset for parsing
// or will create a batch job and return a job id
const isDemoMode = (numQuestions: number, topics: []) => {
    if (numQuestions * topics?.length <= DEMO_MODE_THRESHOLD) {
        return true
    }
    return false
}

const Finish = () => {
    const form = Form.useFormInstance();
    const { data: genDatasetResp, loading, error: generationError, triggerPost } = useTriggerDatagen<GenDatasetResponse>();
    const { num_questions, topics } = form.getFieldsValue(true)
    const isDemo = isDemoMode(num_questions, topics)

    useEffect(() => { 
        const formValues = form.getFieldsValue(true)
        const args = {...formValues, is_demo: isDemo }
        triggerPost(args)
    }, []);

    const topicTabs = genDatasetResp?.results && Object.keys(genDatasetResp.results).map((topic, i) => ({
        key: `${topic}-${i}`,
        label: topic,
        value: topic,
        children: <TopicsTable formData={genDatasetResp} topic={topic} />
    }));
    const nextStepsListPreview = [
        {
            avatar: '',
            title: 'Review Dataset',
            description: 'Review your dataset to ensure it properly fits your usecase.',
            icon: <GradingIcon/>,
            href: getFilesURL(genDatasetResp?.export_path?.local)
        },
        {
            avatar: '',
            title: 'Evaluate Dataset',
            description: 'Use an LLM as a judge to evaluate and score your dataset.',
            icon: <AssessmentIcon/>,
            href: `/${Pages.EVALUATOR}/create/${genDatasetResp?.export_path?.local}`
        },
        {
            avatar: '',
            title: 'Fine Tuning Studio',
            description: 'Bring your dataset to Fine Tuning Studio AMP to start fine tuning your models in Cloudera AI Workbench.',
            icon: <ModelTrainingIcon/>,
            href: 'https://github.com/cloudera/CML_AMP_LLM_Fine_Tuning_Studio'
        },
    ]
    const nextStepsListNonPreview = [
        {
            avatar: '',
            title: 'Review Dataset',
            description: 'Once your dataset finishes generating, you can review your dataset in the workbench files',
            icon: <GradingIcon/>,
            href: getFilesURL('')
        },
        {
            avatar: '',
            title: 'Fine Tuning Studio',
            description: 'Bring your dataset to Fine Tuning Studio AMP to start fine tuning your models in Cloudera AI Workbench.',
            icon: <ModelTrainingIcon/>,
            href: 'https://github.com/cloudera/CML_AMP_LLM_Fine_Tuning_Studio'
        },
    ]


    if (loading) {
        return (
            <Flex vertical justify='middle' gap='middle'>
                <Spin fullscreen size='large' tip={'Successfully started synthetic data generation process. Please wait a few moments...'}>
                    <div></div>
                </Spin>
            </Flex>
        )
    }

    if (generationError) {
        return (
            <>
                <Result
                    status="error"
                    title="Synthetic Data Generation Failed"
                    subTitle={generationError?.message}
                    extra={
                        <Button type="primary" href={`/${Pages.GENERATOR}`}>
                            {'Start Over'}
                        </Button>
                    }
                />
            </>
        )
    }

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
                <TabsContainer title={'Generated Dataset'}>
                    <Tabs tabPosition='left' items={topicTabs}/>
                </TabsContainer>
            )}
            <Divider/>
            <Title level={2}>{'Next Steps'}</Title>
            <List
                itemLayout="horizontal"
                dataSource={isDemo ? nextStepsListPreview : nextStepsListNonPreview}
                renderItem={({ title, href, icon, description}, i) => (
                    <Link to={href}>
                        <List.Item key={`${title}-${i}`}>
                            <List.Item.Meta
                                avatar={<Avatar style={{ backgroundColor: '#1677ff'}} icon={icon} />}
                                title={title}
                                description={description}
                            />
                        </List.Item>
                    </Link>
                )}
            />
            <ButtonGroup gap={8}>
                <StyledButton icon={<FormatListBulletedIcon/>}>
                    <Link to={`/${Pages.HISTORY}`}>{'View Dataset List'}</Link>
                </StyledButton>
                {isDemo && (
                    <StyledButton icon={<PageviewOutlined/>}>
                        <a href={getFilesURL(genDatasetResp?.export_path?.local)} target='_blank' rel='noreferrer'>
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

export default Finish;