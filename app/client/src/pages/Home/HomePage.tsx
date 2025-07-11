import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Col, Flex, Layout, Row, Tabs } from 'antd'
import type { TabsProps } from 'antd';
import DatasetsTab from './DatasetsTab';
import EvaluationsTab from './EvaluationsTab';
import DatasetIcon from '../../assets/ic-datasets.svg';
import ArrowRightIcon from '../../assets/ic-arrow-right.svg';
import EvaluateIcon from '../../assets/ic-evaluations.svg';
import DataAugmentationIcon from '../../assets/ic-data-augmentation.svg';
import EvaluateButton from './EvaluateButton';
import ExportsTab from './ExportsTab';


const { Content } = Layout;

const StyledContent = styled(Content)`
    padding: 24px;
    background-color: #f5f7f8;
`;

const HeaderSection = styled.div`
  display: flex;
  margin-bottom: 1rem;
  height: 100px;
  width: 50%;
  padding: 16px;
  background-color: #ffffff;
  .left-section {
    width: 66px;
    height: 66px;
    flex-grow: 0;
    margin: 0 8px 9px 0;
    padding: 14.4px 14.4px 14.4px 14.4px;
    background-color: #e5ffe5;
  }
  .middle-section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-left: 8px;
      width: 70%;
      .section-title {
        width: 186px;
        height: 24px;
        flex-grow: 0;
        font-size: 16px;
        font-weight: 500;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.5;
        letter-spacing: normal;
        text-align: left;
        color: #1b2329;
      }
   }
   .right-section {
      display: flex;
      flex-direction: column-reverse;
    }
    .evaluate-icon {
      background-color: #fff4cd;
    }     
`;

export enum ViewType {
    DATASETS = 'datasets',
    EVALUATIONS = 'evaluations',
    EXPORTS = 'exports'
}

const HomePage: React.FC = () => {
    const [tabViewType, setTabViewType] = useState<ViewType>(ViewType.DATASETS);

    const items: TabsProps['items'] = [
        {
            key: ViewType.DATASETS,
            label: 'Datasets',
            children: <DatasetsTab />,
        },
        {
            key: ViewType.EVALUATIONS,
            label: 'Evaluations',
            children: <EvaluationsTab />,
        },
        {
            key: ViewType.EXPORTS,
            label: 'Exports',
            children: <ExportsTab refetchOnRender={tabViewType === ViewType.EXPORTS} />,
        }
    ];

    const onTabChange = (key: string) =>
        setTabViewType(key as ViewType);


    return (
        <Layout>
            <StyledContent>
                <Flex>
                    <HeaderSection>
                        <div className="left-section">
                            <img src={DatasetIcon} alt="Datasets" />
                        </div>
                        <div className="middle-section">
                            <div className="section-title">Create Datasets</div>
                            <div className="section-description">
                                <p>Generate synthetic datasets for training models</p>
                            </div>
                        </div>
                        <div className="right-section">
                            <div>
                                <Button href="/data-generator">
                                    Get Started
                                    <img src={ArrowRightIcon} alt="Get Started" />
                                </Button>
                            </div>
                        </div>
                    </HeaderSection>
                    <HeaderSection style={{ marginLeft: '1rem' }}>
                        <div className="left-section" style={{ padding: '5px' }}>
                            <img src={DataAugmentationIcon} alt="Datasets" />
                        </div>
                        <div className="middle-section">
                            <div className="section-title">Data Augmentation</div>
                            <div className="section-description">
                                <p>Generate multi-dimension datasets using LLM custom prompts</p>
                            </div>
                        </div>
                        <div className="right-section">
                            <div>
                                <Button href="/data-augmentation">
                                    Get Started
                                    <img src={ArrowRightIcon} alt="Get Started" />
                                </Button>
                            </div>
                        </div>
                    </HeaderSection>
                    <HeaderSection style={{ marginLeft: '1rem' }}>
                        <div className="left-section evaluate-icon">
                            <img src={EvaluateIcon} alt="Datasets" />
                        </div>
                        <div className="middle-section">
                            <div className="section-title">Evaluate</div>
                            <div className="section-description">
                                <p>Evaluate generated datasets for fine tuning LLMs</p>
                            </div>
                        </div>
                        <div className="right-section">
                            <div>
                                <EvaluateButton />
                            </div>
                        </div>
                    </HeaderSection>
                </Flex>
                <Row>
                    <Col span={24}>
                        <Tabs
                            defaultActiveKey={tabViewType}
                            items={items}
                            onChange={onTabChange} />
                    </Col>
                </Row>
            </StyledContent>
        </Layout>
    );

}

export default HomePage; 
