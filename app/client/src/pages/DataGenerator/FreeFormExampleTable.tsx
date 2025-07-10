
import isEmpty from 'lodash/isEmpty';
import first from 'lodash/first';
import toString from 'lodash/toString';
import React, { FunctionComponent, useState, useMemo, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Spin, Empty, Typography } from 'antd';
import styled from 'styled-components';

// // Register all Community features
// // ModuleRegistry.registerModules([AllCommunityModule]);
import { themeMaterial } from "ag-grid-community";

import { 
    ModuleRegistry, 
    ClientSideRowModelModule, 
    ValidationModule,
    type ColDef,
    type GetRowIdFunc,
    type GetRowIdParams
 } from 'ag-grid-community';

import { TextFilterModule } from 'ag-grid-community'; 
import { NumberFilterModule } from 'ag-grid-community'; 
import { DateFilterModule } from 'ag-grid-community'; 

// Register all Community features (if needed, specify valid modules here)
ModuleRegistry.registerModules([
    // AllModules,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    // SetFilterModule,
    // MultiFilterModule,
    // GroupFilterModule,
    // CustomFilterModule,

   //  ModuleRegistry,
    // RowGroupingModule,
    // PivotModule,
    // TreeDataModule,
    ClientSideRowModelModule,
    ValidationModule
]);

const { Text } = Typography;

const LoadingContainer = styled.div`
    height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 16px;
`;

interface Props {
    data: Record<string, unknown>[];
    loading?: boolean;
}

const FreeFormExampleTable: FunctionComponent<Props> = ({ data, loading = false }) => {
    const [colDefs, setColDefs] = useState<ColDef[]>([]);
    const [rowData, setRowData] = useState<Record<string, unknown>[]>([]);
    
    useEffect(() => {
        if (!isEmpty(data)) {
            const firstRow = first(data);
            if (firstRow) {
                const columnNames = Object.keys(firstRow);
                const columnDefs = columnNames.map((colName) => ({
                    field: colName,
                    headerName: colName,
                    width: 250,
                    filter: true,
                    sortable: true,
                    resizable: true
                }));
                setColDefs(columnDefs);
                setRowData(data);
            }
        }
    }
    , [data]);
    
    const defaultColDef: ColDef = useMemo(
        () => ({
          flex: 1,
          filter: true,
          enableRowGroup: true,
          enableValue: true,
          editable: false, // Make it non-editable for consistency
          minWidth: 170
        }),
        []
      );
    
      let index = 0;
      const getRowId = useCallback<GetRowIdFunc>(
        ({ data: { ticker } }: GetRowIdParams) => {
            index++;
            return ticker || toString(index);
        },
        []
      );
    
      const statusBar = useMemo(
        () => ({
          statusPanels: [
            { statusPanel: "agTotalAndFilteredRowCountComponent" },
            { statusPanel: "agTotalRowCountComponent" },
            { statusPanel: "agFilteredRowCountComponent" },
            { statusPanel: "agSelectedRowCountComponent" },
            { statusPanel: "agAggregationComponent" },
          ],
        }),
        []
      );

    // Show loading state
    if (loading) {
        return (
            <LoadingContainer>
                <Spin size="large" />
                <Text type="secondary">Loading examples...</Text>
            </LoadingContainer>
        );
    }

    // Show empty state if no data
    if (isEmpty(data)) {
        return (
            <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No examples available" />
            </div>
        );
    }

  return (
    <>
      <div style={{ 
        // minHeight: '600px', 
        overflowX: 'auto', 
        overflowY: 'auto',
        height: '600px',
        display: 'flex',
        flexDirection: 'column'
        }}>
        <AgGridReact
          theme={themeMaterial}
          columnDefs={colDefs}
          rowData={rowData}
          getRowId={getRowId}
          defaultColDef={defaultColDef}
          statusBar={statusBar}
          suppressRowHoverHighlight={true} // Remove hover effects for consistency
          suppressCellFocus={true}
        />
      </div>
    </>
  );
}
export default FreeFormExampleTable;