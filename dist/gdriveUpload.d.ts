interface _UploadOptions {
    file: File;
    token: string;
    folder?: string;
    metadata?: _Metadata;
    chunkSize?: number;
    onProgress?: _OnProgressFn;
}
declare type _OnProgressFn = (value: number) => void;
declare type _Metadata = {
    [key: string]: any;
};
declare const enum _DEFAULT {
    chunkSize = 5242880
}
declare function gdriveUpload(opt: _UploadOptions): Promise<Error | undefined>;
