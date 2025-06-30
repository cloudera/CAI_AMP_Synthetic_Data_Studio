import { Form, Select } from "antd";
import { FunctionComponent, useEffect, useState } from "react";
import { useGetUseCases } from "./hooks";
import { UseCase } from "../../types";
import get from "lodash/get";

interface Props {}


const UseCaseSelector: FunctionComponent<Props> = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const useCasesReq = useGetUseCases();  

  useEffect(() => {
    if (useCasesReq.data) {
        let _useCases = get(useCasesReq, 'data.usecases', []);
        _useCases = _useCases.map((useCase: any) => ({ 
            ...useCase,
            label: useCase.name, 
            value: useCase.id 
        }));
        setUseCases(_useCases);
    }
  }, [useCasesReq.data]);


  return (
    <Form.Item
        name='use_case'
        label='Template'
        rules={[
            { required: true }
        ]}
        tooltip='A specialize template for generating your dataset'
        labelCol={{
            span: 8
        }}
        shouldUpdate
        >
            <Select placeholder={'Select a template'}>
                {useCases.map(option => 
                    <Select.Option key={option.value} value={option.value}>
                        {option.label}
                    </Select.Option>
                )}
            </Select>
    </Form.Item>
  );
}

export default UseCaseSelector;