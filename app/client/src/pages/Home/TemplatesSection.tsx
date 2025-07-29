import get from 'lodash/get';
import { Card } from 'antd';
import React from 'react';
import styled from "styled-components";
import { useGetUseCases } from '../DataGenerator/hooks';
import Loading from '../Evaluator/Loading';
import { Pages } from "../../types";
import { Template } from './types';
import TemplateCard from './TemplateCard';


const Container = styled.div`
  background-color: #ffffff;
  padding: 1rem;
  overflow-x: auto;
`;

const StyledContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px;
    width: 100%;
    // justify-content: center;
    // align-items: center;
`;


const TemplatesSection: React.FC = () => {
    const useCasesReq = useGetUseCases();
    if (useCasesReq.isLoading) {
        return <Container><Loading /></Container>;
    }
    
    const useCases: Template[] = get(useCasesReq, 'data.usecases', []);
    

    return (
        <Card
            title="Templates"
            bodyStyle={{ padding: '1rem' }}
        >
            {useCasesReq.isLoading && <Loading />}
            {useCasesReq.isError && <div>Error loading templates</div>}
            <StyledContainer>
                {useCases.map((useCase: Template) => (
                    <TemplateCard key={useCase.id} template={useCase} />)
               )}
            </StyledContainer>
               

        </Card>
    )
}

export default TemplatesSection;