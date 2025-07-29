import { Form, FormInstance, Select } from "antd";
import { FunctionComponent, useEffect, useState } from "react";
import { useGetUseCases } from "./hooks";
import { UseCase } from "../../types";
import get from "lodash/get";

interface Props {
    form: FormInstance<any>;
}


const UseCaseSelector: FunctionComponent<Props> = ({ form }) => {
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

  const onChange = (value: string) => {
    form.setFieldValue('use_case', value);
    if (value !== 'custom') {
        form.setFieldValue('example_path', null);
        form.setFieldValue('examples', []);
    }
  }


  return (
    <Form.Item
        name='use_case'
        label='Template'
        rules={[
            { required: true }
        ]}
        tooltip='A specialized template for generating your dataset'
        labelCol={{
            span: 8
        }}
        shouldUpdate
        >
            <Select placeholder={'Select a template'} onChange={onChange}>
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