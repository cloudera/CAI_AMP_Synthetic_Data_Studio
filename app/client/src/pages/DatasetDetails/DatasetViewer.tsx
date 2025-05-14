import { FunctionComponent, useEffect } from "react";
import { Dataset } from '../Evaluator/types';
import { useMutation } from "@tanstack/react-query";
import { fetchFileContent } from "../DataGenerator/hooks";
import get from "lodash/get";
import isEmpty from "lodash/isEmpty";
import { Col, Row } from "antd";
import FreeFormTable from "../DataGenerator/FreeFormTable";

interface Props {
    dataset: Dataset;    
}


const DatasetViewer: FunctionComponent<Props> = ({ dataset }) => {
    const mutation = useMutation({
        mutationFn: fetchFileContent
    });

    useEffect(() => {  
        const generate_file_name = get(dataset, 'generate_file_name');
        if (!isEmpty(generate_file_name)) {
            mutation.mutate({
                path: generate_file_name      
            });
        }
    }, [dataset]);


    return (
        <Row>
            <Col sm={24}>
                <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                    {mutation.isLoading && <p>Loading...</p>}
                    {mutation.isError && <p>Error: {mutation.error}</p>}
                    {mutation.isSuccess && (
                        <FreeFormTable data={mutation.data} />
                    )}
                </div>
            </Col>    
        </Row>
    );
}
export default DatasetViewer;