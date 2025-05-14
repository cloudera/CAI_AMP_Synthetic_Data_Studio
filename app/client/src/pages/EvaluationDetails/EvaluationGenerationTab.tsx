import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { Col, Row, Tabs } from 'antd';
import { Dataset, Evaluation, EvaluationDetails } from '../Evaluator/types';
import styled from 'styled-components';
import { getTopicMap } from '../Evaluator/util';
import EvaluateTopicTable from '../Evaluator/EvaluateTopicTable';
import FreeFormEvaluationTable from '../Evaluator/FreeFromEvaluationTable';


interface Props {
    dataset: Dataset
    evaluation: Evaluation;
    evaluationDetails: EvaluationDetails;
}

const Container = styled.div`  
   padding: 16px;
   background-color: #ffffff;
`;

const EvaluationGenerationTab: React.FC<Props> = ({ dataset, evaluationDetails }) => { 
    const result = get(evaluationDetails, 'evaluation');
    const isFreeForm = get(dataset, 'technique' , false) === 'freeform';

    let topicTabs: unknown[] = [];
    const { topics, topicMap } = getTopicMap({ result });
    if (dataset.topics !== null && !isEmpty(dataset.topics) && !isFreeForm) {
        topicTabs = topics.map((topicName: string, index: number) => ({
            key: `${topicName}-${index}`,
            label: topicName,
            value: topicName,
            children: <EvaluateTopicTable data={get(topicMap, `${topicName}.evaluated_pairs`, [])} topicResult={get(topicMap, `${topicName}`)} topic={topicName} />
        }));
    }
    
    if (isEmpty(topicTabs) && !isFreeForm) {
        const values = Object.values(topicMap);
        return (
            <Row>
                <Col sm={24}>
                    <EvaluateTopicTable data={get(values, `[0].evaluated_pairs`, [])} topicResult={get(values, '[0]')} topic={'Evaluate'} />
                </Col>
            </Row>
        );
    }

    if (isFreeForm) {
        return (
            <Row>
                <Col sm={24}>
                    <FreeFormEvaluationTable data={get(result, 'evaluated_rows', [])} />
                </Col>
            </Row>
        );
    }


    return (
        <Container>
            <Row>
                <Col sm={24}>
                    <Tabs tabPosition="left" items={topicTabs}/>
                </Col>
            </Row>
        </Container>
    );
}

export default EvaluationGenerationTab;