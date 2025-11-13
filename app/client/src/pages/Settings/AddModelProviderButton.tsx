import { useEffect, useState } from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Alert, AutoComplete, Button, Form, Input, Modal, notification, Radio, Select, Tooltip } from 'antd';
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { useMutation } from "@tanstack/react-query";
import { addModelProvider } from './hooks';
import Loading from '../Evaluator/Loading';

export enum ModelProviderType {
    OPENAI = 'openai',
    OPENAI_COMPATIBLE = 'openai_compatible',
    GEMINI = 'gemini',
    CAII = 'caii',
    AWS_BEDROCK = 'aws_bedrock'
}


export const modelProviderTypeOptions: CheckboxGroupProps<string>['options'] = [
  { label: <Tooltip title="Cloudera AI Inferencing">{'Cloudera'}</Tooltip>, value: 'caii' },  
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI Compatible', value: 'openai_compatible' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'AWS Bedrock', value: 'aws_bedrock' }
];

const OPENAI_MODELS = [
    "gpt-4.1",               // Latest GPT-4.1 series (April 2025)
    "gpt-4.1-mini", 
    "gpt-4.1-nano"
];

export const OPENAI_MODELS_OPTIONS = OPENAI_MODELS.map((model: string) => ({
    label: model,
    value: model
}));

const GEMINI_MODELS = [
    "gemini-2.5-pro",           // June 2025 - most powerful thinking model
    "gemini-2.5-flash",         // June 2025 - best price-performance  
    "gemini-2.5-flash-lite"    // June 2025 - cost-efficient
];

export const AWS_BEDROCK_MODELS = [
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "us.anthropic.claude-opus-4-1-20250805-v1:0",
    "us.anthropic.claude-opus-4-20250514-v1:0",
    "global.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "us.anthropic.claude-3-opus-20240229-v1:0",
    "meta.llama3-8b-instruct-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "mistral.mistral-large-2402-v1:0",
    "mistral.mistral-small-2402-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "us.meta.llama3-2-3b-instruct-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-2-1b-instruct-v1:0",
    "us.meta.llama3-1-8b-instruct-v1:0",
    "us.meta.llama3-1-70b-instruct-v1:0",
    "us.meta.llama3-3-70b-instruct-v1:0",
    "us.mistral.pixtral-large-2502-v1:0",
    "us.meta.llama4-scout-17b-instruct-v1:0",
    "us.meta.llama4-maverick-17b-instruct-v1:0",
    "mistral.mistral-7b-instruct-v0:2",
    "mistral.mixtral-8x7b-instruct-v0:1"
];

export const AWS_BEDROCK_MODELS_OPTIONS = AWS_BEDROCK_MODELS.map((model: string) => ({
    label: model,
    value: model
}));

export const GEMINI_MODELS_OPTIONS = GEMINI_MODELS.map((model: string) => ({
    label: model,
    value: model
}));

interface Props {
    refetch: () => void;
}

const AddModelProviderButton: React.FC<Props> = ({ refetch }) => {
    const [form] = Form.useForm();
    const [showModal, setShowModal] = useState(false);
    const [modelProviderType, setModelProviderType] = useState<ModelProviderType>(ModelProviderType.OPENAI);
    const [models, setModels] = useState(OPENAI_MODELS_OPTIONS);
    const mutation = useMutation({
        mutationFn: addModelProvider
    });


    useEffect(() => {
        if (mutation.isError) {
            notification.error({
              message: 'Error',
              description: `An error occurred while fetching the prompt.\n ${mutation.error}`
            });
        }
        if (mutation.isSuccess) {
            notification.success({
                message: 'Success',
                description: `THe model provider has been created successfully!.`
              });
          form.resetFields();    
          setShowModal(false);
          refetch();
        }
    }, [mutation.error, mutation.isSuccess]);

    const onCancel = () => {
        form.resetFields();
        setShowModal(false);
    }

    const onSubmit = async () => {
        try {
            await form.validateFields();
            const values = form.getFieldsValue();
            
            mutation.mutate({
                endpoint_config: {
                  display_name: values.display_name,
                  endpoint_id: values.endpoint_id,
                  model_id: values.model_id,
                  provider_type: values.provider_type, 
                  api_key: values.api_key,
                  endpoint_url: values.endpoint_url
                }
            });
        } catch (error) {
            console.error(error);
        }
    };
    

    const initialValues = {
        provider_type: 'openai'
    };

    const onChange = (e: any) => {
        const value = get(e, 'target.value');
        setModelProviderType(value as ModelProviderType);
        if (value === 'openai' && !isEqual(OPENAI_MODELS_OPTIONS, models)) {
            setModels(OPENAI_MODELS_OPTIONS);
        } else if (value === 'gemini' && !isEqual(GEMINI_MODELS_OPTIONS, models)) {
            setModels(GEMINI_MODELS_OPTIONS);
        } else if (value === 'aws_bedrock' && !isEqual(GEMINI_MODELS_OPTIONS, models)) {
            setModels(AWS_BEDROCK_MODELS_OPTIONS);
        } else if (value === 'caii' && !isEqual(GEMINI_MODELS_OPTIONS, models)) {
            setModels([]);
        }
    }

    return (
        <>
            <Button onClick={() => setShowModal(true)} icon={<PlusCircleOutlined />}>
                {'Add'}
            </Button>
            {showModal && <Modal
                visible
                okText={`Add`}
                title={`Add Model Provider`}
                onCancel={onCancel}
                onOk={onSubmit}
                width={800}
            >
                <Form form={form} layout="vertical" initialValues={initialValues}>
                    <br />
                    <br />
                    {mutation.isPending && <Loading />}
                    {mutation.error && (
                        <Alert
                            type="error"
                            message="Error Occurred"
                            description={
                                <div>{mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}</div>
                            }
                        />
                    )}
                    <Form.Item name="provider_type">
                        <Radio.Group
                            block
                            options={modelProviderTypeOptions}
                            defaultValue="openai"
                            optionType="button"
                            buttonStyle="solid"
                            style={{ width: '100%', whiteSpace: 'nowrap' }}
                            onChange={onChange}
                        />
                    </Form.Item>
                    <Form.Item 
                        name="model_id" 
                        label="Model"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                            <AutoComplete
                                autoFocus
                                showSearch
                                allowClear
                                options={[
                                    { label: <strong>{'Enter Model Name '}</strong>, value: '' }
                                ].concat(
                                    models
                                )}
                                placeholder={'Select Model'}
                            />
                    </Form.Item>
                   
                    {modelProviderType !== ModelProviderType.OPENAI && modelProviderType !== ModelProviderType.GEMINI && <Form.Item 
                        name="endpoint_url" 
                        label="Endpoint URL" 
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                            <Input />
                    </Form.Item>}
                    {modelProviderType !== ModelProviderType.AWS_BEDROCK && modelProviderType !== ModelProviderType.CAII && <Form.Item 
                        name="api_key" 
                        label="API Key"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>}
                    {modelProviderType === ModelProviderType.CAII && <Form.Item 
                        name="cdp_token" 
                        label="CDP Token"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>}
                    {modelProviderType === ModelProviderType.AWS_BEDROCK && 
                    <>
                      <Form.Item 
                        name="aws_access_key_id:" 
                        label="Access Key"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>
                    <Form.Item 
                        name="aws_secret_access_key:" 
                        label="Secret Key"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>
                    <Form.Item 
                        name="region:" 
                        label="Region"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input />
                    </Form.Item>
                    </>
                   }
                </Form>
            </Modal>}    
        </>
    );
}

export default AddModelProviderButton;

