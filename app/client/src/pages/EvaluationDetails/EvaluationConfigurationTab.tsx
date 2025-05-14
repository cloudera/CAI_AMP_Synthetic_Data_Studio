import { Badge, Col, Flex, Modal, Row, Table, Typography } from "antd";
import { Evaluation } from "../Evaluator/types";
import styled from "styled-components";
import ExampleModal from "../DatasetDetails/ExampleModal";
import { getColorCode } from "../Evaluator/util";

const { Text } = Typography;

interface Props {
    evaluation: Evaluation;
    evaluationDetails: EvaluationDetails;
}

const Container = styled.div`  
   padding: 16px;
   background-color: #ffffff;
`;

const StyledTitle = styled.div`
    margin-bottom: 4px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 500;
    margin-left: 4px;

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


const EvaluationConfigurationTab: React.FC<Props> = ({ evaluation }) => {   

    const exampleColummns = [
            {
                title: 'Justification',
                dataIndex: 'justification',
                ellipsis: true,
                width: '70%',
                render: (justification: string) => <>{justification}</>
          
            },
            {
                title: 'Score',
                dataIndex: 'score',
                ellipsis: true,
                width: '20%',
                render: (score: number) => <><Badge count={score} color={getColorCode(score)} showZero /></>
            }
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
                            text: evaluation?.custom_prompt,
                            tooltips: ['Copy Prompt', 'Copied!'],
                        }}>
                            {evaluation?.custom_prompt}
                        </Text>
                    </Flex>
                </Col>
            </Row>      
            <Row style={{ marginTop: '16px', marginBottom: '8px' }}>
                <Col sm={24}>
                    <Flex vertical>
                        <StyledTitle>Examples</StyledTitle>
                        <StyledTable
                            bordered
                            columns={exampleColummns}
                            dataSource={evaluation?.examples || []}
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
                        />
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
                            dataSource={[evaluation?.model_parameters]}
                            pagination={false}
                            rowKey={(_record, index) => `parameters-table-${index}`}
                        />
                    </Flex>
                </Col>
            </Row>
        </Container>
    );
}

export default EvaluationConfigurationTab;