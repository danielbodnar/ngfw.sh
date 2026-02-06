# Monitoring Pages Implementation Plan

## Agent: monitoring-pages

### Status: Waiting for Dependencies

Dependencies required:
- **astro-setup**: Pages directory structure, layouts, Clerk integration
- **vue-components**: Table, Modal, Spinner, Stat, GaugeComponent, MiniChart components
- **vue-composables**: useDashboards(), useReports(), useLogs() composables

---

## Architecture Overview

### File Structure
```
packages/portal-astro/src/
├── pages/
│   ├── monitoring/
│   │   ├── dashboards/
│   │   │   ├── index.astro              # Dashboard list
│   │   │   ├── [id].astro               # Dynamic dashboard viewer
│   │   │   ├── network-overview.astro   # Network metrics dashboard
│   │   │   ├── security-events.astro    # Security events dashboard
│   │   │   ├── dns-analytics.astro      # DNS query analytics
│   │   │   ├── wifi-performance.astro   # WiFi metrics
│   │   │   ├── wan-health.astro         # WAN connection health
│   │   │   ├── vpn-metrics.astro        # VPN connection metrics
│   │   │   ├── system-resources.astro   # CPU/RAM/Disk
│   │   │   ├── traffic-analysis.astro   # Traffic flow analysis
│   │   │   ├── firewall-rules.astro     # Firewall rule hits
│   │   │   └── qos-metrics.astro        # QoS statistics
│   │   └── reports.astro                # Reports management
│   └── system/
│       └── logs.astro                   # System logs viewer
└── components/
    └── monitoring/
        ├── DashboardGrid.vue            # Grid of dashboard cards
        ├── DashboardViewer.vue          # Chart/metric viewer
        ├── ReportList.vue               # Report table
        ├── ReportGenerator.vue          # Modal for generating reports
        ├── LogViewer.vue                # Log table with filtering
        └── LogFilter.vue                # Log filter controls
```

---

## Component Specifications

### 1. DashboardGrid.vue
**Purpose**: Display grid of available dashboards with preview stats

**Props**:
- `dashboards: Dashboard[]`
- `loading?: boolean`

**Features**:
- Card-based grid layout (2-4 columns responsive)
- Each card shows: icon, title, description, last updated, quick stats
- Click to navigate to dashboard detail page
- Hover effects and loading states

**Mock Data Structure**:
```typescript
interface Dashboard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'network' | 'security' | 'system' | 'traffic';
  lastUpdated: number;
  stats: { label: string; value: string; }[];
}
```

---

### 2. DashboardViewer.vue
**Purpose**: Display charts and metrics for a specific dashboard

**Props**:
- `dashboardId: string`
- `timeRange?: '1h' | '6h' | '24h' | '7d' | '30d'`
- `autoRefresh?: boolean`

**Features**:
- Time range selector in header
- Auto-refresh toggle (5s, 30s, 1m, 5m)
- Grid of stat cards + charts
- Export button (PNG, PDF)
- Full-screen mode toggle

**Charts** (mock with colored divs initially):
- Line charts for time-series data
- Bar charts for comparisons
- Pie/donut charts for distributions
- Gauge charts for percentages

---

### 3. ReportList.vue
**Purpose**: Table of generated and scheduled reports

**Props**:
- `reports: Report[]`
- `loading?: boolean`

**Features**:
- Sortable table columns
- Status badges (pending, generating, ready, failed)
- Actions: Download, Delete, Regenerate
- Filter by status and type
- Pagination (20 items per page)

**Mock Data Structure**:
```typescript
interface Report {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  dateRange: { start: number; end: number; };
  generatedAt: number | null;
  fileSize: number | null;
  format: 'pdf' | 'csv' | 'json';
}
```

---

### 4. ReportGenerator.vue
**Purpose**: Modal for creating new reports

**Props**:
- `open: boolean`
- `@close: () => void`
- `@generate: (config: ReportConfig) => void`

**Features**:
- Multi-step wizard OR single form
- Report type selector (30 types)
- Date range picker
- Format selector (PDF, CSV, JSON)
- Include/exclude sections
- Schedule option (one-time vs recurring)

**Report Types** (20-30 mockups):
1. Network Traffic Summary
2. Security Events Summary
3. DNS Query Analytics
4. Firewall Rule Analysis
5. IPS Alert Summary
6. VPN Connection Report
7. WiFi Performance Report
8. WAN Health Report
9. System Resource Utilization
10. Bandwidth Usage by Client
11. Top Talkers Report
12. Blocked Connections Report
13. Port Scan Detection Report
14. Malware Detection Report
15. QoS Policy Effectiveness
16. DHCP Lease History
17. NAT Translation Report
18. SSL/TLS Certificate Report
19. Authentication Log Report
20. Configuration Change Audit
21. Backup History Report
22. Firmware Update Log
23. Interface Statistics Report
24. Protocol Distribution Report
25. Geolocation Traffic Report
26. Application Usage Report
27. Threat Intelligence Feed Report
28. Compliance Audit Report
29. Monthly Executive Summary
30. Custom Query Report

---

### 5. LogViewer.vue
**Purpose**: Advanced log table with real-time updates

**Props**:
- `logs: LogEntry[]`
- `loading?: boolean`
- `realtime?: boolean`

**Features**:
- Virtual scrolling for 10,000+ entries
- Color-coded by log level (error=red, warn=yellow, info=blue, debug=gray)
- Expandable rows for full details
- Copy log entry button
- Export selected/filtered logs
- Auto-scroll to bottom in realtime mode
- Pause/resume realtime updates

**Mock Data Structure**:
```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: string;
  message: string;
  details?: Record<string, any>;
  source: string;
}
```

---

### 6. LogFilter.vue
**Purpose**: Filter controls for log viewer

**Props**:
- `filters: LogFilters`
- `@change: (filters: LogFilters) => void`

**Features**:
- Level checkboxes (Error, Warn, Info, Debug)
- Category dropdown (System, Network, Security, Auth, DNS, Firewall, VPN, etc.)
- Date range picker
- Search input (fuzzy search in message)
- Quick filters: "Last 1h", "Last 6h", "Last 24h", "Last 7d"
- Clear all button

**Filter Structure**:
```typescript
interface LogFilters {
  levels: string[];
  categories: string[];
  dateRange: { start: number; end: number; } | null;
  search: string;
}
```

---

## Astro Page Specifications

### pages/monitoring/dashboards/index.astro
- Display `<DashboardGrid />` with 10+ dashboard cards
- Filter/search bar at top
- Categories tabs: All, Network, Security, System, Traffic

### pages/monitoring/dashboards/[id].astro
- Dynamic route for any dashboard ID
- Display `<DashboardViewer :dashboardId="id" />`
- Breadcrumb navigation
- 404 if dashboard ID invalid

### Individual Dashboard Pages
Each dashboard page (network-overview.astro, security-events.astro, etc.) will:
- Use main layout with sidebar
- Display `<DashboardViewer dashboardId="<specific-id>" />`
- Include page-specific metadata (title, description)
- Show relevant stat cards and charts

### pages/monitoring/reports.astro
- Display `<ReportList />` with 20+ report entries
- "Generate New Report" button opens `<ReportGenerator />`
- Tabs: All, Ready, Pending, Failed
- Bulk actions: Download selected, Delete selected

### pages/system/logs.astro
- Display `<LogFilter />` in sidebar or top panel
- Display `<LogViewer />` with filtered results
- Toggle realtime mode button
- Export all/filtered button
- Stats header: Total logs, Error count, Warn count

---

## Mock Data Requirements

### Dashboard Metrics
```typescript
const dashboardMetrics = {
  networkOverview: {
    stats: [
      { label: 'WAN Uptime', value: '99.8%', trend: 'up' },
      { label: 'Active Connections', value: '847', trend: 'neutral' },
      { label: 'Avg Latency', value: '12ms', trend: 'down' },
      { label: 'Total Throughput', value: '1.2 Gbps', trend: 'up' },
    ],
    charts: [
      { type: 'line', title: 'Bandwidth Usage (24h)', data: [...] },
      { type: 'bar', title: 'Traffic by Protocol', data: [...] },
    ]
  },
  securityEvents: {
    stats: [
      { label: 'Blocked IPs', value: '284', trend: 'up' },
      { label: 'IPS Alerts', value: '47', trend: 'down' },
      { label: 'Firewall Drops', value: '1.2K', trend: 'up' },
      { label: 'Threat Score', value: '6.2/10', trend: 'down' },
    ],
    charts: [
      { type: 'line', title: 'Security Events (7d)', data: [...] },
      { type: 'pie', title: 'Event Types', data: [...] },
    ]
  },
  // ... 8 more dashboard types
}
```

### Log Entries (100+ mock entries)
```typescript
const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: Date.now() - 30000,
    level: 'error',
    category: 'Network',
    message: 'WAN connection lost, failover to LTE',
    source: 'wan-monitor',
    details: { interface: 'eth0', reason: 'timeout' }
  },
  {
    id: '2',
    timestamp: Date.now() - 25000,
    level: 'warn',
    category: 'Security',
    message: 'Multiple failed login attempts from 203.0.113.89',
    source: 'auth-manager',
    details: { ip: '203.0.113.89', attempts: 5, username: 'admin' }
  },
  // ... 98 more entries
]
```

### Report Types (30 types)
```typescript
const reportTypes = [
  { id: 'network-traffic', name: 'Network Traffic Summary', category: 'network', duration: '5-10min' },
  { id: 'security-events', name: 'Security Events Summary', category: 'security', duration: '3-5min' },
  // ... 28 more types
]
```

---

## Styling Patterns (from existing portal)

### Color Palette
- Background: `bg-zinc-950`, `bg-zinc-900`
- Borders: `border-zinc-800`
- Text: `text-zinc-100` (primary), `text-zinc-300` (secondary), `text-zinc-500` (muted)
- Success: `text-green-500`, `bg-green-500`
- Warning: `text-yellow-500`, `bg-yellow-500`
- Danger: `text-red-500`, `bg-red-500`
- Primary: `text-blue-500`, `bg-blue-600`

### Component Patterns
- Cards: `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm`
- Tables: Striped rows with hover states
- Buttons: Variant-based (default, primary, danger, ghost)
- Badges: Pill-shaped with variant colors
- Inputs: Labeled with validation states

### Responsive Grid
- Stats: `grid grid-cols-2 lg:grid-cols-4 gap-4`
- Dashboards: `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6`
- Reports: Full-width table with horizontal scroll

---

## API Integration Plan (future)

When composables are available:

### useDashboards()
```typescript
const {
  dashboards,           // Dashboard[]
  loading,             // boolean
  error,               // Error | null
  refresh,             // () => Promise<void>
  getDashboard,        // (id: string) => Promise<Dashboard>
} = useDashboards();
```

### useReports()
```typescript
const {
  reports,             // Report[]
  loading,             // boolean
  error,               // Error | null
  generate,            // (config: ReportConfig) => Promise<Report>
  download,            // (id: string) => Promise<void>
  delete: deleteReport, // (id: string) => Promise<void>
  refresh,             // () => Promise<void>
} = useReports();
```

### useLogs()
```typescript
const {
  logs,                // LogEntry[]
  loading,             // boolean
  error,               // Error | null
  filters,             // Ref<LogFilters>
  setFilters,          // (filters: LogFilters) => void
  realtime,            // Ref<boolean>
  toggleRealtime,      // () => void
  export: exportLogs,  // (format: 'csv' | 'json') => Promise<void>
} = useLogs();
```

---

## Implementation Checklist

### Phase 1: Vue Components (monitoring/)
- [ ] DashboardGrid.vue
- [ ] DashboardViewer.vue
- [ ] ReportList.vue
- [ ] ReportGenerator.vue
- [ ] LogViewer.vue
- [ ] LogFilter.vue

### Phase 2: Dashboard Pages (monitoring/dashboards/)
- [ ] index.astro
- [ ] [id].astro
- [ ] network-overview.astro
- [ ] security-events.astro
- [ ] dns-analytics.astro
- [ ] wifi-performance.astro
- [ ] wan-health.astro
- [ ] vpn-metrics.astro
- [ ] system-resources.astro
- [ ] traffic-analysis.astro
- [ ] firewall-rules.astro
- [ ] qos-metrics.astro

### Phase 3: Other Pages
- [ ] monitoring/reports.astro
- [ ] system/logs.astro

### Phase 4: Mock Data
- [ ] Create mock dashboard metrics
- [ ] Create 100+ mock log entries
- [ ] Create 30 report type definitions
- [ ] Create 20+ mock generated reports

### Phase 5: Integration
- [ ] Replace mock data with composables
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test all navigation flows

---

## Testing Plan

1. **Navigation**: Verify all dashboard links work
2. **Filtering**: Test log filters apply correctly
3. **Realtime**: Verify log realtime mode updates
4. **Reports**: Test generate/download/delete flows
5. **Responsive**: Test on mobile, tablet, desktop
6. **Dark Mode**: Verify all components follow dark theme

---

## Notes

- Use existing Button, Card, Table, Badge components from `@/components/ui/`
- Follow Tailwind CSS 4 patterns from existing portal
- Use Vue 3 Composition API with `<script setup lang="ts">`
- All timestamps in Unix epoch (seconds or milliseconds)
- Mock chart data with colored divs initially, replace with real charts later
- Ensure all pages are SSR-compatible (no client-only code at top level)

---

**Ready to implement upon dependency completion.**
