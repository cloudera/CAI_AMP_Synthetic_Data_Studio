import { Button, Col, Flex, Layout, Modal, notification, Row, Table, Tooltip, Tooltip } from "antd";
import { Content } from "antd/es/layout/layout";
import styled from "styled-components";
import { deleteModelProvider, useModelProviders } from "./hooks";
import get from "lodash/get";
import { sortItemsByKey } from "../../utils/sortutils";
import Paragraph from "antd/es/typography/Paragraph";
import StyledTitle from "../Evaluator/StyledTitle";
import Toolbar from "./Toolbar";
import AddModelProviderButton, { ModelProviderType } from "./AddModelProviderButton";
import DateTime from "../../components/DateTime/DateTime";
import {
    EditOutlined,
    DeleteOutlined
  } from '@ant-design/icons';
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import EditModelProvider from "./EditModelProvider";



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

const SettingsPage: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [model, setModel] = useState<CustomModel | null>(null);
    const filteredModelsReq = useModelProviders();   
    const customModels = get(filteredModelsReq, 'data.endpoints', []);

    const mutation = useMutation({
        mutationFn: deleteModelProvider
    });
   
    const onDelete = (model: CustomModel) => {
        Modal.confirm({
          content: (
            <span>{`Are you sure you want to delete the model \'${model.display_name}\'`}</span>
          ),
          onOk: async () => {
            try {
                mutation.mutate({
                    endpoint_id: model.endpoint_id
                })
            } catch (error) {
              notification.error({
                message: "Error",
                description: error instanceof Error ? error.message : String(error),
              });
            }
            filteredModelsReq.refetch();
          },
          title: 'Confirm'
        });
      };

    const onEdit = (_model: CustomModel) => {
        setShowModal(true);
        setModel(_model)
        

    }

    const modelProvidersColumns = [{
        key: 'display_name',
        title: 'Display Name',
        dataIndex: 'display_name',
        width: 200,
        sorter: sortItemsByKey('display_name')
           
    }, {
        key: 'provider_type',
        title: 'Provider Type',
        dataIndex: 'provider_type',
        width: 150,
        sorter: sortItemsByKey('provider_type'),
        render: (provider_type: string) => {
            if (provider_type === 'openai') {
                return 'OpenAI';
            } else if (provider_type === ModelProviderType.GEMINI) {
                return 'Gemini';
            } else if (provider_type === ModelProviderType.CAII) {
                return 'CAII';
            }
            return 'N/A'
        }
    }, {
        key: 'model_id',
        title: 'Model ID',
        dataIndex: 'model_id',
        width: 200,
        sorter: sortItemsByKey('model_id')
           
    }, {
        key: 'created_at',
        title: 'Created At',
        dataIndex: 'created_at',
        width: 200,
        sorter: sortItemsByKey('created_at'),
        render: (timestamp: string) => <>{timestamp == null ? 'N/A' : <DateTime dateTime={timestamp}/>}</>
           
    }, {
        key: 'endpoint_url',
        title: 'Endpoint',
        dataIndex: 'endpoint_url',
        width: 300,
        sorter: sortItemsByKey('endpoint_url'),
        render: (endpoint_url: string) => <StyledParagraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{endpoint_url}</StyledParagraph>
    }, {
        title: 'Actions',
        width: 100,
        render: (model: CustomModel) => {
            return (
                <Flex>
                    <Tooltip title="Edit">
                        <Button
                            type="link"
                            key={`${model.endpoint_id}-delete`}
                            onClick={() => onDelete(model)}
                            data-event-category="User Action"
                            data-event="Delete"
                        >
                            <DeleteOutlined />
                        </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                        <StyledButton
                            type="link"
                            key={`${model.endpoint_id}-deploy`}
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
                <Row style={{ marginTop: '26px' }}>
                    <Col sm={24}>
                      <Toolbar
                        left={
                          <StyledTitle style={{ fontSize: '18px' }}>{'Custom Models'}</StyledTitle>
                        }
                        right={
                          <Flex style={{ height: '100%', marginBottom: '12px' }}>
                            <AddModelProviderButton refetch={filteredModelsReq.refetch} />
                          </Flex>
                        }
                      />
                      <StyledTable 
                        rowKey={(row: CustomModel) => `${row?.endpoint_id}`}
                        tableLayout="fixed"
                        columns={modelProvidersColumns}
                        dataSource={customModels || [] as CustomModel[]} />
                    </Col>
                </Row>
                </Container>
                {showModal && 
                    <EditModelProvider model={model as CustomModel} refetch={filteredModelsReq.refetch} onClose={() => setShowModal(false)} />}
            </StyledContent>
        </Layout>        
    );

}

export default SettingsPage;