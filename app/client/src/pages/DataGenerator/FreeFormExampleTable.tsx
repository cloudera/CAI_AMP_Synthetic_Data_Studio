
import isEmpty from 'lodash/isEmpty';
import first from 'lodash/first';
import toString from 'lodash/toString';
import React, { FunctionComponent, useState, useMemo, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';

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

interface Props {
    data: Record<string, unknown>[];
}

const FreeFormExampleTable: FunctionComponent<Props> = ({ data }) => {
    const [colDefs, setColDefs] = useState([]);
    const [rowData, setRowData] = useState([]);
    console.log('FreeFormExampleTable', data);
    
    useEffect(() => {
        if (!isEmpty(data)) {
            const columnNames = Object.keys(first(data));
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
    , [data]);
    
    const defaultColDef: ColDef = useMemo(
        () => ({
          flex: 1,
          filter: true,
          enableRowGroup: true,
          enableValue: true,

          editable: true,
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


  return (
    <>
      <div style={{ 
        // minHeight: '600px', 
        xScroll: 'auto', 
        yScroll: 'auto',
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
        />
      </div>
    </>
  );
}
export default FreeFormExampleTable;