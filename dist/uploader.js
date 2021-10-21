const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
export default async function driveUpload({ file, token, folder, chunkSize, onProgress }) {
    if (!(file && token))
        throw new Error("bad param");
    const _onProgress = onProgress || ((_v) => { });
    const _chunkSize = chunkSize || DEFAULT_CHUNK_SIZE;
    const location = await getUploadLocation(file, token, folder);
    await uploadChunks(file, location, _chunkSize, _onProgress);
    _onProgress(1);
}
async function getUploadLocation(file, token, folder) {
    const metadata = { mimeType: file.type, name: file.name };
    if (folder)
        metadata.parents = [folder];
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(metadata)
    });
    if (!response.ok)
        throw new Error("init fetch: " + response.status);
    const location = response.headers.get("location");
    if (!location)
        throw new Error("no location");
    return location;
}
async function uploadChunks(file, location, chunkSize, onProgress) {
    let ulEnd;
    for (let start = 0;; start = ulEnd + 1) {
        onProgress(start / file.size);
        const end = Math.min(start + chunkSize, file.size);
        const blob = await file.slice(start, end).arrayBuffer(); // read from file
        const response = await fetch(location, // upload to location
        {
            method: "PUT",
            headers: {
                "Content-Range": `bytes ${start}-${end - 1}/${file.size}`
            },
            body: blob
        });
        if (response.ok)
            break; // all done
        if (response.status != 308)
            throw new Error("chunk fetch: " + response.status);
        const r = response.headers.get("Range");
        if (!r)
            throw new Error("no Range");
        ulEnd = parseInt(r.substr(r.indexOf("-") + 1)); // real uploaded
        if (!Number.isInteger(ulEnd) || ulEnd < start)
            throw new Error("bad range: " + r);
    }
}
//# sourceMappingURL=uploader.js.map