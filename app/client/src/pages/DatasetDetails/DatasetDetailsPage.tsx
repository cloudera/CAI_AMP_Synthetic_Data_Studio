import get from 'lodash/get';
import { Avatar, Button, Card, Col, Divider, Dropdown, Flex, Layout, List, Row, Space, Tabs, TabsProps, Tag, Typography } from "antd";
import styled from "styled-components";
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { Link, useParams } from "react-router-dom";
import { useGetDatasetDetails } from "./hooks";
import Loading from "../Evaluator/Loading";
import { nextStepsList } from './constants';
import { getModelProvider, getUsecaseType, getWorkflowType } from '../DataGenerator/constants';
import { useState } from 'react';
import ConfigurationTab, { TagsContainer } from './ConfigurationTab';
import DatasetGenerationTab from './DatasetGenerationTab';
import {
  ArrowLeftOutlined,
  DownOutlined,
  FolderViewOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Pages } from '../../types';
import isEmpty from 'lodash/isEmpty';
import { getFilesURL } from '../Evaluator/util';


const { Content } = Layout;
const { Title } = Typography;


const StyledHeader = styled.div`
  height: 28px;
  flex-grow: 0;
  font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
  color:  #5a656d;
  font-size: 24px;
  font-weight: 300;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.4;
  letter-spacing: normal;
  text-align: left;
`;

const StyledLabel = styled.div`
  margin-bottom: 4px;
  font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
  font-weight: 500;
  margin-bottom: 4px;
  display: block;
  font-size: 14px;
  color: #5a656d;
`;

const StyledContent = styled(Content)`
  // background-color: #ffffff;
  margin: 24px;
  .ant-table {
    overflow-y: scroll;
  }
`;

const StyledValue = styled.div`
    // color: #1b2329;
    color: #5a656d;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-size: 12px;
    font-variant: tabular-nums;
    line-height: 1.4285;
    list-style: none;
    font-feature-settings: 'tnum';
`;

const StyledPageHeader = styled.div`
    height: 28px;
    align-self: stretch;
    flex-grow: 0;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-size: 20px;
    // font-weight: 600;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.4;
    letter-spacing: normal;
    text-align: left;
    color: rgba(0, 0, 0, 0.88);
`;

const StyledButton = styled(Button)`  
    padding-left: 0;
`

enum ViewType {
  CONFIURATION = 'configuration',
  GENERATION = 'generation',
}    


const DatasetDetailsPage: React.FC = () => {
    const { generate_file_name } = useParams();
    const [tabViewType, setTabViewType] = useState<ViewType>(ViewType.GENERATION);
    const { data, error, isLoading } = useGetDatasetDetails(generate_file_name as string);
    const dataset = get(data, 'dataset');
    const datasetDetails = get(data, 'datasetDetails');
    const total_count = get(dataset, 'total_count', []);

    if (isLoading) {
        return (
          <StyledContent>
            <Loading />
          </StyledContent>
        );
    }

    const items: TabsProps['items'] = [
        {
            key: ViewType.GENERATION,
            label: 'Generation',
            children: <DatasetGenerationTab  dataset={dataset} datasetDetails={datasetDetails}/>,
        },
        {
            key: ViewType.CONFIURATION,
            label: 'Parameter & Examples',
            children: <ConfigurationTab dataset={dataset} />,
        },
    ];

    const menuActions: MenuProps['items'] = [
      {
        key: 'view-in-preview',
        label: (
          <a target="_blank" rel="noopener noreferrer" href={`${getFilesURL(dataset.local_export_path)}`}>
            View in Preview
          </a>
        ),
        icon: <FolderViewOutlined />,
      },
      {
        key: 'generate-dataset',
        label: (
          <Link to={`/${Pages.GENERATOR}`} state={{
            data: dataset,
            internalRedirect: true,
          }}>
            Generate Dataset
          </Link>
        ),
        icon: <ThunderboltOutlined />,
      },
      {
        key: 'evaluate-dataset',
        label: (
          <Link disabled={isEmpty(dataset?.generate_file_name)} to={`/${Pages.EVALUATOR}/create/${dataset?.generate_file_name}`}>
            Evaluate Dataset
          </Link>
        ),
        icon: <QueryStatsIcon />,
      }
    ];


    const onTabChange = (key: string) =>
        setTabViewType(key as ViewType);


    return (
        <Layout>
            <StyledContent>
                <Row>
                  <Col sm={24}>
                    <StyledButton type="link" onClick={() => window.history.back()} style={{ color: '#1677ff' }} icon={<ArrowLeftOutlined />}>
                      Back to Home
                    </StyledButton>
                  </Col>
                </Row>
                <Row style={{ marginBottom: '16px', marginTop: '16px'  }}>
                  <Col sm={20}>
                    <StyledPageHeader>{dataset?.display_name}</StyledPageHeader>
                  </Col>
                  <Col sm={4}>
                    <Flex style={{ flexDirection: 'row-reverse' }}>
                      <Dropdown menu={{ items: menuActions }}>
                        <Button onClick={(e) => e.preventDefault()}>
                          <Space>
                              Actions
                              <DownOutlined />
                          </Space>
                        </Button>
                      </Dropdown>
                    </Flex>
                  </Col>

                </Row>
                <Card>
                    <Row>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Model ID</StyledLabel>
                            <StyledValue>{dataset?.model_id}</StyledValue>
                          </Flex>
                        </Col>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Model Provider</StyledLabel>
                            <StyledValue>{getModelProvider(dataset?.inference_type)}</StyledValue>
                          </Flex>
                        </Col>
                    </Row>
                    <Row style={{ marginTop: '16px' }}>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Workflow</StyledLabel>
                            <StyledValue>{getWorkflowType(dataset?.technique)}</StyledValue>
                          </Flex>
                        </Col>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Template</StyledLabel>
                            <StyledValue>{getUsecaseType(dataset?.use_case)}</StyledValue>
                          </Flex>
                        </Col>
                    </Row>
                    {dataset?.technique === 'sft' && !isEmpty(dataset?.doc_paths) && (
                    <Row style={{ marginTop: '16px' }}>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Context</StyledLabel>
                            {/* <StyledValue>{dataset?.custom_prompt}</StyledValue> */}
                            <TagsContainer>
                              <Space size={[0, 'small']} wrap>
                                {dataset?.doc_paths?.map((file: string) => (
                                    <Tag key={file}>
                                        <div className="tag-title" title={file}>
                                            {file}
                                        </div>
                                    </Tag>
                                ))}
                              </Space>
                            </TagsContainer> 
                          </Flex>
                        </Col>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Input Key</StyledLabel>
                            <StyledValue>{dataset?.input_key}</StyledValue>
                          </Flex>
                        </Col>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Output Value</StyledLabel>
                            <StyledValue>{dataset?.output_value}</StyledValue>
                          </Flex>
                        </Col>
                      </Row>    
                    )}
                    <Row style={{ marginTop: '16px' }}>
                        <Col sm={8}>
                          <Flex vertical>
                            <StyledLabel>Total Dataset Size</StyledLabel>
                            <StyledValue>{total_count}</StyledValue>
                          </Flex>
                        </Col>
                    </Row> 
                </Card>
                <br/>
                <br/>
                <Row>
                    <Col span={24}>
                        <Tabs
                            defaultActiveKey={tabViewType}
                            items={items}
                            onChange={onTabChange} />
                    </Col>
                </Row>

                <br/>
                <br/>
                <Divider/>
                <Title level={2}>{'Next Steps'}</Title>
                <List
                  itemLayout="horizontal"
                  dataSource={nextStepsList}
                  renderItem={(item, i) => (
                    <List.Item key={`${item.title}-${i}`}>
                        <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: '#1677ff'}} icon={item.icon} />}
                            title={item.title}
                            description={item.description}
                        />
                    </List.Item>
                )}
            />    
            </StyledContent>
        </Layout>
        
    );
}

export default DatasetDetailsPage;