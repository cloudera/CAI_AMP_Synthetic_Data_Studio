import { Form, Select } from "antd";
import { FunctionComponent, useEffect, useState } from "react";
import { useGetUseCases } from "./hooks";
import { UseCase } from "../../types";

interface Props {}


const UseCaseSelector: FunctionComponent<Props> = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const useCasesReq = useGetUseCases();  
  console.log('useCasesReq', useCasesReq);

  useEffect(() => {
    if (useCasesReq.data) {
        console.log('useCasesReq.data', useCasesReq.data);
        const _useCases = useCasesReq.data.map((uc: string) => ({ label: uc, value: uc }));
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