import { Button, Dropdown, Flex, MenuProps, Modal, Row, Space, Table, TableProps, Typography } from "antd";
import { useDeleteEvaluation, useGetEvaluationsHistory } from "../../api/Evaluations/evaluations";
import { EvaluationResponse } from "../../api/Evaluations/response";
import React, { useEffect } from "react";
import EvaluationDetailModal from "./EvaluationDetails/EvaluationDetailModal";
import FindInPageIcon from '@mui/icons-material/FindInPage';
import DeleteIcon from '@mui/icons-material/Delete';
import { DownOutlined, FolderViewOutlined, ThunderboltOutlined } from '@ant-design/icons';

import { blue } from '@ant-design/colors';
import { useUseCaseMapping } from "../../api/hooks";
import DateTime from "../DateTime/DateTime";
import styled from "styled-components";
import { Pages } from "../../types";
import { Link } from "react-router-dom";

const { Paragraph, Text } = Typography;

const ModalButtonGroup = styled(Flex)`
    margin-top: 15px !important;
`

export default function Evaluations() {
  const evaluationsHistoryAPI = useGetEvaluationsHistory();
  const deleteEvaluationHistoryAPI = useDeleteEvaluation();
  const { getUseCaseName } = useUseCaseMapping();
  const [toggleEvaluationDetailModal, setToggleEvaluationDetailModal] = React.useState(false);
  const [evaluationDetail, setEvaluationDetail] = React.useState<EvaluationResponse>({} as EvaluationResponse);

  const columnDefinitions: TableProps<EvaluationResponse>['columns'] = [
    {
      key: '1',
      title: 'Display Name',
      dataIndex: 'display_name'
    },
    {
      key: '2',
      title: 'Model ID',
      dataIndex: 'model_id'
    },
    {
      key: '3',
      title: 'Average Score',
      dataIndex: 'average_score'
    },
    {
      key: '4',
      title: 'Use Case',
      dataIndex: 'use_case',
      render: (useCase: string) => <Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{getUseCaseName(useCase)}</Paragraph>
    },
    {
      key: '5',
      title: 'Final Prompt',
      dataIndex: 'custom_prompt',
      render: (finalPrompt) => <Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}>{ finalPrompt ? finalPrompt : "N/A"}</Paragraph>
    },
    {
      key: '6',
      title: 'Create Time',
      dataIndex: 'timestamp',
      render: (timestamp) => <Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis={{ rows: 1 }}><DateTime dateTime={timestamp}></DateTime></Paragraph>

    },

    {
      key: '7',
      title: 'Actions',
      render: (row: EvaluationResponse) => (
        <Row style={{ width: 150 }}>
          <Dropdown menu={{ items: getActionsMenu(row) }} trigger={['click']}>
            <Space style={{ cursor: "pointer" }}>
              <Text style={{ color: blue.primary }}>Actions</Text>
              <DownOutlined style={{ color: blue.primary }} />
            </Space>
          </Dropdown>
        </Row>
      )
    },
  ];

  useEffect(() => {
    evaluationsHistoryAPI.triggerGet();
  }, []);

  function getActionsMenu(row: EvaluationResponse) {
    const datasetMoreActions: MenuProps['items'] = [
      {
        key: '1',
        label: (
          <Text>
            View Evaluation Details
          </Text>
        ),
        onClick: () => setToggleEvaluationDetailModal(true),
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
          <Link to={`/${Pages.EVALUATOR}/reevaluate/${row.evaluate_file_name}`}>
            Re-evaluate
          </Link>
        ),
        icon: <ThunderboltOutlined />,
      },
      {
        key: '4',
        label: (
          <Text onClick={() => deleteConfirmWarningModal(row)}>Remove Evaluation</Text>
        ),
        icon: <DeleteIcon />
      }
    ];

    return datasetMoreActions;
  }

  async function handleDeleteEvaluationConfirm() {
    await deleteEvaluationHistoryAPI.triggerDelete(evaluationDetail.evaluate_file_name, `file_path=${evaluationDetail.local_export_path}`);
    await evaluationsHistoryAPI.triggerGet();
  }

  const deleteConfirmWarningModal = (row: EvaluationResponse) => {
    return Modal.warning({
      title: 'Remove Evaluation',
      closable: true,
      content: (
        <>
          <Text>
            {`Are you sure you want to remove this evaluation`} <Text strong>{row.display_name}?</Text>
          </Text>
        </>
      ),
      icon: undefined,
      footer: (
        <ModalButtonGroup gap={8} justify='end'>
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
        </ModalButtonGroup>
      ),
      maskClosable: true,
      width: "20%"
    })
  }

  const getFilesURL = (fileName: string) => {
    const {
      VITE_WORKBENCH_URL,
      VITE_PROJECT_OWNER,
      VITE_CDSW_PROJECT
    } = import.meta.env
    return `${VITE_WORKBENCH_URL}/${VITE_PROJECT_OWNER}/${VITE_CDSW_PROJECT}/preview/${fileName}`
  }

  return (
    <>
      <h1>Evaluations</h1>
      <Table<EvaluationResponse>
        rowKey={(row) => row.id}
        pagination={false}
        tableLayout="fixed"
        onRow={(row) =>
        ({
          onClick: () => {
            setEvaluationDetail(row);
          }
        })}
        columns={columnDefinitions}
        dataSource={evaluationsHistoryAPI.data || []} />
      <EvaluationDetailModal evaluationDetail={evaluationDetail} isModalActive={toggleEvaluationDetailModal} setIsModalActive={setToggleEvaluationDetailModal} />
    </>
  )
}