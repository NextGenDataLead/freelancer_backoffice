# Supabase Database Connection Troubleshooting Guide

## 🔍 **Research Summary**

Based on comprehensive analysis of Supabase connection issues and the latest documentation, this guide addresses the most common database export connection problems and their solutions.

## 🛠 **Key Fixes Applied**

### **1. Enhanced Connection String Format**
- ✅ Added `?sslmode=require` to all connection strings for better security and compatibility
- ✅ Prioritized direct IPv6 connection (`db.[PROJECT].supabase.co`) as first choice for exports
- ✅ Updated pooler format to use session mode (port 5432) for `pg_dump` compatibility

### **2. Improved Region Support**
- ✅ Added US West 2 region as more reliable fallback than US East 1
- ✅ Maintained EU Central support with better error handling
- ✅ Removed legacy pooler formats that are no longer supported

### **3. Better Error Messages**
- ✅ Added step-by-step troubleshooting instructions
- ✅ Included specific connection string examples for EU Central region
- ✅ Added `psql` test command suggestions
- ✅ Network troubleshooting guidance (VPN, firewall, etc.)

## 🚨 **Common Issues & Solutions**

### **Issue 1: EU Central Region Connection Failures**
**Symptoms**: `connection refused` errors with `aws-0-eu-central-1.pooler.supabase.com`

**Solutions**:
1. **Direct Connection** (Recommended for exports):
   ```
   OLD_DB_HOST="db.jkennqbxyotnslpsthqf.supabase.co"
   OLD_DB_USER="postgres"
   OLD_DB_PORT="5432"
   ```

2. **Session Pooler** (IPv4 networks):
   ```
   OLD_DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
   OLD_DB_USER="postgres.jkennqbxyotnslpsthqf"
   OLD_DB_PORT="5432"
   ```

### **Issue 2: Password Special Characters**
**Symptoms**: Authentication failures despite correct password

**Solution**: Ensure proper URL encoding in password:
- `&` → `%26`
- `@` → `%40`  
- `#` → `%23`
- `$` → `%24`
- `^` → `%5E`
- `*` → `%2A`

### **Issue 3: Network/VPN Interference**
**Symptoms**: Intermittent connection failures, works on different network

**Solutions**:
1. Temporarily disable VPN/proxy
2. Try mobile hotspot
3. Check corporate firewall for port 5432/6543 blocking
4. Test with `psql` directly to isolate issue

### **Issue 4: IPv6 vs IPv4 Compatibility**
**Symptoms**: Direct connection fails on IPv4-only networks

**Solution**: Use session pooler format instead of direct connection:
```bash
# IPv6 networks (preferred)
OLD_DB_HOST="db.[PROJECT-REF].supabase.co"

# IPv4 networks (fallback)  
OLD_DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
OLD_DB_USER="postgres.[PROJECT-REF]"
```

## 🧪 **Testing Your Connection**

Before running the export, test your connection manually:

```bash
# Test direct connection
psql "postgresql://postgres:PASSWORD@db.jkennqbxyotnslpsthqf.supabase.co:5432/postgres?sslmode=require"

# Test pooler connection  
psql "postgresql://postgres.jkennqbxyotnslpsthqf:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

## 📋 **Updated Export Process**

The export script now:

1. **Tries IPv6 direct connection first** (best for exports)
2. **Falls back to session poolers** across multiple regions  
3. **Uses proper SSL mode** for security compliance
4. **Provides detailed troubleshooting** when connections fail
5. **Supports manual overrides** for specific network configurations

## 🔗 **Connection Priority Order**

1. Manual override (if `OLD_DB_HOST` specified)
2. Direct IPv6 connection (`db.[PROJECT].supabase.co:5432`)
3. EU Central session pooler (`aws-0-eu-central-1.pooler.supabase.com:5432`)
4. US East session pooler (fallback)
5. US West session pooler (more reliable)
6. EU West session pooler
7. Asia Pacific session pooler

## 🎯 **Best Practices for Exports**

- ✅ **Use direct connection when possible** (IPv6 supported networks)
- ✅ **Rotate database password** before export for fresh credentials
- ✅ **Test connection with psql first** to isolate issues
- ✅ **Use session mode (port 5432)** for `pg_dump` compatibility  
- ✅ **Enable SSL mode** for security compliance
- ✅ **Set manual overrides** for problematic networks

## 📚 **Research Sources**

This troubleshooting guide is based on:
- Official Supabase Documentation 2024/2025
- StackOverflow community solutions
- GitHub Discussions and Issues  
- Real-world connection failure patterns
- Supabase CLI best practices

The export script now implements these research-backed solutions to maximize connection success rates across different network environments and regions.