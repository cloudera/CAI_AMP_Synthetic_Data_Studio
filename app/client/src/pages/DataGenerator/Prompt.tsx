import isEmpty from 'lodash/isEmpty';
import isNumber from 'lodash/isNumber';
import { useEffect, useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Divider, Flex, Form, Input, InputNumber, Modal, notification, Row, Select, Space, Tooltip, Typography } from 'antd';
import type { InputRef } from 'antd';
import styled from 'styled-components';

import Parameters from './Parameters';
import TooltipIcon from '../../components/TooltipIcon';
import { usefetchTopics, useFetchDefaultSchema, useFetchDefaultPrompt } from '../../api/api';
import { MAX_NUM_QUESTION, MIN_SEED_INSTRUCTIONS,  MAX_SEED_INSTRUCTIONS } from './constants'
import { Usecases, WorkflowType } from './types';
import { useWizardCtx } from './utils';
import { fetchFileContent, fetchSeedList, useDatasetSize, useGetPromptByUseCase } from './hooks';
import CustomPromptButton from './CustomPromptButton';
import get from 'lodash/get';
import TextArea from 'antd/es/input/TextArea';
import FileSelectorButton from './FileSelectorButton';
import { useMutation } from '@tanstack/react-query';
import first from 'lodash/first';
import ResetIcon from './ResetIcon';

const { Title } = Typography;

const FormLabel = styled(Title)`
    margin-top: 0px;
    margin-bottom: 0px !important;
`;
const StyledFormItem = styled(Form.Item)`
    margin-bottom: 0px;
`;

const StyledPromptFormItem = styled(StyledFormItem)`
    label {
        width: 100%;
    }
`;

const RestoreDefaultBtn = styled(Button)`
    max-width: fit-content;
`;
const LeftCol = styled(Col)`
    border-right: 1px solid #d9d9d9;
    padding: 18px 0px;
`;
const RightCol = styled(Col)`
    padding: 18px 0px;
`;
const StyledTextArea = styled(Input.TextArea)`
    margin-bottom: 10px !important;
    min-height: 175px !important;
    padding: 15px 20px !important;
`
const ModalButtonGroup = styled(Flex)`
    margin-top: 15px !important;
`
const StyledDivider = styled(Divider)`
    margin: 8px 0px;
`;
const AddTopicContainer = styled(Space)`
    .ant-space-item {
        padding-right: 12px;
        width: 100% !important;
    };
    padding: 0px 8px 4px;
    width: 100% !important;
`;

const SeedsFormItem = styled(StyledFormItem)`
  .ant-form-item-control {
    width: 45vw;
  }

`

const Prompt = () => {
    const form = Form.useFormInstance();
    const selectedTopics = Form.useWatch('topics');
    const numQuestions = Form.useWatch('num_questions');
    const datasetSize = Form.useWatch('num_questions');
    const [items, setItems] = useState<string[]>([]);
    const [customTopic, setCustomTopic] = useState('');

    const customTopicRef = useRef<InputRef>(null);
    const defaultPromptRef = useRef<null|string>(null);
    const defaultSchemaRef = useRef<null|string>(null);

    const useCase = form.getFieldValue('use_case');
    const model_id = form.getFieldValue('model_id');
    const inference_type = form.getFieldValue('inference_type');
    const doc_paths = form.getFieldValue('doc_paths');
    const workflow_type = form.getFieldValue('workflow_type');
    const input_key = form.getFieldValue('input_key');
    const input_value = form.getFieldValue('input_value');
    const output_key = form.getFieldValue('output_key');
    const caii_endpoint = form.getFieldValue('caii_endpoint');
    
    const { data: defaultPrompt, loading: promptsLoading } = useFetchDefaultPrompt(useCase, workflow_type);

    // Page Bootstrap requests and useEffect
    const { data: defaultTopics, loading: topicsLoading } = usefetchTopics(useCase);
    const { data: defaultSchema, loading: schemaLoading } = useFetchDefaultSchema();
    const { data: dataset_size, isLoading: datasetSizeLoading, isError, error } = useDatasetSize(
        workflow_type,
        doc_paths,
        input_key,
        input_value,
        output_key
    );
    const mutation = useMutation({
        mutationFn: fetchSeedList
    });

    useEffect(() => {
        if (!isEmpty(mutation.data) && !mutation.isError) {
            const seeds = mutation.data.map((item: string) => item.trim());
            setItems(seeds);
            form.setFieldValue('topics', seeds);
        }
    }, [mutation.data]);


    useEffect(() => {  
        if (isError) {
            notification.error({
                message: 'Error fetching the dataset size',
                description: get(error, 'error'),
            });
        } 

    }, [error, isError]);

    useEffect(() => {
        if (defaultTopics) {
            // customTopics is a client-side only fieldValue that persists custom topics added
            // when the user switches between wizard steps
            const customTopics = form.getFieldValue('customTopics')
            if (customTopics) {
                setItems([...defaultTopics.topics, ...customTopics])
            } else {
                setItems(defaultTopics.topics)
            }
            if (form.getFieldValue('topics') === undefined) {
                form.setFieldValue('topics', [])
            }
        }
        if (defaultPrompt) {
            defaultPromptRef.current = defaultPrompt;
            if (form.getFieldValue('custom_prompt') === undefined) {
                form.setFieldValue('custom_prompt', defaultPrompt)
            }
            if (form.getFieldValue('custom_prompt') !== defaultPrompt && 
                form.getFieldValue('use_case') !== 'custom') {
                form.setFieldValue('custom_prompt', defaultPrompt)
            }
        }
        if (defaultSchema) {
            defaultSchemaRef.current = defaultSchema;
            if (form.getFieldValue('schema') === undefined) {
                form.setFieldValue('schema', defaultSchema)
            }
        }
        if (dataset_size) {
            if (form.getFieldValue('num_questions') !== dataset_size) {
                form.setFieldValue('num_questions', dataset_size)
            }
        }
    }, [defaultPromptRef, defaultSchema, defaultSchemaRef, defaultTopics, dataset_size, form, setItems]);

    const { setIsStepValid } = useWizardCtx();
    useEffect(() => {
        let isStepValid = false;
        if(isEmpty(doc_paths)) {
            if (selectedTopics?.length > 0 && numQuestions > 0) {
                isStepValid = true;
            }
            setIsStepValid(isStepValid)
        } else if(!isEmpty(doc_paths) && workflow_type === WorkflowType.SUPERVISED_FINE_TUNING) {
            setIsStepValid(isNumber(datasetSize) && datasetSize > 0);
        } else {
            setIsStepValid(true);
        }
        
    }, [selectedTopics, numQuestions, datasetSize]);

    const onTopicTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        console.log('onTopicTextChange:', event.target.value);
        setCustomTopic(event.target.value);
    };

    const setPrompt = (_prompt: string) => {
        form.setFieldValue('custom_prompt', _prompt);
    }

    const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
        e.preventDefault();
        console.log('Adding custom topic:', customTopic);
        if (!customTopic || items.includes(customTopic)) {
            return; // Prevent adding duplicate or empty topics
        }

        const updatedItems = [...items, customTopic];
        form.setFieldValue('topics', [
            ...(form.getFieldValue('topics') || []),
            customTopic,
        ])
        setItems(updatedItems);

        // customTopics is a client-side only fieldValue that persists custom topics added
        // when the user switches between pagination steps
        const prevCustomTopics = form.getFieldValue('customTopics')
        const customTopics = prevCustomTopics ? [...prevCustomTopics, customTopic] : [customTopic];
        form.setFieldValue('customTopics', customTopics)

        setCustomTopic('');
    };


    const onAddFiles = (files: File[]) => {
        if (!isEmpty (files)) {
            const file = first(files);
            const path = get(file, '_path');
            if (path) {
                mutation.mutate({ path });
            }
        };
    }

    return (
        <Row gutter={[50,0]}>
            <LeftCol span={17}>
                <Flex vertical gap={14}>
                    <div>
                        <StyledPromptFormItem
                            name='custom_prompt'
                            label={
                                <div style={{ width: '100%', height: '32px', display: 'flex' }}>
                                <FormLabel level={4} style={{ width: '240px'}}>
                                    <Space>
                                        <>{'Prompt'}</>
                                        <TooltipIcon message={'Enter a prompt to describe your dataset'}/>
                                    </Space>
                                </FormLabel>
                                <Flex style={{ flexDirection: 'row-reverse', width: '100%' }}>
                                    {(form.getFieldValue('use_case') === Usecases.CUSTOM.toLowerCase() ||
                                        workflow_type === WorkflowType.CUSTOM_DATA_GENERATION) &&  
                                        <CustomPromptButton 
                                            model_id={model_id}
                                            inference_type={inference_type}
                                            caii_endpoint={caii_endpoint}
                                            use_case={useCase}
                                            example_path={form.getFieldValue('example_path') || null}
                                            setPrompt={setPrompt}
                                        />
                                    }
                                    <RestoreDefaultBtn
                                        icon={<ResetIcon />}
                                        type="link"
                                        onClick={() => {
                                            return Modal.warning({
                                                title: 'Restore Default Prompt',
                                                closable: true,
                                                content: <>{'Are you sure you want to restore to the default prompt? Your current prompt will be lost.'}</>,
                                                footer: (
                                                    <ModalButtonGroup gap={8} justify='end'>
                                                        <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
                                                        <Button
                                                            onClick={() => {
                                                                form.setFieldValue('custom_prompt', defaultPromptRef.current)
                                                                Modal.destroyAll()
                                                            }}
                                                            type='primary'
                                                        >
                                                            {'Confirm'}
                                                        </Button>
                                                    </ModalButtonGroup>
                                                ),
                                                maskClosable: true,
                                            })
                                        }}>
                                            {'Restore'}
                                        </RestoreDefaultBtn>    
                                    </Flex>
                                </div>
                            }
                            labelCol={{ span: 24 }}
                            wrapperCol={{ span: 24 }}
                            shouldUpdate
                        >
                            <StyledTextArea autoSize placeholder={'Enter a prompt'}/>
                        </StyledPromptFormItem>
                        
                        
                    </div>
                    {((workflow_type === WorkflowType.CUSTOM_DATA_GENERATION && !isEmpty(doc_paths)) ||
                    (workflow_type === WorkflowType.SUPERVISED_FINE_TUNING && !isEmpty(doc_paths))) && 
                        <StyledFormItem
                            name={'num_questions'}
                            label={
                                <FormLabel level={4}>
                                    <Space>
                                        {'Total Dataset Size'}
                                        <TooltipIcon message={'The total number of Prompt/Completion pairs that will be generated based on this configuration'}/>
                                    </Space>
                                </FormLabel>
                            }
                            rules={[
                                { required: workflow_type === WorkflowType.SUPERVISED_FINE_TUNING, message: `Please select a workflow.` }
                            ]}
                            labelCol={{ span: 24 }}
                            wrapperCol={{ span: 24 }}
                            shouldUpdate
                           
                        >
                        
                            <InputNumber disabled={workflow_type === WorkflowType.CUSTOM_DATA_GENERATION} value={dataset_size} />
                        </StyledFormItem>    
                    }
                    {isEmpty(doc_paths) && (workflow_type === WorkflowType.SUPERVISED_FINE_TUNING ||
                        workflow_type === WorkflowType.CUSTOM_DATA_GENERATION ||
                        workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION) &&
                    <Flex gap={20} vertical>
                        {mutation.isError &&
                            <Alert
                                message='Error fetching seed instructions'
                                description={get(mutation.error, 'message', 'An error occurred while fetching seed instructions.')}
                                type='error'
                            />
                        }
                        {mutation.isPending && <Alert message='Loading seed instructions...' type='info' />}
                        <Flex>
                        <SeedsFormItem
                            name={'topics'}
                            label={
                                <FormLabel level={4}>
                                    <Space>
                                        <>{'Seed Instructions'}</>
                                        <TooltipIcon message={`Select up to ${MAX_SEED_INSTRUCTIONS} seed instructions. The generator will generate a dataset for each seed.`}/>
                                    </Space>
                                </FormLabel>
                            }
                            rules={[
                                { required: true, message: `Please select at least ${MIN_SEED_INSTRUCTIONS} seed instruction` }
                            ]}
                            labelCol={{ span: 24 }}
                            wrapperCol={{ span: 24 }}
                            shouldUpdate
                            // validateTrigger='onBlur'
                        >
                            
                            <Select
                                allowClear
                                mode="multiple"
                                placeholder="Select from list of default seed instruction or add a new custom seed instruction"
                                maxCount={MAX_SEED_INSTRUCTIONS}
                                dropdownRender={(menu) => (
                                    <>
                                        {selectedTopics?.length === MAX_SEED_INSTRUCTIONS && (
                                            <Alert
                                                message={`You can select up to ${MAX_SEED_INSTRUCTIONS} topics. You must de-select a seed instruction before selecting another one.`}
                                                type='warning'
                                            />
                                        )}
                                        {menu}
                                        <StyledDivider/>
                                        <AddTopicContainer>
                                            <StyledFormItem
                                                name={'customTopic'}
                                                rules={[
                                                    { validator: (_: unknown, value: string) => {
                                                        if (items.includes(value)) {
                                                            return Promise.reject('This seed instruction already exists in the list')
                                                        }
                                                        return Promise.resolve()
                                                    }}
                                                ]}
                                            >
                                                <Space.Compact block>
                                                    <TextArea
                                                        disabled={selectedTopics?.length === MAX_SEED_INSTRUCTIONS}
                                                        placeholder="Enter custom seed instruction"
                                                        rows={4}
                                                        ref={customTopicRef}
                                                        value={customTopic}
                                                        onChange={onTopicTextChange}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                    <Tooltip
                                                        title={
                                                            selectedTopics?.length < MAX_SEED_INSTRUCTIONS && customTopic.length === 0 ?
                                                            'Enter a custom seed instruction name to enable' : undefined
                                                        }
                                                    >
                                                        <Button
                                                            style={{ marginLeft: '12px' }}
                                                            disabled={items.includes(customTopic) ||
                                                                selectedTopics?.length === MAX_SEED_INSTRUCTIONS ||
                                                                customTopic.length === 0}
                                                            type="primary"
                                                            icon={<PlusOutlined/>}
                                                            onClick={addItem}
                                                        >
                                                            {'Add Seed Instruction'}
                                                        </Button>
                                                    </Tooltip>
                                                </Space.Compact>
                                            </StyledFormItem>
                                        </AddTopicContainer>
                                    </>
                                )}
                                options={items.map((item: string) => ({
                                    label: item, 
                                    value: item,
                                    disabled: selectedTopics?.length === MAX_SEED_INSTRUCTIONS
                                }))}
                            />
                            
                        </SeedsFormItem>
                        <div style={{ marginTop: '40px'}}>
                            <FileSelectorButton onAddFiles={onAddFiles} workflowType={form.getFieldValue('workflow_type')} />
                        </div>
                        </Flex>
                        <StyledFormItem
                            name='num_questions'
                            label={<FormLabel level={4}>{'Entries Per Seed'}</FormLabel>}
                            labelCol={{ span: 24 }}
                            rules={[
                                { required: true, message: 'Please provide a data count' },
                                { type: 'number', max: MAX_NUM_QUESTION, message: `You can only generate up to ${MAX_NUM_QUESTION} prompt/completion pairs per seed instruction`}
                            ]}
                            tooltip='The number of prompt completion pairs you would like to generate for each seed instruction'
                        >
                            <InputNumber
                                min={1} 
                                max={MAX_NUM_QUESTION}
                                step={1}
                            />
                        </StyledFormItem>
                        
                        <FormLabel level={4}>
                            <Space>
                                {'Total Dataset Size'}
                                <TooltipIcon message={'The total number of Prompt/Completion pairs that will be generated based on this configuration'}/>
                            </Space>
                        </FormLabel>
                        <InputNumber disabled value={selectedTopics?.length * numQuestions} />
                    </Flex>}

                    {form.getFieldValue('use_case') === Usecases.TEXT2SQL  && (
                        <div>
                            <StyledFormItem
                                name={'schema'}
                                label={<FormLabel level={4}>{'DB Schema'}</FormLabel>}
                                labelCol={{ span: 24 }}
                                wrapperCol={{ span: 24 }}
                                shouldUpdate
                            >
                                <StyledTextArea placeholder={'Enter a table schema'}/>
                            </StyledFormItem>
                            <RestoreDefaultBtn
                                onClick={() => {
                                    return Modal.warning({
                                        title: 'Restore Default DB Schema',
                                        closable: true,
                                        content: <>{'Are you sure you want to restore to the default DB Schema? Your current DB Schema will be lost.'}</>,
                                        footer: (
                                            <ModalButtonGroup gap={8} justify='end'>
                                                <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
                                                <Button
                                                    onClick={() => {
                                                        form.setFieldValue('schema', defaultSchemaRef.current)
                                                        Modal.destroyAll()
                                                    }}
                                                    type='primary'
                                                >
                                                    {'Confirm'}
                                                </Button>
                                            </ModalButtonGroup>
                                        ),
                                        maskClosable: true,
                                    })
                                }}
                            >
                                {'Restore Default Schema'}
                            </RestoreDefaultBtn>
                        </div>
                    )}
                </Flex>
            </LeftCol>
            <RightCol span={6}>
                <FormLabel level={4}>{'Parameters'}</FormLabel>
                <Parameters/>
            </RightCol>
        </Row>
    )
}

export default Prompt;