import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Dataset } from '../Evaluator/types';
import { Col, Flex, Modal, Row } from 'antd';
import styled from 'styled-components';
import { AgGridReact } from 'ag-grid-react';
import { themeMaterial, ModuleRegistry, ClientSideRowModelModule, ValidationModule, TextFilterModule, NumberFilterModule, DateFilterModule, type ColDef, type GetRowIdFunc, type GetRowIdParams } from 'ag-grid-community';
import toString from 'lodash/toString';

import { QuestionSolution } from '../DataGenerator/types';
import FreeFormExampleTable from '../DataGenerator/FreeFormExampleTable';
import ExampleModal from './ExampleModal';
import { ICellRendererParams } from 'ag-grid-community';
import { Empty } from 'antd';
import PCModalContent from '../DataGenerator/PCModalContent';

// Register AG Grid modules
ModuleRegistry.registerModules([
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    ClientSideRowModelModule,
    ValidationModule
]);

interface Props {
    dataset: Dataset;
}

const Container = styled.div`
    background-color: #ffffff;
    padding: 1rem;
`;

const StyledTitle = styled.div`
    margin-bottom: 4px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-weight: 500;
    margin-bottom: 4px;
    display: block;
    font-size: 14px;
    color: #5a656d;
`;

export const TagsContainer = styled.div`
  min-height: 30px;
  display: block;
  margin-bottom: 4px;
  margin-top: 4px;
  .ant-tag {
    max-width: 150px;
  }
  .tag-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

// Unified AG Grid Table Component for Configuration
const ConfigurationExampleTable: React.FC<{ data: QuestionSolution[] }> = ({ data }) => {
    const [colDefs, setColDefs] = useState<ColDef[]>([]);
    const [rowData, setRowData] = useState<QuestionSolution[]>([]);
    
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

const ConfigurationTab: React.FC<Props> = ({ dataset }) => {

    return (
        <Container>
            <Row style={{ marginTop: '16px', marginBottom: '8px' }}>
                <Col sm={24}>
                    <Flex vertical>
                        <StyledTitle>Examples</StyledTitle>
                        {dataset.technique === 'freeform' && <FreeFormExampleTable data={dataset.examples as any} />}
                        {dataset.technique !== 'freeform' && 
                        <ConfigurationExampleTable data={dataset.examples as unknown as QuestionSolution[]} />}
                    </Flex>
                </Col>
            </Row>
        </Container>

    );
};

export default ConfigurationTab;


