import clone from 'lodash/clone';
import pullAt from 'lodash/pullAt';
import { Button, Card, Flex, Form, FormInstance, Table, Tooltip } from "antd";
import { Dataset, EvaluateExample, EvaluateExampleRecord } from "./types";


import React, { useEffect, useState } from 'react';
import { DeleteOutlined, EditOutlined } from "@mui/icons-material";
import TooltipIcon from "../../components/TooltipIcon";
import StyledTitle from "./StyledTitle";
import styled from "styled-components";
import PromptExampleModal from "./PrmptExampleModal";
import { MAX_PROMPT__EXAMPLES, MODE } from './util';

interface Props {
  dataset: Dataset;
  examples: EvaluateExample[];
  form: FormInstance;   
};

const StyledCard = styled(Card)`
  margin-top: 24px;
  .icon-container {
    margin-left: 8px;
    margin-top: auto;
    margin-bottom: 12px;
  }
`;

enum ModeType {
  ADD = 'ADD',
  EDIT = 'EDIT'  
}

const EvaluateExampleTable: React.FC<Props> = ({ examples, form }) => {
  const [modeType, setModeType] = useState<ModeType | null>(null);
  const [evaluateExamples, setEvaluateExamples] = useState<EvaluateExample[]>(examples || []);
  const [showModal, setShowModal] = useState(false);
  const [evaluateExampleRecord, setEvaluateExampleRecord] = useState<EvaluateExampleRecord | null>(null);
  
  useEffect(() => {
    setEvaluateExamples(examples);
  }, [examples])

  useEffect(() => {
    const values = form.getFieldsValue();
    form.setFieldsValue({
      ...values,
      examples: evaluateExamples
    })
  }, [evaluateExamples])

  const onEdit = (record: EvaluateExample, index: number) => {
    setEvaluateExampleRecord({
      ...record,
      index
    });
    setModeType(ModeType.EDIT);
    setShowModal(true);
  };

  const onSave = (_evaluateExample: EvaluateExample, pointer: number) => {
    const _evaluateExamples = clone(evaluateExamples);
    if (modeType !== null && modeType !== ModeType.ADD) {
      const evaluations = _evaluateExamples.map((evaluate: EvaluateExample, index: number) => {
        if (pointer === index) {
          return _evaluateExample;
        }
        return evaluate;
      });
      setEvaluateExamples(evaluations);
      setShowModal(false);
    } else {
      _evaluateExamples.push(_evaluateExample);
      setEvaluateExamples(_evaluateExamples);
      setEvaluateExampleRecord(null);
      setShowModal(false);
    }
  }

  const onDelete = (index: number) => {
    const _promptExamples = clone(evaluateExamples);
    pullAt(_promptExamples, index);
    setEvaluateExamples(_promptExamples);
  }
  
  const columns = [
    {
        title: 'Justification',
        dataIndex: 'justification',
        ellipsis: true,
        width: '70%',
        render: (justification: string) => <>{justification}</>
  
    },
    {
        title: 'Score',
        dataIndex: 'score',
        ellipsis: true,
        width: '20%',
        render: (score: number) => <>{score}</>
    },
    {
        title: 'Actions',
        key: 'actions',
        width: '10%',
        render: (_value: string, record: EvaluateExample, index: number) => {
          return (
            <Flex>
              <Button type="link" onClick={() => onEdit(record, index)} icon={<EditOutlined fontSize="small" />} />
              <Button type="link" onClick={() => onDelete(index)} icon={<DeleteOutlined fontSize="small" />} />
            </Flex>
          );
        }
      }
  ];


  const onRestoreDefaults = () => {
    setEvaluateExamples(examples);
  }
  const onAdd = () => {
    setEvaluateExampleRecord(null);
    setShowModal(true);
    setModeType(ModeType.ADD);
  }
  const onClose = () => {
    setShowModal(false);
    setModeType(null);
    setEvaluateExampleRecord(null);
  }

  const disabled = Array.isArray(evaluateExamples) && evaluateExamples.length === MAX_PROMPT__EXAMPLES;

  return (
    <StyledCard>
      <Flex style={{ marginBottom: '8px',  justifyContent: 'space-between' }}>
        <Flex>
        <StyledTitle>Evaluation Examples</StyledTitle>
        <div className="icon-container">
          <TooltipIcon message={'Provide up to 5 examples of justification score pairs to improve your output dataset'}/> 
        </div>
        </Flex>
        <Flex align='flex-end' gap={15} style={{ marginBottom: '6px' }}>
          <Button type="link" disabled={disabled} onClick={onRestoreDefaults} style={{ paddingRight: 0 }}>
            {'Restore Defaults'}
          </Button>
          <Tooltip title={disabled ? `You can add up to ${MAX_PROMPT__EXAMPLES} examples. To add more, you must remove one.` : undefined}>
            <Button type="link" disabled={disabled} style={{ paddingLeft: 0 }} onClick={onAdd}>
              {'Add Example'}
            </Button>
          </Tooltip>
        </Flex>
      </Flex>
      <Form.Item name='examples'>
        <Table 
          columns={columns} 
          dataSource={evaluateExamples} 
          rowKey={(_record, index) => `table-row-prompt-${index}`}
          pagination={false} 
        />
      </Form.Item>
      {showModal && 
        <PromptExampleModal
          mode={evaluateExampleRecord === null ? MODE.CREATE : MODE.EDIT} 
          example={evaluateExampleRecord} 
          onClose={onClose} 
          onSave={onSave}  
        />}
    </StyledCard>
  );
}

export default EvaluateExampleTable;