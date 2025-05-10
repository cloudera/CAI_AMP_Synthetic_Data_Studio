import get from 'lodash/get';
import isString from 'lodash/isString';
import React from 'react';  
import { EvaluatedPair } from "./types";
import { Badge, Button, Flex, Modal, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import Markdown from '../../components/Markdown';
import { getColorCode } from './util';

interface Props {
  evaluatedPair: EvaluatedPair;
  onClose: () => void;
}

const Item = styled.div`
  padding: 4px;
  border-color: blue;
  border-size: 1px;
`;

const Section = styled.div`
  border: 1px solid #1677ff;
  border-radius: 5px;
  padding: 5px 10px;
  max-height: 300px;
  scroll-y: auto;
  overflow-y: auto;
`;

const StyledLabel = styled.div`
  height: 20px;
  font-style: normal;
  line-height: 1.4;
  letter-spacing: normal;
  text-align: left;
  color: #1b2329;
  margin-left: 0
  margin-right: 4px;
  font-size: 16px;
`;

const StyledIcon = styled.div`
  margin-left: 4px;
  svg {
    color: #1777ff;
  }
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    max-height: 85vh;
    overflow-y: hidden;
    width: 800px;
    .ant-modal-body {
      padding-top: 0;
      scroll-y: auto;
      overflow-y: hidden;
    }
  }
`;

const Container = styled.div`
  max-height: 70vh;
  overflow-y: auto;
`;


const GeneratedEvaluationrModal: React.FC<Props> = ({ evaluatedPair, onClose }) => { 
  const { question, solution, evaluation } = evaluatedPair;
  const justification = get(evaluation, 'justification', '');
  const count = get(evaluation, 'score', 0);
  

  return (
    <StyledModal
      visible={true}
      title={'Generated Evaluations'}
      width="70%"
      onCancel={onClose}
      footer={[
        <Button key="ok" type="primary" onClick={onClose}>
          OK
        </Button>
      ]}
    >  
    <Container>
      <Flex gap={10} vertical>
        <Item>
          <div style={{ display: 'flex', marginBottom: '4px' }}>
            <StyledLabel>{'Prompt'}</StyledLabel>
            <StyledIcon>
              <Tooltip title={'Evaluation Pprompt'}>
                <QuestionCircleOutlined style={{ fontSize: '14px' }}/>
              </Tooltip>
            </StyledIcon>
          </div>
          <Section>
            <Markdown text={question} /> 
          </Section>
        </Item>
        <Item>
          <div style={{ display: 'flex', marginBottom: '4px' }}>
            <StyledLabel>{'Completion'}</StyledLabel>
            <StyledIcon>
              <Tooltip title={'Evaluation Completion'}>
                <QuestionCircleOutlined style={{ fontSize: '14px' }}/>
              </Tooltip>
            </StyledIcon>
          </div>
          <Section>
            <Markdown text={solution} /> 
          </Section>
        </Item>
        <Item style={{ display: 'flex' }}>
          <StyledLabel style={{ marginRight: '4px' }}>Score:</StyledLabel>
          <Badge count={count} color={getColorCode(count)} showZero />
        </Item>
        <Item>
          <div style={{ display: 'flex', marginBottom: '4px' }}>
            <StyledLabel>{'Justification'}</StyledLabel>
            <StyledIcon>
              <Tooltip title={'Evaluation Justification'}>
                <QuestionCircleOutlined style={{ fontSize: '14px' }}/>
              </Tooltip>
            </StyledIcon>
          </div>
          <Section>
            <Markdown text={isString(justification) ? justification : JSON.stringify(justification)} /> 
          </Section>
        </Item>
      </Flex>
      </Container>
    </StyledModal>
  )    
}

export default GeneratedEvaluationrModal;

