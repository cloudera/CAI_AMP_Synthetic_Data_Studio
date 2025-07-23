import first from 'lodash/first';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React, { FunctionComponent, useEffect } from 'react';
import { Button, Form, Modal, Space, Table, Tooltip, Typography, Flex, Input, Empty } from 'antd';
import { CloudUploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useMutation } from "@tanstack/react-query";
import { useFetchExamples } from '../../api/api';
import TooltipIcon from '../../components/TooltipIcon';
import PCModalContent from './PCModalContent';
import { ExampleType, File, QuestionSolution, WorkflowType } from './types';
import FileSelectorButton from './FileSelectorButton';

import { fetchFileContent, getExampleType, useGetExamplesByUseCase } from './hooks';
import { useState } from 'react';
import FreeFormExampleTable from './FreeFormExampleTable';
import { L } from 'vitest/dist/chunks/reporters.DTtkbAtP.js';
import Loading from '../Evaluator/Loading';
import { isEqual, set } from 'lodash';

const { Title, Text } = Typography;
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


const Examples: FunctionComponent = () => {
    const form = Form.useFormInstance();
    const [records, setRecords] = useState<Record<string, string>[]>([]);
    const workflowType = form.getFieldValue('workflow_type');
    const { examples, isLoading: examplesLoading, refetch } = 
        useGetExamplesByUseCase(form.getFieldValue('use_case'));

    const mutation = useMutation({
        mutationFn: fetchFileContent
    });

    useEffect(() => {
        const example_path = form.getFieldValue('example_path');
        if (!isEmpty(example_path)) {
            mutation.mutate({
                path: example_path      
            });
        }
     }, [form.getFieldValue('example_path'), form.getFieldValue('workflow_type')]);

    useEffect(() => {  
        console.log('------------------> useEffect')
        if (!isEmpty(mutation.data)) {
            form.setFieldValue('examples', mutation.data);
            if (!isEqual(mutation.data, records)) {
               setRecords(mutation.data);
            }
            
        } else if (Array.isArray(examples) && !isEqual(examples, records)) {
            form.setFieldValue('examples', examples);
            setRecords(examples);
        }
    }, [mutation.data, examples]);
    
    

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
      }
    }

    const labelCol = {
        span: 10
    };

    const showEmptyState = workflowType === WorkflowType.FREE_FORM_DATA_GENERATION && 
        isEmpty(mutation.data) &&
        records.length === 0;

    console.log('examples', form.getFieldValue('examples'));
    console.log('records', records);

    return (
        <Container>
            {examplesLoading && <Loading />}
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
                    <Button
                        onClick={() => {
                            return Modal.warning({
                                title: 'Restore',
                                closable: true,
                                content: <>{'Are you sure you want to restore to default examples? All previously created examples will be lost.'}</>,
                                footer: (
                                    <ModalButtonGroup gap={8} justify='end'>
                                        <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
                                        <Button
                                            onClick={() => {
                                                refetch();
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
                </Flex>
            </Header>
            {!isEmpty(records) && <FreeFormExampleTable  data={form.getFieldValue('examples')}/>}  
            {showEmptyState && (
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
                        {`Upload a JSON file containing examples`}
                        </h4>
                        <p>
                        {'Examples should be in the format of a JSON array containing array of key & value pairs. The key should be the column name and the value should be the cell value.'}
                        </p>
                      </>
                    }
                  />
            )}
        </Container>
    )
};
export default Examples;