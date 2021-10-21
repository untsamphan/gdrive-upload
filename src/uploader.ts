interface _UploadOptions {
  file: File; // the file to upload
  token: string; // auth token from Google api
  folder?: string; // parent folder id to upload to
  name?: string;
  desciption?: string;
  chunkSize?: number; // must be multiple of 256*1024
  onProgress?: _OnProgressFn; // 0:start 1:done 0.x:progress
}
type _OnProgressFn = (value: number) => void;
const enum _DEFAULT { chunkSize = 5 * 1024 * 1024 };


async function gdriveUpload(opt: _UploadOptions)
{
  if (!(opt.file && opt.token)) throw new Error("bad param");

  try {
    const location = await _getUploadLocation(opt);
    if (location instanceof Error) return location;
    const error = await _uploadChunks(location, opt);
    if (error instanceof Error) return error;

  } catch(error) {
    if (error instanceof Error) return error;
    throw error;
  }
  return undefined; // success
}


async function _getUploadLocation(opt: _UploadOptions)
{
  const metadata = { mimeType: opt.file.type, name: opt.file.name } as any;
  if (opt.folder) metadata.parents = [opt.folder];
  if (opt.name) metadata.name = opt.name;
  if (opt.desciption) metadata.desciption = opt.desciption;

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

    if (!response.ok) return new Error("init fetch: " + response.status);
    const location = response.headers.get("location");
    if (!location) return new Error("no location");
    return location;

  } catch(error) {
    if (error instanceof Error) return error;
    throw error;
  }
}


async function _uploadChunks(location: string, opt: _UploadOptions)
{
  const onProgress = opt.onProgress || ((_v: number) => {});
  const chunkSize = opt.chunkSize || _DEFAULT.chunkSize;
  const size = opt.file.size;

  try {
    let ulEnd: number;
    for(let start = 0;; start = ulEnd + 1) {
      onProgress(start / size); // signal progress
      const end = Math.min(start + chunkSize, size);

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
