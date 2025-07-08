import endsWith from 'lodash/endsWith';
import filter from 'lodash/filter';
import clone from 'lodash/clone';
import set from 'lodash/set';
import forEach from 'lodash/forEach';
import React, { useEffect, useState } from 'react';
import { Badge, Breadcrumb, Button, Col, Flex, List, Popover, Row, Table, Tooltip, Typography } from 'antd';
import styled from 'styled-components';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import { getFileSize, isDirectory } from './utils';
import { File, WorkflowType } from './types';
import { useGetProjectFiles } from './hooks';
import isEmpty from 'lodash/isEmpty';
import Loading from '../Evaluator/Loading';

const DIRECTORY_MIME_TYPE = 'inode/directory';

interface Props {
  workflowType: WorkflowType;
  files: File[];
  onSelectedRows: (selectedRows: File[]) => void;
  enableJsonFiles?: boolean;
}

const StyledTable = styled(Table)`
  font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
  color: #5a656d;
  .ant-table-thead > tr > th {
    color: #5a656d;
    border-bottom: 1px solid #eaebec;
    font-weight: 500;
    text-align: left;
    // background: #ffffff;
    border-bottom: 1px solid #eaebec;
    transition: background 0.3s ease;
  }
  .ant-table-row > td.ant-table-cell {
    padding: 8px;
    padding-left: 16px;
    font-size: 13px;
    font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    color: #5a656d;
    .ant-typography {
      font-size: 13px;
      font-family: Roboto, -apple-system, 'Segoe UI', sans-serif;
    }
  }
`;

const StyledButton = styled(Button)`
  padding-left: 0;
`;

interface RowSelectionMap {
  [key: string]: React.Key[];
}

interface FileSelectionMap {
  [key: string]: File[];
}

export const getSelectedRowKeys = (rowKeySelectionMap: RowSelectionMap) => {
  let rowKeys: React.Key[] = [];
  // retrieve all the selected row keys
  const keyPaths = Object.keys(rowKeySelectionMap);
  forEach(keyPaths, key => {
    rowKeys = rowKeys.concat(rowKeySelectionMap[key]);
  });
  return rowKeys;
}

export const getSelectedRows = (fileSelectionMap: FileSelectionMap) => {
  let rows: File[] = [];
  // retrieve all the selected row keys
  const keyPaths = Object.keys(fileSelectionMap);
  forEach(keyPaths, key => {
    rows = rows.concat(fileSelectionMap[key]);
  });
  return rows;
}


const FilesTable: React.FC<Props> = ({ onSelectedRows, workflowType, enableJsonFiles }) => {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [, setSelectedRows] = useState<File[]>([]);
  // row selection map: path as key -> list of row keys
  const [rowSelectionMap, setRowSelectionMap] = useState<RowSelectionMap>({});
  // row selection map: path as key -> list of files
  const [fileSelectionMap, setFileSelectionMap] = useState<FileSelectionMap>({});
  const { fetching, listProjectFiles, data } = useGetProjectFiles();

  useEffect(() => {
    if (!isEmpty(path) || paths === null || isEmpty(paths)) {
      listProjectFiles({
        path: path === null ? '' : path
      });
    }
  }, [path, paths]);

  const filteredFiles = filter(data, (file: File) => {
    return !file.name.startsWith('.');
  });

  const isSelectionDisabled = (record: File) => {
    if (isDirectory(record)) {
      return true;
    }
    if (enableJsonFiles) {
      return false;
    }

    if (workflowType === WorkflowType.SUPERVISED_FINE_TUNING) {
      return !endsWith(record.name, '.pdf');
    } else if (workflowType === WorkflowType.CUSTOM_DATA_GENERATION) {
      return !endsWith(record.name, '.json')
    }
    return false;
  }

  const rowSelection = {
    getCheckboxProps: (record:File) => ({
      ...record,
      disabled: isSelectionDisabled(record)
    }),
    onChange: (_selectedRowKeys: React.Key[], _selectedRows: File[]) => {
      const selectedRowsWithPath = _selectedRows.map((row: File) => ({
        ...row,
        path: `${Array.isArray(paths) && !isEmpty(paths) ? paths?.join('/') + '/' : ''}${row.name}`
      })) 
      // update row key map by path
      let newRowSelectionMap = clone(rowSelectionMap);
      newRowSelectionMap = set(newRowSelectionMap, path as string, _selectedRowKeys);
      setRowSelectionMap(newRowSelectionMap);
      // update row map  by path
      let newFileSelectionMap = clone(fileSelectionMap);
      newFileSelectionMap = set(newFileSelectionMap, path as string, selectedRowsWithPath);
      setFileSelectionMap(newFileSelectionMap);
      setSelectedRowKeys(getSelectedRowKeys(newRowSelectionMap));
      setSelectedRows(getSelectedRows(newFileSelectionMap));
      onSelectedRows(getSelectedRows(newFileSelectionMap));
    },
    selectedRowKeys
  };

  const onClick = (file: File) => {
    const subPaths = clone(Array.isArray(paths) ? paths : []);
    subPaths.push(file.name);
    setPaths(subPaths);
    setPath(subPaths.join('/'));
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      ellipsis: true,
      render: (file: File) => {
        const { name } = file;

        if (file?.mime !== DIRECTORY_MIME_TYPE) {
          return (
            <Flex>
              <FileOutlined style={{ marginTop: '2px' }} />
              <span style={{ marginLeft: '4px' }}>
                 <Tooltip title={name}>
                   <Typography.Text style={{ maxWidth: '300px' }} ellipsis={true}>{name}</Typography.Text>
                 </Tooltip>
              </span>
            </Flex>
          );
        }
        return (
          <StyledButton
            type="link"
            onClick={() => onClick(file)}
            icon={file?.mime === DIRECTORY_MIME_TYPE ? <FolderOutlined /> : <FileOutlined />}
          >
            {name}
          </StyledButton>
        );
      },
      sortDirections: ['descend', 'ascend']
    },
    {
      title: 'Size',
      key: 'size',
      render: (file: File) => getFileSize(file.size, false)
    }
  ];
  const hasSelected = selectedRowKeys.length !== 0;

  return (
    <>
      <Row style={{ marginBottom: '12px' }}>
        <Col sm={20}>
          {!isEmpty(path) && (
            <Breadcrumb>
              <Breadcrumb.Item
                onClick={() => {
                  setPaths([]);
                  setPath(null);
                }}
              >
                {'root'}
              </Breadcrumb.Item>
              {Array.isArray(paths) && paths.map((path: string) => (
                <Breadcrumb.Item>{path}</Breadcrumb.Item>
              ))}
            </Breadcrumb>
          )}
        </Col>
        {fetching && <Loading />}

        <Col sm={4}>
          <Flex style={{ flexDirection: 'row-reverse' }}>
            {hasSelected && (
              <Popover
                content={
                  <>
                    <List
                      style={{ width: '250px' }}
                      size="small"
                      bordered
                      dataSource={selectedRowKeys}
                      renderItem={item => <List.Item>{item}</List.Item>}
                    />
                  </>
                }
                trigger="click"
              >
                <Button type="link">
                  <>
                    <span style={{ marginRight: '3px' }}>{`Selected `}</span>
                    <Badge
                      count={selectedRowKeys.length}
                      style={{
                        backgroundColor: `#eaebec`,
                        color: `#5a656d`,
                        boxShadow: '0 0 0 1px #d9d9d9 inset'
                      }}
                    />
                    <span style={{ marginLeft: '4px' }}>{` files`}</span>
                  </>
                </Button>
              </Popover>
            )}
          </Flex>
        </Col>
      </Row>

      <StyledTable
        rowKey={(row: File) => `${row?.name}`}
        tableLayout="fixed"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: false
        }}
        columns={columns}
        dataSource={filteredFiles}
        rowSelection={{
          type: 'checkbox',
          ...rowSelection
        }}
      />
    </>
  );
};

export default FilesTable;
