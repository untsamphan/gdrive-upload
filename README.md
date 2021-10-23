# gdriveUpload

Small JavaScript library, for uploading large or small file in chunks to Google Drive, using the [resumable upload](https://developers.google.com/drive/api/v3/manage-uploads#resumable) API</a>

- upload large files, e.g., 2GB
- minimal memory requirement, depending on the configurable `chunkSize`
- specify any metadata, e.g., name, description
- provide a callback to show progress
- return Promise, allow handling of success/failure case
- for use in Google Apps Script projects

## Installation

Copy the .js file, or use jsdelivr:-

```html
<script src="https://cdn.jsdelivr.net/gh/untsamphan/gdrive-upload@1.1/dist/gdriveUpload.min.js"></script>
```

## API

The function:-

```javascript
async function gdriveUpload(option: _UploadOptions)
```

It returns `undefined` if success or `Error` if failed.

The `option` parameters:-

```typescript
interface _UploadOptions {
  file: File; // the file to upload
  token: string; // auth token from Google api
  folder?: string; // parent folder id to upload to (root if missing)
  metadata?: _Metadata; // such as `name`, `description`
  chunkSize?: number; // must be multiple of 256*1024 (default 5M)
  onProgress?: _OnProgressFn; // 0:start 1:done 0.x:progress
}
type _OnProgressFn = (value: number) => void;
type _Metadata = {[key: string]: any};
```

The parameter `file` and `token` are required. The rest are optional. For the list of available metadata properties see the list at [file.create](https://developers.google.com/drive/api/v3/reference/files/create#request-body) API.

## Example

Sample code from an Apps Script web app. The Apps Script function `getFolderAndToken()` returns the folder id and OAuth token.

### Web app JavaScript

```javascript
function uploadFile() {
  const file = document.getElementById("file").files[0];
  showUploadStart();

  const metadata = {};
  let v = document.getElementById("name").value;
  if (v && v !== file.name) metadata.name = v;
  v = document.getElementById("description").value;
  if (v) metadata.description = v;

  google.script.run.withSuccessHandler(doUpload).getFolderAndToken();

  function doUpload(result) {
    gdriveUpload({ ...result, file, metadata, onProgress: handleProgress })
    .then(error => {
      if (error) showMessage("Upload error: " + error.message);
    }).finally(showUploadEnd);
  }
}

function handleProgress(value) {
  if (value === 0) showMessage("Uploading...");
  else if (value === 1) showMessage("Done");
  document.getElementById("progress").innerHTML =
    `<progress max="1" value=${value}></progress>`;
}
```

### App Script

```javascript
function getFolderAndToken() {
  const folderName = "Uploads";
  const folders = DriveApp.getFoldersByName(folderName);
  const folder = (folders.hasNext()) ? folders.next() : DriveApp.createFolder(folderName);
  return {
    folder: folder.getId(),
    token: ScriptApp.getOAuthToken()
  };
}
```
