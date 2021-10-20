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
const _DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
function gdUpload({ file, token, folder, chunkSize, onProgress }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(file && token))
            throw "bad param";
        const _onProgress = onProgress || ((_v) => { });
        const _chunkSize = chunkSize || _DEFAULT_CHUNK_SIZE;
        const location = yield _getUploadLocation(file, token, folder);
        yield _uploadChunks(file, location, _chunkSize, _onProgress);
        _onProgress(1);
    });
}
function _getUploadLocation(file, token, folder) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = { mimeType: file.type, name: file.name };
        if (folder)
            body.parents = [folder];
        let response;
        response = yield fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        if (!response.ok)
            throw "init fetch status: " + response.status;
        const location = response.headers.get("location");
        if (!location)
            throw "no location";
        return location;
    });
}
function _uploadChunks(file, location, chunkSize, onProgress) {
    return __awaiter(this, void 0, void 0, function* () {
        let ulEnd;
        for (let start = 0;; start = ulEnd + 1) {
            onProgress(start / file.size);
            const end = Math.min(start + chunkSize, file.size);
            //console.log("start:end", start, end);
            const blob = yield file.slice(start, end).arrayBuffer(); // read from file
            const response = yield fetch(location, {
                method: "PUT",
                headers: {
                    "Content-Range": `bytes ${start}-${end - 1}/${file.size}`
                },
                body: blob
            });
            if (response.ok)
                break; // all done
            if (response.status != 308)
                throw "chunk fetch status: " + response.status;
            const r = response.headers.get("Range");
            if (!r)
                throw "no range in response";
            ulEnd = parseInt(r.substr(r.indexOf("-") + 1)); // real uploaded
            if (!Number.isInteger(ulEnd) || ulEnd < start)
                throw "bad range: " + r;
        }
    });
}
//# sourceMappingURL=uploader.js.map