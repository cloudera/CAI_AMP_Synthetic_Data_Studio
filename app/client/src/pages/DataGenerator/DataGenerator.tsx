import isEmpty from 'lodash/isEmpty';
import isString from 'lodash/isString';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { Button, Flex, Form, Layout, Steps } from 'antd';
import type { FormInstance } from 'antd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import styled from 'styled-components';

import Configure from './Configure';
import Prompt from './Prompt';
import Examples from './Examples';
import Summary from './Summary';
import Finish from './Finish';

import { DataGenWizardSteps, WizardStepConfig, WorkflowType } from './types';
import { WizardCtx } from './utils';
import { fetchDatasetDetails, useGetDatasetDetails } from '../DatasetDetails/hooks';
import { useMutation } from '@tanstack/react-query';

const { Content } = Layout;
// const { Title } = Typography;

const StyledTitle = styled.div`
    margin-top: 10px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-size: 20px;
    font-weight: 600;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.4;
    letter-spacing: normal;
    text-align: left;
`
const Wizard = styled(Steps)`
    margin-bottom: 5px;
    padding: 15px 0px 25px 0px;
`;
const WizardButton = styled(Button)`
    font-size: 18px;
    font-weight: 300;
    padding: 24px 12px;
`;
const WizardContent = styled(Content)`
    background: #FFFFFF;
    flex: 1;
    margin-bottom: 60px;
    padding: 0px 25px 30px;
    min-width: 800px;
`;
const WizardFooter = styled(Flex)`
    background: #f5f5f5;
    padding-top: 20px;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 20px 25px 30px;

`;

const steps: WizardStepConfig[] = [
    {
        title: 'Configure',
        key: DataGenWizardSteps.CONFIGURE,
        content: <Configure/>,
        required: true,
    },
    {
        title: 'Examples',
        key: DataGenWizardSteps.EXAMPLES,
        content: <Examples/>
    },
    {
        title: 'Prompt',
        key: DataGenWizardSteps.PROMPT,
        content: <Prompt/>,
    },
    {
        title: 'Summary',
        key: DataGenWizardSteps.SUMMARY,
        content: <Summary/>
    },
    {
        title: 'Finish',
        key: DataGenWizardSteps.FINISH,
        content: <Finish/>
    },

];

/**
 * Wizard component for Synthetic Data Generation workflow
 */
const DataGenerator = () => {
    const [current, setCurrent] = useState(0);
    const [maxStep, setMaxStep] = useState(0);
    const [isStepValid, setIsStepValid] = useState<boolean>(false);
    
    // Data passed from listing table to prepopulate form
    const location = useLocation();
    const { generate_file_name } = useParams();
    const initialData = location?.state?.data;
    const mutation = useMutation({
        mutationFn: fetchDatasetDetails
    });


    useEffect(() => {
        if (generate_file_name && !mutation.data) {
            mutation.mutate(generate_file_name);
        }
        if (mutation.data && mutation?.data?.dataset) {
            form.setFieldsValue({
                ...initialData,
                ...(mutation?.data?.dataset as any)
            });
        }

    }, [generate_file_name]);
    

    if (initialData?.technique) {
        initialData.workflow_type = initialData?.technique === 'sft' ? 
        WorkflowType.SUPERVISED_FINE_TUNING :
        initialData?.technique === 'freeform' ? WorkflowType.FREE_FORM_DATA_GENERATION :
        WorkflowType.CUSTOM_DATA_GENERATION;
    }
    if (Array.isArray(initialData?.doc_paths) && !isEmpty(initialData?.doc_paths) ) {
        initialData.doc_paths = initialData?.doc_paths.map((path: string) => ({
            value: path,
            label: path
        }));
        
    }

    // if (datasetDetailsReq && datasetDetailsReq.data && 
    //     !isEmpty(datasetDetailsReq?.data?.generate_file_name)) {
    //     initialData.example_path = initialData?.example_path;
    // }

    if (Array.isArray(initialData?.input_paths) && !isEmpty(initialData?.input_paths) ) {
        initialData.doc_paths = initialData?.input_paths.map((path: string) => ({
            value: path,
            label: path
        }));
    }
    if (isString(initialData?.doc_paths)) {
        initialData.doc_paths = [];
    }


    const formData = useRef(initialData || { num_questions: 20, topics: [] });

    const [form] = Form.useForm<FormInstance>();

    const onStepChange = (value: number) => {
        setCurrent(value);
    };

    const next = () => {
        if (isStepValid) {
            setCurrent(Math.min(current + 1, steps.length - 1));
            setMaxStep(Math.min(maxStep + 1, steps.length - 1));
        }
    };

    const prev = () => setCurrent(Math.max(0, current - 1))

    return (
        <WizardCtx.Provider value={{ setIsStepValid }}>
            <Layout style={{ paddingBottom: 45 }}>
                <StyledTitle>{'Synthetic Dataset Studio'}</StyledTitle>
                <Wizard
                    current={current}
                    onChange={onStepChange}
                    items={steps.map((step, i) => ({ title: step.title, key: step.key,  disabled: maxStep < i }))}
                />
                <WizardContent>
                    <Form
                        colon={false}
                        name='data-generator'
                        initialValues={formData.current}
                        form={form}
                        onFieldsChange={() => {}}
                    >
                        {steps[current].content}
                    </Form>
                </WizardContent>
                <WizardFooter justify='space-between'>
                    <div>
                        {current > 0 && (
                            <WizardButton
                                icon={<ArrowBackIcon/>}
                                iconPosition='start'
                                onClick={prev}
                                type='primary'
                            >
                                {'Previous'}
                            </WizardButton>
                        )}
                    </div>
                    <div>
                        {steps[current].key !== DataGenWizardSteps.SUMMARY &&
                            steps[current].key !== DataGenWizardSteps.FINISH && (
                            <WizardButton
                                disabled={!isStepValid}
                                icon={<ArrowForwardIcon/>}
                                iconPosition='end'
                                onClick={next}
                                type='primary'
                                >
                                    {'Next'}
                                </WizardButton>
                        )}
                        { steps[current].key === DataGenWizardSteps.SUMMARY && (
                            <WizardButton
                                type='primary'
                                icon={<AutoAwesomeIcon/>}
                                onClick={next}
                            >
                                {'Generate'}
                            </WizardButton>
                        )}
                    </div>
                </WizardFooter>
            </Layout>
        </WizardCtx.Provider>
    )
}

export default DataGenerator;

