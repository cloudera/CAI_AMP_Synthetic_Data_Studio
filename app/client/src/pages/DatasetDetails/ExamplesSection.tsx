import { Collapse, Descriptions, Flex, Modal, Table, Typography } from "antd";
import styled from "styled-components";
import Markdown from "../../Markdown";
import { DatasetResponse } from "../../../api/Datasets/response";
import { QuestionSolution } from "../../../pages/DataGenerator/types";
import { MODEL_PARAMETER_LABELS, ModelParameters, Usecases } from "../../../types";
import { Dataset } from "../../../pages/Evaluator/types";
import PCModalContent from "../../../pages/DataGenerator/PCModalContent";

import ExampleModal from "./ExampleModal";
import FreeFormExampleTable from "../DataGenerator/FreeFormExampleTable";

const { Text, Title } = Typography;
const Panel = Collapse.Panel;


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

const MarkdownWrapper = styled.div`
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 4px 11px;
`;

const StyledLabel = styled.div`
  font-size: 16px;
  padding-top: 8px;
`;

const StyledCollapse = styled(Collapse)`
  .ant-collapse-content > .ant-collapse-content-box {
    padding: 0;
  }
  .ant-collapse-item > .ant-collapse-header .ant-collapse-expand-icon {
    height: 28px;
    display: flex;
    align-items: center;
    padding-inline-end: 12px;
  }  
`;

const Label = styled.div` 
    font-size: 18px;
    padding-top: 8px;
`;

export type DatasetDetailProps = {
    datasetDetails: DatasetResponse | Dataset;
}

const ExamplesSection= ({ datasetDetails }: DatasetDetailProps)  => {
    console.log('ExamplesSection >> datasetDetails', datasetDetails);
    const { technique } = datasetDetails;

    const exampleCols = [
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

    return (
     
        <StyledCollapse ghost style={{ marginLeft: '-1em' }}>
            <Panel
                key="exmaples"
                header={<Label>Examples</Label>}
                style={{ padding: 0 }}
            >        
                <Flex vertical gap="middle">
                    {technique === 'freeform' ? (
                        <FreeFormExampleTable
                            data={datasetDetails.examples || []}
                        />    
                    ) : 
                    <StyledTable
                        bordered
                        columns={exampleCols}
                        dataSource={datasetDetails.examples || []}
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
            </Panel>
        </StyledCollapse>
    )
}

export default ExamplesSection;