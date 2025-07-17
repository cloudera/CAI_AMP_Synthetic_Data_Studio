import isEmpty from 'lodash/isEmpty';
import React from 'react';
import { Button, Dropdown, Flex, MenuProps, Modal, Space, Typography } from "antd";
import { Dataset } from "../Evaluator/types";
import styled from "styled-components";
import { ExportOutlined, FolderViewOutlined, ThunderboltOutlined } from '@ant-design/icons';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from "react-router-dom";
import { useDeleteDataset } from '../../api/Datasets/datasets';
import { useState } from 'react';
import DatasetDetailModal from '../../components/Datasets/DatasetDetails/DatasetDetailModal';
import { DatasetResponse } from '../../api/Datasets/response';
import { getFilesURL } from '../Evaluator/util';
import { Pages } from "../../types";

const { Text } = Typography;

const ButtonGroup = styled(Flex)`
    margin-top: 15px !important;
`

interface DatasetActionsProps {
    dataset: Dataset; 
    refetch: () => void;
    setToggleDatasetExportModal: (toggle: boolean) => void;   
}


const DatasetActions: React.FC<DatasetActionsProps> = ({ dataset, refetch, setToggleDatasetExportModal }) => {
    const [showModal, setShowModal] = useState(false);
    const deleteDatasetReq = useDeleteDataset();

    const deleteConfirmWarningModal = (row: Dataset) => {
        return Modal.warning({
          title: 'Remove Dataset',
          closable: true,
          content: (
            <>
              <Text>
                {`Are you sure you want to remove this dataset`} <Text strong>{row.display_name}?</Text>
              </Text>
            </>
          ),
          icon: undefined,
          footer: (
            <ButtonGroup gap={8} justify='end'>
              <Button onClick={() => Modal.destroyAll()}>{'Cancel'}</Button>
              <Button
                onClick={() => {
                  handleDeleteEvaluationConfirm()
                  Modal.destroyAll()
                }}
                type='primary'
                color='danger'
                variant='solid'
              >
                {'Remove'}
              </Button>
            </ButtonGroup>
          ),
          maskClosable: true,
          width: "20%"
        })
      }
    
      async function handleDeleteEvaluationConfirm() {
        await deleteDatasetReq.triggerDelete(dataset?.generate_file_name, `file_path=${dataset?.local_export_path}`);
        // await datasetHistoryAPI.triggerGet();
        refetch();
      }
    
    const menuActions: MenuProps['items'] = [
        {
          key: '1',
          label: 
            <Link disabled={isEmpty(dataset?.generate_file_name)} to={`/dataset/${dataset?.generate_file_name}`}>
              View Dataset Details
            </Link>,
          icon: <FindInPageIcon />
        },
        {
          key: '2',
          label: (
            <a target="_blank" rel="noopener noreferrer" href={`${getFilesURL(dataset.local_export_path)}`}>
              View in Preview
            </a>
          ),
          icon: <FolderViewOutlined />,
        },
        {
          key: '3',
          label: (
            <Link to={`/${Pages.REGENERATE}/${dataset.generate_file_name}`} state={{
              data: dataset,
              internalRedirect: true,
            }}>
              Generate Dataset
            </Link>
          ),
          icon: <ThunderboltOutlined />,
        },
        {
          key: '4',
          label: (
            <Link disabled={isEmpty(dataset?.generate_file_name)} to={`/${Pages.EVALUATOR}/create/${dataset?.generate_file_name}`}>
              Evaluate Dataset
            </Link>
          ),
          icon: <QueryStatsIcon />,
        },
        {
          key: '5',
          label: (
            <Text>
              Export Dataset
            </Text>
          ),
          onClick: () => setToggleDatasetExportModal(true),
          icon: <ExportOutlined />
        },
        {
          key: '6',
          label: (
            <Text onClick={() => deleteConfirmWarningModal(dataset)}>Remove Dataset</Text>
          ),
          icon: <DeleteIcon />
        }
    ];

    return (
        <>
          <Flex gap="small" justify="center" align="center" style={{ marginRight: 48 }}>
            <Dropdown menu={{ items: menuActions }} trigger={['click']}>
                <Space style={{ cursor: "pointer" }}>
                    <MoreVertIcon style={{ color: '#5a656d' }} />
                </Space>
            </Dropdown>
          </Flex>
          {showModal && <DatasetDetailModal isModalActive={showModal} datasetDetails={dataset as Dataset | DatasetResponse} setIsModalActive={setShowModal} />}
        </>
        
    )
}

export default DatasetActions;