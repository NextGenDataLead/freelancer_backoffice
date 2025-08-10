"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DataTable,
  commonActions,
  commonBulkActions,
  type DataTableColumn,
  type DataTableAction,
  type DataTableBulkAction
} from "@/components/ui/table/data-table"
import { 
  TableFilters,
  type TableFilterConfig
} from "@/components/ui/table/table-filters"
import { useTableState } from "@/hooks/use-table-state"
import { 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  Globe,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  Download
} from "lucide-react"

// Sample data types
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | 'moderator'
  status: 'active' | 'inactive' | 'pending'
  company: string
  department: string
  joinDate: string
  lastActive: string
  projects: number
  revenue: number
}

interface Project {
  id: number
  name: string
  client: string
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: string
  endDate: string
  budget: number
  progress: number
  team: string[]
}

// Sample data generators
const generateUsers = (count: number): User[] => {
  const roles: User['role'][] = ['admin', 'user', 'moderator']
  const statuses: User['status'][] = ['active', 'inactive', 'pending']
  const companies = ['Acme Corp', 'TechStart Inc', 'Design Co', 'DevStudio', 'InnovateLabs']
  const departments = ['Engineering', 'Marketing', 'Sales', 'Support', 'Design']
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: roles[Math.floor(Math.random() * roles.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    company: companies[Math.floor(Math.random() * companies.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
    joinDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString().split('T')[0],
    lastActive: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    projects: Math.floor(Math.random() * 10) + 1,
    revenue: Math.floor(Math.random() * 100000) + 10000
  }))
}

const generateProjects = (count: number): Project[] => {
  const statuses: Project['status'][] = ['active', 'completed', 'on-hold', 'cancelled']
  const priorities: Project['priority'][] = ['low', 'medium', 'high', 'urgent']
  const clients = ['Apple Inc', 'Google LLC', 'Microsoft Corp', 'Meta Platforms', 'Amazon.com', 'Tesla Inc']
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Project ${String.fromCharCode(65 + i)}`,
    client: clients[Math.floor(Math.random() * clients.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    startDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString().split('T')[0],
    endDate: new Date(2024, Math.floor(Math.random() * 12) + 6, Math.floor(Math.random() * 28)).toISOString().split('T')[0],
    budget: Math.floor(Math.random() * 500000) + 50000,
    progress: Math.floor(Math.random() * 100),
    team: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, j) => `Team Member ${j + 1}`)
  }))
}

export default function TablesPage() {
  const [users] = React.useState(() => generateUsers(50))
  const [projects] = React.useState(() => generateProjects(30))
  const [activeTab, setActiveTab] = React.useState<'users' | 'projects'>('users')

  // User table configuration
  const userColumns: DataTableColumn<User>[] = [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-xs text-muted-foreground">{record.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'company',
      title: 'Company',
      dataIndex: 'company',
      sortable: true,
      filterable: true,
      render: (value, record) => (
        <div>
          <div className="flex items-center text-sm">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            {value}
          </div>
          <div className="text-xs text-muted-foreground">{record.department}</div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      dataIndex: 'role',
      sortable: true,
      filterable: true,
      render: (value) => {
        const colors = {
          admin: 'bg-red-100 text-red-800',
          moderator: 'bg-yellow-100 text-yellow-800',
          user: 'bg-green-100 text-green-800'
        }
        return <Badge className={colors[value]}>{value}</Badge>
      }
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      sortable: true,
      filterable: true,
      render: (value) => {
        const colors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          pending: 'bg-yellow-100 text-yellow-800'
        }
        return <Badge className={colors[value]}>{value}</Badge>
      }
    },
    {
      key: 'projects',
      title: 'Projects',
      dataIndex: 'projects',
      sortable: true,
      align: 'center',
      render: (value) => (
        <Badge variant="outline">{value}</Badge>
      )
    },
    {
      key: 'revenue',
      title: 'Revenue',
      dataIndex: 'revenue',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className="font-mono">${value.toLocaleString()}</span>
      )
    },
    {
      key: 'joinDate',
      title: 'Join Date',
      dataIndex: 'joinDate',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    }
  ]

  // Project table configuration
  const projectColumns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      title: 'Project',
      dataIndex: 'name',
      sortable: true,
      searchable: true,
      render: (value, record) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-muted-foreground">{record.client}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      sortable: true,
      filterable: true,
      render: (value) => {
        const colors = {
          active: 'bg-blue-100 text-blue-800',
          completed: 'bg-green-100 text-green-800',
          'on-hold': 'bg-yellow-100 text-yellow-800',
          cancelled: 'bg-red-100 text-red-800'
        }
        return <Badge className={colors[value]}>{value.replace('-', ' ')}</Badge>
      }
    },
    {
      key: 'priority',
      title: 'Priority',
      dataIndex: 'priority',
      sortable: true,
      filterable: true,
      render: (value) => {
        const colors = {
          low: 'bg-gray-100 text-gray-800',
          medium: 'bg-blue-100 text-blue-800',
          high: 'bg-orange-100 text-orange-800',
          urgent: 'bg-red-100 text-red-800'
        }
        return <Badge className={colors[value]}>{value}</Badge>
      }
    },
    {
      key: 'progress',
      title: 'Progress',
      dataIndex: 'progress',
      sortable: true,
      align: 'center',
      render: (value) => (
        <div className="w-full">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>{value}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'budget',
      title: 'Budget',
      dataIndex: 'budget',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className="font-mono">${value.toLocaleString()}</span>
      )
    },
    {
      key: 'team',
      title: 'Team Size',
      dataIndex: 'team',
      sortable: true,
      align: 'center',
      render: (value) => (
        <Badge variant="outline">{value.length} members</Badge>
      )
    }
  ]

  // Table actions
  const userActions: DataTableAction<User>[] = [
    commonActions.edit((record) => {
      console.log('Edit user:', record)
    }),
    {
      key: 'view-profile',
      label: 'View Profile',
      icon: UserCheck,
      onClick: (record) => console.log('View profile:', record),
      variant: 'ghost'
    },
    commonActions.delete((record) => {
      console.log('Delete user:', record)
    })
  ]

  const userBulkActions: DataTableBulkAction<User>[] = [
    {
      key: 'activate',
      label: 'Activate Users',
      icon: UserCheck,
      onClick: (records) => console.log('Activate users:', records),
      variant: 'default'
    },
    {
      key: 'deactivate',
      label: 'Deactivate Users',
      icon: UserX,
      onClick: (records) => console.log('Deactivate users:', records),
      variant: 'outline'
    },
    commonBulkActions.export((records) => {
      console.log('Export users:', records)
    }),
    commonBulkActions.delete((records) => {
      console.log('Delete users:', records)
    })
  ]

  const projectActions: DataTableAction<Project>[] = [
    commonActions.edit((record) => {
      console.log('Edit project:', record)
    }),
    {
      key: 'view-details',
      label: 'View Details',
      icon: TrendingUp,
      onClick: (record) => console.log('View project details:', record),
      variant: 'ghost'
    }
  ]

  // Filter configurations
  const userFilters: TableFilterConfig[] = [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Moderator', value: 'moderator' },
        { label: 'User', value: 'user' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    {
      key: 'company',
      label: 'Company',
      type: 'select',
      options: [
        { label: 'Acme Corp', value: 'Acme Corp' },
        { label: 'TechStart Inc', value: 'TechStart Inc' },
        { label: 'Design Co', value: 'Design Co' }
      ]
    },
    {
      key: 'revenue',
      label: 'Revenue Range',
      type: 'range',
      min: 0,
      max: 100000
    }
  ]

  const projectFilters: TableFilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'On Hold', value: 'on-hold' },
        { label: 'Cancelled', value: 'cancelled' }
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' }
      ]
    },
    {
      key: 'progress',
      label: 'Progress',
      type: 'range',
      min: 0,
      max: 100
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Tables</h1>
          <p className="text-muted-foreground">
            Advanced data table components with sorting, filtering, and pagination
          </p>
        </div>
      </div>

      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('users')}
        >
          <Users className="h-4 w-4 mr-2" />
          Users Table
        </Button>
        <Button
          variant={activeTab === 'projects' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('projects')}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Projects Table
        </Button>
      </div>

      {activeTab === 'users' ? (
        <Card>
          <CardHeader>
            <CardTitle>Users Management</CardTitle>
            <CardDescription>
              Manage your team members with advanced filtering, sorting, and bulk actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserTable 
              data={users} 
              columns={userColumns}
              actions={userActions}
              bulkActions={userBulkActions}
              filters={userFilters}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Projects Management</CardTitle>
            <CardDescription>
              Track and manage your projects with detailed progress monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectTable 
              data={projects} 
              columns={projectColumns}
              actions={projectActions}
              filters={projectFilters}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// User table with state management
function UserTable({ 
  data, 
  columns, 
  actions, 
  bulkActions, 
  filters 
}: {
  data: User[]
  columns: DataTableColumn<User>[]
  actions: DataTableAction<User>[]
  bulkActions: DataTableBulkAction<User>[]
  filters: TableFilterConfig[]
}) {
  const tableState = useTableState({
    data,
    initialPageSize: 10,
    initialSort: { column: 'name', direction: 'asc' }
  })

  return (
    <div className="space-y-4">
      <TableFilters
        filters={filters}
        values={tableState.filterState}
        onChange={tableState.updateFilter}
        onClear={tableState.clearFilter}
        onReset={tableState.clearAllFilters}
        compact
      />
      
      <DataTable
        data={tableState.paginatedData}
        columns={columns}
        selectable
        searchable
        searchPlaceholder="Search users..."
        selectedRowKeys={tableState.selectedKeys}
        onSelectionChange={tableState.setSelectedKeys}
        sortable={false}
        onSortChange={tableState.setSortState}
        pagination={false}
        actions={actions}
        bulkActions={bulkActions}
        className="border-0"
      />
      
      {/* Custom pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {(tableState.currentPage - 1) * tableState.pageSize + 1} to {Math.min(tableState.currentPage * tableState.pageSize, tableState.totalRecords)} of {tableState.totalRecords} entries
        </div>
        
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={tableState.pageSize}
              onChange={(e) => tableState.setPageSize(Number(e.target.value))}
              className="h-8 w-16 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              {[5, 10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={tableState.goToFirstPage}
              disabled={tableState.currentPage === 1}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏮
            </button>
            <button
              onClick={tableState.goToPreviousPage}
              disabled={tableState.currentPage === 1}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏪
            </button>
            <div className="flex items-center justify-center text-sm font-medium px-3">
              Page {tableState.currentPage} of {tableState.totalPages}
            </div>
            <button
              onClick={tableState.goToNextPage}
              disabled={tableState.currentPage === tableState.totalPages}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏩
            </button>
            <button
              onClick={tableState.goToLastPage}
              disabled={tableState.currentPage === tableState.totalPages}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Project table with state management
function ProjectTable({ 
  data, 
  columns, 
  actions, 
  filters 
}: {
  data: Project[]
  columns: DataTableColumn<Project>[]
  actions: DataTableAction<Project>[]
  filters: TableFilterConfig[]
}) {
  const tableState = useTableState({
    data,
    initialPageSize: 15,
    initialSort: { column: 'name', direction: 'asc' }
  })

  return (
    <div className="space-y-4">
      <TableFilters
        filters={filters}
        values={tableState.filterState}
        onChange={tableState.updateFilter}
        onClear={tableState.clearFilter}
        onReset={tableState.clearAllFilters}
        orientation="horizontal"
        showClearAll
      />
      
      <DataTable
        data={tableState.paginatedData}
        columns={columns}
        searchable
        searchPlaceholder="Search projects..."
        sortable={false}
        onSortChange={tableState.setSortState}
        pagination={false}
        actions={actions}
        className="border-0"
      />
      
      {/* Custom pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {(tableState.currentPage - 1) * tableState.pageSize + 1} to {Math.min(tableState.currentPage * tableState.pageSize, tableState.totalRecords)} of {tableState.totalRecords} entries
        </div>
        
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={tableState.pageSize}
              onChange={(e) => tableState.setPageSize(Number(e.target.value))}
              className="h-8 w-16 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              {[5, 10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={tableState.goToFirstPage}
              disabled={tableState.currentPage === 1}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏮
            </button>
            <button
              onClick={tableState.goToPreviousPage}
              disabled={tableState.currentPage === 1}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏪
            </button>
            <div className="flex items-center justify-center text-sm font-medium px-3">
              Page {tableState.currentPage} of {tableState.totalPages}
            </div>
            <button
              onClick={tableState.goToNextPage}
              disabled={tableState.currentPage === tableState.totalPages}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏩
            </button>
            <button
              onClick={tableState.goToLastPage}
              disabled={tableState.currentPage === tableState.totalPages}
              className="h-8 w-8 p-0 border border-input bg-background rounded-md disabled:opacity-50"
            >
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}