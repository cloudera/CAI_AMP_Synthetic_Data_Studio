import { Button, Form, Modal, Select } from "antd";
import { useNavigate } from 'react-router-dom';
import ArrowRightIcon from '../../assets/ic-arrow-right.svg';
import { useEffect, useState } from "react";
import { useDatasets } from "./hooks";
import Loading from "../Evaluator/Loading";
import { isEmpty } from "lodash";
import { Dataset } from "../Evaluator/types";
import { Pages } from "../../types";


const EvaluateButton: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const {data, isLoading} = useDatasets();

    useEffect(() => {
        if(!isEmpty(data?.datasets)) {
            setDatasets(data?.datasets);
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

    return (
        <>
            <Button onClick={() => setShowModal(true)} className="evaluate-button" disabled={isEmpty(datasets)}>
                Get Started
                <img src={ArrowRightIcon} alt="Get Started" />
            </Button>
            {showModal &&
                 <Modal
                 visible={true}
                 okText={'Evaluate'}
                 title={'Evaluate Dataset'}
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
                        name='dataset_name'
                        label={'Dataset Name'}
                        rules={[
                            { required: true, message: 'This field is required.' }
                        ]}
                    >
                        <Select options={options} placeholder="Select a dataset" />
                    </Form.Item>
              </Form>
            </Modal>}
        </>
    )
}

export default EvaluateButton;