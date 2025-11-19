import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, notification, Radio, Select } from 'antd';
import { useMutation } from "@tanstack/react-query";
import { setCredentials } from './hooks';
import Loading from '../Evaluator/Loading';
import { ModelProviderCredentials, ModelProviderType } from './types';
import get from 'lodash/get';


interface Props {
    refetch: () => void;
    onClose: () => void;
    model: ModelProviderCredentials;
}

export const modelProviderTypeOptions: CheckboxGroupProps<string>['options'] = [
    { label: 'OpenAI', value: 'openai' },
    { label: 'OpenAI Compatible', value: 'openai_compatible' },
    { label: 'Gemini', value: 'gemini' },
    { label: 'AWS Bedrock', value: 'aws_bedrock' },
    { label: 'CAII', value: 'caii' },
  ];

const SetModelProviderCredentials: React.FC<Props> = ({ model, refetch, onClose }) => {
    const { providerType } = model;
    const [modelProviderType, setModelProviderType] = useState<ModelProviderType>(providerType);
    const [form] = Form.useForm();
    
    const mutation = useMutation({
        mutationFn: setCredentials
    });

    useEffect(() => {
        if (mutation.isError) {
            notification.error({
              message: 'Error',
              description: `An error occurred while setting credentials.\n ${mutation.error}`
            });
        }
        if (mutation.isSuccess) {
            notification.success({
                message: 'Success',
                description: `The credentials has been edited successfully!.`
            });
            onClose();  
            refetch();
        }
    }, [mutation.error, mutation.isSuccess]);

    const onCancel = () => {
        form.resetFields();
        onClose();
    }
    
    const onSubmit = async () => {
        try {
            await form.validateFields();
            const values = form.getFieldsValue();
            delete values.provider_type;
            
            mutation.mutate({
                credentials: {
                  ...values
                }
            });
        } catch (error) {
            console.error(error);
        }
    };

    const initialValues = {
        provider_type: providerType
    };

    const onChange = (e: any) => {
        const value = get(e, 'target.value');
        console.log('onChange', value);
        setModelProviderType(value as ModelProviderType);
        form.setFieldsValue({
            ...form.getFieldsValue(),
            provider_type: value
        });
    }

    return (
        <>
            <Modal
                visible
                okText={`Save`}
                title={`Configure Model Provider`}
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
                            onChange={onChange}
                            style={{ width: '100%',  whiteSpace: 'nowrap' }}
                        />
                    </Form.Item>
                    {/* {providerType !== ModelProviderType.OPENAI && providerType !== ModelProviderType.GEMINI && <Form.Item 
                        name="endpoint_url" 
                        label="Endpoint URL" 
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                            <Input />
                    </Form.Item>} */}
                    {modelProviderType === ModelProviderType.OPENAI && <Form.Item 
                        name="OPENAI_API_KEY" 
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
                        name="CDP_TOKEN" 
                        label="CDP Token"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>}
                    {modelProviderType === ModelProviderType.GEMINI && <Form.Item 
                        name="GEMINI_API_KEY" 
                        label="API Key"
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
                        name="AWS_ACCESS_KEY_ID" 
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
                        name="AWS_SECRET_ACCESS_KEY" 
                        label="Secret Key"
                        rules={[
                            {
                                required: true,
                                message: 'This field is required.'
                            }
                        ]}>
                       <Input.Password />
                    </Form.Item>
                    </>
                   }
                </Form>
            </Modal>    
        </>
    );
}

export default SetModelProviderCredentials;

