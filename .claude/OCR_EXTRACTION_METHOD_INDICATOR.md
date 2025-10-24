# OCR Extraction Method Visual Indicators

## Summary
Added visual indicators to show which OCR extraction method was used (AI-Enhanced vs Rule-Based) in the expense form.

## Changes Made

### 1. Updated OCR Processor for LM Studio Local Network Access
**File**: `scripts/ocr_processor.py`

**LM Studio Setup (Windows):**
- Enable **"Serve on Local Network"** in LM Studio Server Settings
- This binds LM Studio to `0.0.0.0` making it accessible from WSL2
- LM Studio will show: `Reachable at: http://10.173.239.108:1235`

**Updated endpoint priority:**
- `http://10.173.239.108:1235/v1` (primary - LM Studio on local network)
- `http://127.0.0.1:1235/v1` (fallback - direct localhost)
- `http://172.24.0.1:1235/v1` (fallback - Windows host IP)
- `http://host.docker.internal:1235/v1` (fallback - WSL2 Docker)
- Dynamic endpoints from mDNS and resolv.conf also added

**Note:** The IP `10.173.239.108` may change if your network configuration changes. If OCR stops working, check the LM Studio "Reachable at" address and update line 22 in `scripts/ocr_processor.py`.

### 2. Added Visual Indicators in Expense Form
**File**: `src/components/financial/expenses/expense-form.tsx`

#### New Icons Imported:
- `Bot` - for AI-Enhanced badge
- `FileText` - for Rule-Based badge

#### Badge Display After Upload:
When a receipt is successfully uploaded, a badge appears showing the extraction method:
- **🤖 AI-Enhanced** - Blue-purple gradient badge when Paddle LLM (Phi-3.5-mini) was used
- **📄 Rule-Based** - Secondary badge when fallback rule-based parsing was used

#### Detailed Info in Form Header:
When OCR data is present, the form header shows:
- Extraction method badge (AI-Enhanced or Rule-Based)
- OCR confidence percentage
- Example: "OCR Verwerking: 🤖 AI-Enhanced (Paddle LLM) | Confidence: 87%"

## How to Identify the Extraction Method

### Method 1: Visual UI Badges (NEW)
After uploading a receipt, look for:

1. **Upload Section Badge**: Appears immediately after successful upload
   - Blue-purple gradient = AI-Enhanced (Paddle LLM connected)
   - Gray secondary = Rule-Based (Paddle LLM unavailable, fallback used)

2. **Form Header Info**: Shows detailed extraction info
   - Method badge with icon
   - Confidence percentage
   - Engine name (e.g., "Paddle LLM" or "Fallback")

### Method 2: Browser Console
Check the API response in DevTools:
```json
{
  "extraction_method": "llm",  // or "rules"
  "ocr_metadata": {
    "processing_engine": "PaddleOCR + Phi-3.5-mini"  // or "PaddleOCR + Rules"
  }
}
```

### Method 3: Server Logs
Terminal output when running `npm run dev`:

**When AI-Enhanced (Success):**
```
Attempting LLM connection to: http://127.0.0.1:1235/v1
LLM extraction successful via http://127.0.0.1:1235/v1: <vendor name>
```

**When Rule-Based (Fallback):**
```
All LLM endpoints failed, falling back to rule-based parsing
Using rule-based fallback parsing
```

## Testing

To test the visual indicators:

1. **Start the Paddle LLM service on port 1235**
2. Navigate to: `http://localhost:3000/dashboard/financieel-v2/uitgaven`
3. Upload a receipt image
4. Observe the badges:
   - If Paddle is running → **🤖 AI-Enhanced** badge
   - If Paddle is not running → **📄 Rule-Based** badge
5. Check the form header for detailed extraction info

## Badge Styling

### AI-Enhanced Badge
- Gradient: Blue to Purple (`from-blue-500 to-purple-600`)
- Icon: Robot (`Bot`)
- Text: "AI-Enhanced (Paddle LLM)"
- Indicates LLM successfully extracted data

### Rule-Based Badge
- Variant: Secondary (gray)
- Icon: Document (`FileText`)
- Text: "Rule-Based (Fallback)"
- Indicates pattern-based extraction was used

### Confidence Badge
- Variant: Outline
- Shows: OCR confidence as percentage (0-100%)
- Example: "Confidence: 87%"

## Data Flow

1. **Upload Receipt** → `handleFileUpload()`
2. **Process with OCR** → `/api/expenses/ocr-process`
3. **Python Script** → `scripts/ocr_processor.py`
4. **Try LLM Extraction** → `http://127.0.0.1:1235/v1` (Paddle service)
5. **On Success** → Returns `extraction_method: "llm"` + `processing_engine: "PaddleOCR + Phi-3.5-mini"`
6. **On Failure** → Falls back to rules → Returns `extraction_method: "rules"` + `processing_engine: "PaddleOCR + Rules"`
7. **UI Updates** → Shows appropriate badge based on `processing_engine`

## Benefits

- **Immediate Visual Feedback**: User knows instantly if AI or rules were used
- **Transparency**: Clear indication of extraction quality
- **Debugging**: Easy to identify when LLM service is down
- **Confidence Metric**: Shows OCR quality at a glance
- **Professional UI**: Polished badges with icons and gradients

## LM Studio Setup Instructions

### One-Time Setup (Windows)

1. **Open LM Studio** on Windows
2. **Go to Server tab** → Click **"Server Settings"** (⚙️ icon)
3. **Enable "Serve on Local Network"** checkbox
4. **Optional: Enable these for better development experience:**
   - ✅ Run LLM server on machine login (auto-start)
   - ✅ JIT (Just-In-Time) model loading (auto-loads models)
   - ✅ Auto Server Start
5. **Note the "Reachable at" address** (e.g., `http://10.173.239.108:1235`)
6. **Load your model** (e.g., `microsoft_-_phi-3.5-mini-instruct`)

### Testing the Connection

From WSL2 terminal:
```bash
# Quick test
curl http://10.173.239.108:1235/v1/models

# Detailed OCR test
python3 /home/jimbojay/code/Backoffice/scripts/test-ocr-llm-connection.py

# Test all endpoints
/home/jimbojay/code/Backoffice/scripts/test-llm-endpoints.sh
```

### Troubleshooting

**If the IP address changes:**
1. Check LM Studio's "Reachable at" address
2. Update line 22 in `scripts/ocr_processor.py`:
   ```python
   'http://YOUR_NEW_IP:1235/v1',  # Update this IP
   ```

**If connection fails:**
- ✅ Verify LM Studio is running
- ✅ Verify "Serve on Local Network" is enabled
- ✅ Check Windows Firewall isn't blocking port 1235
- ✅ Run the test script to see which endpoints work

**Production Deployment:**
When deploying to cloud, replace the LM Studio endpoint with a cloud LLM API:
- OpenAI: `https://api.openai.com/v1`
- Anthropic: `https://api.anthropic.com/v1`
- Self-hosted: Your cloud endpoint
- Just update line 22 in `scripts/ocr_processor.py`
