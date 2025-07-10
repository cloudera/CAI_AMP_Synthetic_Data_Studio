import { Form, Select } from "antd";
import { FunctionComponent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useGetUseCases } from "./hooks";
import { UseCase } from "../../types";
import get from "lodash/get";

interface Props {}

const UseCaseSelector: FunctionComponent<Props> = () => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const location = useLocation();
  
  // Check if this is a regeneration scenario
  const isRegenerating = location.state?.data || location.state?.internalRedirect;
  
  // Only fetch use cases if we're NOT regenerating
  const useCasesReq = useGetUseCases(isRegenerating);  

  useEffect(() => {
    if (!isRegenerating && useCasesReq.data) {
        let _useCases = get(useCasesReq, 'data.usecases', []);
        _useCases = _useCases.map((useCase: any) => ({ 
            ...useCase,
            label: useCase.name, 
            value: useCase.id 
        }));
        setUseCases(_useCases);
    }
  }, [useCasesReq.data, isRegenerating]);

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