interface _UploadOptions {
  file: File; // the file to upload
  token: string; // auth token from Google api
  folder?: string; // parent folder id to upload to
  chunkSize?: number; // must be multiple of 256*1024
  onProgress?: _OnProgressFn; // 0:start 1:done 0.x:progress
}
type _OnProgressFn = (value: number) => void;
const enum _DEFAULT { chunkSize = 5 * 1024 * 1024 };


async function gdriveUpload(
  { file, token, folder, chunkSize, onProgress }: _UploadOptions)
{
  if (!(file && token)) throw new Error("bad param");
  const _onProgress = onProgress || ((_v: number) => {});
  const _chunkSize = chunkSize || _DEFAULT.chunkSize;

  try {
    const location = await _getUploadLocation(file, token, folder);
    if (location instanceof Error) return location;
    const error = await _uploadChunks(file, location, _chunkSize, _onProgress);
    if (error instanceof Error) return error;

  } catch(error) {
    if (error instanceof Error) return error;
    throw error;
  }
  _onProgress(1); // signal 100% progress
  return undefined; // success
}


async function _getUploadLocation(file: File, token: string, folder?: string)
{
  const metadata = { mimeType: file.type, name: file.name } as any;
  if (folder) metadata.parents = [folder];

  try {
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metadata)
      });

    if (!response.ok) return new Error("init fetch: " + response.status);
    const location = response.headers.get("location");
    if (!location) return new Error("no location");
    return location;

  } catch(error) {
    if (error instanceof Error) return error;
    throw error;
  }
}


async function _uploadChunks(file: File, location: string,
  chunkSize: number, onProgress: _OnProgressFn)
{
  try {
    let ulEnd: number;
    for(let start = 0;; start = ulEnd + 1) {
      onProgress(start / file.size);
      const end = Math.min(start + chunkSize, file.size);

      const blob = await file.slice(start, end).arrayBuffer(); // read from file
      const response = await fetch(location, // upload to location
        {
          method: "PUT",
          headers: {
            "Content-Range": `bytes ${start}-${end-1}/${file.size}`
          },
          body: blob
        });
      if (response.ok) return undefined; // all done
      if (response.status != 308) return new Error("chunk fetch: " + response.status);

      const r = response.headers.get("Range");
      if (!r) return new Error("no Range");
      ulEnd = parseInt(r.substr(r.indexOf("-") + 1)); // real uploaded
      if (!Number.isInteger(ulEnd) || ulEnd < start) return new Error("bad range: " + r);
    }

  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
}
