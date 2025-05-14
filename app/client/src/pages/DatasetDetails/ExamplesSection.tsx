import { Collapse, Flex, Modal, Table } from "antd";
import styled from "styled-components";
import { DatasetResponse } from "../../../api/Datasets/response";
import { QuestionSolution } from "../../../pages/DataGenerator/types";
import { Dataset } from "../../../pages/Evaluator/types";

import ExampleModal from "./ExampleModal";
import FreeFormExampleTable from "../DataGenerator/FreeFormExampleTable";

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