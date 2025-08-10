// Base table components (from shadcn/ui)
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../table"

// Advanced data table components
export {
  DataTable,
  commonActions,
  commonBulkActions,
  type DataTableProps,
  type DataTableColumn,
  type DataTableAction,
  type DataTableBulkAction,
  type DataTableSortState,
  type DataTableFilterState
} from "./data-table"

// Filtering components
export {
  TableFilters,
  QuickFilters,
  type TableFilterConfig,
  type TableFiltersProps,
  type QuickFiltersProps,
  type FilterType,
  type FilterOption
} from "./table-filters"

// Pagination components
export {
  TablePagination,
  SimplePagination,
  usePagination,
  type TablePaginationProps,
  type SimplePaginationProps,
  type UsePaginationOptions,
  type UsePaginationReturn
} from "./table-pagination"

// State management hooks
export {
  useTableState,
  useTableColumns,
  type UseTableStateOptions,
  type UseTableStateReturn
} from "../../../hooks/use-table-state"