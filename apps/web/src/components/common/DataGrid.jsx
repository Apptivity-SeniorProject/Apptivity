import { Button, Grid, Table } from 'antd'

function DataGrid({
    columns,
    rows,
    rowKey = 'id',
    loading = false,
    currentPage = 1,
    pageSize = 20,
    totalCount = 0,
    onPageChange,
    emptyText,
    onInfoCardClick,
    infoCardColumnTitle = 'Info Card',
    infoCardLabel = 'View',
}) {
    const screens = Grid.useBreakpoint()
    const isMobile = !screens.md

    const mergedColumns = onInfoCardClick
        ? [
            ...columns,
            {
                title: infoCardColumnTitle,
                key: '__info_card_action',
                align: 'center',
                render: (_, row) => (
                    <Button size={isMobile ? 'small' : 'middle'} onClick={() => onInfoCardClick(row)}>
                        {infoCardLabel}
                    </Button>
                ),
            },
        ]
        : columns

    return (
        <Table
            rowKey={rowKey}
            columns={mergedColumns}
            dataSource={rows}
            loading={loading}
            size={isMobile ? 'small' : 'middle'}
            scroll={{ x: 'max-content' }}
            pagination={{
                current: currentPage,
                pageSize,
                total: totalCount,
                showSizeChanger: !isMobile,
                pageSizeOptions: ['10', '20', '50'],
                onChange: (page, nextPageSize) => {
                    onPageChange?.(page, nextPageSize)
                },
            }}
            locale={{
                emptyText,
            }}
        />
    )
}

export default DataGrid
