import endsWith from 'lodash/endsWith';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import { useEffect, useState } from 'react';
import { Flex, Form, Input, Select, Typography } from 'antd';
import styled from 'styled-components';
import { File, WorkflowType } from './types';
import { useFetchModels } from '../../api/api';
import { MODEL_PROVIDER_LABELS } from './constants';
import { ModelProviders, ModelProvidersDropdownOpts } from './types';
import { getWizardModel, getWizardModeType, useWizardCtx } from './utils';
import FileSelectorButton from './FileSelectorButton';
import UseCaseSelector from './UseCaseSelector';
import { useLocation } from 'react-router-dom';
import { WizardModeType } from '../../types';
import { get } from 'lodash';


const StepContainer = styled(Flex)`
    background: white;
    padding: 40px 0px;
`;
const FormContainer = styled(Flex)`
    width: 800px;
`;

export const StyledTextArea = styled(Input.TextArea)`
    margin-bottom: 10px !important;
    min-height: 175px !important;
`;

export const USECASE_OPTIONS = [
    // { label: 'Lending Dataset', value: 'lending_dataset' },
    // { label: 'Credit Card History', value: 'credit_card_history' },
    // { label: 'Housing Dataset', value: 'housing_dataset' },
    { label: 'Code Generation', value: 'code_generation' },
    { label: 'Text to SQL', value: 'text2sql' },
    { label: 'Custom', value: 'custom' },

];

export const WORKFLOW_OPTIONS = [
    // { label: 'Supervised Fine-Tuning', value: 'supervised-fine-tuning' },
    { label: 'Custom Data Generation', value: 'custom' },
    { label: 'Freeform Data Generation', value: 'freeform' }
];

export const MODEL_TYPE_OPTIONS: ModelProvidersDropdownOpts = [
    { label: MODEL_PROVIDER_LABELS[ModelProviders.BEDROCK], value: ModelProviders.BEDROCK},
    { label: MODEL_PROVIDER_LABELS[ModelProviders.CAII], value: ModelProviders.CAII },
];

const Configure = () => {
    const location = useLocation();
    const [wizardModeType, setWizardModeType] = useState(getWizardModeType(location));

    useEffect(() => {
        if (wizardModeType === WizardModeType.DATA_AUGMENTATION) {
            setWizardModeType(WizardModeType.DATA_AUGMENTATION);
            form.setFieldValue('workflow_type', 'custom');
        } else {
            setWizardModeType(WizardModeType.DATA_GENERATION);
            form.setFieldValue('workflow_type', 'freeform');
        }
    }, [location, wizardModeType]);

    const form = Form.useFormInstance();
    const formData = Form.useWatch((values) => values, form);
    const { setIsStepValid } = useWizardCtx();
    const { data } = useFetchModels();
    const [selectedFiles, setSelectedFiles] = useState(
        !isEmpty(form.getFieldValue('doc_paths')) ? form.getFieldValue('doc_paths') : []);

    const validateForm = async () => {
        const values = form.getFieldsValue();
        delete values.custom_prompt_instructions;
        delete values.doc_paths;
        delete values.output_key;
        delete values.output_value;
        
        const allFieldsFilled = Object.values(values).every(value => Boolean(value));
        if (allFieldsFilled && isFunction(setIsStepValid)) {
            setIsStepValid(true)
        } else if (isFunction(setIsStepValid)) {
            setIsStepValid(false)
        }
    }
    useEffect(() => {
        validateForm()
    }, [form, formData])

    // keivan
    useEffect(() => {
        if (formData && formData?.inference_type === undefined) {
            form.setFieldValue('inference_type', ModelProviders.CAII);
        }
    }, [formData]);

    const labelCol = {
      span: 8
    };

    const wrapperCol = {
      span: 16
    }

    const onAddFiles = (files: File[]) => {
        const paths = files.map((file: File) => (
            { 
                value: file?.path,
                label: file.name
            }));
        setSelectedFiles(paths);
        form.setFieldValue('doc_paths', paths);
    }

    const onFilesChange = (selections: unknown) => {
        if (Array.isArray(selections) && !isEmpty(selections)) {
            const paths = selections.map((file: File) => (
                { 
                    value: file.name,
                    label: file.name
                }));
            setSelectedFiles(paths);
            form.setFieldValue('doc_paths', paths); 
        } else {
            setSelectedFiles([]);
            form.setFieldValue('doc_paths', []); 
        }
          
    }

    const onWorkflowTypeChange = (value: string) => {
        const _workflow_type = form.getFieldValue('workflow_type');
        if (_workflow_type !== value) {
            form.setFieldValue('doc_paths', []);
            setSelectedFiles([]);    
        }
    }

    return (
        <StepContainer justify='center'>
            <FormContainer vertical>
                <Form.Item
                    name='display_name'
                    label='Dataset Display Name'
                    rules={[{ required: true }]}
                    tooltip='Human readable name of your dataset. This value is not unique.'
                    labelCol={labelCol}
                    wrapperCol={wrapperCol}
                    labelAlign="right"
                >
                    <Input placeholder='Type a display name'/>
                </Form.Item>
                <Form.Item
                    name='inference_type'
                    label='Model Provider'
                    rules={[{ required: true }]}
                    labelCol={labelCol}
                    shouldUpdate
                >
                    <Select
                       
                        onChange={() => form.setFieldValue('model_id', undefined)}
                        placeholder={'Select a model provider'}
                    >
                        {MODEL_TYPE_OPTIONS.map(({ label, value }, i) =>
                            <Select.Option key={`${value}-${i}`} value={value}>
                                {label}
                            </Select.Option>
                        )}
                    </Select>
                </Form.Item>
                <Form.Item
                    name='model_id'
                    label='Model ID'
                    dependencies={['inference_type']}
                    rules={[{ required: true }]}
                    shouldUpdate
                    tooltip={formData?.inference_type === ModelProviders.CAII ? `You can find you Cloudera AI Inference model ID in the Model Endpoint Details page` : undefined}
                    labelCol={labelCol}
                >
                    {formData?.inference_type === ModelProviders.CAII ? (
                        <Input placeholder={'Enter Cloudera AI Inference Model ID'}/>
                    ) : (
                        <Select placeholder={'Select a Model'} notFoundContent={'You must select a Model Provider before selecting a Model'}>
                            {!isEmpty(data?.models) && data?.models[ModelProviders.BEDROCK]?.map((model, i) =>
                                <Select.Option key={`${model}-${i}`} value={model}>
                                    {model}
                                </Select.Option>
                            )}
                        </Select>
                    )}

                </Form.Item>
                {formData?.inference_type === ModelProviders.CAII && (
                    <>
                        <Form.Item
                            name="caii_endpoint"
                            label={'Cloudera AI Inference Endpoint'}
                            extra={
                                <Typography.Link
                                    target='_blank'
                                    rel='noreferrer'
                                    href="https://docs.cloudera.com/machine-learning/cloud/ai-inference/topics/ml-caii-use-caii.html"
                                >
                                    {'Need help?'}
                                </Typography.Link>
                            }
                            rules={[
                                { required: true },
                                // {
                                //     type: 'url',
                                //     message: 'Endpoint must be a valid url'
                                // }
                            ]}
                            tooltip={'The inference enpoint of your model deployed in Cloudera AI Inference Service'}
                            labelCol={labelCol}
                        >
                            <Input />
                        </Form.Item>
                    </>

                )}
                
                <Form.Item
                    name='workflow_type'
                    label='Workflow'
                    tooltip='A specialized workflow for your dataset'
                    labelCol={labelCol}
                    hidden={true}
                    shouldUpdate
                    rules={[
                            { required: true }
                        ]}
                      >
                        <Select placeholder={'Select a workflow'} onChange={onWorkflowTypeChange}>
                        {WORKFLOW_OPTIONS.map(option => 
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        )}
                    </Select>
                </Form.Item>
                {(formData?.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING || 
                 formData?.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION) && 
                 <UseCaseSelector />}

                {(
                    formData?.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING || 
                    formData?.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION) && 
                <Form.Item
                    name='doc_paths'
                    label='Context'
                    labelCol={labelCol}
                    dependencies={['workflow_type']}
                    shouldUpdate
                    validateTrigger="['onBlur','onChange']"
                    validateFirst
                    rules={[
                        () => ({
                            validator(_, value) {
                              const _workflow_type = form.getFieldValue('workflow_type');
                              const values = form.getFieldValue('doc_paths');
                              if (Array.isArray(values) && !isEmpty(values)) {
                                try {
                                    if (_workflow_type === WorkflowType.CUSTOM_DATA_GENERATION && 
                                        !isEmpty(value)) {
                                            const isInValid = values.some(item => !endsWith(item.value, '.json'));
                                            if(isInValid) {
                                                throw new Error('Invalid file extension, for custom data generation workflow only JSON files are supported.')
                                            }

                                    } else if (_workflow_type === WorkflowType.SUPERVISED_FINE_TUNING &&
                                        !isEmpty(value)) {
                                            const isInValid = values.some(item => !endsWith(item.value, '.pdf'));
                                            if(isInValid) {
                                                throw new Error('Invalid file extension, for supervised fine tuning workflow only PDF files are supported.')
                                            }
                                    }

                                } catch(e) {
                                    return Promise.reject(e);
                                }
                            }
                            return Promise.resolve();
                            }
                        })
                    ]}
                >
                    <Flex>
                        <Select placeholder={'Select project files'} mode="multiple" value={selectedFiles || []} onChange={onFilesChange} allowClear/>    
                        <FileSelectorButton onAddFiles={onAddFiles} workflowType={form.getFieldValue('workflow_type')} />
                    </Flex>
                </Form.Item>}
                {formData?.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION && 
                <>
                    <Form.Item
                        name='input_key'
                        label='Input Key'
                        labelCol={labelCol}
                        validateTrigger={['workflow_type', 'onChange']}
                        shouldUpdate
                        rules={[
                            () => ({
                                validator(_, value) { 
                                  const values = form.getFieldValue('doc_paths');  
                                  if (isEmpty(value) && Array.isArray(values) && !isEmpty(values)) {
                                    try {
                                        throw new Error('This field is required.')
                                    } catch(e) {
                                        return Promise.reject(e);
                                    }
                                }
                                return Promise.resolve();
                            }
                            })
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='output_key'
                        label='Output Key'
                        labelCol={labelCol}
                        shouldUpdate
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='output_value'
                        label='Output Value'
                        labelCol={labelCol}
                        shouldUpdate
                    >
                        <Input />
                    </Form.Item>
                </>}
                {/* {formData?.workflow_type === WorkflowType.FREE_FORM_DATA_GENERATION || 
                 <Form.Item
                    name='example_path'
                    label='Example File'
                    labelCol={labelCol}
                    dependencies={['workflow_type']}
                    shouldUpdate
                    validateTrigger="['onBlur','onChange']"
                    validateFirst
                    rules={[]}
                 >
                    <Flex>
                        <Select placeholder={'Select example file'} value={selectedFiles || []} onChange={onFilesChange} allowClear/>
                        <Input placeholder='Select example file' disabled />
                        <FileSelectorButton onAddFiles={onAddExampleFiles} workflowType={form.getFieldValue('workflow_type')} />
                    </Flex>
                 </Form.Item>} */}
            </FormContainer>
        </StepContainer>
    )
}

export default Configure;