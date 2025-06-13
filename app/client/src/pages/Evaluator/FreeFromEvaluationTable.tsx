import first from 'lodash/first';
import isEmpty from 'lodash/isEmpty';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import Paragraph from 'antd/es/typography/Paragraph';
// import { TextFilterModule } from 'ag-grid-community'; 
// import { NumberFilterModule } from 'ag-grid-community'; 
// import { DateFilterModule } from 'ag-grid-community'; 
import { 
    // ModuleRegistry, 
    // ClientSideRowModelModule, 
    // ValidationModule,
    type ColDef,
    type GetRowIdFunc,
    type GetRowIdParams
 } from 'ag-grid-community'; 

 import { themeMaterial } from "ag-grid-community";
import get from 'lodash/get';
import { getColorCode } from './util';
import { Badge, Popover } from 'antd';
import styled from 'styled-components';

interface Props {
    data: unknown[];
}

const StyledParagraph = styled(Paragraph)`
    font-size: 13px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    color:  #5a656d;
`;

const FreeFormEvaluationTable: React.FC<Props> = ({ data }) => {
    const [colDefs, setColDefs] = useState([]);
    const [rowData, setRowData] = useState([]);
       
    useEffect(() => {
           if (!isEmpty(data)) {
               const rows = data.map((item) => {
                  const row = get(item, 'row');
                  return {
                    score: get(item, 'evaluation.score'),
                    justification: get(item, 'evaluation.justification'),
                    ...row
                  }
                       
               });
               
               const columnNames = Object.keys(first(rows));
               const columnDefs = columnNames.map((colName) => {
                const columnDef = {
                    field: colName,
                    headerName: colName,
                    width: 250,
                    filter: true,
                    sortable: true,
                    resizable: true
                } 
                if (colName === 'score') {
                    columnDef['width'] = 120
                    columnDef['cellRenderer'] = (params: unknown) => {
                      return <Badge count={params.value} color={getColorCode(params.value)} showZero />
                    }
                } else if (colName === 'justification') {
                    columnDef['cellRenderer'] = (params: unknown) => (
                        <Popover title="Justification" placement="rightTop" content={params.value}>
                            <StyledParagraph style={{ width: 200, marginBottom: 0 , paddingTop: '12px', paddingBottom: '12px' }} ellipsis={{ rows: 1 }}>
                              {params.value}
                            </StyledParagraph>
                        </Popover>
                    );
                }

                return columnDef;
            });
               setColDefs(columnDefs);
               setRowData(rows);
           }
       }, [data]);
       
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

export default FreeFormEvaluationTable;