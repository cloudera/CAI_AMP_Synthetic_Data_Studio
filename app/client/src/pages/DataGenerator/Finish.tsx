import isNumber from 'lodash/isNumber';
import filter from 'lodash/filter';
import isString from 'lodash/isString';
import isEmpty from 'lodash/isEmpty';
import { FC, useEffect } from 'react';
import { HomeOutlined, PageviewOutlined } from '@mui/icons-material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import GradingIcon from '@mui/icons-material/Grading';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { Avatar, Button, Card, Divider, Flex, Form, List, Modal, Result, Spin, Tabs, Table, Typography, FormInstance, Popover } from 'antd';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import PCModalContent from './PCModalContent'
import { useTriggerDatagen } from './../../api/api'
import { DEMO_MODE_THRESHOLD } from './constants'
import { GenDatasetResponse, QuestionSolution, WorkflowType } from './types';
import { Pages } from '../../types';
import CustomResultTable from './CustomResultTable';
import SeedResultTable from './SeedResultTable';
import { getFilesURL } from '../Evaluator/util';
import FreeFormTable from './FreeFormTable';

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
            title: 'Prompt',
            dataIndex: 'prompts',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.question}</>
        },
        {
            title: 'Completion',
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
            pagination={{
                showSizeChanger: true,
                showQuickJumper: false,
                hideOnSinglePage: true
            }}
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

// Determine if server should return dataset for parsing
// or will create a batch job and return a job id
const isDemoMode = (numQuestions: number, topics: [], form: FormInstance) => {
    const workflow_type = form.getFieldValue('workflow_type');
    let doc_paths = form.getFieldValue('doc_paths');
    doc_paths = filter(doc_paths, (path: string) => path !== null && !isEmpty(path));

    if (workflow_type === WorkflowType.CUSTOM_DATA_GENERATION ||
        (workflow_type === WorkflowType.SUPERVISED_FINE_TUNING && !isEmpty(doc_paths))
    ) {
        const total_dataset_size = form.getFieldValue('num_questions');
        if (isNumber(total_dataset_size)) {
            return total_dataset_size <= DEMO_MODE_THRESHOLD;
        }
        return true;
    }

    if (numQuestions * topics?.length <= DEMO_MODE_THRESHOLD) {
        return true
    }
    // set dataset size for SFT & CDG
    if (workflow_type === WorkflowType.SUPERVISED_FINE_TUNING && !isEmpty(doc_paths)) {
        const dataset_size = form.getFieldValue('num_questions');
        return dataset_size <= DEMO_MODE_THRESHOLD;
    }
    return false
}

const Finish = () => {
    const form = Form.useFormInstance();
    const { num_questions, topics, workflow_type } = form.getFieldsValue(true);
    const { data: genDatasetResp, loading, error: generationError, triggerPost } = useTriggerDatagen<GenDatasetResponse>(workflow_type);
    
    const isDemo = isDemoMode(num_questions, topics, form);

    useEffect(() => {
        const formValues = form.getFieldsValue(true);
        
        const doc_paths = formValues.doc_paths;
        if (Array.isArray(doc_paths) && !isEmpty(doc_paths)) {
            if (formValues.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING) {
                formValues.doc_paths = doc_paths.map(item => item.value);
            } else if (formValues.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION) {

                formValues.input_path = doc_paths.map(item => item.value);
                delete formValues.doc_paths;
                // delete formValues.examples;
                formValues.use_case = 'custom';
            }
        } else {
            delete formValues.doc_paths;
        }
        if (isString(formValues?.input_path)) {
            formValues.input_path = [];
        }
        if (formValues.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING) {
            formValues.technique = 'sft';
        } else if (formValues.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION) {
            formValues.technique = 'custom_workflow';
        } else if (formValues.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION) {
            formValues.technique = 'freeform';
        }
        // send examples as null when the array is empty
        if (isEmpty(formValues.examples)) {
            formValues.examples = null;
        }
        if (isEmpty(formValues.topics)) {
            formValues.topics = null;
        }
        if (formValues.customTopic) {
            delete formValues.customTopic;
        }
        if (formValues.customTopics) {
            delete formValues.customTopics;
        }
        if (formValues.doc_paths) {
            let doc_paths = formValues.doc_paths;
            doc_paths = filter(doc_paths, (path: string) => path !== null && !isEmpty(path));
            formValues.doc_paths = doc_paths
        }

        if (formValues.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION) {
            formValues.example_custom = formValues.examples;
            delete formValues.examples;
        }

        const args = {...formValues, is_demo: isDemo, model_params: formValues.model_parameters }
        console.log('Triggering data generation with args:', args);
        triggerPost(args)
    }, []);
    
    const hasTopics = (genDatasetResp: unknown) => {
        return !Array.isArray(genDatasetResp?.results)
    }

    
    const formValues = form.getFieldsValue(true);
    let hasDocSeeds = false;
    if (isEmpty(formValues.topics) &&
        (formValues.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION || formValues.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING) && 
        !isEmpty(formValues.doc_paths)) {
            hasDocSeeds = true;
    }

    let topicTabs = [];
    console.log('Preparing topics...', formValues.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION)
    if (!hasDocSeeds && formValues.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION && formValues.use_case !== 'custom' && 
        hasTopics(genDatasetResp) && !isEmpty(genDatasetResp?.results)) {
            const values = Object.values(genDatasetResp?.results);
            

        topicTabs = genDatasetResp?.results && Object.keys(genDatasetResp.results).map((topic, i) => {
            return ({
            key: `topic-${i}`,
            label: (
            <Popover content={topic} placement="right" trigger="hover" overlayStyle={{
                width: "50vw",
                maxHeight: '50vh',
                overflowY: 'auto'
              }}>
                <Typography.Text style={{ maxWidth: '300px' }} ellipsis={true}>{topic}</Typography.Text>
            </Popover>)
            ,
            value: topic.replace(/\n/g, ' '),
            children: workflow_type !== WorkflowType.FREE_FORM_DATA_GENERATION ?
            <TopicsTable formData={genDatasetResp} topic={topic} /> :
            // <FreeFormTable data={get(genDatasetResp, `results.${topic}`)} />
            <FreeFormTable data={values[i]} />

            
        })
        });
    }
    
    const nextStepsListPreview = [
        {
            avatar: '',
            title: 'Review Dataset',
            description: 'Review your dataset to ensure it properly fits your usecase.',
            icon: <GradingIcon/>,
            href: getFilesURL(genDatasetResp?.export_path?.local || "")
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
    console.log('Finish >> ');
    console.log('hasTopics', hasTopics(genDatasetResp));
    console.log('formValues', formValues);
    console.log('isDemo', isDemo);
    console.log('topicTabs', topicTabs);

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
            {(isDemo && formValues.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION && formValues.use_case !== 'custom' && hasTopics(genDatasetResp) && !hasDocSeeds) && (
                <TabsContainer title={'Generated Dataset'}>
                    <Tabs tabPosition='left' items={topicTabs}/>
                </TabsContainer>
            )}
            {formValues.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION && formValues.use_case === 'custom' && 
                <CustomResultTable results={genDatasetResp?.results || []} />
            }
            {hasDocSeeds && <SeedResultTable results={genDatasetResp?.results || {}} />}
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