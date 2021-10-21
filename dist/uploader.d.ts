interface UploadOptions {
    file: File;
    token: string;
    folder?: string;
    chunkSize?: number;
    onProgress?: OnProgressFn;
}
declare type OnProgressFn = (value: number) => void;
export default function driveUpload({ file, token, folder, chunkSize, onProgress }: UploadOptions): Promise<void>;
export {};
