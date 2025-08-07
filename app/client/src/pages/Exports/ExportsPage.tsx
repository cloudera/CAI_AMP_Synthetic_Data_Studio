import { useEffect } from "react";
import { Layout } from "antd";
import styled from "styled-components";
import ExportsTab from "../Home/ExportsTab";
import StyledTitle from "../Evaluator/StyledTitle";

const { Content } = Layout;

const StyledContent = styled(Content)`
    padding: 24px;
    background-color: #f5f7f8;
`;

const Container = styled.div`
  background-color: #ffffff;
  padding: 1rem;
  overflow-x: auto;
`;



const ExportsPage: React.FC = () => {
    return (
        <Layout>
            
            <StyledContent>
            <StyledTitle style={{ fontWeight: 600}}>{'Exports'}</StyledTitle>
                <Container>
                    <ExportsTab refetchOnRender={true} hideSearch={false} />
                </Container>
            </StyledContent>
        </Layout>
    );
}

export default ExportsPage;