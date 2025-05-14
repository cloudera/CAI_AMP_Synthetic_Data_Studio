import React, { SyntheticEvent, useEffect } from 'react';
import { Col, Input, Row, Table } from 'antd';
import { DatasetGeneration } from '../Home/types';
import { sortItemsByKey } from '../../utils/sortutils';
import { SearchProps } from 'antd/es/input/Search';
import { throttle } from 'lodash';

const { Search } = Input;

interface Props {
    results: DatasetGeneration[]
}


const CustomGenerationTable: React.FC<Props> = ({ results }) => {
    const [searchQuery, setSearchQuery] = React.useState<string | null>(null);
    const [filteredResults, setFilteredResults] = React.useState<DatasetGeneration[]>(results || []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = results.filter((result: DatasetGeneration) => {
                // clean up the filter logic
                return result?.Prompt?.toLowerCase().includes(searchQuery.toLowerCase()) || result?.Completion?.toLowerCase().includes(searchQuery.toLowerCase());
            });
            setFilteredResults(filtered);
        } else {
            setFilteredResults(results);
        }
    }, [results, searchQuery]);

    const columns = [
        {
            title: 'Prompt',
            ellipsis: true,
            sorter: sortItemsByKey('Prompt'),
            render: (record: DatasetGeneration) => {
                const question = record?.question || record?.Prompt || record?.prompt;
                return <>{question}</>;
            }
        },
        {
            title: 'Completion',
            ellipsis: true,
            sorter: sortItemsByKey('Completion'),
            render: (record: DatasetGeneration) => {
                const solution = record?.solution || record?.Completion || record?.completion;
                return <>{solution}</>;
            }
        }
    ];

     const onSearch: SearchProps['onSearch'] = (value) => {
        throttle((value: string) => setSearchQuery(value), 500)(value);
    }
        
    const onChange = (event: SyntheticEvent) => {
        const value = event.target?.value;
        throttle((value: string) => setSearchQuery(value), 500)(value);
    }

    return (
        <>
            <Row style={{ marginBottom: '16px', marginTop: '16px' }}>
                <Col span={24}>
                    <Search
                        placeholder="Search Datasets"
                        onSearch={onSearch}
                        onChange={onChange}
                        style={{ width: 350 }} />
                </Col>
            </Row>
            <Table
                columns={columns}
                dataSource={filteredResults}
                rowClassName={() => 'hover-pointer'}
                rowKey={(_record, index) => `generation-table-${index}`}
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: false,
                    hideOnSinglePage: true
                }}
            />
        </>
        
    )
}

export default CustomGenerationTable;
