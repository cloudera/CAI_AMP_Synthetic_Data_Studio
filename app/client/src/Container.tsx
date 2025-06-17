import Layout from 'antd/es/layout';
import { Button, ConfigProvider, Divider, Flex, Menu, Popover, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';

import './App.css'
import { LABELS } from './constants';
import { Pages } from './types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { GithubOutlined, MailOutlined } from '@ant-design/icons';
import UpgradeButton from './pages/Home/UpgradeButton';

const { Text } = Typography;
const { Header, Content } = Layout;
type MenuItem = Required<MenuProps>['items'][number];
const queryClient = new QueryClient()

const AppContainer = styled(Layout)`
  height: 100%;
`
const AppContent = styled(Content)`
  height: 100%;
  padding: 12px 24px;
`
const BrandingContainer = styled(Flex)`
  padding: 10px;
`
const BrandingTitle = styled(Typography)`
    width: 192px;
    height: 17px;
    flex-grow: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    font-size: 20px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
    line-height: 0.75;
    letter-spacing: normal;
    text-align: left;
    color: rgba(255, 255, 255, 0.65);
`
const BrandingTextContainer = styled(Flex)`
  padding-top: 5px;
`
const PageHeader = styled(Header)`
  height: fit-content;
  padding: 5px 15px
`;
const StyledImg = styled.img`
  height: ${props => props?.height && `${props.height}px`}
`

const StyledText = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  font-size: 14px;
  font-weight: normal;
`;

const StyledSection = styled.div`
  margin-left: 24px;
  color: #adb2b6;
  flex-grow: 1;
  font-family: Roboto Mono, monospace;
  font-size: 12px;
  overflow: hidden;
`;

const pages: MenuItem[] = [
  {
    key: Pages.HOME,
    label: (
      <Link to={`${Pages.HOME}`}>{LABELS[Pages.HOME]}</Link>
    ),
  },
  {
    key: Pages.GENERATOR,
    label: (
      <Link to={`${Pages.GENERATOR}`}>{LABELS[Pages.GENERATOR]}</Link>
    ),
  },
  // {
  //   key: Pages.TELEMETRY,  
  //   label: (
  //     <Link to={`${Pages.TELEMETRY}`}>{LABELS[Pages.TELEMETRY]}</Link>
  //   ),
  // },
  {
    key: Pages.FEEDBACK,
    label: (
      <Popover placement="bottom" title={<Typography.Text strong>{LABELS[Pages.FEEDBACK]}</Typography.Text>}  content={
        <>
        <Divider style={{ margin: 0 }}/>
        <div style={{ margin: '12px' }}>
          <Flex justify='left' vertical>
            <StyledText>
              We value your feedback! Reach out to us via email or join the discussion on GitHub. 
            </StyledText>  
            <StyledText>Your feedback help us improve and grow.</StyledText>
          <br/>
          <Button type="link" icon={<MailOutlined />}>
          <Text copyable={{ text: 'ai_feedback@cloudera.com' }} style={{ color: '#1677ff' }}>ai_feedback@cloudera.com</Text>         
          </Button>
          <div style={{ margin: 'auto' }}>
            <a type="link" target="_blank" rel="noopener noreferrer" href="https://github.com/cloudera/CAI_AMP_Synthetic_Data_Studio/discussions">
              <GithubOutlined />
              <span style={{ marginLeft: '4px' }}>Join the discussion on GitHub</span>
            </a>
          </div>
          <Flex justify='center' align='center' vertical style={{ marginTop: '12px' }}>
            <StyledSection>
              {`SDS-1.0.2`}
            </StyledSection>
          </Flex>
          </Flex>
          <br/>
        </div>
        </>        
      }>
        <Button type="text" style={{ paddingLeft: 0 }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.65)'}}>{LABELS[Pages.FEEDBACK]}</span>
        </Button>
      </Popover>
    )
  }, 
  {
    key: Pages.UPGRADE,
    label: (
      <UpgradeButton />
    )
  }
]


const NotificationContext = React.createContext({messagePlacement: 'topRight'});

const Container = () => {
  const location = useLocation();
  const notificationContextValue = useMemo(() => ({ messagePlacement: 'topRight' }), []);

  return (
    <ConfigProvider theme={{
      components: {
        List: {
          emptyTextPadding: 0
        }
      }
    }}>
      <QueryClientProvider client={queryClient}>
        <NotificationContext.Provider value={notificationContextValue}>
          <AppContainer>
            <PageHeader>
              <Flex justify='space-between' align='center'>
                <BrandingContainer gap={5}>
                  <BrandingTextContainer align='start' justify='center' vertical>
                    <BrandingTitle>{'Synthetic Data Studio'}</BrandingTitle>
                  </BrandingTextContainer>
                </BrandingContainer>
                <Menu
                  disabledOverflow={true}
                  items={pages}
                  mode="horizontal"
                  selectable={false}
                  selectedKeys={[location.pathname]}
                  theme="dark"
                  defaultSelectedKeys={[Pages.GENERATOR]} />
              </Flex>
            </PageHeader>
            <AppContent>
              <div style={{ height: "100%" }} key={location.pathname}>
                <Outlet />
              </div>
            </AppContent>
          </AppContainer>
        </NotificationContext.Provider>
      </QueryClientProvider>
    </ConfigProvider>
  )
};

export default Container;