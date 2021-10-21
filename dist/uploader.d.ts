interface _UploadOptions {
    file: File;
    token: string;
    folder?: string;
    chunkSize?: number;
    onProgress?: _OnProgressFn;
}
declare type _OnProgressFn = (value: number) => void;
declare const enum _DEFAULT {
    chunkSize = 5242880
}
declare function gdriveUpload({ file, token, folder, chunkSize, onProgress }: _UploadOptions): Promise<Error | undefined>;
declare function _getUploadLocation(file: File, token: string, folder?: string): Promise<string | Error>;
declare function _uploadChunks(file: File, location: string, chunkSize: number, onProgress: _OnProgressFn): Promise<Error | undefined>;
