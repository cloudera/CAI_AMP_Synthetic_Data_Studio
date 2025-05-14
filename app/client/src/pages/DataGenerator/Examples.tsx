import first from 'lodash/first';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React, { useEffect } from 'react';
import { Button, Form, Modal, Space, Table, Tooltip, Typography, Flex, Input, Empty } from 'antd';
import { CloudUploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useMutation } from "@tanstack/react-query";
import { useFetchExamples } from '../../api/api';
import TooltipIcon from '../../components/TooltipIcon';
import PCModalContent from './PCModalContent';
import { File, QuestionSolution, WorkflowType } from './types';
import FileSelectorButton from './FileSelectorButton';

import { fetchFileContent } from './hooks';
import { useState } from 'react';
import FreeFormExampleTable from './FreeFormExampleTable';
import { useWizardCtx } from './utils';

const { Title } = Typography;
const Container = styled.div`
    padding-bottom: 10px
`
const Header = styled(Flex)`
    margin-bottom: 15px;
    padding-top: 18px;
`
const StyledTitle = styled(Title)`
    margin: 0;
`
const ModalButtonGroup = styled(Flex)`
    margin-top: 15px !important;
`
const StyledTable = styled(Table)`
    .ant-table-row {
        cursor: pointer;
    }
`

const StyledContainer = styled.div`
  margin-bottom: 24px;
  height: 48px;
  color: rgba(0, 0, 0, 0.45);
  svg {
    font-size: 48px;
  } 

`;

const MAX_EXAMPLES = 5;

enum ExampleType {
  FREE_FORM = 'freeform',
  PROMPT_COMPLETION = 'promptcompletion'
}

const Examples: React.FC = () => {
    const form = Form.useFormInstance();
    const [exampleType, setExampleType] = useState(ExampleType.PROMPT_COMPLETION);
    
    const mutation = useMutation({
        mutationFn: fetchFileContent
    });
    const values = form.getFieldsValue(true)

    useEffect(() => {
        const example_path = form.getFieldValue('example_path');

        if (!isEmpty(example_path)) {
            mutation.mutate({
                path: example_path      
            });
        }

        if (form.getFieldValue('workflow_type') === 'freeform') {
            setExampleType(ExampleType.FREE_FORM);
        }
       
        

     }, [form.getFieldValue('example_path'), form.getFieldValue('workflow_type')]);

    useEffect(() => {   
        if (!isEmpty(mutation.data)) {
            form.setFieldValue('examples', mutation.data);
        }
    }, [mutation.data]); 

    const { setIsStepValid } = useWizardCtx();
    const _values = Form.useWatch(['examples', 'example_path'], form);
    useEffect (() => {
        const values = form.getFieldsValue();
        if (isEmpty(values.examples) && isEmpty(form.getFieldValue('example_path'))) {
            setIsStepValid(false);
        } else {
            setIsStepValid(true);
        }
    }, [_values, form.getFieldValue('example_path')]);

    const columns = [
        {
            title: 'Prompts',
            dataIndex: 'question',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.question}</>
        },
        {
            title: 'Completions',
            dataIndex: 'solution',
            ellipsis: true,
            render: (_text: QuestionSolution, record: QuestionSolution) => <>{record.solution}</>
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 130,
            render: (_text: QuestionSolution, record: QuestionSolution, index: number) => {
                const { question, solution } = record;
                const editRow = (data: QuestionSolution) => {
                    const updatedExamples = [...form.getFieldValue('examples')];
                    updatedExamples.splice(index, 1, data);
                    form.setFieldValue('examples', updatedExamples);
                    Modal.destroyAll()
                }
                const deleteRow = () => {
                    const updatedExamples = [...form.getFieldValue('examples')];
                    updatedExamples.splice(index, 1);
                    form.setFieldValue('examples', updatedExamples);
                }
                return (
                    <Flex>
                        <Button
                            icon={<EditOutlined />}
                            type='link'
                            onClick={(e) => {
                                e.stopPropagation();
                                return  Modal.info({ 
                                    title: 'Edit Example',
                                    closable: true,
                                    content: (
                                        <PCModalContent
                                            question={question}
                                            solution={solution}
                                            onSubmit={editRow}
                                            readOnly={false}
                                        />
                                    ),
                                    icon: undefined,
                                    maskClosable: true,
                                    footer: null, // Modal submit footerbtns handled by content component
                                    width: 1000
                                })
                            }}
                        />
                        <Button
                            icon={<DeleteOutlined />}
                            type='link'
                            onClick={(e) => {
                                e.stopPropagation();
                                return  Modal.warning({ 
                                    title: 'Remove Example',
                                    closable: true,
                                    content: (
                                        <PCModalContent
                                            question={question}
                                            solution={solution}
                                        />
                                    ),
                                    icon: undefined,
                                    footer: (
                                        <ModalButtonGroup gap={8} justify='end'>
                                            <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
                                            <Button
                                                onClick={() => {
                                                    deleteRow()
                                                    Modal.destroyAll()
                                                }}
                                                type='primary'
                                                color='danger'
                                                variant='solid'
                                            >
                                                {'Remove'}
                                            </Button>
                                        </ModalButtonGroup>
                                    ),
                                    maskClosable: true,
                                    width: 1000
                                })
                            }}
                        />
                    </Flex>
            )
        }},
    ];
    const dataSource = Form.useWatch('examples', form);
    const { data: examples, loading: examplesLoading } = useFetchExamples(form.getFieldValue('use_case'));
    if (!dataSource && examples) {
        form.setFieldValue('examples', examples.examples)
    }
    const rowLimitReached = form.getFieldValue('examples')?.length === MAX_EXAMPLES;
    const workflowType = form.getFieldValue('workflow_type');

    const onAddFiles = (files: File[]) => {
      if (!isEmpty (files)) {
        const file = first(files);
        mutation.mutate({
            path: get(file, '_path'),      
        });
        const values = form.getFieldsValue();
        form.setFieldsValue({
            ...values,
            example_path: get(file, '_path')
        });
        setExampleType(ExampleType.FREE_FORM);
      }
    }

    const labelCol = {
        span: 10
    };

    return (
        <Container>
            <Header align='center' justify='space-between'>
                <StyledTitle level={3}>
                    <Space>
                        <>{'Examples'}</>
                        <TooltipIcon message={'Provide up to 5 examples of prompt completion pairs to improve your output dataset'}/>
                    </Space>
                </StyledTitle>
                <Flex align='center' gap={15}>       
                    {workflowType === WorkflowType.FREE_FORM_DATA_GENERATION && 
                      <>
                        <Form.Item
                            name="example_path"
                            tooltip='Upload a JSAON file containing examples'
                            labelCol={labelCol}
                            style={{ display: 'none' }}
                            shouldUpdate
                            rules={[
                               { required: true }
                            ]}
                        >
                            <Input disabled />
                        </Form.Item>
                        <FileSelectorButton onAddFiles={onAddFiles} workflowType={workflowType} label="Import"/>
                      </>
                    }
                    
                    {exampleType !== ExampleType.FREE_FORM && 
                    <Button
                        onClick={() => {
                            return Modal.warning({
                                title: 'Restore default example',
                                closable: true,
                                content: <>{'Are you sure you want to restore to default examples? All previously created examples will be lost.'}</>,
                                footer: (
                                    <ModalButtonGroup gap={8} justify='end'>
                                        <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
                                        <Button
                                            onClick={() => {
                                                if (examples?.examples) {
                                                    form.setFieldValue('examples', [...examples.examples]);
                                                }
                                                Modal.destroyAll();
                                            }}
                                            type='primary'
                                        >
                                            {'Confirm'}
                                        </Button>
                                    </ModalButtonGroup>
                                ),
                                maskClosable: true,
                            })
                        }}
                    >
                        {'Restore Defaults'}
                    </Button>}
                   
                    {exampleType !== ExampleType.FREE_FORM && 
                    <Tooltip title={rowLimitReached ? `You can add up to ${MAX_EXAMPLES} examples. To add more, you must remove one.` : undefined}>
                        <Button
                            disabled={rowLimitReached}
                            onClick={(e) => {
                                e.stopPropagation();
                                const addRow = (data: QuestionSolution) => {
                                    const updatedExamples = [...form.getFieldValue('examples'), data];
                                    form.setFieldValue('examples', updatedExamples);
                                    Modal.destroyAll();
                                }
                                return  Modal.info({ 
                                    title: 'Add Example',
                                    closable: true,
                                    content: (
                                        <PCModalContent
                                            onSubmit={addRow}
                                            readOnly={false}
                                        />
                                    ),
                                    icon: undefined,
                                    footer: null, // Modal submit footerbtns handled by content component
                                    maskClosable: true,
                                    width: 1000
                                })
                            }}
                        >
                            {'Add Example'}
                        </Button>
                    </Tooltip>}
                </Flex>
            </Header>
            {exampleType === ExampleType.FREE_FORM && !isEmpty(mutation.data) && 
              <FreeFormExampleTable  data={mutation.data}/>}
            {exampleType === ExampleType.FREE_FORM && isEmpty(mutation.data) && !isEmpty(values.examples) && 
              <FreeFormExampleTable  data={values.examples}/>}  
            {exampleType === ExampleType.FREE_FORM && isEmpty(mutation.data) && isEmpty(values.examples) &&
                <Empty
                image={
                   <StyledContainer>
                     <CloudUploadOutlined />
                   </StyledContainer>
                }
                imageStyle={{
                    height: 60,
                    marginBottom: 24
                }}
                description={
                  <>
                    <h4>
                    Upload a JSON file containing examples
                    </h4>
                    <p>
                    {'Examples should be in the format of a JSON array containing array of key & value pairs. The key should be the column name and the value should be the cell value.'}
                    </p>
                  </>
                }
              >
              </Empty>
            }  
            {exampleType !== ExampleType.FREE_FORM && 
            <Form.Item
                name='examples'
            >
                <StyledTable
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    loading={examplesLoading}
                    onRow={(record) => ({
                        onClick: () => Modal.info({ 
                            title: 'View Details',
                            content: <PCModalContent {...record}/>,
                            icon: undefined,
                            maskClosable: true,
                            width: 1000
                        })
                    })}
                    rowClassName={() => 'hover-pointer'}
                    rowKey={(_record, index) => `examples-table-${index}`}
                />
            </Form.Item>}
            
        </Container>
    )
};
export default Examples;