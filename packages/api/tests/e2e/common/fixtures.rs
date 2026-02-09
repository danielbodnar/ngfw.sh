// Test data factories and fixtures

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// WAN configuration fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WanConfigFixture {
    pub mode: String,
    pub ip: Option<String>,
    pub netmask: Option<String>,
    pub gateway: Option<String>,
    pub dns: Vec<String>,
}

impl WanConfigFixture {
    pub fn dhcp() -> Self {
        Self {
            mode: "dhcp".to_string(),
            ip: None,
            netmask: None,
            gateway: None,
            dns: vec![],
        }
    }

    pub fn static_ip() -> Self {
        Self {
            mode: "static".to_string(),
            ip: Some("192.168.1.100".to_string()),
            netmask: Some("255.255.255.0".to_string()),
            gateway: Some("192.168.1.1".to_string()),
            dns: vec!["8.8.8.8".to_string(), "8.8.4.4".to_string()],
        }
    }
}

/// LAN configuration fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanConfigFixture {
    pub ip: String,
    pub netmask: String,
    pub dhcp_enabled: bool,
    pub dhcp_start: Option<String>,
    pub dhcp_end: Option<String>,
}

impl LanConfigFixture {
    pub fn default() -> Self {
        Self {
            ip: "192.168.1.1".to_string(),
            netmask: "255.255.255.0".to_string(),
            dhcp_enabled: true,
            dhcp_start: Some("192.168.1.100".to_string()),
            dhcp_end: Some("192.168.1.200".to_string()),
        }
    }

    pub fn custom(ip: &str, netmask: &str) -> Self {
        Self {
            ip: ip.to_string(),
            netmask: netmask.to_string(),
            dhcp_enabled: false,
            dhcp_start: None,
            dhcp_end: None,
        }
    }
}

/// VLAN configuration fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VlanFixture {
    pub id: u16,
    pub name: String,
    pub subnet: String,
    pub netmask: String,
}

impl VlanFixture {
    pub fn guest_network() -> Self {
        Self {
            id: 10,
            name: "guest".to_string(),
            subnet: "192.168.10.0".to_string(),
            netmask: "255.255.255.0".to_string(),
        }
    }

    pub fn iot_network() -> Self {
        Self {
            id: 20,
            name: "iot".to_string(),
            subnet: "192.168.20.0".to_string(),
            netmask: "255.255.255.0".to_string(),
        }
    }

    pub fn custom(id: u16, name: &str, subnet: &str) -> Self {
        Self {
            id,
            name: name.to_string(),
            subnet: subnet.to_string(),
            netmask: "255.255.255.0".to_string(),
        }
    }
}

/// WiFi network fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WiFiNetworkFixture {
    pub ssid: String,
    pub password: String,
    pub security: String,
    pub band: String,
    pub hidden: bool,
}

impl WiFiNetworkFixture {
    pub fn home_network() -> Self {
        Self {
            ssid: "HomeNetwork".to_string(),
            password: "SecurePassword123!".to_string(),
            security: "wpa3".to_string(),
            band: "2.4ghz".to_string(),
            hidden: false,
        }
    }

    pub fn guest_network() -> Self {
        Self {
            ssid: "GuestNetwork".to_string(),
            password: "GuestPass123!".to_string(),
            security: "wpa2".to_string(),
            band: "5ghz".to_string(),
            hidden: false,
        }
    }

    pub fn custom(ssid: &str, password: &str) -> Self {
        Self {
            ssid: ssid.to_string(),
            password: password.to_string(),
            security: "wpa2".to_string(),
            band: "2.4ghz".to_string(),
            hidden: false,
        }
    }
}

/// Firewall rule fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallRuleFixture {
    pub name: String,
    pub action: String,
    pub source: String,
    pub destination: String,
    pub protocol: String,
    pub port: Option<u16>,
    pub enabled: bool,
}

impl FirewallRuleFixture {
    pub fn allow_ssh() -> Self {
        Self {
            name: "Allow SSH".to_string(),
            action: "accept".to_string(),
            source: "wan".to_string(),
            destination: "lan".to_string(),
            protocol: "tcp".to_string(),
            port: Some(22),
            enabled: true,
        }
    }

    pub fn block_telnet() -> Self {
        Self {
            name: "Block Telnet".to_string(),
            action: "drop".to_string(),
            source: "any".to_string(),
            destination: "any".to_string(),
            protocol: "tcp".to_string(),
            port: Some(23),
            enabled: true,
        }
    }

    pub fn custom(name: &str, action: &str, protocol: &str, port: Option<u16>) -> Self {
        Self {
            name: name.to_string(),
            action: action.to_string(),
            source: "any".to_string(),
            destination: "any".to_string(),
            protocol: protocol.to_string(),
            port,
            enabled: true,
        }
    }
}

/// NAT rule fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NatRuleFixture {
    pub name: String,
    pub external_port: u16,
    pub internal_ip: String,
    pub internal_port: u16,
    pub protocol: String,
    pub enabled: bool,
}

impl NatRuleFixture {
    pub fn ssh_forward() -> Self {
        Self {
            name: "SSH Port Forward".to_string(),
            external_port: 2222,
            internal_ip: "192.168.1.100".to_string(),
            internal_port: 22,
            protocol: "tcp".to_string(),
            enabled: true,
        }
    }

    pub fn web_server() -> Self {
        Self {
            name: "Web Server".to_string(),
            external_port: 80,
            internal_ip: "192.168.1.50".to_string(),
            internal_port: 8080,
            protocol: "tcp".to_string(),
            enabled: true,
        }
    }

    pub fn custom(external_port: u16, internal_ip: &str, internal_port: u16) -> Self {
        Self {
            name: format!("Port Forward {}", external_port),
            external_port,
            internal_ip: internal_ip.to_string(),
            internal_port,
            protocol: "tcp".to_string(),
            enabled: true,
        }
    }
}

/// Device registration fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRegistrationFixture {
    pub name: String,
    pub model: String,
    pub serial: String,
    pub mac: String,
}

impl DeviceRegistrationFixture {
    pub fn rt_ax92u() -> Self {
        Self {
            name: "Home Router".to_string(),
            model: "RT-AX92U".to_string(),
            serial: Uuid::new_v4().to_string(),
            mac: "AA:BB:CC:DD:EE:FF".to_string(),
        }
    }

    pub fn rt_ax88u() -> Self {
        Self {
            name: "Office Router".to_string(),
            model: "RT-AX88U".to_string(),
            serial: Uuid::new_v4().to_string(),
            mac: "11:22:33:44:55:66".to_string(),
        }
    }

    pub fn custom(name: &str, model: &str) -> Self {
        Self {
            name: name.to_string(),
            model: model.to_string(),
            serial: Uuid::new_v4().to_string(),
            mac: format!("00:11:22:33:44:{:02X}", rand::random::<u8>()),
        }
    }
}

/// VPN peer fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnPeerFixture {
    pub name: String,
    pub public_key: String,
    pub allowed_ips: Vec<String>,
    pub persistent_keepalive: Option<u16>,
}

impl VpnPeerFixture {
    pub fn mobile_device() -> Self {
        Self {
            name: "Mobile Phone".to_string(),
            public_key: "ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX=".to_string(),
            allowed_ips: vec!["10.0.0.2/32".to_string()],
            persistent_keepalive: Some(25),
        }
    }

    pub fn laptop() -> Self {
        Self {
            name: "Laptop".to_string(),
            public_key: "ZYXW9876VUSR5432PONM1098LKJI6543HGFE2109DCBA=".to_string(),
            allowed_ips: vec!["10.0.0.3/32".to_string()],
            persistent_keepalive: Some(25),
        }
    }

    pub fn custom(name: &str, allowed_ip: &str) -> Self {
        Self {
            name: name.to_string(),
            public_key: base64::encode(rand::random::<[u8; 32]>()),
            allowed_ips: vec![allowed_ip.to_string()],
            persistent_keepalive: Some(25),
        }
    }
}

/// DHCP reservation fixture
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DhcpReservationFixture {
    pub mac: String,
    pub ip: String,
    pub hostname: Option<String>,
}

impl DhcpReservationFixture {
    pub fn server() -> Self {
        Self {
            mac: "AA:BB:CC:DD:EE:01".to_string(),
            ip: "192.168.1.10".to_string(),
            hostname: Some("server".to_string()),
        }
    }

    pub fn printer() -> Self {
        Self {
            mac: "AA:BB:CC:DD:EE:02".to_string(),
            ip: "192.168.1.20".to_string(),
            hostname: Some("printer".to_string()),
        }
    }

    pub fn custom(mac: &str, ip: &str, hostname: Option<&str>) -> Self {
        Self {
            mac: mac.to_string(),
            ip: ip.to_string(),
            hostname: hostname.map(|s| s.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wan_config_dhcp() {
        let config = WanConfigFixture::dhcp();
        assert_eq!(config.mode, "dhcp");
        assert!(config.ip.is_none());
    }

    #[test]
    fn test_wan_config_static() {
        let config = WanConfigFixture::static_ip();
        assert_eq!(config.mode, "static");
        assert!(config.ip.is_some());
    }

    #[test]
    fn test_vlan_fixtures() {
        let guest = VlanFixture::guest_network();
        assert_eq!(guest.id, 10);
        assert_eq!(guest.name, "guest");

        let iot = VlanFixture::iot_network();
        assert_eq!(iot.id, 20);
    }

    #[test]
    fn test_firewall_rule_fixtures() {
        let allow_ssh = FirewallRuleFixture::allow_ssh();
        assert_eq!(allow_ssh.action, "accept");
        assert_eq!(allow_ssh.port, Some(22));

        let block = FirewallRuleFixture::block_telnet();
        assert_eq!(block.action, "drop");
    }

    #[test]
    fn test_device_registration() {
        let device = DeviceRegistrationFixture::rt_ax92u();
        assert_eq!(device.model, "RT-AX92U");
        assert!(!device.serial.is_empty());
    }
}
