import first from 'lodash/first';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Button, Form, Modal, Space, Typography, Flex, Input, Empty, Spin } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useMutation } from "@tanstack/react-query";
import { useLocation } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { themeMaterial, ModuleRegistry, ClientSideRowModelModule, ValidationModule, TextFilterModule, NumberFilterModule, DateFilterModule, type ColDef, type GetRowIdFunc, type GetRowIdParams, type ICellRendererParams } from 'ag-grid-community';
import toString from 'lodash/toString';

import TooltipIcon from '../../components/TooltipIcon';
import PCModalContent from './PCModalContent';
import { ExampleType, File, QuestionSolution, WorkflowType } from './types';
import FileSelectorButton from './FileSelectorButton';

import { fetchFileContent, getExampleType, useGetExamplesByUseCase } from './hooks';
import FreeFormExampleTable from './FreeFormExampleTable';

// Register AG Grid modules
ModuleRegistry.registerModules([
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    ClientSideRowModelModule,
    ValidationModule
]);

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

const StyledContainer = styled.div`
  margin-bottom: 24px;
  height: 48px;
  color: rgba(0, 0, 0, 0.45);
  svg {
    font-size: 48px;
  } 
`;

const LoadingContainer = styled.div`
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 16px;
`;

// Simple cell renderer without click interactions
const TextCellRenderer = (params: ICellRendererParams) => {
    const { value } = params;
    if (!value) return '';
    
    return (
        <div 
            style={{ 
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                lineHeight: '1.5',
                padding: '8px 4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}
        >
            {value}
        </div>
    );
};

// Unified AG Grid Table Component for all templates - READ-ONLY
const UnifiedExampleTable: React.FC<{ data: QuestionSolution[], loading?: boolean }> = ({ data, loading = false }) => {
    const [colDefs, setColDefs] = useState<ColDef[]>([]);
    const [rowData, setRowData] = useState<QuestionSolution[]>([]);
    
    useEffect(() => {
        if (!isEmpty(data)) {
            const columnDefs: ColDef[] = [
                {
                    field: 'question',
                    headerName: 'Prompts',
                    flex: 1,
                    filter: true,
                    sortable: true,
                    resizable: true,
                    minWidth: 300,
                    cellRenderer: TextCellRenderer,
                    wrapText: true,
                    autoHeight: false,
                },
                {
                    field: 'solution',
                    headerName: 'Completions',
                    flex: 1,
                    filter: true,
                    sortable: true,
                    resizable: true,
                    minWidth: 300,
                    cellRenderer: TextCellRenderer,
                    wrapText: true,
                    autoHeight: false,
                }
            ];
            setColDefs(columnDefs);
            setRowData(data);
        }
    }, [data]);
    
    const defaultColDef: ColDef = useMemo(
        () => ({
            flex: 1,
            filter: true,
            sortable: true,
            resizable: true,
            minWidth: 250,
        }),
        []
    );
    
    let index = 0;
    const getRowId = useCallback<GetRowIdFunc>(
        ({ data: rowData }: GetRowIdParams) => {
            index++;
            return toString(index);
        },
        []
    );

    if (loading) {
        return (
            <LoadingContainer>
                <Spin size="large" />
                <Text type="secondary">Loading examples...</Text>
            </LoadingContainer>
        );
    }

    if (isEmpty(data)) {
        return (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No examples available" />
            </div>
        );
    }

    return (
        <div style={{ 
            height: '400px',
            width: '100%'
        }}>
            <AgGridReact
                theme={themeMaterial}
                columnDefs={colDefs}
                rowData={rowData}
                getRowId={getRowId}
                defaultColDef={defaultColDef}
                suppressRowHoverHighlight={true} // REMOVE hover effects
                suppressCellFocus={true}
                rowHeight={60}
                domLayout="normal"
                // REMOVE onRowClicked and rowSelection to make it non-interactive like lending/credit data
            />
        </div>
    );
};

const Examples: React.FC = () => {
    const form = Form.useFormInstance();
    const location = useLocation();
    const [exampleType, setExampleType] = useState(ExampleType.PROMPT_COMPLETION);
    
    const mutation = useMutation({
        mutationFn: fetchFileContent
    });
    
    // Get ALL form values - this works consistently during regeneration
    const allFormValues = form.getFieldsValue(true);
    const { examples = [] } = allFormValues;

    // Check if this is a regeneration scenario
    const isRegenerating = location.state?.data || location.state?.internalRedirect;
    const useCase = form.getFieldValue('use_case');
    const workflowType = form.getFieldValue('workflow_type');

    // CRITICAL FIX: Determine example type immediately when examples are available
    // This prevents race conditions and eliminates back-and-forth loading issues
    const currentExampleType = useMemo(() => {
        // Priority 1: If workflow is freeform, always use FREE_FORM
        if (workflowType === 'freeform') {
            return ExampleType.FREE_FORM;
        }
        
        // Priority 2: If we have examples data, determine type from the data structure
        if (!isEmpty(examples)) {
            return getExampleType(examples) as ExampleType;
        }
        
        // Priority 3: If we have mutation data (file upload), it's always FREE_FORM
        if (!isEmpty(mutation.data)) {
            return ExampleType.FREE_FORM;
        }
        
        // Priority 4: Default to PROMPT_COMPLETION for 2-column templates
        return ExampleType.PROMPT_COMPLETION;
    }, [workflowType, examples, mutation.data]);

    useEffect(() => {
        const example_path = form.getFieldValue('example_path');

        // Only try to load from example_path if we're not regenerating and have a path
        if (!isRegenerating && !isEmpty(example_path)) {
            mutation.mutate({
                path: example_path      
            });
        }
    }, [form.getFieldValue('example_path'), isRegenerating]);

    useEffect(() => {   
        // Only set examples from mutation data if we're not regenerating
        if (!isRegenerating && !isEmpty(mutation.data)) {
            form.setFieldValue('examples', mutation.data);
        }
    }, [mutation.data, isRegenerating]);
    
    // CRITICAL FIX: Don't make API call at all during regeneration or when we already have examples
    const shouldFetchFromAPI = !isRegenerating && isEmpty(examples) && !isEmpty(useCase);
    const { examples: apiExamples, exmpleFormat, isLoading: examplesLoading } = 
        useGetExamplesByUseCase(shouldFetchFromAPI ? useCase : '');
    
    // Only update examples from API if we're not regenerating and don't have existing examples
    useEffect(() => {
        if (!isRegenerating && isEmpty(examples) && apiExamples) {
            form.setFieldValue('examples', apiExamples)
        }
    }, [apiExamples, examples, isRegenerating]);

    // REMOVED: The problematic useEffect that caused race conditions
    // The exampleType is now determined synchronously via useMemo above

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

    // FIXED: Show loading when we should fetch from API AND the API is actually loading
    // This ensures the spinner shows up when the API call is in progress
    const shouldShowLoading = shouldFetchFromAPI && examplesLoading;

    return (
        <Container>
            <Header align='center' justify='space-between'>
                <StyledTitle level={3}>
                    <Space>
                        <>{'Examples'}</>
                        <TooltipIcon message={'View examples that guide the generation of your dataset'}/>
                    </Space>
                </StyledTitle>
                <Flex align='center' gap={15}>       
                    {workflowType === 'freeform' && 
                      <>
                        <Form.Item
                            name="example_path"
                            tooltip='Upload a JSON file containing examples'
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
                </Flex>
            </Header>
            {currentExampleType === ExampleType.FREE_FORM ? (
                workflowType === 'freeform' && isEmpty(examples) && isEmpty(mutation.data) && !shouldShowLoading ? (
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
                ) : (
                    <FreeFormExampleTable 
                        data={mutation.data || examples} 
                        loading={shouldShowLoading && isEmpty(examples) && isEmpty(mutation.data)} 
                    />
                )
            ) : (
              <Form.Item
                  name='examples'
              >
                  <UnifiedExampleTable data={examples} loading={shouldShowLoading} />
              </Form.Item>
            )}
            
        </Container>
    )
};
export default Examples;