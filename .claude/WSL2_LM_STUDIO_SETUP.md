# WSL2 LM Studio Connectivity Setup

This guide provides step-by-step instructions to enable WSL2 connectivity to LM Studio running on Windows.

## Problem
WSL2 cannot connect to LM Studio server running on Windows localhost:1234 due to WSL2's NAT networking architecture.

## Solution: Windows Port Forwarding

### Prerequisites
- LM Studio running on Windows with CORS enabled: `lms server start --cors`
- Windows PowerShell with Administrator privileges

### Step 1: Add Port Forwarding Rule

**Open PowerShell as Administrator** and run this single command:

```powershell
netsh interface portproxy add v4tov4 listenport=1234 listenaddress=0.0.0.0 connectport=1234 connectaddress=127.0.0.1
```

### Step 2: Add Windows Firewall Rule

Run this command in the same PowerShell window:

```powershell
New-NetFirewallRule -DisplayName "Allow WSL2 Port 1234" -Direction Inbound -Protocol TCP -LocalPort 1234 -Action Allow
```

### Step 3: Verify Configuration

Check that the rules were created successfully:

```powershell
# Check port forwarding
netsh interface portproxy show all

# Check firewall rule
Get-NetFirewallRule -DisplayName "Allow WSL2 Port 1234"
```

### Step 4: Test Connection from WSL2

From your WSL2 terminal:

```bash
curl -v http://127.0.0.1:1234/v1/models
```

If successful, you should see JSON response with available models.

## Alternative Solutions

### Option 1: Mirrored Mode (Windows 11 22H2+ Only)

Create/edit `%UserProfile%\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
dnsTunneling=true
```

Then restart WSL:
```powershell
wsl --shutdown
```

### Option 2: mDNS Hostname Resolution

From WSL2, try connecting using:
```bash
curl http://$(hostname).local:1234/v1/models
```

### Option 3: socat Proxy (WSL2 Side)

Install and run socat in WSL2:
```bash
sudo apt install socat
socat TCP-LISTEN:1234,fork TCP:$(hostname).local:1234 &
```

## Cleanup (If Needed)

To remove the port forwarding rule:
```powershell
netsh interface portproxy delete v4tov4 listenport=1234 listenaddress=0.0.0.0
```

To remove the firewall rule:
```powershell
Remove-NetFirewallRule -DisplayName "Allow WSL2 Port 1234"
```

## Troubleshooting

1. **"Access denied"**: Make sure PowerShell is running as Administrator
2. **Connection still fails**: Restart LM Studio with `lms server start --cors`
3. **Firewall blocks**: Check Windows Defender Firewall settings
4. **Port already in use**: Check if another service is using port 1234: `netstat -an | findstr :1234`

## Status
- ✅ OCR system works perfectly with rule-based parsing (LLM enhancement is optional)
- ✅ All original issues resolved: Romanian invoice parsing, category validation, reverse charge detection
- ⚠️ LLM enhancement requires this networking setup to function