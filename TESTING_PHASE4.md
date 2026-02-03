# Phase 4 Testing Guide

## 🚀 Quick Start

### Prerequisites
1. MongoDB running
2. Redis running
3. Backend virtual environment activated
4. Frontend dependencies installed

### Start the Application

**Terminal 1 - Backend:**
```powershell
cd backend
.\.venv_backend\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery Worker:**
```powershell
cd backend
.\.venv_backend\Scripts\Activate.ps1
celery -A app.worker worker --loglevel=info --pool=solo
```

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm run dev
```

Access: `http://localhost:5173`

---

## ✅ Testing Checklist

### 1. Install New Backend Dependencies

First, install the new packages:
```powershell
cd backend
.\.venv_backend\Scripts\Activate.ps1
pip install reportlab Pillow
```

---

### 2. Test Advanced Visualizations

#### A. Chart Editor
1. **Login** to your account
2. **Upload a dataset** (CSV or Excel)
3. **Analyze** the dataset
4. Navigate to the **Chart Gallery**
5. Click on any chart
6. Look for an **"Edit Chart"** button (you may need to add this to ChartGallery.jsx)
7. In the editor:
   - ✅ Change the title
   - ✅ Modify axis labels
   - ✅ Change colors
   - ✅ Toggle legend on/off
   - ✅ Toggle grid on/off
   - ✅ Switch chart type
   - ✅ Click "Save Changes"

#### B. Custom Chart Builder
1. Click **"Create Custom Chart"** button (add this to your dashboard)
2. Select a dataset from dropdown
3. Choose X and Y columns
4. Select chart type (bar, line, scatter, histogram)
5. Customize title and labels
6. Pick a color
7. Verify **live preview** updates
8. Click **"Create Chart"**

#### C. Chart Export
1. Open any chart in the editor
2. Click **"Export"** buttons:
   - ✅ Export to PNG
   - ✅ Export to SVG
   - ✅ Export to PDF
3. Verify files download correctly

---

### 3. Test Export & Reporting

#### A. PDF Export
**API Test:**
```powershell
# Get your token from localStorage in browser DevTools
$token = "YOUR_JWT_TOKEN"
$taskId = "YOUR_TASK_ID"

Invoke-WebRequest -Uri "http://127.0.0.1:8000/export/pdf/$taskId" `
  -Headers @{"Authorization"="Bearer $token"} `
  -OutFile "report.pdf"
```

**Expected Result:**
- PDF file downloads
- Contains: title, metadata, overview table, insights, recommendations

#### B. Excel Export
**API Test:**
```powershell
$token = "YOUR_JWT_TOKEN"
$taskId = "YOUR_TASK_ID"

Invoke-WebRequest -Uri "http://127.0.0.1:8000/export/excel/$taskId" `
  -Headers @{"Authorization"="Bearer $token"} `
  -OutFile "analysis.xlsx"
```

**Expected Result:**
- Excel file with 4 sheets: Data, Statistics, Data Quality, Insights
- Proper formatting applied

#### C. Email Report
**API Test:**
```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
    task_id = "YOUR_TASK_ID"
    email = "test@example.com"
    subject = "Test Report"
    message = "Here's your analysis"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/export/email" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body $body
```

**Expected Result:**
- Success message (note: email won't actually send without SMTP config)

---

### 4. Test Collaboration Features

#### A. Share Analysis
**API Test:**
```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
    task_id = "YOUR_TASK_ID"
    shared_with = @("testuser1", "testuser2")
    permission = "view"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/share" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body $body
```

**Frontend Test:**
1. Add a **"Share"** button to your analysis view
2. Integrate `ShareAnalysisModal` component
3. Enter usernames (comma-separated)
4. Select permission level
5. Click **"Share"**
6. Verify success message

#### B. Team Workspaces
**Create Workspace:**
```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
    name = "Marketing Team"
    description = "Marketing analytics workspace"
    members = @("user1", "user2")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/workspaces" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body $body
```

**List Workspaces:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/workspaces" `
  -Headers @{"Authorization"="Bearer $token"}
```

#### C. Comments
**Add Comment:**
```powershell
$token = "YOUR_JWT_TOKEN"
$body = @{
    task_id = "YOUR_TASK_ID"
    text = "Great insights from this analysis!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/comments" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body $body
```

**Get Comments:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/comments/YOUR_TASK_ID" `
  -Headers @{"Authorization"="Bearer $token"}
```

**Frontend Test:**
1. Add `<CommentsPanel taskId={taskId} />` to your dashboard
2. Type a comment and press "Post"
3. Edit your comment
4. Delete your comment
5. Verify timestamps and user attribution

#### D. Version History
**Get Versions:**
```powershell
$token = "YOUR_JWT_TOKEN"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/versions/YOUR_TASK_ID" `
  -Headers @{"Authorization"="Bearer $token"}
```

**Frontend Test:**
1. Add `<VersionHistory taskId={taskId} />` to your dashboard
2. View version history
3. Click "Restore" on a previous version
4. Confirm restoration

---

### 5. Test Performance Features

#### A. Paginated Jobs
```powershell
$token = "YOUR_JWT_TOKEN"

# Page 1, 10 items
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/jobs/paginated?page=1&limit=10" `
  -Headers @{"Authorization"="Bearer $token"}

# Page 2, filter by completed
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/jobs/paginated?page=2&limit=10&status=completed" `
  -Headers @{"Authorization"="Bearer $token"}
```

**Expected:**
- Jobs array with pagination metadata
- Total count and pages

#### B. Cache Statistics
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/cache/stats"
```

**Expected:**
- Connected clients count
- Memory usage
- Uptime
- Total commands processed

---

## 🔧 Integration Steps

### Add Components to Dashboard

Update your main dashboard file (e.g., `Dashboard.jsx` or `DashboardNew.jsx`):

```jsx
import { useState } from 'react';
import ChartEditor from '../components/ChartEditor';
import CustomChartBuilder from '../components/CustomChartBuilder';
import ShareAnalysisModal from '../components/ShareAnalysisModal';
import CommentsPanel from '../components/CommentsPanel';
import VersionHistory from '../components/VersionHistory';
import WorkspacesPanel from '../components/WorkspacesPanel';

function Dashboard() {
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);

  return (
    <div>
      {/* Your existing dashboard content */}
      
      {/* Add these buttons somewhere visible */}
      <button onClick={() => setShowChartBuilder(true)}>
        Create Custom Chart
      </button>
      
      <button onClick={() => setShowShareModal(true)}>
        Share Analysis
      </button>

      {/* Collaboration Panels */}
      {currentTaskId && (
        <>
          <CommentsPanel taskId={currentTaskId} />
          <VersionHistory taskId={currentTaskId} />
        </>
      )}

      {/* Modals */}
      {showChartEditor && (
        <ChartEditor
          chart={selectedChart}
          onSave={(chart) => {
            console.log('Chart saved:', chart);
            setShowChartEditor(false);
          }}
          onClose={() => setShowChartEditor(false)}
        />
      )}

      {showChartBuilder && (
        <CustomChartBuilder
          datasets={['dataset1.csv', 'dataset2.csv']} // Your datasets
          onSave={(chart) => {
            console.log('Custom chart created:', chart);
            setShowChartBuilder(false);
          }}
          onClose={() => setShowChartBuilder(false)}
        />
      )}

      {showShareModal && (
        <ShareAnalysisModal
          taskId={currentTaskId}
          onClose={() => setShowShareModal(false)}
          onShare={() => {
            console.log('Analysis shared');
            setShowShareModal(false);
          }}
        />
      )}
    </div>
  );
}
```

### Add Export Buttons

Add to your `AnalysisResultsViewer` or similar component:

```jsx
const ExportButtons = ({ taskId }) => {
  const token = localStorage.getItem('token');

  const exportPDF = async () => {
    const response = await fetch(`http://127.0.0.1:8000/export/pdf/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${taskId}.pdf`;
    a.click();
  };

  const exportExcel = async () => {
    const response = await fetch(`http://127.0.0.1:8000/export/excel/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${taskId}.xlsx`;
    a.click();
  };

  return (
    <div className="flex gap-2">
      <button onClick={exportPDF}>Export PDF</button>
      <button onClick={exportExcel}>Export Excel</button>
    </div>
  );
};
```

---

## 🐛 Troubleshooting

### Issue: PDF Export Fails
**Solution:**
```powershell
pip install reportlab Pillow
```

### Issue: Import Error - collaboration.py
**Solution:** The file was created. Restart your backend server.

### Issue: MongoDB Collections Not Found
**Solution:** Collections are created automatically on first use. Just make API calls.

### Issue: Comments Not Showing
**Solution:** 
1. Check browser console for errors
2. Verify `taskId` is passed correctly
3. Check network tab for API response

### Issue: "Access Denied" Errors
**Solution:**
1. Verify JWT token is valid
2. Check task ownership (only owner can share/manage)
3. For comments, verify you're the author for edit/delete

---

## 📊 Database Verification

Check MongoDB collections:

```javascript
// In MongoDB Compass or mongo shell
use adaa_db

// Check new collections
db.shares.find()
db.workspaces.find()
db.comments.find()
db.versions.find()

// Verify indexes
db.shares.getIndexes()
db.comments.getIndexes()
```

---

## 🎯 Quick Verification Script

Create a test file `test_phase4.py` in backend:

```python
import requests
import json

BASE_URL = "http://127.0.0.1:8000"
TOKEN = "YOUR_JWT_TOKEN"  # Get from browser

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Test 1: Cache Stats
print("Testing cache stats...")
response = requests.get(f"{BASE_URL}/api/cache/stats")
print(f"✅ Cache Stats: {response.status_code}")

# Test 2: Paginated Jobs
print("\nTesting paginated jobs...")
response = requests.get(f"{BASE_URL}/api/jobs/paginated?page=1&limit=5", headers=headers)
print(f"✅ Paginated Jobs: {response.status_code}")
print(f"   Found {response.json().get('pagination', {}).get('total', 0)} jobs")

# Test 3: Create Workspace
print("\nTesting workspace creation...")
workspace_data = {
    "name": "Test Workspace",
    "description": "Testing Phase 4",
    "members": []
}
response = requests.post(f"{BASE_URL}/api/workspaces", headers=headers, json=workspace_data)
print(f"✅ Create Workspace: {response.status_code}")

# Test 4: List Workspaces
print("\nTesting workspace listing...")
response = requests.get(f"{BASE_URL}/api/workspaces", headers=headers)
print(f"✅ List Workspaces: {response.status_code}")
print(f"   Found {len(response.json().get('workspaces', []))} workspaces")

print("\n🎉 Phase 4 API tests complete!")
```

Run it:
```powershell
cd backend
python test_phase4.py
```

---

## ✅ Final Checklist

Before moving to Phase 5, verify:

- [ ] Backend starts without errors
- [ ] Celery worker connects successfully
- [ ] Frontend compiles without errors
- [ ] All new endpoints return 200 OK
- [ ] PDF export downloads successfully
- [ ] Excel export has 4 sheets
- [ ] Comments can be added/edited/deleted
- [ ] Workspaces can be created
- [ ] Version history displays
- [ ] Cache stats endpoint works
- [ ] Pagination returns correct data
- [ ] MongoDB has new collections

---

## 📞 Need Help?

If you encounter issues:

1. Check terminal logs for errors
2. Verify MongoDB and Redis are running
3. Check browser console (F12)
4. Verify JWT token is valid
5. Ensure all dependencies are installed

---

**Ready to test?** Start with the backend dependencies, then work through each section! 🚀
