import { useState } from "react";
import { Dropdown, Flex, Space, MenuProps, Typography, Modal, Button } from "antd";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import DeleteIcon from '@mui/icons-material/Delete';
import { FolderViewOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from "react-router-dom";
import EvaluationDetailModal from "../../components/Evaluations/EvaluationDetails/EvaluationDetailModal";
import { Evaluation } from "./types";
import styled from "styled-components";
import { useDeleteEvaluation } from "../../api/Evaluations/evaluations";
import { Pages } from "../../types";
import { getFilesURL } from "../Evaluator/util";

const { Text } = Typography;

interface Props {
    evaluation: Evaluation;
    refetch: () => void;
}

const ModalButtonGroup = styled(Flex)`
    margin-top: 15px !important;
`;

const EvaluationActions: React.FC<Props> = ({ evaluation, refetch }) => {
    const [showModal, setShowModal] = useState(false);
    const deleteEvaluationReq = useDeleteEvaluation();

    async function handleDeleteEvaluationConfirm() {
        await deleteEvaluationReq.triggerDelete(evaluation.evaluate_file_name, `file_path=${evaluation.local_export_path}`);
        refetch();
    }

    const deleteConfirmWarningModal = (row: Evaluation) => {
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

    const menuActions: MenuProps['items'] = [
        {
            key: '1',
            label: (
              <Link to={`/evaluation/${evaluation.evaluate_file_name}`}>
                View Evaluation Details
              </Link>
            ),
            icon: <FindInPageIcon />
          },
          {
            key: '2',
            label: (
              <a target="_blank" rel="noopener noreferrer" href={`${getFilesURL(evaluation.local_export_path)}`}>
                View in Preview
              </a>
            ),
            icon: <FolderViewOutlined />,
          },
          {
            key: '3',
            label: (
              <Link to={`/${Pages.EVALUATOR}/reevaluate/${evaluation.evaluate_file_name}`}>
                Re-evaluate
              </Link>
            ),
            icon: <ThunderboltOutlined />,
          },
          {
            key: '4',
            label: (
              <Text onClick={() => deleteConfirmWarningModal(evaluation)}>Remove Evaluation</Text>
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
          {showModal &&  
            <EvaluationDetailModal 
                evaluationDetail={evaluation} 
                isModalActive={showModal} 
                setIsModalActive={setShowModal}
            />}
        </>
    );
}

export default EvaluationActions;