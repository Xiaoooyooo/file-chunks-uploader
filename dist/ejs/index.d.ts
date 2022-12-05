import { RequestOptions } from "./request";
declare type FileChunk = File | Blob;
interface UploaderOptions extends RequestOptions {
    /**
     * 需要上传的文件
     */
    file: File;
    /**
     * 切片大小，字节数，默认 10M
     * @default 10485760
     */
    chunkSize: number;
    /**
     * 跳过的切片编号
     * @default []
     */
    ignoreChunks: number[];
    /**
     * 需要上传的数据
     * 注意如果给定值为函数那么文件切片不会自动被包含到需要上传的数据中，需要在返回的数据中手动添加
     * @default {}
     */
    data?: {
        [key: string]: any;
    } | ((chunk: FileChunk, index: number) => {
        [key: string]: any;
    } | Promise<{
        [key: string]: any;
    }>);
    /**
     * 同一时间允许存在的最大上传请求个数
     * @default 3
     */
    maxInOneTime?: number;
    /**
     * 分片上传失败时允许的最多重试次数
     * @default 3
     */
    maxRetryTimes?: number;
    /**
     * 切片上传成功时调用的事件处理函数
     * @param res 服务器返回的数据
     */
    onChunkUploadSuccess?: (res: any) => void;
    /**
     * 切片上传失败时触发的事件处理函数，在重试上传也失败后才会调用
     * @param reason 服务区返回的数据
     */
    onChunkUploadFailed?: (reason: any) => void;
    /**
     * 上传过程中触发的事件处理函数，接受一个数值，表示当前上传进度
     * @param progress 当前上传进度 [0, 1]
     */
    onUploadProgress?: (progress: number) => void;
    /**
     * 上传成功后调用
     */
    onUploadSuccess?: () => void;
    /**
     * 上传失败后调用
     * @param err 失败的原因（当前分片上传失败后服务器返回的数据，或网络错误）
     */
    onUploadFailed?: (err: any) => void;
}
/**
 * 取消上传
 */
declare type AbortControler = () => void;
export default function uploader(options: UploaderOptions): AbortControler;
export {};
