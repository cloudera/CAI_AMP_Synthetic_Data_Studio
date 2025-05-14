import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, Flex, Layout, List, Tabs, Typography } from 'antd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import GradingIcon from '@mui/icons-material/Grading';
import EvaluateTopicTable from './EvaluateTopicTable';
import { EVALUATOR_JOB_SUCCESS, getTopicMap } from './util';
import styled from 'styled-components';
import { getProjectJobsUrl } from './hooks';
import { Dataset } from './types';
import { WorkflowType } from '../DataGenerator/types';
import SeedEvaluateTable from './SeedEvaluateTable';
import FreeFromEvaluationTable from './FreeFromEvaluationTable';


const { Content } = Layout;
const { Title } = Typography;

interface Props {
  result: unknown;
  demo: boolean;
  dataset: Dataset;
}


export const EVALUATE_NEXT_STEPS = [
  {
      avatar: '',
      title: 'Review Evaluation',
      description: 'Review your dataset evaluation to ensure it properly fits your usecase.',
      icon: <GradingIcon/>
  }
];

const StyleContent = styled(Content)`
  margin: 24px;
`;


const EvaluatorSuccess: React.FC<Props> = ({ result, dataset, demo }) => {
  const hasTopics = (result: unknown) => {
    return !Array.isArray(result?.results);
  }

  const isFreeForm = (dataset: Dataset) => 
    dataset?.technique === 'freeform';

  const hasCustomSeed = (_dataset: Dataset) => (_dataset?.technique === 'sft' && !isEmpty(_dataset?.doc_paths)) ||
      (_dataset?.technique === WorkflowType.CUSTOM_DATA_GENERATION && !isEmpty(_dataset?.input_path))
  

  const isCustom = hasCustomSeed(dataset)    
  let topicTabs = null;
  if (!isCustom && isEmpty(get(result, 'job_id')) && isEmpty(get(result, 'job_name')) && !isEmpty(result) && hasTopics(result)) {
    const { topics, topicMap } = getTopicMap(result);
    topicTabs = topics.map((topicName: string, index: number) => ({
      key: `${topicName}-${index}`,
      label: topicName,
      value: topicName,
      children: <EvaluateTopicTable data={get(topicMap, `${topicName}.evaluated_pairs`, [])} topicResult={get(topicMap, `${topicName}`)} topic={topicName} />
    }));
  }

  return (
    <Layout>
      <StyleContent>
        <Title level={2}>
          <Flex align='center' gap={10}>
            <CheckCircleIcon style={{ color: '#178718' }}/>
            {'Success'}
          </Flex>
          </Title>
          {!demo &&
            (<Flex gap={20} vertical>
               <Typography>
                 {EVALUATOR_JOB_SUCCESS}
               </Typography>
               <Flex>
                 <Button type='primary' style={{ marginLeft: '4px', marginRight: '4px' }}>
                   <a href={getProjectJobsUrl()} target='_blank' rel='noreferrer'>
                     {'View Job'}
                   </a>
                 </Button>
               </Flex>
            </Flex>)}
           
          {topicTabs !== null && 
          <>
            <Typography>
              {'Your dataset evaluation was successfully generated. You can review your evaluation in the table below.'}
            </Typography>
            {!isCustom && !isEmpty(topicTabs) && !isFreeForm(dataset) &&
              <Card title={'Generated Evaluations'} style={{ marginTop: '36px' }}>
                <Tabs tabPosition='left' items={topicTabs}/>
              </Card>}
              {isFreeForm(dataset) &&
              <Card title={'Generated Evaluations'} style={{ marginTop: '36px' }}>
                  <FreeFromEvaluationTable data={get(result, 'result.evaluated_rows', [])} />
              </Card>}  
          </>}
          {isCustom && 
          <>
            <Typography>
              {'Your dataset evaluation was successfully generated. You can review your evaluation in the table below.'}
            </Typography>
            <SeedEvaluateTable results={result} />
          </>}

          <Title level={2}>{'Next Steps'}</Title>
            <List
              itemLayout="horizontal"
              dataSource={EVALUATE_NEXT_STEPS}
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
           
           <Flex style={{ marginTop: '24px' }}>
              <Button icon={<FormatListBulletedIcon/>}>
                <Link to={`/home`}>{'View Evaluation List'}</Link>
              </Button> 
           </Flex>   
      </StyleContent>
    </Layout>    
  );
}

export default EvaluatorSuccess;

