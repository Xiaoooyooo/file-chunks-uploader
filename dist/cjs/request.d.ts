interface XhrOptions {
    url: string;
    method: string;
    withCredentials?: boolean;
    /**
     * 每次上传超时时间，毫秒
     * @default 30000
     */
    timeout?: number;
    /**
     * 当前分片上传过程调用的事件，接受一个参数表示当前已经上传的数据量
     */
    onUploadProgress?: (chunkProgress: number) => void;
}
export interface RequestOptions extends XhrOptions {
    data?: {
        [key: string]: any;
    };
    signal?: AbortSignal;
}
export default function request(options: RequestOptions): Promise<unknown>;
export {};
