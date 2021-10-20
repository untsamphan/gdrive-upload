"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
function gdUpload({ file, token, folder, chunkSize, onProgress }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(file && token))
            throw "bad param";
        if (!onProgress)
            onProgress = (_v) => { };
        if (!chunkSize)
            chunkSize = DEFAULT_CHUNK_SIZE;
        const body = { mimeType: file.type, name: file.name };
        if (folder)
            body.parents = [folder];
        let response;
        try {
            response = yield fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
        }
        catch (error) {
            throw "init fetch: " + error;
        }
        if (!response.ok)
            throw "init fetch status: " + response.status;
        const location = response.headers.get("location") || "";
        if (!location)
            throw "no location";
        uploadChunk(0);
        function uploadChunk(start) {
            return __awaiter(this, void 0, void 0, function* () {
                onProgress(start / file.size);
                let end = start + chunkSize;
                if (end > file.size)
                    end = file.size;
                console.log("start:end", start, end);
                const reader = new FileReader();
                const blob = file.slice(start, end);
                reader.readAsArrayBuffer(blob);
                let response;
                try {
                    response = yield fetch(location, {
                        method: "PUT",
                        headers: {
                            "Content-Range": `bytes ${start}-${end - 1}/${file.size}`
                        },
                        body: blob
                    });
                }
                catch (error) {
                    throw `chunk fetch: (${error})`;
                }
                if (response.status == 308) { // upload next chunk
                    const r = response.headers.get("Range");
                    if (!r)
                        throw "no range in response";
                    const realEnd = parseInt(r.substr(r.indexOf("-") + 1));
                    if (!Number.isInteger(realEnd) || realEnd < start)
                        throw "bad range: " + r;
                    uploadChunk(realEnd + 1);
                }
                else if (response.ok)
                    onProgress(1); // all done
                else
                    throw "chunk status: " + response.status;
            });
        }
    });
}
//# sourceMappingURL=uploader.js.map