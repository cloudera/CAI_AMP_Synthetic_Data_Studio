import get from 'lodash/get';
import { Card, Tabs, Typography } from "antd";
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
    const topics = get(dataset, 'topics', []);
    const technique = get(dataset, 'technique');
    const topicTree = getTopicTree(data, topics);

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