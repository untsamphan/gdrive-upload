"use strict";
;
async function gdriveUpload(opt) {
    if (!(opt.file && opt.token))
        throw new TypeError("bad param");
    try {
        const location = await _getUploadLocation(opt);
        if (location instanceof Error)
            return location;
        const error = await _uploadChunks(location, opt);
        if (error instanceof Error)
            return error;
    }
    catch (error) {
        if (error instanceof Error)
            return error;
        throw error;
    }
    return undefined; // success
}
async function _getUploadLocation(opt) {
    let metadata = { mimeType: opt.file.type, name: opt.file.name };
    if (opt.folder)
        metadata.parents = [opt.folder];
    if (opt.metadata)
        metadata = Object.assign(Object.assign({}, metadata), opt.metadata);
    try {
        const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
            method: "POST", cache: "no-cache",
            headers: {
                Authorization: "Bearer " + opt.token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(metadata)
        });
        if (!response.ok)
            return new Error("init fetch: " + response.status);
        const location = response.headers.get("location");
        if (!location)
            return new Error("no location");
        return location;
    }
    catch (error) {
        if (error instanceof Error)
            return error;
        throw error;
    }
}
async function _uploadChunks(location, opt) {
    const onProgress = opt.onProgress || ((_v) => { });
    const chunkSize = opt.chunkSize || 5242880 /* chunkSize */;
    if (chunkSize <= 0 || chunkSize % (256 * 1024) !== 0)
        throw TypeError("bad chunkSize: " + chunkSize);
    const size = opt.file.size;
    try {
        let end;
        for (let start = 0;; start = end + 1) {
            onProgress(start / size); // signal progress
            end = Math.min(start + chunkSize, size);
            const blob = await opt.file.slice(start, end).arrayBuffer(); // read from file
            const response = await fetch(location, // upload the chunk to location
            {
                method: "PUT", cache: "no-cache", body: blob,
                headers: { "Content-Range": `bytes ${start}-${end - 1}/${size}` }
            });
            if (response.ok) { // all done
                onProgress(1); // signal 100% progress
                return undefined; // success
            }
            if (response.status != 308)
                return new Error("chunk fetch: " + response.status);
            const r = response.headers.get("Range");
            if (!r)
                return new Error("no Range");
            end = parseInt(r.substr(r.indexOf("-") + 1)); // get where the real upload end
            if (!Number.isInteger(end) || end < start)
                return new Error("bad range: " + r);
        }
    }
    catch (error) {
        if (error instanceof Error)
            return error;
        throw error;
    }
}
//# sourceMappingURL=gdriveUpload.js.map