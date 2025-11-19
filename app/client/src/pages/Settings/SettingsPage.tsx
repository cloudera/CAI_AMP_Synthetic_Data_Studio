import { Button, Col, Flex, Layout, Modal, notification, Row, Table, Tooltip, Tooltip } from "antd";
import { Content } from "antd/es/layout/layout";
import styled from "styled-components";
import { deleteModelProvider, useModelProviders } from "./hooks";
import get from "lodash/get";
import { sortItemsByKey } from "../../utils/sortutils";
import Paragraph from "antd/es/typography/Paragraph";
import StyledTitle from "../Evaluator/StyledTitle";
import Toolbar from "./Toolbar";
// ModelProviderType
import DateTime from "../../components/DateTime/DateTime";
import {
    EditOutlined,
    DeleteOutlined,
    CheckOutlined,
    CloseOutlined
  } from '@ant-design/icons';
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import isEmpty from "lodash/isEmpty";
import SetModelProviderCredentials from "./SeModelProviderCredentials";
import { ModelProviderCredentials, ModelProviderType } from "./types";
import { find, isEqual } from "lodash";



const StyledContent = styled(Content)`
    padding: 24px;
    background-color: #f5f7f8;
`;


export interface CustomModel {
  endpoint_id: string;
  display_name: string;  
  model_id: string;  
  provider_type: string;  
  api_key?: string;
  cdp_token?: string;
  created_at: string
}

const Container = styled.div`
  background-color: #ffffff;
  padding: 1rem;
  overflow-x: auto;
`;

const StyledTable = styled(Table)`
  font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
  color:  #5a656d;
  .ant-table-thead > tr > th {
    color: #5a656d;
    border-bottom: 1px solid #eaebec;
    font-weight: 500;
    text-align: left;
    // background: #ffffff;
    border-bottom: 1px solid #eaebec;
    transition: background 0.3s ease; 
  }
  .ant-table-row > td.ant-table-cell {
    padding: 8px;
    padding-left: 16px;
    font-size: 13px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    color:  #5a656d;
    .ant-typography {
      font-size: 13px;
      font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    }
  }
`;

const StyledParagraph = styled(Paragraph)`
    font-size: 13px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    color:  #5a656d;
`;

const StyledButton = styled(Button)`
    margin-left: 8px;
`;

enum ModelProvideTypeKey {
  OPENAI_API_KEY = 'OPENAI_API_KEY',
  GEMINI_API_KEY = 'GEMINI_API_KEY',
  CDP_TOKEN = 'CDP_TOKEN',
  OPENAI_ENDPOINT_COMPATIBLE_KEY = 'OpenAI_Endpoint_Compatible_Key',
  AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
}

interface ProviderCredential {
  key: string;
  is_set: boolean;
}

const getModelProviderKey = (type: ModelProvideTypeKey, credentials: ProviderCredential[]) => {
  const providerType = find(credentials, { key: type});
  return providerType?.is_set === true;
}

const SettingsPage: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [modelProviderCredentials, setModelProviderCredentials] = useState<ModelProviderCredentials[]>([]);
    const [model, setModel] = useState<ModelProviderCredentials | null>(null);
    const filteredModelsReq = useModelProviders();
    const credentials = get(filteredModelsReq, 'data.credentials', []);


    useEffect(() => {
      if (!isEmpty(credentials)) {
        const _modelProviderCredentials: ModelProviderCredentials[] = [];
        _modelProviderCredentials.push({
          providerType: ModelProviderType.OPENAI,
          isSet: getModelProviderKey(ModelProvideTypeKey.OPENAI_API_KEY, credentials)
        });
        _modelProviderCredentials.push({
          providerType: ModelProviderType.GEMINI,
          isSet: getModelProviderKey(ModelProvideTypeKey.GEMINI_API_KEY, credentials)
        });
        _modelProviderCredentials.push({
          providerType: ModelProviderType.OPENAI_COMPATIBLE,
          isSet: getModelProviderKey(ModelProvideTypeKey.OPENAI_ENDPOINT_COMPATIBLE_KEY, credentials)
        });
        _modelProviderCredentials.push({
          providerType: ModelProviderType.AWS_BEDROCK,
          isSet: getModelProviderKey(ModelProvideTypeKey.AWS_ACCESS_KEY_ID, credentials)
        });
        _modelProviderCredentials.push({
          providerType: ModelProviderType.CAII,
          isSet: getModelProviderKey(ModelProvideTypeKey.CDP_TOKEN, credentials)
        });
        if (!isEqual(_modelProviderCredentials, modelProviderCredentials)) {
          setModelProviderCredentials(_modelProviderCredentials)
        }
      }
      
    }, [credentials, filteredModelsReq.data]);

    const onEdit = (model: ModelProviderCredentials) => {
        setShowModal(true);
        setModel(model);
    }

    const modelProvidersColumns = [
      {
        key: 'providerType',
        title: 'Provider Type',
        dataIndex: 'providerType',
        width: 350,
        sorter: sortItemsByKey('provider_type'),
        render: (provider_type: string) => {
            if (provider_type === ModelProviderType.OPENAI) {
                return 'OpenAI';
            } else if (provider_type === ModelProviderType.OPENAI_COMPATIBLE) {
                return 'OpenAI Compatible';
            } else if (provider_type === ModelProviderType.GEMINI) {
                return 'Gemini';     
            } else if (provider_type === ModelProviderType.AWS_BEDROCK) {
                return 'AWS Bedrock';
            } else if (provider_type === ModelProviderType.CAII) {
                return 'CAII';
            }
            return 'N/A'
        }
    }, {
        key: 'isSet',
        title: 'Configured',
        dataIndex: 'isSet',
        width: 100,
        sorter: sortItemsByKey('isSet'),
        render: (is_set: boolean) => {
          if (is_set) {
            return <Flex><CheckOutlined style={{ color: 'green' }} /></Flex>
          }
          return <Flex><CloseOutlined style={{ color: 'red' }} /></Flex>;
        }
    }, {
        title: 'Actions',
        width: 100,
        render: (model: ModelProviderCredentials) => {
            return (
                <Flex>
                    <Tooltip title="Edit">
                        <StyledButton
                            type="link"
                            key={`${model.providerType}-deploy`}
                            onClick={() => onEdit(model)}
                            data-event-category="User Action"
                            data-event="Edit"
                        >
                            <EditOutlined />
                        </StyledButton>
                    </Tooltip>
                </Flex>
            );

        }
    }];

    return (
        <Layout>
            <StyledContent>
            <Container>
            <StyledTitle style={{ fontWeight: 600}}>{'Settings'}</StyledTitle>
            
                <br />
                <br />
                <Row style={{ marginTop: '12px' }}>
                    <Col sm={24}>
                      <Toolbar
                        left={
                          <StyledTitle style={{ fontSize: '18px' }}>{'Model Providers'}</StyledTitle>
                        }
                      />
                      <StyledTable 
                        rowKey={(row: ModelProviderCredentials) => `${row?.providerType}`}
                        tableLayout="fixed"
                        columns={modelProvidersColumns}
                        pagination={false}
                        dataSource={modelProviderCredentials || [] as ModelProviderCredentials[]} />
                    </Col>
                </Row>
                </Container>
                {showModal && 
                    <SetModelProviderCredentials model={model as ModelProviderCredentials} refetch={filteredModelsReq.refetch} onClose={() => setShowModal(false)} />}
            </StyledContent>
        </Layout>        
    );

}

export default SettingsPage;