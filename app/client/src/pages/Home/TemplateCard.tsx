import React from 'react';
import styled from "styled-components";
import { Template } from './types';
import { Popover, Space, Tag } from 'antd';
import ArrowRightIcon from '../../assets/ic-arrow-right-light.svg';
import { Pages } from '../../types';
import { useNavigate } from 'react-router-dom';
import sample from 'lodash/sample';
import { getTemplateTagColors, TemplateTagThemes } from './constans';


interface Props {
    template: Template;
}

const StyledCard = styled.div`
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  height: 200px;
  width: 300px;
  align-self: stretch;
  flex-grow: 0;
  justify-content: flex-start;
  align-items: stretch;
  gap: 8px;
  padding: 16px 24px;
  border-radius: 4px;
  border: 1px solid #d6d8db;
  cursor: pointer;

`;

const TopSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
  margin-bottom: 1rem;
`;

const StyledTitle = styled.div`
  height: 24px;
  flex-grow: 0;
  font-size: 16px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: normal;
  text-align: left;
  color: rgba(0, 0, 0, 0.85);
`;

const StyledDescription = styled.div`
  height: 44px;
  align-self: stretch;
  flex-grow: 0;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.57;
  letter-spacing: normal;
  text-align: left;
  color: rgba(0, 0, 0, 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
   overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* Number of lines to show */
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
`;



const BottomSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  height: 32px;
  flex-grow: 1;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  .text {
    width: 78px;
    height: 24px;
    flex-grow: 0;
    font-size: 14px;
    font-weight: normal;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.57;
    letter-spacing: normal;
    text-align: left;
    color: rgba(0, 0, 0, 0.88);
  }
  .icon {
    width: 24px;
    height: 24px;
    flex-grow: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    cursor: pointer;
    color: #000000e1;
  }
`;

const TagsContainer = styled.div`
  min-height: 30px;
  display: block;
  margin-bottom: 4px;
  margin-top: 4px;
  .ant-tag {
    max-width: 150px;
  }
  .tag-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const StyledTag = styled(Tag)<{ $theme: { color: string; backgroundColor: string; borderColor: string } }>`
  color: ${props => props.$theme.color} !important;
  background-color: ${props => props.$theme.backgroundColor} !important;
  border: 1px solid ${props => props.$theme.borderColor} !important;
`;


const TemplateCard: React.FC<Props> = ({ template }) => {
    const navigate = useNavigate();
    const hasTags = template.tag !== null && Array.isArray(template.tag);
    const tags = !hasTags ? [] : template.tag.slice(0, 1);
    const moreTags = !hasTags ? [] : template.tag.slice(1);

    const getTag = (tag: string) => {
        const theme = sample(TemplateTagThemes);
        const { color, backgroundColor, borderColor } = getTemplateTagColors(theme as string);

        return (
          <StyledTag key={tag} $theme={{ color, backgroundColor, borderColor }}>
            <div className="tag-title" title={tag} style={{ maxWidth: '150px', color }}>
                {tag}
            </div>
          </StyledTag>
        )
    }


    return (
        <StyledCard onClick={() => navigate(`/${Pages.GENERATOR}/${template.id}`)}>
            <TopSection>
                <StyledTitle>{template.name}</StyledTitle>
                <Popover
                    title="Description"
                    content={template.description}
                    trigger="hover"
                    placement="right"
                    overlayStyle={{ maxWidth: '300px' }}
                >
                    <StyledDescription>{template.description}</StyledDescription>
                </Popover>
            </TopSection>
            <TagsContainer>
                <Space size={[0, 'small']} wrap>
                    {tags.map((tag: string) => (
                        getTag(tag)
                    ))}
                    {moreTags.length > 0 && (
                        <Popover
                            title="Tags"
                            overlayStyle={{
                                width: '400px'
                            }}
                            content={
                                <Space size={[0, 'small']} wrap>
                                    {moreTags.map((tag: string) => (
                                        getTag(tag)
                                    ))}
                                </Space>
                            }
                            trigger="hover"
                        >
                            <Tag>
                                <div className="tag-title">{`+${moreTags.length}`}</div>
                            </Tag>
                        </Popover>
                    )}
                </Space>
            </TagsContainer>
            <BottomSection>
                <span className="text">Get Started</span>
                <div className="icon">
                    <img src={ArrowRightIcon} alt="Get Started" />
                </div>
            </BottomSection>
        </StyledCard>
    )
}

export default TemplateCard;