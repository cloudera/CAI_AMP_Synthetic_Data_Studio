import { Button, Form, Modal, Select } from "antd";
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from "react";
import { useDatasets } from "./hooks";
import Loading from "../Evaluator/Loading";
import { isEmpty } from "lodash";
import { HeaderSection } from "./HomePage";
import { Dataset } from "../Evaluator/types";
import { Pages } from "../../types";
import EvaluateIcon from '../../assets/ic-brand-inventory-ordering.svg';
import ArrowRightIcon from '../../assets/ic-arrow-right.svg';


const EvaluateSection: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const {data, isLoading} = useDatasets();

    useEffect(() => {
        if(!isEmpty(data?.data)) {
            setDatasets(data?.data);
        }
    }, [data]);

    const initialValues = {
        dataset_name: null
    }

    const onClose = () => setShowModal(false);

    const onSubmit = async () => {
        try {
        await form.validateFields();
        const values = form.getFieldsValue();
        const dataset = datasets.find((dataset: Dataset) => dataset.display_name === values.dataset_name);
        navigate(`/${Pages.EVALUATOR}/create/${dataset?.generate_file_name}`); 
        } catch (e) {
            console.error(e);
        }
    }

    const options = datasets.map((dataset: unknown) => ({
        value: dataset.display_name,
        label: dataset.display_name,
        key: `${dataset?.display_name}-${dataset?.generate_file_name}`
    }));

    const onClick = () => {
        if(isEmpty(datasets)) {
            setShowModal(true);
        }
        
    }


    return (
        <>
            <HeaderSection style={{ marginLeft: '1rem' }} onClick={onClick}>
                <div className="top-section">
                    <div className="left-section evaluate-icon">
                        <img src={EvaluateIcon} alt="evaluation" />
                    </div>
                    <div className="middle-section">
                        <div className="section-title">Evaluation</div>
                        <div className="section-description">
                            Use LLMs to score and filter your synthetic data. Keep only high-quality results.
                        </div>
                    </div>
                </div>
                <div className="bottom-section">
                    <div>
                        <Button onClick={onClick}>
                            Get Started
                            <img src={ArrowRightIcon} alt="Get Started" />
                        </Button>
                    </div>
                </div>
            </HeaderSection>
            {showModal && (
                <Modal
                    visible={true}
                    okText="Evaluate"
                    title="Evaluate Dataset"
                    onCancel={onClose}
                    onOk={onSubmit}
                    width="40%"
                >
                    {isLoading && <Loading />}
                    <Form
                        layout="vertical"
                        form={form}
                        initialValues={initialValues}
                    >
                        <Form.Item
                            name="dataset_name"
                            label="Dataset Name"
                            rules={[
                                { required: true, message: 'This field is required.' }
                            ]}
                        >
                            <Select options={options} placeholder="Select a dataset" />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </>
    );
}

export default EvaluateSection;