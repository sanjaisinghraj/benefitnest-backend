# Portal Customization - Quick Start Guide

## 🚀 How to Use

### Step 1: Access the Customization Page
1. Go to **Admin Dashboard** (`/admin`)
2. Click the **🎨 Portal Customization** tile
3. You'll see a list of all corporate clients

### Step 2: Select a Corporate
- Click on any corporate card to select it
- The card will highlight with a blue border
- A confirmation message appears below

### Step 3: Customize the Portal
The form is organized into 8 sections. Edit any fields you want:

| Section | What You Can Customize |
|---------|------------------------|
| **🎨 Visual Identity** | Primary, secondary, accent, background, text, border colors |
| **📝 Typography** | Fonts, sizes, weights, line heights for headings and body |
| **🏢 Logo & Branding** | Logo URL, dimensions, sticky header behavior |
| **📐 Layout & Spacing** | Container width, padding, section gaps |
| **✍️ Content Management** | Portal title, tagline, hero section text, CTA button |
| **👁️ Component Visibility** | Show/hide header, hero, benefits, features, contact, footer, etc. |
| **🌍 Regional Settings** | Currency, timezone, date format, default language |
| **⚙️ Advanced Settings** | Dark mode, SSO, GDPR, custom CSS |

### Step 4: Save Changes
1. Click **✓ Save Customizations** button
2. A loading spinner appears while saving
3. Green toast notification confirms success
4. Changes are automatically versioned in database

## 📋 Customization Examples

### Example 1: Change Company Branding
```
1. Select "Kind Healthcare" corporate
2. Set Primary Color: #059669 (green)
3. Set Heading Font: "Georgia"
4. Set Portal Title: "Kind Healthcare Benefits"
5. Save
→ Portal now shows with green branding and Georgia font
```

### Example 2: Hide Certain Sections
```
1. Select "TechCorp" corporate
2. Under "Component Visibility", uncheck:
   - Show FAQ Section
   - Show Employee Directory
3. Save
→ Portal no longer shows FAQ or employee directory sections
```

### Example 3: Custom Styling
```
1. Select "Global Inc" corporate
2. Scroll to "Advanced Settings"
3. Add Custom CSS:
   .custom-class {
     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
   }
4. Save
→ Custom CSS applied to portal
```

## 🔄 Understanding Versions

When you save customizations:

1. **Backend checks** if a customization already exists
2. **If exists**: 
   - Deactivates previous version (is_active = false)
   - Creates new version (v+1)
   - Logs to history table
3. **If not exists**: Creates version 1
4. **All changes** logged to audit table for compliance

**Example**: 
- Version 1 created on Day 1
- You edit and save on Day 5 → Version 2 created
- You edit again on Day 10 → Version 3 created
- Portal always uses active version (latest)

## 🎯 Best Practices

### ✅ DO:
- **Review before saving** - Check colors/fonts in browser
- **Use standard fonts** - Stick to web-safe fonts (Segoe UI, Georgia, Arial, etc.)
- **Test on portal** - Visit `subdomain.benefitnest.space` to see changes
- **Keep it simple** - Don't overload with too many colors
- **Document changes** - Take note of what you customized

### ❌ DON'T:
- Don't use very long portal titles (keep under 60 characters)
- Don't set inconsistent colors (hard to read)
- Don't upload broken image URLs for logo
- Don't use extreme font sizes (keep between 12-48px)
- Don't mix dark and light mode inconsistently

## 🔐 Permissions

- **Who can access**: Users with admin credentials
- **What they can do**: Customize any corporate's portal
- **Audit trail**: All changes logged with timestamp and user ID

## 🛠️ Troubleshooting

### Issue: Save button is disabled
**Solution**: Select a corporate from the list first

### Issue: Colors not showing on portal
**Solution**: 
1. Check if portal customizations are active
2. Clear browser cache (Ctrl+Shift+Delete)
3. Visit portal subdomain again

### Issue: Font not changing
**Solution**: 
1. Use standard web font names (check CSS font-family list)
2. Font must be available on system or web-safe
3. Clear browser cache and refresh

### Issue: Changes not saved
**Solution**:
1. Check internet connection
2. Look for error toast notification
3. Try saving again

## 📊 Monitoring Changes

To track what was changed:
1. Check `portal_customization_history` table (shows all versions)
2. Check `portal_customization_audit` table (shows all edits)
3. View `is_active` flag (shows current version)

## 📞 Support

If something doesn't work:
1. Check browser console (F12) for errors
2. Verify backend API is running
3. Ensure database has `portal_customizations` table
4. Check that corporate has a valid `tenant_id`

## 🎨 Color Reference

Common professional colors to use:

```
Blues:     #2563eb, #3b82f6, #0284c7, #0369a1
Greens:    #10b981, #059669, #047857, #065f46
Purples:   #8b5cf6, #7c3aed, #6d28d9, #5b21b6
Reds:      #ef4444, #dc2626, #991b1b, #7f1d1d
Grays:     #6b7280, #4b5563, #374151, #1f2937
```

## 📱 Mobile Preview

To see how portal looks on mobile:
1. Visit `subdomain.benefitnest.space`
2. Press F12 to open DevTools
3. Click mobile device icon
4. Test different screen sizes

---

**Last Updated**: December 27, 2025  
**Feature Status**: ✅ Production Ready
