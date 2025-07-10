import isEmpty from 'lodash/isEmpty';
import { Dropdown, Flex, Image, MenuProps, notification, Space, Table, TableProps, Tooltip, Typography } from "antd";
import React, { useEffect } from "react";
import FindInPageIcon from '@mui/icons-material/FindInPage';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDeleteDataset, useGetDatasetHistory } from "../../api/Datasets/datasets";
import { DatasetResponse } from "../../api/Datasets/response";
import DatasetDetailModal from "./DatasetDetails/DatasetDetailModal";
import { DownOutlined, ExportOutlined, FolderViewOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from "react-router-dom";
import { HuggingFaceIconUrl, Pages } from "../../types";
import { blue } from '@ant-design/colors';
import DateTime from "../DateTime/DateTime";
import { useUseCaseMapping } from "../../api/hooks";
import DeleteConfirmWarningModal from './DeleteConfirmModal';
import DatasetExportModal, { ExportResult } from '../Export/ExportModal';


const { Paragraph, Text } = Typography;

export default function DatasetsComponent() {
  const datasetHistoryAPI = useGetDatasetHistory();
  const deleteDatasetHistoryAPI = useDeleteDataset();
  const { getUseCaseName } = useUseCaseMapping();
  const [toggleDatasetDetailModal, setToggleDatasetDetailModal] = React.useState(false);
  const [toggleDatasetExportModal, setToggleDatasetExportModal] = React.useState(false);
  const [exportResult, setExportResult] = React.useState<ExportResult>();
  const [datasetDetails, setDatasetDetails] = React.useState<DatasetResponse>({} as DatasetResponse);
  const [notificationInstance, notificationContextHolder] = notification.useNotification();


  useEffect(() => {
    if (!toggleDatasetExportModal) {
      datasetHistoryAPI.triggerGet();
    }
  }, [toggleDatasetExportModal]);

  useEffect(() => {
    if (exportResult?.successMessage) {
      notificationInstance.success({
        message: `Dataset Exported to Huggingface`,
        description: "Dataset has been successfully exported."
      });
    }
    if (exportResult?.failedMessage) {
      notificationInstance.error({
        message: "Error Exporting Dataset",
        description: "There was an error exporting the dataset. Please try again."
      });
    }
  }, [exportResult, notificationInstance])

  const datasetsColumnDefinition: TableProps<DatasetResponse>['columns'] = [
    {
      key: '1',
      title: 'Display Name',
      dataIndex: 'display_name'
    },
    {
      key: '2',
      title: 'Dataset Name',
      dataIndex: 'generate_file_name'
    },
    {
      key: '3',
      title: 'Model',
      dataIndex: 'model_id',
      render: (modelId: string) => <Tooltip title={modelId}><Paragraph style={{ width: 150, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{modelId}</Paragraph></Tooltip>
    },
    {
      key: '4',
      title: 'Questions Per Topic',
      dataIndex: 'num_questions',
      width: 150
    },
    {
      key: '4a',
      title: 'Completed Rows',
      dataIndex: 'completed_rows',
      width: 120,
      align: 'center',
      render: (completed_rows: number | null) => <>{completed_rows != null ? completed_rows : 'N/A'}</>
    },
    {
      key: '5',
      title: 'Use Case',
      dataIndex: 'use_case',
      render: (useCase: string) => <Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{getUseCaseName(useCase)}</Paragraph>
    },
    {
      key: '6',
      title: 'Creation Time',
      dataIndex: 'timestamp',
      render: (timestamp) => <Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}><DateTime dateTime={timestamp}></DateTime></Paragraph>
    },
    {
      key: '7',
      title: 'Exports',
      width: "8rem",
      dataIndex: 'hf_export_path',
      render: (hfExportPath) => getHuggingFaceExportLink(hfExportPath)
    },
    {
      key: '8',
      title: 'Actions',
      width: 150,
      render: (row: DatasetResponse) => (
        <Dropdown menu={{ items: getActionsMenu(row), }} trigger={['click']}>
          <Space style={{ cursor: "pointer" }}>
            <Text style={{ color: blue.primary }}>Actions</Text>
            <DownOutlined style={{ color: blue.primary }} />
          </Space>
        </Dropdown>
      )
    },
  ];

  const getFilesURL = (fileName: string) => {
    const {
      VITE_WORKBENCH_URL,
      VITE_PROJECT_OWNER,
      VITE_CDSW_PROJECT
    } = import.meta.env
    return `${VITE_WORKBENCH_URL}/${VITE_PROJECT_OWNER}/${VITE_CDSW_PROJECT}/preview/${fileName}`
  }

  async function handleDeleteEvaluationConfirm() {
    await deleteDatasetHistoryAPI.triggerDelete(datasetDetails.generate_file_name, `file_path=${datasetDetails.local_export_path}`);
    await datasetHistoryAPI.triggerGet();
  }

  function getActionsMenu(row: DatasetResponse) {
    const datasetMoreActions: MenuProps['items'] = [
      {
        key: '1',
        label: (
          <Text>
            View Dataset Details
          </Text>
        ),
        onClick: () => setToggleDatasetDetailModal(true),
        icon: <FindInPageIcon />
      },
      {
        key: '2',
        label: (
          <a target="_blank" rel="noopener noreferrer" href={`${getFilesURL(row.local_export_path)}`}>
            View in Preview
          </a>
        ),
        icon: <FolderViewOutlined />,
      },
      {
        key: '3',
        label: (
          <Link to={`/${Pages.GENERATOR}`} state={{
            data: row,
            internalRedirect: true,
          }}>
            Generate Dataset
          </Link>
        ),
        icon: <ThunderboltOutlined />,
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
          <Link disabled={isEmpty(row?.generate_file_name)} to={`/${Pages.EVALUATOR}/create/${row?.generate_file_name}`}>
            Evaluate Dataset
          </Link>
        ),
        icon: <QueryStatsIcon />,
      },
      {
        key: '7',
        label: (
          <Text onClick={() => DeleteConfirmWarningModal({ row, handleDeleteEvaluationConfirm })}>Remove Dataset</Text>
        ),
        icon: <DeleteIcon />
      }
    ];

    return datasetMoreActions;
  }

  function getHuggingFaceExportLink(hugginfaceExportUrl: string) {
    return (
      <Flex align='center' justify='center'>
        {hugginfaceExportUrl
          ? <a target='blank' href={hugginfaceExportUrl}><Image width={20} height={20} src={HuggingFaceIconUrl} preview={false}></Image></a>
          : <StopOutlined />}
      </Flex>);
  }

  return (
    <>
      <h1>Datasets</h1>
      <Table<DatasetResponse>
        rowKey={(row) => row.id}
        tableLayout="fixed"
        pagination={false}
        onRow={(row) =>
        ({
          onClick: () => {
            setDatasetDetails(row);
          }
        })}
        columns={datasetsColumnDefinition}
        dataSource={datasetHistoryAPI.data || []} />
      <DatasetDetailModal datasetDetails={datasetDetails} isModalActive={toggleDatasetDetailModal} setIsModalActive={setToggleDatasetDetailModal} />
      <DatasetExportModal setExportResult={setExportResult} datasetDetails={datasetDetails} isModalActive={toggleDatasetExportModal} setIsModalActive={setToggleDatasetExportModal} />
      {notificationContextHolder}
    </>
  )
}