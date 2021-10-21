interface _UploadOptions {
    file: File;
    token: string;
    folder?: string;
    name?: string;
    desciption?: string;
    chunkSize?: number;
    onProgress?: _OnProgressFn;
}
declare type _OnProgressFn = (value: number) => void;
declare const enum _DEFAULT {
    chunkSize = 5242880
}
declare function gdriveUpload(opt: _UploadOptions): Promise<Error | undefined>;
declare function _getUploadLocation(opt: _UploadOptions): Promise<string | Error>;
declare function _uploadChunks(location: string, opt: _UploadOptions): Promise<Error | undefined>;
