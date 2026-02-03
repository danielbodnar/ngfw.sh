import { useState } from 'react'
import {
  Shield,
  Wifi,
  Globe,
  Activity,
  Lock,
  Eye,
  Zap,
  Server,
  Users,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Menu,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Router,
  Filter,
  ShieldCheck,
  BarChart3,
  Building,
  Home,
  Crown,
} from 'lucide-react'

// Utility for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(' ')

// Plans data
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Essential security for getting started',
    features: [
      'Basic firewall rules',
      'Traffic monitoring (24h)',
      'Up to 5 devices',
      'Community support',
    ],
    notIncluded: ['DNS blocking', 'VPN', 'IDS/IPS'],
    cta: 'Get Started Free',
    popular: false,
    icon: Shield,
  },
  {
    id: 'home',
    name: 'Home',
    price: 12,
    period: 'month',
    description: 'Advanced protection for home networks',
    features: [
      'Everything in Free',
      'DNS ad & tracker blocking',
      'Up to 50 devices',
      '7-day log retention',
      'Email support',
    ],
    notIncluded: ['VPN', 'IDS/IPS'],
    cta: 'Start Free Trial',
    popular: false,
    icon: Home,
  },
  {
    id: 'homeplus',
    name: 'Home+',
    price: 24,
    period: 'month',
    description: 'Complete home security suite',
    features: [
      'Everything in Home',
      'Advanced web filtering',
      'WireGuard VPN (5 peers)',
      'Up to 100 devices',
      '30-day retention',
      'Parental controls',
    ],
    notIncluded: ['IDS/IPS', 'API'],
    cta: 'Start Free Trial',
    popular: true,
    icon: Crown,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 60,
    period: 'month',
    description: 'Professional-grade security',
    features: [
      'Everything in Home+',
      'IDS/IPS protection',
      'Application DPI',
      'Unlimited VPN peers',
      'Multi-site (3)',
      'API access',
    ],
    notIncluded: [],
    cta: 'Start Free Trial',
    popular: false,
    icon: ShieldCheck,
  },
  {
    id: 'business',
    name: 'Business',
    price: 120,
    period: 'month',
    description: 'Enterprise features for SMB',
    features: [
      'Everything in Pro',
      'AD/LDAP integration',
      'HA clustering',
      'Compliance reports',
      'Unlimited sites',
      'Dedicated support',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    popular: false,
    icon: Building,
  },
]

// Hardware data
const hardware = [
  {
    id: 'br100',
    name: 'BR100',
    tagline: 'Perfect for apartments',
    price: 149,
    specs: ['Dual-core 1GHz', '512MB RAM', '4x GbE ports'],
    supports: ['home', 'homeplus'],
    image: '/router-100.png',
  },
  {
    id: 'br200',
    name: 'BR200',
    tagline: 'Ideal for homes',
    price: 249,
    specs: ['Quad-core 1.5GHz', '1GB RAM', '5x GbE + WiFi 6'],
    supports: ['home', 'homeplus', 'pro'],
    image: '/router-200.png',
  },
  {
    id: 'br400',
    name: 'BR400 Pro',
    tagline: 'For power users & SMB',
    price: 449,
    specs: ['Quad-core 2GHz', '4GB RAM', '8x 2.5GbE + 10G SFP+'],
    supports: ['pro', 'business'],
    image: '/router-400.png',
  },
]

// Features data
const features = [
  {
    icon: Shield,
    title: 'Next-Gen Firewall',
    description: 'Deep packet inspection with application-aware filtering. Block threats before they enter your network.',
    color: 'emerald',
  },
  {
    icon: Filter,
    title: 'DNS Filtering',
    description: 'Block ads, trackers, and malware at the DNS level. Protect every device without installing software.',
    color: 'cyan',
  },
  {
    icon: Lock,
    title: 'WireGuard VPN',
    description: 'Secure remote access with the fastest VPN protocol. Connect from anywhere with zero configuration.',
    color: 'violet',
  },
  {
    icon: Eye,
    title: 'Intrusion Detection',
    description: 'AI-powered threat detection identifies and blocks attacks in real-time. Stay ahead of emerging threats.',
    color: 'amber',
  },
  {
    icon: BarChart3,
    title: 'Traffic Analytics',
    description: 'Complete visibility into your network. See who is using bandwidth and what applications are running.',
    color: 'blue',
  },
  {
    icon: Users,
    title: 'Fleet Management',
    description: 'Manage multiple sites from a single dashboard. Perfect for businesses with distributed networks.',
    color: 'rose',
  },
]

// FAQ data
const faqs = [
  {
    q: 'What hardware do I need?',
    a: 'NGFW.sh runs on our purpose-built routers (BR100, BR200, BR400) which include all the processing power needed for deep packet inspection, VPN, and threat detection without slowing down your network.',
  },
  {
    q: 'How does DNS filtering work?',
    a: 'DNS filtering blocks unwanted content at the network level by intercepting DNS queries. This means ads, trackers, and malware are blocked for every device on your network - no app installation required.',
  },
  {
    q: 'Can I try before I buy?',
    a: 'Yes! All paid plans include a 14-day free trial. No credit card required to start. You can also start with our free tier and upgrade anytime.',
  },
  {
    q: 'What VPN protocol do you use?',
    a: 'We use WireGuard, the most modern and fastest VPN protocol available. It provides better security and significantly better performance than OpenVPN or IPSec.',
  },
  {
    q: 'Is my data private?',
    a: 'Absolutely. All traffic processing happens locally on your router. We never see your browsing history, DNS queries, or network traffic. Only anonymized telemetry for service improvement.',
  },
  {
    q: 'Do you offer support?',
    a: 'Free tier includes community support. Home and Home+ plans include email support with 24-hour response time. Pro and Business plans include priority phone support.',
  },
]

// Components
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'popular' }) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300',
    success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
    popular: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white',
  }
  return (
    <span className={cn('px-2.5 py-0.5 text-xs font-medium rounded-full', variants[variant])}>
      {children}
    </span>
  )
}

function Button({
  children,
  variant = 'default',
  size = 'default',
  className,
  ...props
}: {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    default: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
    primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/25',
    ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100',
    outline: 'border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  }
  return (
    <button
      type="button"
      className={cn(
        'rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function FeatureCard({ icon: Icon, title, description, color }: typeof features[0]) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-transparent text-emerald-400',
    cyan: 'from-cyan-500/20 to-transparent text-cyan-400',
    violet: 'from-violet-500/20 to-transparent text-violet-400',
    amber: 'from-amber-500/20 to-transparent text-amber-400',
    blue: 'from-blue-500/20 to-transparent text-blue-400',
    rose: 'from-rose-500/20 to-transparent text-rose-400',
  }
  return (
    <div className="feature-card bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition-all duration-300">
      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', colors[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  )
}

function PricingCard({ plan, billingCycle }: { plan: typeof plans[0]; billingCycle: 'monthly' | 'annual' }) {
  const Icon = plan.icon
  const price = billingCycle === 'annual' ? Math.floor(plan.price * 0.8) : plan.price
  
  return (
    <div
      className={cn(
        'relative bg-zinc-900 border rounded-2xl p-6 transition-all duration-300',
        plan.popular ? 'border-emerald-500/50 ring-1 ring-emerald-500/20 scale-105' : 'border-zinc-800 hover:border-zinc-700'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="popular">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
      </div>
      
      <div className="mb-4">
        <span className="text-4xl font-bold text-white">${price}</span>
        {plan.price > 0 && (
          <span className="text-zinc-500">/{billingCycle === 'annual' ? 'mo' : 'month'}</span>
        )}
        {billingCycle === 'annual' && plan.price > 0 && (
          <p className="text-xs text-zinc-500 mt-1">billed annually</p>
        )}
      </div>
      
      <p className="text-sm text-zinc-400 mb-6">{plan.description}</p>
      
      <Button
        variant={plan.popular ? 'primary' : 'outline'}
        className="w-full mb-6"
      >
        {plan.cta}
        <ArrowRight className="w-4 h-4" />
      </Button>
      
      <ul className="space-y-2.5">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-zinc-300">{feature}</span>
          </li>
        ))}
        {plan.notIncluded.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <X className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
            <span className="text-zinc-600">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HardwareCard({ item }: { item: typeof hardware[0] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
      <div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl mb-6 flex items-center justify-center">
        <Router className="w-24 h-24 text-zinc-600" />
      </div>
      <h3 className="text-xl font-semibold text-white">{item.name}</h3>
      <p className="text-sm text-zinc-500 mb-4">{item.tagline}</p>
      <p className="text-3xl font-bold text-white mb-4">${item.price}</p>
      <ul className="space-y-1.5 mb-4">
        {item.specs.map((spec, i) => (
          <li key={i} className="text-sm text-zinc-400 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            {spec}
          </li>
        ))}
      </ul>
      <div className="flex gap-1 flex-wrap">
        {item.supports.map((plan) => (
          <Badge key={plan}>{plan}</Badge>
        ))}
      </div>
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="text-white font-medium pr-8">{q}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-zinc-500 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-48 pb-5' : 'max-h-0'
        )}
      >
        <p className="text-zinc-400 text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">NGFW.sh</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
              <a href="#hardware" className="text-sm text-zinc-400 hover:text-white transition-colors">Hardware</a>
              <a href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">FAQ</a>
              <a href="https://docs.ngfw.sh" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            </nav>
            
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => { window.location.href = 'https://app.ngfw.sh' }}>
                Sign In
              </Button>
              <Button variant="primary" onClick={() => { window.location.href = 'https://app.ngfw.sh' }}>
                Get Started
              </Button>
            </div>
            
            <button
              type="button"
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4">
            <a href="#features" className="block text-zinc-400 hover:text-white">Features</a>
            <a href="#pricing" className="block text-zinc-400 hover:text-white">Pricing</a>
            <a href="#hardware" className="block text-zinc-400 hover:text-white">Hardware</a>
            <a href="#faq" className="block text-zinc-400 hover:text-white">FAQ</a>
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <Button variant="outline" className="w-full">Sign In</Button>
              <Button variant="primary" className="w-full">Get Started</Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="success" className="mb-6">
            <Zap className="w-3 h-3 inline mr-1" />
            Now with AI-powered threat detection
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Enterprise Security,<br />
            <span className="gradient-text">Home Simplicity</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Next-generation firewall protection for your home or business. 
            Block threats, filter content, and secure remote access - all from a beautiful dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => { window.location.href = 'https://app.ngfw.sh' }}>
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg">
              View Live Demo
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Cancel anytime
            </div>
          </div>
        </div>
        
        {/* Hero visual */}
        <div className="max-w-5xl mx-auto mt-16 px-4">
          <div className="gradient-border rounded-2xl glow overflow-hidden">
            <div className="bg-zinc-900 p-2">
              <div className="bg-zinc-950 rounded-lg aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-600">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-zinc-800 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '50M+', label: 'Threats Blocked Daily' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '< 1ms', label: 'DNS Latency' },
              { value: '10K+', label: 'Happy Users' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to secure your network
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Professional-grade security tools that are easy to use. 
              No networking degree required.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
              Start free and upgrade as you grow. All paid plans include a 14-day free trial.
            </p>
            
            <div className="inline-flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setBillingCycle('monthly') }}
                className={cn(
                  'px-4 py-2 text-sm rounded-md transition-colors',
                  billingCycle === 'monthly' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => { setBillingCycle('annual') }}
                className={cn(
                  'px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2',
                  billingCycle === 'annual' ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                )}
              >
                Annual
                <Badge variant="success">Save 20%</Badge>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>
        </div>
      </section>

      {/* Hardware */}
      <section id="hardware" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Hardware</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Purpose-built for security
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Our routers include all the processing power needed for deep packet inspection, 
              VPN, and threat detection without slowing down your network.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {hardware.map((item) => (
              <HardwareCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently asked questions
            </h2>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6">
            {faqs.map((faq, i) => (
              <FAQItem key={i} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to secure your network?
          </h2>
          <p className="text-zinc-400 mb-8">
            Join thousands of users who trust NGFW.sh to protect their homes and businesses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => { window.location.href = 'https://app.ngfw.sh' }}>
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg">
              Schedule a Demo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#hardware" className="hover:text-white transition-colors">Hardware</a></li>
                <li><a href="https://docs.ngfw.sh" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="/gdpr" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="/community" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="https://specs.ngfw.sh" className="hover:text-white transition-colors">API Reference</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">NGFW.sh</span>
            </div>
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} NGFW.sh. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
