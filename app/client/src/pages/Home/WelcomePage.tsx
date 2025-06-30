import toString from 'lodash/toString';
import { Button, Col, Flex, Layout, Row, Image, Checkbox } from 'antd';
import React from 'react';
import styled from 'styled-components';
import SDGIcon from '../../assets/sdg-landing.svg';
import LightBulbIcon from '../../assets/ic-lightbulb.svg';
import QueryPromptIcon from '../../assets/ic-query-prompt.svg';
import NumbersIcon from '../../assets/ic-numbers.svg';

const { Content } = Layout;

const StyledContent = styled(Content)`
    padding: 24px;
    background-color: #f5f7f8;
`;

const LeftSection = styled.div`
    display: flex;
    flex-direction: column;
    padding: 24px;
    .section-title {
        color: #120046;
        font-size: 64px;
        font-weight: bold;
        align-self: stretch;
        flex-grow: 0;
        font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.1;
        letter-spacing: normal;
        text-align: left;
        margin-bottom: 32px;
    }
    .section-item-title {
        height: 24px;
        flex-grow: 0;
        font-family: Roboto;
        font-size: 16px;
        font-weight: normal;
        font-stretch: normal;
        font-style: normal;
        line-height: 1.5;
        letter-spacing: normal;
        text-align: center;
        color: #000;
    }  
    .section-text {
        margin-top: 32px;
    }   
    .lightbulb-icon {
        width: 28px;
        height: 28px;
        flex-grow: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 20px;
        background-color: #fff4cd;
    }
    .query-prompt-icon {
        width: 28px;
        height: 28px;
        flex-grow: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 20px;
        background-color: #edf7ff;
    },
    .numbers-icon {
        width: 28px;
        height: 28px;
        flex-grow: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 20px;
        background-color: #e5ffe5;
    }           
`;

const RightSection = styled.div`
    // width: 50%;
    padding: 24px;
    display: contents;
`;    

const StyledImg = styled.img`
  height: ${props => props?.height && `${props.height}px`}
`


const InfoSection = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 24px;
`;

const WelcomePage: React.FC = () => {
    interface CheckboxChangeEvent {
        target: {
            checked: boolean;
        };
    }

    const onChange = (e: CheckboxChangeEvent) => {
        const checked = e.target.checked;
        window.localStorage.setItem('sds_mute_welcome_page', toString(checked));
    }

    return (
        <Layout>
            <StyledContent>
                <Row>
                    <Col sm={12}>
                    <LeftSection>
                        <div className="section-title ">Synthetic Data Studio</div>
                        <div className="section-text">
                        Generate high-quality synthetic datasets for SFT & model alignment and evaluate the quality with LLM-as-a-judge.
                        </div>

                        <InfoSection>
                            <div className="lightbulb-icon"><StyledImg src={LightBulbIcon} height={16} /></div>
                            <Flex vertical>
                                <div>Generate Synthetic Data with Domain Specific Input Queries</div>
                                <div>
                                Generate synthetic data with domain specific input data such as documents, examples or structured data.
                                </div>
                            </Flex>
                        </InfoSection>
                        <InfoSection>
                            <div className="query-prompt-icon"><StyledImg src={QueryPromptIcon} height={16} /></div>
                            <Flex vertical>
                                <div>Evaluate Datasets with LLM-as-a-judge</div>
                                <div>
                                Use models running on Cloudera AI Inference or AWS Bedrock as a judge for evaluating the quality of the generated datasets.
                                </div>
                            </Flex>
                        </InfoSection>
                        <InfoSection>
                            <div className="numbers-icon"><StyledImg src={NumbersIcon} height={16} /></div>
                            <Flex vertical>
                                <div>Export to Hugging Face or Data Lake</div>
                                <div>
                                Generated datasets are automatically persisted in the Cloudera AI Workbench project file system, and can be exported to Hugging Face and Data Lake.
                                </div>
                            </Flex>
                        </InfoSection>
                        <br/>
                        <Flex style={{ marginTop: '32px' }}>
                            <Button type="primary" href="/home">Get Started</Button>

                            <div style={{ marginLeft: '24px', marginTop: '8px' }}>
                                <Checkbox onChange={onChange}>{`Don't show me this again`}</Checkbox>
                            </div>
                        </Flex>
                    </LeftSection>
                    </Col>
                    <Col sm={12}>
                    <RightSection>
                         <Image src={SDGIcon} />
                    </RightSection>
                    </Col>
                </Row>
            </StyledContent>
        </Layout>        

    );
}

export default WelcomePage;
