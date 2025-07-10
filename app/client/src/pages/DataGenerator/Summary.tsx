import { Descriptions, Flex, Form, Input, List, Modal, Typography, Empty } from 'antd';
import styled from 'styled-components';
import isEmpty from 'lodash/isEmpty';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeMaterial, ModuleRegistry, ClientSideRowModelModule, ValidationModule, TextFilterModule, NumberFilterModule, DateFilterModule, type ColDef, type GetRowIdFunc, type GetRowIdParams, type ICellRendererParams } from 'ag-grid-community';
import toString from 'lodash/toString';

import Markdown from '../../components/Markdown';
import PCModalContent from './PCModalContent'
import { MODEL_PROVIDER_LABELS } from './constants'
import { ModelParameters } from '../../types';
import { ModelProviders, QuestionSolution, Usecases } from './types';
import FreeFormExampleTable from './FreeFormExampleTable';

// Register AG Grid modules
ModuleRegistry.registerModules([
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    ClientSideRowModelModule,
    ValidationModule
]);

const { Title } = Typography;

const MODEL_PARAMETER_LABELS: Record<ModelParameters, string> = {
    [ModelParameters.TOP_K]: 'Top K',
    [ModelParameters.TOP_P]: 'Top P',
    [ModelParameters.MIN_P]: 'Min P',
    [ModelParameters.TEMPERATURE]: 'Temperature',
    [ModelParameters.MAX_TOKENS]: 'Max Tokens',
};

const MarkdownWrapper = styled.div`
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 4px 11px;
`;

const StyledTextArea = styled(Input.TextArea)`
    color: #575757 !important;
    background: #fafafa !important;
    width: auto;
    min-width: 800px;
}
`;

// Improved cell renderer with better text handling
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

const SummaryExampleTable: React.FC<{ data: QuestionSolution[] }> = ({ data }) => {
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

    if (isEmpty(data)) {
        return (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No examples available" />
            </div>
        );
    }

    return (
        <div style={{ 
            height: '300px',
            width: '100%'
        }}>
            <AgGridReact
                theme={themeMaterial}
                columnDefs={colDefs}
                rowData={rowData}
                getRowId={getRowId}
                defaultColDef={defaultColDef}
                suppressRowHoverHighlight={true} // REMOVE hover effects for consistency
                suppressCellFocus={true}
                rowHeight={60}
                domLayout="normal"
                // REMOVE onRowClicked to make it non-interactive like lending/credit data
            />
        </div>
    );
};

const Summary= () => {
    const form = Form.useFormInstance()
    const {
        display_name,
        use_case,
        inference_type,
        model_id,
        num_questions,
        custom_prompt,
        model_parameters,
        workflow_type,
        topics = [],
        schema,
        examples = []
    } = form.getFieldsValue(true);

    console.log('Summary form values:', form.getFieldsValue(true));

    const cfgStepDataSource = [
        { label: 'Dataset Name', children: display_name },
        { label: 'Usecase', children: use_case },
        { label: 'Model Provider', children: MODEL_PROVIDER_LABELS[inference_type as ModelProviders] },
        { label: 'Model Name', children: model_id },
        { label: 'Data Count', children: num_questions },
        { label: 'Total Dataset Size', children: topics === null ? num_questions : num_questions * topics.length },
    ];

    return (
        <Flex vertical gap={20}>
            <div>
                <Title level={4}>{'Configuration'}</Title>
                <Descriptions 
                    bordered
                    column={1}
                    items={cfgStepDataSource}
                />
            </div>
            <div>
                <Title level={4}>{'Prompt'}</Title>
                <StyledTextArea value={custom_prompt} disabled />
            </div>
            {(schema && use_case === Usecases.TEXT2SQL) && (
                <div>
                    <Title level={4}>{'DB Schema'}</Title>
                    <MarkdownWrapper>
                        <Markdown text={schema}/>
                    </MarkdownWrapper>
                </div>
            )}
            {!isEmpty(examples) && 
              <div>
                <Title level={4}>{'Examples'}</Title>
                {workflow_type === 'freeform' ?
                <FreeFormExampleTable  data={examples} /> :
                <SummaryExampleTable data={examples} />}
            </div>}
        </Flex>
    )
};

export default Summary;