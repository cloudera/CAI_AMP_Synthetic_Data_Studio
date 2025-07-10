import { Collapse, Flex, Modal } from 'antd';
import styled from 'styled-components';
import isEmpty from 'lodash/isEmpty';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeMaterial, ModuleRegistry, ClientSideRowModelModule, ValidationModule, TextFilterModule, NumberFilterModule, DateFilterModule, type ColDef, type GetRowIdFunc, type GetRowIdParams } from 'ag-grid-community';
import toString from 'lodash/toString';

import { QuestionSolution } from '../DataGenerator/types';
import FreeFormExampleTable from '../DataGenerator/FreeFormExampleTable';
import ExampleModal from './ExampleModal';
import { DatasetResponse } from "../../api/Datasets/response";
import { Dataset } from "../Evaluator/types";

// Register AG Grid modules
ModuleRegistry.registerModules([
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    ClientSideRowModelModule,
    ValidationModule
]);

const { Panel } = Collapse;

const Label = styled.div`
    margin-bottom: 4px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    font-weight: 500;
    margin-bottom: 4px;
    display: block;
    font-size: 14px;
    color: #5a656d;
`;

const StyledCollapse = styled(Collapse)`
    .ant-collapse-content > .ant-collapse-content-box {
        padding: 0 !important;
    }
`;

// Unified AG Grid Table Component for Dataset Details
const DatasetExampleTable: React.FC<{ data: QuestionSolution[] }> = ({ data }) => {
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
                    minWidth: 200,
                    wrapText: true,
                    autoHeight: true,
                },
                {
                    field: 'solution',
                    headerName: 'Completions',
                    flex: 1,
                    filter: true,
                    sortable: true,
                    resizable: true,
                    minWidth: 200,
                    wrapText: true,
                    autoHeight: true,
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
            minWidth: 170,
            wrapText: true,
            autoHeight: true,
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

    const onRowClicked = useCallback((event: { data: QuestionSolution }) => {
        const record = event.data;
        Modal.info({
            title: 'View Details',
            content: <ExampleModal {...record} />,
            icon: undefined,
            maskClosable: false,
            width: 1000
        });
    }, []);

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
                onRowClicked={onRowClicked}
                rowSelection="single"
                suppressRowHoverHighlight={false}
                suppressCellFocus={true}
            />
        </div>
    );
};

export type DatasetDetailProps = {
    datasetDetails: DatasetResponse | Dataset;
}

const ExamplesSection= ({ datasetDetails }: DatasetDetailProps)  => {
    // Handle both DatasetResponse and Dataset types
    const technique = 'technique' in datasetDetails ? datasetDetails.technique : 'sft';
    const examples = datasetDetails.examples || [];

    return (
     
        <StyledCollapse ghost style={{ marginLeft: '-1em' }}>
            <Panel
                key="exmaples"
                header={<Label>Examples</Label>}
                style={{ padding: 0 }}
            >        
                <Flex vertical gap="middle">
                    {technique === 'freeform' ? (
                        <FreeFormExampleTable
                            data={examples as any}
                        />    
                    ) : 
                    <DatasetExampleTable data={examples as QuestionSolution[]} />}
            </Flex>
            </Panel>
        </StyledCollapse>
    )
}

export default ExamplesSection;