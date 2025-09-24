import { useEffect, useState } from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input, Modal, notification, Radio, Select } from 'antd';
import type { CheckboxGroupProps } from 'antd/es/checkbox';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { useMutation } from "@tanstack/react-query";
import { addModelProvider } from './hooks';
import Loading from '../Evaluator/Loading';

export enum ModelProviderType {
    OPENAI = 'openai',
    GEMINI = 'gemini',
    CAII = 'caii'
}


const modelProviderTypeOptions: CheckboxGroupProps<string>['options'] = [
  { label: 'OpenAI', value: 'openai' },
  // { label: 'CAII', value: 'caii' },
  { label: 'Gemini', value: 'gemini' },
];

const OPENAI_MODELS = [
    "gpt-4.1",               // Latest GPT-4.1 series (April 2025)
    "gpt-4.1-mini", 
    "gpt-4.1-nano",
    "o3",                    // Latest reasoning models (April 2025) 
    "o4-mini",
    "o3-mini",               // January 2025
    "o1",                    // December 2024
    "gpt-4o",                // November 2024
    "gpt-4o-mini",           // July 2024
    "gpt-4-turbo",           // April 2024
    "gpt-3.5-turbo"          // Legacy but still widely used
];

const OPENAI_MODELS_OPTIONS = OPENAI_MODELS.map((model: string) => ({
    label: model,
    value: model
}));

const GEMINI_MODELS = [
    "gemini-2.5-pro",           // June 2025 - most powerful thinking model
    "gemini-2.5-flash",         // June 2025 - best price-performance  
    "gemini-2.5-flash-lite",    // June 2025 - cost-efficient
    "gemini-2.0-flash",         // February 2025 - next-gen features
    "gemini-2.0-flash-lite",    // February 2025 - low latency
    "gemini-1.5-pro",           // September 2024 - complex reasoning
    "gemini-1.5-flash",         // September 2024 - fast & versatile
    "gemini-1.5-flash-8b"       // October 2024 - lightweight
];

const GEMINI_MODELS_OPTIONS = GEMINI_MODELS.map((model: string) => ({
    label: model,
    value: model
}));

interface Props {
    refetch: () => void;
}

const AddModelProviderButton: React.FC<Props> = ({ refetch }) => {
    const [form] = Form.useForm();
    const [showModal, setShowModal] = useState(false);
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
        if (value === 'openai' && !isEqual(OPENAI_MODELS_OPTIONS, models)) {
            setModels(OPENAI_MODELS_OPTIONS);
        } else if (value === 'gemini' && !isEqual(GEMINI_MODELS_OPTIONS, models)) {
            setModels(GEMINI_MODELS_OPTIONS);
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
                            style={{ width: '40%' }}
                            onChange={onChange}
                        />
                    </Form.Item>
                    <Form.Item 
                        name="display_name" 
                        label="Display Name" 
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                            <Input />
                    </Form.Item>
                    <Form.Item 
                        name="endpoint_id" 
                        label="Endpoint ID" 
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                            <Input />
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
                            <Select options={models} />
                    </Form.Item>
                    <Form.Item 
                        name="endpoint_url" 
                        label="Endpoint URL" 
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                            <Input />
                    </Form.Item>
                    <Form.Item 
                        name="api_key" 
                        label="API Key"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>}    
        </>
    );
}

export default AddModelProviderButton;

