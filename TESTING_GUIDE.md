# Manual Testing Guide for Issue Fixes

## Issue #64 Remaining Problems - Testing Guide

### Prerequisites
1. Start the application in development mode
2. Have at least one administrator account and one content manager account
3. Have test markmaps with different colorFreezeLevel values

---

## Test 1: Color Freeze Level Rendering

### Setup
1. Log in with a regular user account
2. Navigate to the editor (`/editor`)

### Test Steps - Editor Preview
1. Create a new markmap with the following content:
   ```markdown
   # Root
   ## Level 1-A
   ### Level 2-A
   #### Level 3-A
   ## Level 1-B
   ### Level 2-B
   #### Level 3-B
   ```

2. Set `Color Freeze Level` to `0`
   - **Expected**: All levels should have different colors
   - **Verify**: Each level (Root, Level 1, Level 2, Level 3) has its own distinct color

3. Change `Color Freeze Level` to `2`
   - **Expected**: Levels 0-1 have unique colors, but level 2 and beyond share colors with their parents
   - **Verify**: Root and Level 1 nodes have distinct colors, but Level 2 and Level 3 nodes share colors with their respective Level 1 parents

4. Change `Color Freeze Level` to `1`
   - **Expected**: Only root has a unique color, all other levels share colors with their parents
   - **Verify**: Root node has a unique color, but all Level 1, 2, and 3 nodes share the same color scheme

5. Save the markmap with `Color Freeze Level = 2`

### Test Steps - Markmap View Page
1. Navigate to the saved markmap's view page
2. **Expected**: The colorFreezeLevel should be applied the same as in the editor preview
3. **Verify**: Colors match the behavior seen in the editor preview with colorFreezeLevel=2

### Test Steps - Different Markmaps
1. Create multiple markmaps with different colorFreezeLevel values (0, 1, 2, 3)
2. View each markmap
3. **Expected**: Each markmap respects its own colorFreezeLevel setting
4. **Verify**: No cross-contamination of settings between markmaps

---

## Test 2: Appealed Complaints Resolution (Admin Panel)

### Setup Part 1: Create an Escalated Complaint
1. Log in with a content manager account
2. Navigate to Content Management (`/content-management`)
3. Find a pending complaint (or create one first by reporting a markmap)
4. Click "Escalate to Admin" on a pending complaint
5. Add resolution notes: "Needs higher authority review"
6. Confirm escalation
7. **Verify**: Complaint disappears from Content Management queue

### Setup Part 2: Create an Appealed Complaint
1. Log in with a content manager account
2. Find another pending complaint
3. Dismiss the complaint with resolution: "Content appears appropriate"
4. Log out and log in as the reporter who filed that complaint
5. Navigate to notifications
6. Find the dismissal notification and click "Appeal"
7. **Verify**: Complaint is now in appealed status

### Test Steps - Resolve Escalated Complaint (Sustain)
1. Log in with an administrator account
2. Navigate to Admin Panel (`/admin`)
3. Click on "Appealed Complaints" tab
4. You should see both the escalated and appealed complaints
5. Find the escalated complaint
6. Click "Sustain (Override)" button
7. Add resolution notes: "Complaint is valid, retiring markmap"
8. Click "Sustain & Retire"
9. **Expected**: 
   - ✅ Request succeeds (200 OK, not 400 Bad Request)
   - Complaint disappears from the list
   - Markmap is retired
   - Author receives notification
10. **Verify**: Check the markmap page - should show as retired

### Test Steps - Resolve Escalated Complaint (Dismiss)
1. Still in Admin Panel > Appealed Complaints
2. Find another escalated complaint
3. Click "Uphold Dismissal" button
4. Add resolution notes: "Original dismissal was correct"
5. Click "Uphold Dismissal"
6. **Expected**: 
   - ✅ Request succeeds (200 OK, not 400 Bad Request)
   - Complaint disappears from the list
   - Complaint status becomes 'dismissed'
   - Reporter receives notification
10. **Verify**: Check notifications for the reporter

### Test Steps - Resolve Appealed Complaint (Sustain)
1. Find the appealed complaint in the list
2. Click "Sustain (Override)" button
3. Add resolution notes: "Upon review, complaint is valid"
4. Click "Sustain & Retire"
5. **Expected**: 
   - ✅ Request succeeds (200 OK, not 400 Bad Request)
   - Complaint disappears from the list
   - Markmap is retired
   - Author receives notification about retirement
10. **Verify**: Author can edit the retired markmap

### Test Steps - Resolve Appealed Complaint (Dismiss)
1. Find another appealed complaint
2. Click "Uphold Dismissal" button
3. Add resolution notes: "Original dismissal stands"
4. Click "Uphold Dismissal"
5. **Expected**: 
   - ✅ Request succeeds (200 OK, not 400 Bad Request)
   - Complaint disappears from the list
   - Reporter receives final dismissal notification
10. **Verify**: Reporter cannot appeal again (already appealed once)

---

## Success Criteria

### Color Freeze Level
- ✅ colorFreezeLevel value is properly saved to database
- ✅ colorFreezeLevel is correctly passed from backend to frontend
- ✅ MarkmapViewer component applies colorFreezeLevel to the rendered markmap
- ✅ Different colorFreezeLevel values produce visibly different color patterns
- ✅ Color patterns are consistent between editor preview and markmap view page

### Appealed Complaints
- ✅ No 400 Bad Request errors when resolving escalated complaints
- ✅ No 400 Bad Request errors when resolving appealed complaints  
- ✅ "Sustain (Override)" correctly retires the markmap
- ✅ "Uphold Dismissal" correctly closes the complaint
- ✅ Appropriate notifications are sent to authors and reporters
- ✅ Complaint status transitions are correct in the database

---

## Troubleshooting

### If colorFreezeLevel still doesn't work:
1. Check browser console for errors
2. Verify the markmap value in database: `SELECT id, title, colorFreezeLevel FROM Markmap WHERE id='<markmap-id>';`
3. Check network tab to see the actual value being sent from backend
4. Add console.log in MarkmapViewer.vue line 112 to log the options object
5. Check if markmap-view library version supports colorFreezeLevel

### If complaint resolution still fails:
1. Check backend logs for the exact error message
2. Verify complaint status in database: `SELECT id, status FROM Complaint WHERE id='<complaint-id>';`
3. Check network tab for the request payload and response
4. Verify the error comes from the resolve method specifically

---

## Rollback Plan

If issues persist after these changes:
1. The changes are minimal and isolated
2. Revert commit: `git revert a8c86c0` (for MarkmapViewer changes)
3. Revert commit: `git revert 1b503d0` (for complaints service changes)
4. File detailed bug reports with browser console logs and network traces
