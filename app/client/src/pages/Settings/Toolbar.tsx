import React from 'react';
import { Row } from 'antd';
import classNames from 'classnames';
import styled from 'styled-components';

interface Props {
  /** Content for the left content area. */
  left?: React.ReactNode;
  /** Content for the center content area. */
  center?: React.ReactNode;
  /** Content for the right content area. */
  right?: React.ReactNode;
  /** Additional class name to add to the underlying Row component. */
  className?: string;
  style?: React.CSSProperties;
}

const StyledRow = styled(Row)`
  .altus-toolbar {
  & .altus-toolbar-group:not(.ant-row-start) {
    flex-grow: 1;
  }
}

`;

/**
 * @deprecated
 */
export default function Toolbar({ left, center, right, className = '', ...otherProps }: Props) {
  return (
    <StyledRow
      {...otherProps}
      className={classNames('altus-toolbar spaced-16', className)}
      justify="space-between"
      align="middle"
    >
      {left && (
        <Row justify="start" align="middle" className="altus-toolbar-group spaced-12">
          {left}
        </Row>
      )}
      {center && (
        <Row justify="center" align="middle" className="altus-toolbar-group spaced-12">
          {center}
        </Row>
      )}
      {right && (
        <Row justify="end" align="middle" className="altus-toolbar-group spaced-12">
          {right}
        </Row>
      )}
    </StyledRow>
  );
}
