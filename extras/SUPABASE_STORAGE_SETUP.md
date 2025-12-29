# Supabase Storage Setup - Portal Files

## Step 1: Create Storage Bucket

1. Open **Supabase Dashboard**
2. Go to **Storage** → **Buckets**
3. Click **Create New Bucket**
4. Configure:
   - **Name:** `portals`
   - **File size limit:** 10 MB
   - **Allowed MIME types:** text/html

## Step 2: Set Bucket Policies

In Supabase Dashboard → Storage → Buckets → `portals` → Policies:

**Policy 1: Public Read (Allow anyone to view portals)**
```sql
CREATE POLICY "Allow public read on portals"
ON storage.objects
FOR SELECT
USING (bucket_id = 'portals');
```

**Policy 2: Service Role Write (Allow backend to create/update)**
```sql
CREATE POLICY "Allow service role to manage portals"
ON storage.objects
FOR ALL
USING (bucket_id = 'portals')
WITH CHECK (bucket_id = 'portals');
```

## Step 3: Code Changes (Already Done)

The backend now:
- Uploads portal HTML to Supabase Storage `portals` bucket
- Stores file path in database
- Generates public URLs for access
- Checks storage instead of local filesystem

## Step 4: How It Works

```
Frontend clicks "Open"
        ↓
Backend calls API endpoint
        ↓
Generates portal HTML
        ↓
Uploads to Supabase Storage (portals bucket)
        ↓
Stores file path in database
        ↓
Returns public URL
        ↓
Frontend opens portal in new tab
```

## File Storage Location

- **Bucket:** `portals`
- **File Path:** `portals/{subdomain}.html`
- **Public URL:** `https://{project-id}.supabase.co/storage/v1/object/public/portals/{subdomain}.html`

## Benefits

✅ Persists across server restarts
✅ Works on Render/ephemeral filesystems
✅ Scalable to multiple servers
✅ CDN-ready with Supabase
✅ Easy backup and versioning
✅ Public accessible URLs

## Testing

After deploying:

1. Click "Open" button in admin panel
2. Portal HTML uploads to storage
3. Check Supabase Storage → portals bucket
4. Should see `{subdomain}.html` file
5. Portal opens in new tab

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 403 Forbidden | Check bucket policies are set correctly |
| File not found | Verify bucket name is `portals` |
| Upload failed | Check Supabase credentials |
| Can't access portal | Verify bucket is public |

---

**Setup Complete!** ✅ Your portals now persist in Supabase Storage.
