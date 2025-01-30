import { useEffect, useState } from 'react';
import { Flex, Form, Input, Select, Typography } from 'antd';
import styled from 'styled-components';
import { File, WorkflowType } from './types';
import { useFetchModels } from '../../api/api';
import { MODEL_PROVIDER_LABELS } from './constants';
import { ModelProviders, ModelProvidersDropdownOpts } from './types';
import { useWizardCtx } from './utils';
import FileSelectorButton from './FileSelectorButton';

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
    { label: 'Code Generation', value: 'code_generation' },
    { label: 'Text to SQL', value: 'text2sql' },
    { label: 'Custom', value: 'custom' }
];

export const WORKFLOW_OPTIONS = [
    { label: 'Supervised Fine-Tuning', value: 'supervised-fine-tuning' },
    { label: 'Custom Data Generation', value: 'custom' }
];

export const MODEL_TYPE_OPTIONS: ModelProvidersDropdownOpts = [
    { label: MODEL_PROVIDER_LABELS[ModelProviders.BEDROCK], value: ModelProviders.BEDROCK},
    { label: MODEL_PROVIDER_LABELS[ModelProviders.CAII], value: ModelProviders.CAII },
];

const Configure = () => {
    const form = Form.useFormInstance();
    const formData = Form.useWatch((values) => values, form);
    const { setIsStepValid } = useWizardCtx();
    const { data } = useFetchModels();
    const [selectedFiles, setSelectedFiles] = useState([]);

    const validateForm = () => {
        const values = form.getFieldsValue();
        delete values.custom_prompt_instructions;
        delete values.workflow_type;
        console.log('values', values);
        
        const allFieldsFilled = Object.values(values).every(value => Boolean(value));
        console.log('allFieldsFilled', allFieldsFilled);
        if (allFieldsFilled) {
            setIsStepValid && setIsStepValid(true)
        } else {
            setIsStepValid && setIsStepValid(false)
        }
    }
    useEffect(() => {
        validateForm()
    }, [form, formData])

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
        console.log('values', form.getFieldsValue());
    }

    const onFilesChange = (selections: any) => {
        const paths = selections.map((file: File) => (
            { 
                value: file.name,
                label: file.name
            }));
        setSelectedFiles(paths);
        form.setFieldValue('doc_paths', paths);    
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
                            {data?.models[ModelProviders.BEDROCK]?.map((model, i) =>
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
                    rules={[{ required: true }]}
                    shouldUpdate
                >
                    <Select placeholder={'Select a workflow'}>
                        {WORKFLOW_OPTIONS.map(option => 
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        )}
                    </Select>
                </Form.Item>
                {formData?.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING && 
                <Form.Item
                    name='use_case'
                    label='Template'
                    rules={[{ required: true }]}
                    tooltip='A specialize template for generating your dataset'
                    labelCol={labelCol}
                    shouldUpdate
                >
                    <Select placeholder={'Select a template'}>
                        {USECASE_OPTIONS.map(option => 
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        )}
                    </Select>
                </Form.Item>}

                {(
                    formData?.workflow_type === WorkflowType.SUPERVISED_FINE_TUNING || 
                    formData?.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION) && 
                <Form.Item
                    name='doc_paths'
                    label='Files'
                    labelCol={labelCol}
                    shouldUpdate
                >
                    <Flex>
                        <Select placeholder={'Select project files'} mode="multiple" value={selectedFiles} onChange={onFilesChange} allowClear/>    
                        <FileSelectorButton onAddFiles={onAddFiles} workflowType={form.getFieldValue('workflow_type')} />
                    </Flex>
                </Form.Item>}
                {formData?.workflow_type === WorkflowType.CUSTOM_DATA_GENERATION && 
                <>
                    <Form.Item
                        name='input_key'
                        label='Input Key'
                        labelCol={labelCol}
                        rules={[{ required: true }]}
                        shouldUpdate
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='output_key'
                        label='Output Key'
                        labelCol={labelCol}
                        rules={[{ required: true }]}
                        shouldUpdate
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name='output_value'
                        label='Output Value'
                        labelCol={labelCol}
                        rules={[{ required: true }]}
                        shouldUpdate
                    >
                        <Input />
                    </Form.Item>
                </>}
            </FormContainer>
        </StepContainer>
    )
}

export default Configure;