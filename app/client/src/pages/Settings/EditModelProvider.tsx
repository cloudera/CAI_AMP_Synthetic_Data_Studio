import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, notification, Radio, Select } from 'antd';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { useMutation } from "@tanstack/react-query";
import { addModelProvider, useGetModelProvider } from './hooks';
import Loading from '../Evaluator/Loading';
import { CustomModel } from './SettingsPage';
import isEmpty from 'lodash/isEmpty';
import { GEMINI_MODELS_OPTIONS, ModelProviderType, modelProviderTypeOptions, OPENAI_MODELS_OPTIONS } from './AddModelProviderButton';


interface Props {
    refetch: () => void;
    onClose: () => void;
    model: CustomModel;
}

const EditModelProvider: React.FC<Props> = ({ model, refetch, onClose }) => {
    const [form] = Form.useForm();
    const [modelProviderType, setModelProviderType] = useState<ModelProviderType>(ModelProviderType.OPENAI);
    const modelProviderReq = useGetModelProvider(model);
    const [models, setModels] = useState(OPENAI_MODELS_OPTIONS);
    const mutation = useMutation({
        mutationFn: addModelProvider
    });

    useEffect(() => {
        if (!isEmpty(modelProviderReq.data)) {
            const endpoint = get(modelProviderReq, 'data.endpoint');
            if (!isEmpty(endpoint)) {
                form.setFieldsValue({
                    ...endpoint
                });
                setModelProviderType(endpoint?.provider_type as ModelProviderType);
            }
        }
    }, [modelProviderReq.data]);


    useEffect(() => {
        if (mutation.isError) {
            notification.error({
              message: 'Error',
              description: `An error occurred while fetching the model.\n ${mutation.error}`
            });
        }
        if (mutation.isSuccess) {
            notification.success({
                message: 'Success',
                description: `THe model provider has been edited successfully!.`
              });
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
            <Modal
                visible
                okText={`Edit`}
                title={`Edit Model Provider`}
                onCancel={onCancel}
                onOk={onSubmit}
                width={800}
            >
                <Form form={form} layout="vertical" initialValues={initialValues}>
                    <br />
                    <br />
                    {(mutation.isPending || modelProviderReq.isLoading) && <Loading />}
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
                            style={{ width: '100%',  whiteSpace: 'nowrap' }}
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
                            <Select options={models} />
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
            </Modal>    
        </>
    );
}

export default EditModelProvider;

