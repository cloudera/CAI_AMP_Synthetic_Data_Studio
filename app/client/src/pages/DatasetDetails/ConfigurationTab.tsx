import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React from 'react';
import { Dataset } from '../Evaluator/types';
import { Col, Flex, Modal, Row, Space, Table, Tag, Typography } from 'antd';
import ExampleModal from './ExampleModal';
import { QuestionSolution } from '../DataGenerator/types';
import styled from 'styled-components';
import FreeFormExampleTable from '../DataGenerator/FreeFormExampleTable';

const { Text } = Typography;

interface Props {
    dataset: Dataset;
}

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
    .ant-table-row {
        cursor: pointer;
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

const StyledTitle = styled.div`
    margin-bottom: 4px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 500;
    margin-left: 4px;

`;

const Container = styled.div`  
   padding: 16px;
   background-color: #ffffff;
`;

export const TagsContainer = styled.div`
  min-height: 30px;
  display: block;
  margin-bottom: 4px;
  margin-top: 4px;
  .ant-tag {
    max-width: 150px;
  }
  .tag-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;


const ConfigurationTab: React.FC<Props> = ({ dataset }) => {
    const topics = get(dataset, 'topics', []);

    const exampleColummns = [
        {
            title: 'Prompts',
            dataIndex: 'prompts',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.question}</>
        },
        {
            title: 'Completions',
            dataIndex: 'completions',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.solution}</>
        },
    ]

    const parameterColummns = [ 
        {
            title: 'Temperature',
            dataIndex: 'temperature',
            ellipsis: true,
            render: (temperature: number) => <>{temperature}</>
        },
        {
            title: 'Top K',
            dataIndex: 'top_k',
            ellipsis: true,
            render: (top_k: number) => <>{top_k}</>
        },
        {
            title: 'Top P',
            dataIndex: 'top_p',
            ellipsis: true,
            render: (top_p: number) => <>{top_p}</>
        },

    ];
    
    return (
        <Container>
            <Row style={{ marginBottom: '16px', marginTop: '8px'  }}>
                <Col sm={24}>
                    <Flex vertical>
                        <StyledTitle>Custom Prompt</StyledTitle>
                        <Text copyable={{
                            text: dataset?.custom_prompt,
                            tooltips: ['Copy Prompt', 'Copied!'],
                        }}>
                            {dataset?.custom_prompt}
                        </Text>
                    </Flex>
                </Col>
            </Row>    
            {!isEmpty(topics) && 
            <Row style={{ marginTop: '8px', marginBottom: '8px' }}>
                <Col sm={24}>
                    <Flex vertical>
                        <StyledTitle>Seed Instructions</StyledTitle>
                        <TagsContainer>
                            <Space size={[0, 'middle']} wrap>
                                {topics.map((tag: string) => (
                                    <Tag key={tag}>
                                        <div className="tag-title" title={tag}>
                                            {tag}
                                        </div>
                                    </Tag>
                                ))}
                            </Space>
                        </TagsContainer>        
                    </Flex>
                </Col>
            </Row>}            
            <Row style={{ marginTop: '16px', marginBottom: '8px' }}>
                <Col sm={24}>
                    <Flex vertical>
                        <StyledTitle>Examples</StyledTitle>
                        {dataset.technique === 'freeform' && <FreeFormExampleTable data={dataset.examples} />}
                        {dataset.technique !== 'freeform' && 
                        <StyledTable
                            bordered
                            columns={exampleColummns}
                            dataSource={dataset.examples || []}
                            pagination={false}
                            onRow={(record: { question: string, solution: string}) => ({
                                onClick: () => Modal.info({
                                    title: 'View Details',
                                    content: <ExampleModal {...record} />,
                                    icon: undefined,
                                    maskClosable: false,
                                    width: 1000
                                })
                             })}
                            rowKey={(_record, index) => `summary-examples-table-${index}`}
                        />}
                    </Flex>
                </Col>
            </Row>
            <Row style={{ marginTop: '16px' }}>
                <Col sm={24}>
                    <Flex vertical>
                        <StyledTitle>Parameters</StyledTitle>
                        <StyledTable
                            bordered
                            columns={parameterColummns}
                            dataSource={[dataset?.model_parameters]}
                            pagination={false}
                            rowKey={(_record, index) => `parameters-table-${index}`}
                        />
                    </Flex>
                </Col>
            </Row>
        </Container>

    );
};

export default ConfigurationTab;


