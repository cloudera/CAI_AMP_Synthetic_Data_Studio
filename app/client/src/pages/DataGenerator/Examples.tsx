import { useEffect, useRef } from 'react';
import { Button, Form, Modal, Space, Skeleton, Table, Tooltip, Typography, Flex } from 'antd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import styled from 'styled-components';

import { useFetchExamples } from '../../api/api';
import TooltipIcon from '../../components/TooltipIcon';
import PCModalContent from './PCModalContent';
import { QuestionSolution, WorkflowType } from './types';

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
const MAX_EXAMPLES = 5;

const Examples = () => {
    const form = Form.useFormInstance();
    console.log('-------Examples', form.getFieldsValue());
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
                    <Space>
                        <Button
                            icon={<EditIcon/>}
                            type='text'
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
                            icon={<DeleteIcon/>}
                            type='text'
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
                    </Space>
            )
        }},
    ];
    const dataSource = Form.useWatch('examples', form);
    const { data: examples, loading: examplesLoading } = useFetchExamples(form.getFieldValue('use_case'));
    if (!dataSource && examples) {
        form.setFieldValue('examples', examples.examples)
    }
    const rowLimitReached = form.getFieldValue('examples')?.length === MAX_EXAMPLES;
    const workflow_type = form.getFieldValue('workflow_type');
    console.log('workflow_type', workflow_type);

    const isCustomWorkflow = workflow_type === WorkflowType.CUSTOM_DATA_GENERATION;
    if (isCustomWorkflow) {
        columns.shift();
    }

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
                                                examples?.examples &&
                                                    form.setFieldValue('examples', [...examples.examples]);
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
                    </Button>
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
                    </Tooltip>
                </Flex>
            </Header>
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
            </Form.Item>
            
        </Container>
    )
};
export default Examples;