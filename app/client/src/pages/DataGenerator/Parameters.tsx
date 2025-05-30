import isEmpty from 'lodash/isEmpty';
import { useEffect, useRef, useState } from 'react';
import { Col, Divider, Form, InputNumber, Row, Slider, Typography } from 'antd';
import { merge } from 'lodash';
import styled from 'styled-components';

import { useFetchDefaultModelParams } from '../../api/api';
import { LABELS } from '../../constants';
import { ModelParameters } from '../../types';

const StyledSlider = styled(Slider)`
    .ant-slider-rail, .ant-slider-track {
        height: 5px;
    }
    width: 80% !important;
`
const StyledInputNumber = styled(InputNumber)`
    float: right;
    width: 72px;
`
const StyledFormItem = styled(Form.Item)`
    margin-bottom: 30px;
`
const ParamLabel = styled(Typography)`
    font-size: 14px;
`

const Parameters = () => {
    const form = Form.useFormInstance()

    const MODEL_PARAM_DEFAULTS = useRef({
        temperature: {
            min: 0,
            max: 2,
            default: 0,
            step: 0.1
        },
        top_p: {
            min: 0,
            max: 1,
            default: 1,
            step: 0.1
        },
        top_k: {
            min: 0,
            max: 300,
            default: 250,
            step: 1
        },
        max_tokens: {
            min: 1,
            max: 4096,
            default: 4096,
            step: 10
        }
    });

    const formData = form.getFieldsValue(true);
    const [values, setValues] = useState(formData?.model_parameters);

    const { data: defaultParams } = useFetchDefaultModelParams();

    useEffect(() => {
        if (!isEmpty(formData?.model_parameters)) {
            setValues(formData?.model_parameters);
        }     
    }, [formData?.model_parameters]);

    useEffect(() => {
        if (defaultParams && !formData.model_parameters) {
            // Set ref to be use to define min/max for each formItem
            MODEL_PARAM_DEFAULTS.current = merge(MODEL_PARAM_DEFAULTS.current, defaultParams.parameters);
            // Create the data structure to set the default value for each form item.
            const defaultValues = Object.keys(defaultParams.parameters).reduce((acc, curr) => {
                return {...acc, [curr as ModelParameters]: defaultParams.parameters[curr as ModelParameters].default}
            }, {})
            setValues(defaultValues)
            form.setFieldValue('model_parameters', defaultValues)
        }

    }, [defaultParams]);

    // Update both InputNumber and Slider together
    const handleValueChange = (field: string, value: string | number | null) => {
        setValues({
            ...values,
            [field]: value,
        });
        form.setFieldsValue({ model_parameters: { [field]: value }});
    };

    // if (loadingDefaultParams) {
    //     return <Spin/>
    // }
    
    return (
        <>
            <Divider />
            <StyledFormItem
                style={{ marginTop: '16px' }}
                name={['model_parameters', ModelParameters.TEMPERATURE]}
                label={<ParamLabel>{LABELS[ModelParameters.TEMPERATURE]}</ParamLabel>}
                labelCol={{ span: 24 }}
                tooltip={`Controls the randomness of responses. Lower values make outputs more
                     focused and deterministic, while higher values make them more creative and varied.`}
            >
                <Row>
                    <Col span={20}>
                        <StyledSlider
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.TEMPERATURE].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.TEMPERATURE].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.TEMPERATURE].step}
                            value={values?.temperature}
                            onChange={(value) => handleValueChange(ModelParameters.TEMPERATURE, value)}
                        /> 
                    </Col>
                    <Col span={4}>
                        <StyledInputNumber
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.TEMPERATURE].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.TEMPERATURE].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.TEMPERATURE].step}
                            value={values?.temperature}
                            onChange={(value) => handleValueChange(ModelParameters.TEMPERATURE, value)}
                            style={{ width: 72, float: 'right', marginLeft: '12px' }}
                        />
                    </Col>
                </Row>
            </StyledFormItem>
            <StyledFormItem
                name={['model_parameters', ModelParameters.TOP_K]}
                label={<ParamLabel>{LABELS[ModelParameters.TOP_K]}</ParamLabel>}
                labelCol={{ span: 24 }}
                tooltip={`Limits the response to the top k most likely tokens at each step. 
                    Lower values make outputs more focused, while higher values allow for greater diversity.`}
            >
                <Row>
                    <Col span={20}>
                        <StyledSlider
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_K].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_K].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_K].step}
                            value={values?.top_k}
                            onChange={(value) => handleValueChange(ModelParameters.TOP_K, value)}
                        />       
                    </Col>
                    <Col span={4}>
                        <StyledInputNumber
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_K].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_K].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_K].step}
                            value={values?.top_k}
                            onChange={(value) => handleValueChange(ModelParameters.TOP_K, value)}
                            style={{ width: 72, float: 'right', marginLeft: '12px' }}
                        />
                    </Col>
                </Row>
            </StyledFormItem>
            <StyledFormItem
                name={['model_parameters', ModelParameters.TOP_P]}
                label={<ParamLabel>{LABELS[ModelParameters.TOP_P]}</ParamLabel>}
                labelCol={{ span: 24 }}
                tooltip={`Controls the diversity of responses by sampling tokens from the smallest 
                    possible set whose cumulative probability exceeds the specified threshold. Lower
                     values make outputs more focused, while higher values increase randomness.`}
            >
                <Row>
                    <Col span={20}>
                        <StyledSlider
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_P].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_P].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_P].step}
                            value={values?.top_p}
                            onChange={(value) => handleValueChange(ModelParameters.TOP_P, value)}
                        />      
                    </Col>
                    <Col span={4}>
                        <StyledInputNumber
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_P].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_P].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.TOP_P].step}
                            value={values?.top_p}
                            onChange={(value) => handleValueChange(ModelParameters.TOP_P, value)}
                            style={{ width: 72, float: 'right', marginLeft: '12px' }}
                        />
                    </Col>
                </Row>
            </StyledFormItem>
            {/* <StyledFormItem
                name={['model_parameters', ModelParameters.MAX_TOKENS]}
                label={<ParamLabel>{LABELS[ModelParameters.MAX_TOKENS]}</ParamLabel>}
                labelCol={{ span: 24 }}
                tooltip={`Sets the maximum number of tokens (words or word parts) the model can
                     generate in a response. Higher values allow longer outputs but may increase
                      cost or runtime.`}
            >
                <Row>
                    <Col span={20}>
                        <StyledSlider
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.MAX_TOKENS].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.MAX_TOKENS].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.MAX_TOKENS].step}
                            value={values?.max_tokens}
                            onChange={(value) => handleValueChange(ModelParameters.MAX_TOKENS, value)}
                        />      
                    </Col>
                    <Col span={1}/>
                    <Col span={3}>
                        <StyledInputNumber
                            min={MODEL_PARAM_DEFAULTS.current[ModelParameters.MAX_TOKENS].min}
                            max={MODEL_PARAM_DEFAULTS.current[ModelParameters.MAX_TOKENS].max}
                            step={MODEL_PARAM_DEFAULTS.current[ModelParameters.MAX_TOKENS].step}
                            value={values?.max_tokens}
                            onChange={(value) => handleValueChange(ModelParameters.MAX_TOKENS, value)}
                            style={{ width: 72, float: 'right', marginLeft: '12px' }}
                        />
                    </Col>
                </Row>
            </StyledFormItem> */}
        </>
        
    )
}

export default Parameters;