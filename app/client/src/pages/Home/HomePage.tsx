import React, { useState } from 'react';
import styled from 'styled-components';
import { Card, Col, Flex, Layout, Row, Tabs } from 'antd'
import type { TabsProps } from 'antd';
import DatasetsTab from './DatasetsTab';
import EvaluationsTab from './EvaluationsTab';
import DatasetIcon from '../../assets/ic-brand-alternative-data.svg';
import DataAugmentationIcon from '../../assets/ic-data-augmentation.svg';
import ExportsTab from './ExportsTab';
import TemplatesSection from './TemplatesSection';
import { useNavigate } from 'react-router-dom';
import EvaluateSection from './EvaluateSection';


const { Content } = Layout;

const StyledContent = styled(Content)`
    padding: 24px;
    background-color: #f5f7f8;
`;

export const HeaderSection = styled.div`
  display: flex;
  margin-bottom: 1rem;
  height: 100px;
  width: 50%;
  padding: 16px;
  background-color: #ffffff;
  cursor: pointer;
  .left-section {
    width: 66px;
    height: 46px;
    flex-grow: 0;
    margin: 0 8px 9px 0;
    padding: 14.4px 14.4px 14.4px 14.4px;
    background-color: #ffffff;
  }
  .middle-section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-left: 8px;
      margin-top: 12px;
      width: 70%;
      .section-title {
        width: 186px;
        height: 24px;
        flex-grow: 0;
        font-size: 16px;
        font-weight: normal;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.5;
        letter-spacing: normal;
        text-align: left;
        color: #1b2329;
      }
      .section-description {
        align-self: stretch;
        flex-grow: 1;
        font-size: 12px;
        font-weight: normal;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.33;
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
      background-color: #ffffff;
    }     
`;

export enum ViewType {
    DATASETS = 'datasets',
    EVALUATIONS = 'evaluations',
    EXPORTS = 'exports'
}

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [tabViewType, setTabViewType] = useState<ViewType>(ViewType.DATASETS);

    const items: TabsProps['items'] = [
        {
            key: ViewType.DATASETS,
            label: 'Datasets',
            children: <DatasetsTab hideSearch={true} />,
        },
        {
            key: ViewType.EVALUATIONS,
            label: 'Evaluations',
            children: <EvaluationsTab hideSearch={true} />,
        },
        {
            key: ViewType.EXPORTS,
            label: 'Exports',
            children: <ExportsTab refetchOnRender={tabViewType === ViewType.EXPORTS} hideSearch={true} hidePagination={true}/>,
        }
    ];

    const onTabChange = (key: string) =>
        setTabViewType(key as ViewType);


    return (
        <Layout>
            <StyledContent>
                <Flex>
                    <HeaderSection onClick={() => navigate('/data-generator')}>
                        <div className="left-section">
                            <img src={DatasetIcon} alt="Datasets" />
                        </div>
                        <div className="middle-section">
                            <div className="section-title">Generation</div>
                            <div className="section-description">
                              Create synthetic data from scratch using examples, documents, seed instructions and AI assisted prompts.
                            </div>
                        </div>
                    </HeaderSection>

                    <HeaderSection style={{ marginLeft: '1rem' }} onClick={() => navigate('/data-augmentation')}>
                        <div className="left-section" style={{ padding: '5px' }}>
                            <img src={DataAugmentationIcon} alt="augmentation" />
                        </div>
                        <div className="middle-section">
                            <div className="section-title">Augmentation</div>
                            <div className="section-description">
                            Add synthetic rows or field to existing data to fill gaps or balance datasets such as language translations.
                            </div>
                        </div>
                    </HeaderSection>
                    <EvaluateSection />
                </Flex>
                <Row>
                    <Col span={24}>
                        <Card title="Recents">
                            <Tabs
                                defaultActiveKey={tabViewType}
                                items={items}
                                onChange={onTabChange}
                            />
                        </Card>
                    </Col>
                </Row>
                <Row style={{ marginTop: '1rem' }}>
                    <Col span={24}>
                        <TemplatesSection />
                    </Col>
                </Row>    
            </StyledContent>
        </Layout>
    );

}

export default HomePage; 
