# Onboarding Flow Components

Multi-step wizard for router selection and initial setup.

## Overview

The onboarding flow guides new users through:
1. Welcome screen with feature overview
2. Router selection from 4 pre-configured options
3. Configuration (device name, shipping, WiFi, WAN, admin, security)
4. Order summary and review
5. Order submission
6. Completion confirmation

## Components

### OnboardingWizard.vue
**Purpose:** Main wizard state machine and progress indicator

**Props:**
- `initialStep?: WizardStep` - Starting step (default: 'welcome')

**Emits:**
- `stepChange: [step: WizardStep]` - When step changes
- `complete: [orderId: string]` - When order is complete

**Exposed Methods:**
- `goToStep(step)` - Navigate to specific step
- `goNext()` - Advance to next step
- `goBack()` - Return to previous step
- `setRouter(router)` - Store selected router
- `setConfig(config)` - Store configuration
- `setOrderId(id)` - Store order ID

**State:**
- Tracks current step
- Stores router selection
- Stores configuration
- Stores order ID

### OnboardingFlow.vue
**Purpose:** Orchestrates all steps and API communication

**Features:**
- Renders appropriate component for each step
- Handles router selection
- Handles configuration submission
- Submits order to API
- Error handling and display
- Navigation between steps

**API Integration:**
- `GET /onboarding/routers` - Fetch available routers
- `POST /onboarding/order` - Submit order

### RouterSelector.vue
**Purpose:** Display and select from available routers

**Props:**
- `selectedRouterId?: string | null` - Currently selected router ID

**Emits:**
- `select: [router: RouterOption]` - When router is selected

**Features:**
- Fetches router list from API
- Displays router cards with specs, features, pricing
- Visual selection indicator
- Recommended badge
- Stock availability check
- Loading and error states

**Router Data:**
- ASUS RT-AX92U - $299, WiFi 6, Merlin firmware
- GL.iNet Flint 2 - $199, WiFi 6, OpenWrt (recommended)
- Linksys WRT3200ACM - $179, OpenWrt
- GL.iNet Flint 3 - $299, WiFi 7, OpenWrt

### ConfigForm.vue
**Purpose:** Collect all configuration data

**Emits:**
- `submit: [config: OnboardingConfig]` - When form is submitted

**Form Sections:**
1. **Device Identity**
   - Device name (3+ characters)

2. **Shipping Address**
   - Full name
   - Street address (line 1 & 2)
   - City, State (dropdown), ZIP code
   - Phone number

3. **WiFi Network**
   - SSID (network name, max 32 chars)
   - Password (min 8 chars)
   - Hide SSID toggle

4. **Internet Connection (WAN)**
   - Connection type dropdown: DHCP, Static, PPPoE, LTE
   - Dynamic fields based on type:
     - PPPoE: username, password
     - Static: IP, subnet, gateway, DNS1, DNS2

5. **Admin Password**
   - Password (min 8 chars)
   - Confirm password

6. **Security Settings**
   - Security preset: Standard, Strict, Custom
   - Enable IPS toggle
   - Enable DNS filter toggle
   - Enable auto-updates toggle

**Validation:**
- All required fields validated
- ZIP code format (5 or 9 digits)
- Phone number format (10+ digits)
- Password strength (8+ chars)
- Password confirmation match
- WAN-specific validation (PPPoE, Static)

### OrderSummary.vue
**Purpose:** Review all selections before submission

**Props:**
- `router: RouterOption` - Selected router
- `config: OnboardingConfig` - Configuration data

**Emits:**
- `submit: []` - When order is confirmed
- `edit: [section: 'router' | 'config']` - When user wants to edit

**Display:**
- Router image, name, price
- Device name
- Shipping address
- WiFi network (SSID, hidden status)
- WAN connection type
- Security settings
- Order total
- Terms acceptance notice

**Actions:**
- Edit router selection
- Edit configuration
- Go back
- Place order

### OrderComplete.vue
**Purpose:** Display order confirmation and next steps

**Props:**
- `order: OrderDetails` - Order response from API

**Display:**
- Success icon and message
- Order ID
- Device ID (pre-provisioned)
- Estimated delivery date
- Next steps list (3 steps)
- Action buttons (setup guide, dashboard)
- Email confirmation notice

## Pages

### /onboarding/index.astro
Main onboarding page that mounts the Vue app.

**Features:**
- Auth check (redirects to sign-in if not authenticated)
- Could check onboarding status and redirect if complete
- Mounts OnboardingFlow.vue client-side

### /onboarding/complete.astro
Static success page for completed orders.

**Features:**
- Auth check
- Displays order ID from URL params
- Shows completion message and next steps
- Links to dashboard and setup guide

## Backend API Endpoints

### GET /onboarding/routers
Returns list of available routers with specs, features, pricing.

**Response:**
```json
{
  "success": true,
  "result": [
    {
      "id": "gl-inet-flint-2",
      "name": "Flint 2 (GL-MT6000)",
      "manufacturer": "GL.iNet",
      "firmware": "OpenWrt",
      "price": 199,
      "specs": { ... },
      "features": [...],
      "image": "https://...",
      "recommended": true,
      "inStock": true
    }
  ]
}
```

### POST /onboarding/order
Submit router order with configuration.

**Request:**
```json
{
  "routerId": "gl-inet-flint-2",
  "config": {
    "deviceName": "Home Router",
    "shippingAddress": { ... },
    "wifiConfig": { ... },
    "wanType": "dhcp",
    "adminPassword": "...",
    "securityPreset": "standard",
    "enableIPS": true,
    "enableDNSFilter": true,
    "enableAutoUpdates": true
  },
  "subscriptionPlan": "free"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "orderId": "ORD-1707123456-ABCD",
    "deviceId": "DEV-XYZABCD123",
    "estimatedDelivery": "2026-02-15T00:00:00Z",
    "setupInstructions": "https://docs.ngfw.sh/setup/quick-start",
    "status": "pending",
    "createdAt": "2026-02-06T02:00:00Z"
  }
}
```

### GET /onboarding/status
Check user's onboarding status.

**Response:**
```json
{
  "success": true,
  "result": {
    "completed": false,
    "currentStep": "router_selection",
    "lastUpdated": "2026-02-06T02:00:00Z"
  }
}
```

## Schemas (Zod)

All schemas defined in `packages/schema/src/endpoints/onboarding/base.ts`:

- `RouterSpecSchema` - Hardware specifications
- `RouterOptionSchema` - Router product data
- `WANTypeEnum` - Connection types
- `SecurityPresetEnum` - Security levels
- `OnboardingConfigSchema` - Full configuration
- `OrderSubmissionSchema` - Order request
- `OrderResponseSchema` - Order response
- `OnboardingStatusSchema` - Status check

## Usage

### In Middleware (Optional)
Check if user has completed onboarding:

```ts
const status = await fetch('https://specs.ngfw.sh/onboarding/status', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

if (!status.result.completed) {
  return Astro.redirect('/onboarding');
}
```

### Direct Navigation
Users can access `/onboarding` directly. The wizard remembers state within the session.

## Styling

Uses Tailwind CSS 4 with existing component library:
- `Button.vue` - Action buttons
- `Card.vue` - Section containers
- `Input.vue` - Form inputs
- `Select.vue` - Dropdowns
- `Toggle.vue` - Boolean switches
- `Badge.vue` - Status indicators

Color scheme:
- Primary: Blue 600/700
- Success: Green 600
- Error: Red 600
- Neutral: Slate 100-900

## Future Enhancements

1. **Save Progress**
   - Store partial configuration in KV
   - Resume from last step

2. **Payment Integration**
   - Add Stripe checkout
   - Handle subscription plans

3. **Real-time Stock**
   - Query actual inventory
   - Show "notify me" for out-of-stock

4. **Advanced WAN Config**
   - VLAN tagging
   - IPv6 configuration
   - Dual WAN setup

5. **Device Tracking**
   - Real-time order status
   - Shipping notifications
   - Device activation status

6. **Validation Improvements**
   - IP address format validation
   - DNS server validation
   - SSID character restrictions

7. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

8. **Analytics**
   - Track drop-off points
   - Most popular routers
   - Configuration patterns
