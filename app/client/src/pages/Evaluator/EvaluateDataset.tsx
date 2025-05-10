
import get from 'lodash/get';
import set from 'lodash/set';
import isEmpty from 'lodash/isEmpty';
import { Card, Col, Layout, Row, Breadcrumb, Form, FormInstance, Input, Space, Flex, Button, Select, Typography } from 'antd';
import Parameters from '../DataGenerator/Parameters';
import TooltipIcon from '../../components/TooltipIcon';
import { Pages } from '../../types';
import { LABELS } from '../../constants';
import Loading from './Loading';
import { MODEL_TYPE_OPTIONS } from '../DataGenerator/Configure';
import styled from 'styled-components';
import { Dataset, Evaluate, EvaluateExample, ViewType } from './types';
import { useEffect, useState } from 'react';
import { ModelProviders } from '../DataGenerator/types';
import { FORM_FIELD_META_DATA } from './util';
import EvaluateExampleTable from './EvaluateExampleTable';

const { Content, Footer } = Layout;

interface Props {
  form: FormInstance;
  onEvaluate: () => void;
  models: string[];
  loading: boolean;
  modelsMap: {[key: string]: string[]};
  dataset: Dataset | Evaluate;
  examples: EvaluateExample[];
  viewType: ViewType;
  evaluate?: Evaluate;
}

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
const StyledBreadcrumb = styled(Breadcrumb)`
  margin-bottom: 12px;
  .ant-breadcrumb-link {
    font-weight: 600;
    font-size: 30px;
  }
`

const StyledCard = styled(Card)`
  padding-left: 0;
`;


const EvaluateDataset: React.FC<Props> = ({ form, loading, modelsMap, dataset, examples, viewType, onEvaluate, evaluate }) => {
  console.log('EvaluateDataset', dataset, examples);
  const inference_type = get(dataset, 'inference_type', '');
  const [models, setModels] = useState<string[]>(get(modelsMap, inference_type, []));
  const selectedInferenceType = Form.useWatch('inference_type', form);
  
  useEffect(() => {
    if (!isEmpty(selectedInferenceType)) {
      const _models = get(modelsMap, selectedInferenceType, []);
      setModels(_models);
      let values = form.getFieldsValue();
      const _model_id = get(values, 'model_id', '');
      if (_model_id && !_models.includes(_model_id)) {
        values = set(values, 'model_id', undefined);
        form.setFieldsValue(values);
      }
     
    } else {
        setModels([])
    }

  }, [selectedInferenceType]);

  const initialValues = {};
  if(evaluate && evaluate?.model_parameters) {
    initialValues.model_parameters = evaluate?.model_parameters;
  }

  const promptLabel = (
    <Space>
      <>{'Prompt'}</>
      <TooltipIcon message={'Enter a prompt to describe your dataset'}/>
    </Space>
  );

  return (
    <Layout>
      <Content>
        <StyledBreadcrumb>
          <Breadcrumb.Item>{viewType === ViewType.EVALUATE_F0RM ? LABELS[Pages.EVALUATOR] : 'Re-evaluator'}</Breadcrumb.Item>
        </StyledBreadcrumb>
       
        <Form
            layout="vertical"
            colon={false}
            name='evaluater'
            initialValues={initialValues}
            form={form}
            disabled={loading}
        >
        <StyledCard>
          {loading && <Loading />}
          <Row gutter={[50,0]}>
            <LeftCol sm={16}>
              <Flex vertical>
                <Form.Item
                  name='display_name'
                  label="Display Name"
                  labelCol={{ span: 24 }}
                  wrapperCol={{ span: 24 }}
                  rules={[{ required: true }]}
                  shouldUpdate
                >
                  <Input placeholder={'This field is required.'} />
                </Form.Item>
                <Form.Item
                  name='custom_prompt'
                  label={promptLabel}
                  labelCol={{ span: 24 }}
                  wrapperCol={{ span: 24 }}
                  shouldUpdate
                >
                  <StyledTextArea autoSize placeholder={'Enter a prompt'} value={initialValues.custom_prompt}>{initialValues.custom_prompt}</StyledTextArea>
                </Form.Item>
                <Button style={{ maxWidth: 'fit-content' }}> {'Restore Default Prompt'}</Button>
                <Space direction="vertical" size={5} />
                <br/>
                <Form.Item
                    name='inference_type'
                    label='Model Provider'
                    rules={[{ required: true }]}
                >
                    <Select>
                        {MODEL_TYPE_OPTIONS.map(({ label, value }, i) =>
                            <Select.Option key={`${value}-${i}`} value={value}>
                                {label}
                            </Select.Option>
                        )}
                    </Select>
                </Form.Item>
                <Form.Item
                    name='model_id'
                    label='Model'
                    dependencies={['inference_type']}
                    rules={[{ required: true }]}
                    shouldUpdate
                >

                    {selectedInferenceType !== ModelProviders.CAII ? 
                      <Select notFoundContent={'You must select a Model Provider before selecting a Model'}>
                        {models.map((model, i) => 
                            <Select.Option key={`${model}-${i}`} value={model}>
                                {model}
                            </Select.Option>
                        )}
                      </Select> 
                      :
                      <Input placeholder={'Enter Cloudera AI Inference Model ID'}/>
                    }
                    
                </Form.Item>
                {selectedInferenceType === ModelProviders.CAII &&
                      <Form.Item
                        name="caii_endpoint"
                        label={FORM_FIELD_META_DATA.caii_endpoint.label}
                        extra={
                            <Typography.Link
                                target='_blank'
                                rel='noreferrer'
                                href={FORM_FIELD_META_DATA.caii_endpoint.doc_link}
                            >
                                {'Need help?'}
                            </Typography.Link>
                        }
                        rules={[
                            { required: true },
                            {
                                type: 'url',
                                message: 'Endpoint must be a valid url'
                            }
                        ]}
                        style={{ marginTop: '24px' }}
                        tooltip={FORM_FIELD_META_DATA.caii_endpoint.tooltip}
                    >
                        <Input />
                    </Form.Item>
                    }
              </Flex>
            </LeftCol>
            <RightCol sm={7}>
                <Parameters />
            </RightCol>  
          </Row>
        </StyledCard>
        <Row>
          <Col sm={24}>
            <EvaluateExampleTable examples={examples} dataset={dataset} form={form} />
          </Col>    
        </Row>
        </Form>
      </Content>
      <Footer style={{ position: 'sticky', bottom: '0' }}>
        <Row>
          <Col sm={24}>
            <Flex style={{ justifyContent: 'center' }}>
              <Button type="primary" size="large" onClick={onEvaluate} disabled={loading}>
                {viewType === ViewType.EVALUATE_F0RM ? 'Evaluate' : 'Re-evaluate'}
              </Button>
            </Flex>
          </Col>
        </Row>
      </Footer>
      </Layout>
  );    
}

export default EvaluateDataset;