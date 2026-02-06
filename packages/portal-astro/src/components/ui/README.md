# UI Component Library

Vue 3 component library for NGFW.sh portal built with Composition API, TypeScript, and Tailwind CSS 4.

## Components

### Button
**File:** `Button.vue`

Multi-variant button component with size options.

```vue
<Button variant="primary" size="lg" @click="handleClick">
  Click Me
</Button>
```

**Props:**
- `variant`: `'default' | 'primary' | 'danger' | 'ghost'` (default: `'default'`)
- `size`: `'sm' | 'default' | 'lg'` (default: `'default'`)
- `disabled`: `boolean` (default: `false`)
- `type`: `'button' | 'submit' | 'reset'` (default: `'button'`)

**Events:**
- `click`: Emitted when button is clicked

---

### Card
**File:** `Card.vue`

Container component with optional title and actions.

```vue
<Card title="Dashboard">
  <template #actions>
    <Button size="sm">Action</Button>
  </template>
  <p>Card content goes here</p>
</Card>
```

**Props:**
- `title`: `string` (optional)
- `noPadding`: `boolean` (default: `false`)

**Slots:**
- `default`: Card content
- `actions`: Action buttons in header

---

### Input
**File:** `Input.vue`

Form input with label and error states.

```vue
<Input
  v-model="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  :error="emailError"
  required
/>
```

**Props:**
- `modelValue`: `string | number`
- `label`: `string` (optional)
- `type`: `'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'` (default: `'text'`)
- `placeholder`: `string` (optional)
- `error`: `string` (optional)
- `disabled`: `boolean` (default: `false`)
- `required`: `boolean` (default: `false`)
- `id`: `string` (optional, auto-generated if not provided)

**Events:**
- `update:modelValue`: Emitted when value changes

---

### Select
**File:** `Select.vue`

Dropdown select with options.

```vue
<Select
  v-model="selectedRouter"
  label="Router"
  :options="routerOptions"
  placeholder="Choose a router"
  :error="routerError"
  required
/>
```

**Props:**
- `modelValue`: `string | number`
- `label`: `string` (optional)
- `options`: `SelectOption[]` (required)
- `placeholder`: `string` (optional)
- `error`: `string` (optional)
- `disabled`: `boolean` (default: `false`)
- `required`: `boolean` (default: `false`)
- `id`: `string` (optional)

**Types:**
```typescript
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}
```

**Events:**
- `update:modelValue`: Emitted when selection changes

---

### Badge
**File:** `Badge.vue`

Status badge with color variants.

```vue
<Badge variant="success">Active</Badge>
<Badge variant="danger">Offline</Badge>
```

**Props:**
- `variant`: `'success' | 'danger' | 'warning' | 'info' | 'purple'` (default: `'info'`)

---

### Toggle
**File:** `Toggle.vue`

Boolean switch control.

```vue
<Toggle v-model="isEnabled" label="Enable Feature" />
```

**Props:**
- `modelValue`: `boolean` (required)
- `label`: `string` (optional)
- `disabled`: `boolean` (default: `false`)
- `id`: `string` (optional)

**Events:**
- `update:modelValue`: Emitted when toggle state changes

---

### Table
**File:** `Table.vue`

Data table with sorting and row click support. Generic TypeScript support for type-safe data.

```vue
<Table
  :columns="columns"
  :data="devices"
  @rowClick="handleRowClick"
  @sort="handleSort"
/>
```

**Props:**
```typescript
interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  sortKey?: keyof T;
  sortOrder?: 'asc' | 'desc';
  hoverable?: boolean;
}
```

**Events:**
- `rowClick`: Emitted when row is clicked
- `sort`: Emitted when column header is clicked (sortable columns only)

**Slots:**
- `cell-{columnKey}`: Custom cell renderer (receives `row` and `value`)

---

### Modal
**File:** `Modal.vue`

Overlay modal dialog with transitions.

```vue
<Modal :open="isOpen" title="Confirm Action" size="md" @close="isOpen = false">
  <p>Are you sure you want to continue?</p>
  <template #actions>
    <Button variant="ghost" @click="isOpen = false">Cancel</Button>
    <Button variant="primary" @click="confirm">Confirm</Button>
  </template>
</Modal>
```

**Props:**
- `open`: `boolean` (required)
- `title`: `string` (optional)
- `size`: `'sm' | 'md' | 'lg' | 'xl'` (default: `'md'`)

**Events:**
- `close`: Emitted when modal should close (backdrop click, ESC key, close button)

**Slots:**
- `default`: Modal content
- `title`: Custom title (overrides `title` prop)
- `actions`: Action buttons in footer

**Features:**
- Teleports to body
- Backdrop click to close
- ESC key to close
- Body scroll lock when open
- Fade and scale transitions

---

### Spinner
**File:** `Spinner.vue`

Loading indicator.

```vue
<Spinner size="lg" />
```

**Props:**
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)

---

### Stat
**File:** `Stat.vue`

Statistic display with optional trend indicator.

```vue
<Stat
  label="Active Devices"
  value="42"
  icon="🖥️"
  trend="up"
  trendValue="12%"
/>
```

**Props:**
- `label`: `string` (required)
- `value`: `string | number` (required)
- `icon`: `string` (optional)
- `trend`: `'up' | 'down' | 'neutral'` (optional)
- `trendValue`: `string` (optional)

---

### GaugeComponent
**File:** `GaugeComponent.vue`

Radial progress gauge (ideal for CPU, memory, disk usage).

```vue
<GaugeComponent
  :value="cpuUsage"
  :max="100"
  label="CPU Usage"
  size="lg"
  color="blue"
/>
```

**Props:**
- `value`: `number` (required)
- `max`: `number` (default: `100`)
- `label`: `string` (optional)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `color`: `'blue' | 'green' | 'yellow' | 'red' | 'purple'` (default: `'blue'`)

**Features:**
- SVG-based for crisp rendering
- Smooth transition on value change
- Automatic percentage calculation
- Circular progress with center text

---

### MiniChart
**File:** `MiniChart.vue`

Sparkline chart for displaying trends (canvas-based for performance).

```vue
<MiniChart
  :data="[10, 20, 15, 30, 25, 40, 35]"
  :width="200"
  :height="60"
  color="green"
  smooth
/>
```

**Props:**
- `data`: `number[]` (required)
- `width`: `number` (default: `200`)
- `height`: `number` (default: `60`)
- `color`: `'blue' | 'green' | 'yellow' | 'red' | 'purple'` (default: `'blue'`)
- `smooth`: `boolean` (default: `true`)

**Features:**
- Canvas-based rendering for performance
- Smooth curves via quadratic bezier
- Auto-scaling to data range
- Gradient fill below curve
- HiDPI/Retina display support

---

## Usage

### Import Individual Components

```typescript
import { Button, Card, Input } from './components/ui';
```

### Import All Components

```typescript
import * as UI from './components/ui';
```

### TypeScript Support

All components are fully typed with exported TypeScript interfaces:

```typescript
import type { ButtonProps, TableColumn, SelectOption } from './components/ui';
```

---

## Design System

### Colors

All components support dark mode via Tailwind CSS dark mode classes.

**Variants:**
- **Primary:** Blue (`bg-blue-600`)
- **Success:** Green (`bg-green-600`)
- **Danger:** Red (`bg-red-600`)
- **Warning:** Yellow (`bg-yellow-600`)
- **Info:** Blue (`bg-blue-600`)
- **Purple:** Purple (`bg-purple-600`)

### Sizes

Consistent sizing across components:
- **sm:** Small (h-8, text-sm)
- **default/md:** Medium (h-10, text-base)
- **lg:** Large (h-12, text-lg)

### Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus visible states
- Screen reader text where appropriate

---

## Technical Details

- **Framework:** Vue 3 Composition API
- **TypeScript:** Strict mode compatible
- **Script Setup:** All components use `<script setup>` pattern
- **Styling:** Tailwind CSS 4
- **Dark Mode:** Full support via `dark:` prefixes
- **Reactivity:** `defineProps`, `defineEmits`, computed properties
- **Animations:** CSS transitions and transforms

---

## Notes

- All components are self-contained with no external dependencies (except Vue and Tailwind)
- TypeScript errors in `index.ts` are expected until Astro project initializes Vue plugin
- Canvas-based MiniChart provides better performance than SVG for large datasets
- Modal uses Teleport API to mount at document body level
- Table component uses TypeScript generics for type-safe data handling
