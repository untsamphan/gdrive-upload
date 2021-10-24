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
const enum _DEFAULT { chunkSize = 5 * 1024 * 1024 };


async function gdriveUpload(opt: _UploadOptions)
{
  if (!(opt.file &&opt.file.size && opt.token)) throw new TypeError("bad param");

  try {
    const location = await getUploadLocation();
    if (location instanceof Error) return location;
    const error = await uploadChunks(location);
    if (error instanceof Error) return error;

  } catch(error) {
    if (error instanceof Error) return error;
    throw error;
  }
  return undefined; // success


  async function getUploadLocation()
  {
    let metadata: _Metadata = { mimeType: opt.file.type, name: opt.file.name };
    if (opt.folder) metadata.parents = [opt.folder];
    if (opt.metadata) metadata = { ...metadata, ...opt.metadata };

    try {
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        {
          method: "POST", cache: "no-cache",
          headers: {
            Authorization: "Bearer " + opt.token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(metadata)
        });

      if (!response.ok) return new Error("create: " + response.status);
      const location = response.headers.get("location");
      if (!location) return new Error("no location");
      return location;

    } catch(error) {
      if (error instanceof Error) return error;
      throw error;
    }
  }


  async function uploadChunks(location: string)
  {
    const onProgress = opt.onProgress || ((_v: number) => {});
    const chunkSize = opt.chunkSize || _DEFAULT.chunkSize;
    if (chunkSize <= 0 || chunkSize % (256 * 1024))
      throw TypeError("bad chunkSize: " + chunkSize);
    const size = opt.file.size;

    try {
      for(let end = NaN, start = 0;; start = end + 1) {
        onProgress(start / size); // signal progress
        end = Math.min(start + chunkSize, size);

        const blob = await opt.file.slice(start, end).arrayBuffer(); // read from file
        const response = await fetch(location, // upload the chunk to location
          {
            method: "PUT", cache: "no-cache", body: blob,
            headers: { "Content-Range": `bytes ${start}-${end-1}/${size}` }
          });
        if (response.ok) { // all done
          onProgress(1); // signal 100% progress
          return undefined; // success
        }
        if (response.status != 308) return new Error("upload: " + response.status);

        const r = response.headers.get("Range");
        if (!r) return new Error("no Range");
        end = parseInt(r.substr(r.indexOf("-") + 1)); // get where the real upload end
        if (!Number.isInteger(end) || end <= start) return new Error("bad range: " + r);
      }

    } catch (error) {
      if (error instanceof Error) return error;
      throw error;
    }
  }
}
