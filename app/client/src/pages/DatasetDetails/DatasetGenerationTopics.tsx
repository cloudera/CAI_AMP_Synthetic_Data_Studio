import get from 'lodash/get';
import { Card, Table, Tabs, Typography } from "antd";
import { DatasetGeneration } from "../Home/types";
import TopicGenerationTable from "./TopicGenerationTable";
import isEmpty from "lodash/isEmpty";
import styled from "styled-components";
import { Dataset } from '../Evaluator/types';
import FreeFormTable from '../DataGenerator/FreeFormTable';

interface Props {
    data: DatasetGeneration;
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

const TabsContainer = styled(Card)`
    .ant-card-body {
        padding: 0;
    }
    margin: 20px 0px 35px;
`;

const getTopicTree = (data: DatasetGeneration, topics: string[]) => {    
    const topicTree = {};
    if (!isEmpty(data)) {
        topics.forEach(topic => {
            topicTree[topic] = data.filter(result => get(result, 'Seeds') === topic);
        });
    }
    return topicTree;
}   


const DatasetGenerationTable: React.FC<Props> = ({ data, dataset  }) => {
    console.log('----DatasetGenerationTable', data, dataset);
    const topics = get(dataset, 'topics', []);
    const technique = get(dataset, 'technique');
    const topicTree = getTopicTree(data, topics);

    const values = Object.values(topicTree);
    const datasetExamples = get(dataset, 'examples', []);

    let topicTabs = [];
    if (!isEmpty(topics)) {
        topicTabs = topicTree && Object.keys(topicTree).map((topic, i) => ({
            key: `${topic}-${i}`,
            label: <Typography.Text style={{ maxWidth: '300px' }} ellipsis={true}>{topic}</Typography.Text>,
            value: topic,
            children: technique !== 'freefoem' ?
            <TopicGenerationTable results={topicTree[topic as string]} topic={topic} /> :
            <FreeFormTable data={dataset?.examples} />
        }));
    }

    return (
        <>
            {!isEmpty(topicTabs) && 
                (
                    <TabsContainer title={'Generated Dataset'}>
                        <Tabs tabPosition='left' items={topicTabs}/>
                    </TabsContainer>
                )
        }
        </>
    );
}

export default DatasetGenerationTable;